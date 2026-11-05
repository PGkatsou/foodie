const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const recipes = require("./recipe-catalog.js");
const planner = require("./planner-core.js");

const root = __dirname;
const port = Number(process.env.PORT) || 8000;
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};
const allowedDietary = ["vegetarian", "vegan", "meatFree", "seafoodFree", "dairyFree", "eggFree", "glutenFree", "soyFree", "sesameFree", "nutFree", "honeyFree"];
const allowedOccasions = ["romantic", "family", "childFriendly", "celebration", "social", "festive", "brunch", "formal", "summer"];
const allowedPreferences = ["pasta", "highProtein", "light", "budgetFriendly", "polished", "quick", "traditional"];

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: {
      type: "object",
      additionalProperties: false,
      properties: {
        dietary: { type: "array", items: { type: "string", enum: allowedDietary } },
        occasion: { type: "array", items: { type: "string", enum: allowedOccasions } },
        preferences: { type: "array", items: { type: "string", enum: allowedPreferences } }
      },
      required: ["dietary", "occasion", "preferences"]
    },
    menus: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          recipeIds: { type: "array", items: { type: "string" } },
          rationale: { type: "string" }
        },
        required: ["recipeIds", "rationale"]
      }
    }
  },
  required: ["intent", "menus"]
};

function sendJson(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) throw new Error("Request body is too large.");
  }
  return JSON.parse(body || "{}");
}

function compactIntent(intent) {
  return {
    occasion: intent.occasion,
    dietary: intent.dietary,
    preferences: intent.preferences,
    cuisine: intent.cuisine,
    guests: intent.guests,
    budget: intent.budget,
    courseCount: intent.courseCount
  };
}

function validateInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Request must be a JSON object.");
  const budget = Number(input.budget);
  const guests = Number(input.guests);
  const courseCount = Number(input.courseCount);
  if (!Number.isFinite(budget) || budget < 10 || budget > 2000) throw new Error("Budget must be between EUR 10 and EUR 2,000.");
  if (!Number.isInteger(guests) || guests < 1 || guests > 20) throw new Error("Guest count must be between 1 and 20.");
  if (!Number.isInteger(courseCount) || courseCount < 1 || courseCount > 4) throw new Error("Course count must be between 1 and 4.");
  if (typeof input.occasion !== "string" || !input.occasion.trim() || input.occasion.length > 160) throw new Error("Occasion must be 1 to 160 characters.");
  if (typeof input.recipeRequest !== "string" || input.recipeRequest.length > 400) throw new Error("Recipe requests must be 400 characters or fewer.");
  if (typeof input.cuisine !== "string" || (input.cuisine && !planner.summarizeCatalog(recipes).some((recipe) => recipe.cuisines.includes(input.cuisine)))) {
    const allowed = ["Greek", "Italian", "Asian", "American", "European", "Mediterranean", "Mexican", "Indian", "Street food"];
    if (input.cuisine && !allowed.includes(input.cuisine)) throw new Error("Choose a supported cuisine or Any cuisine.");
  }
  return { ...input, budget, guests, courseCount, cuisine: input.cuisine || "" };
}

async function requestAiPlan(input, localIntent) {
  const catalog = planner.summarizeCatalog(recipes);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    signal: AbortSignal.timeout(25_000),
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions: "You are a menu planner. Interpret the occasion and free-text request semantically. Treat dietary constraints as hard exclusions. Do not invent recipes, ingredients, costs, or facts. Select only catalog IDs. Build complete menus in the required course order; the server will validate all constraints and calculate all costs. Use cuisine-specific recipes for mains; neutral-course recipes may be used for compatible supporting courses. Return only the required structured data.",
      input: JSON.stringify({
        request: {
          budgetEur: localIntent.budget,
          guests: localIntent.guests,
          occasion: input.occasion,
          cuisine: input.cuisine,
          courses: localIntent.courseCount,
          additionalRequest: input.recipeRequest
        },
        deterministicInterpretation: compactIntent(localIntent),
        catalog
      }),
      text: {
        format: {
          type: "json_schema",
          name: "menu_plan",
          strict: true,
          schema: responseSchema
        }
      }
    })
  });
  if (!response.ok) throw new Error(`AI service returned HTTP ${response.status}.`);
  const result = await response.json();
  const outputText = result.output_text || result.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("AI service returned no structured plan.");
  return JSON.parse(outputText);
}

function createAiMenus(aiResult, input, localIntent) {
  const intent = planner.mergeAiIntent(localIntent, aiResult.intent);
  const menus = [];
  for (const candidate of aiResult.menus.slice(0, 3)) {
    const validation = planner.validateMenu(recipes, candidate.recipeIds, input, { intent });
    if (!validation.valid) continue;
    const menu = planner.buildMenu(recipes, candidate.recipeIds, intent, 0, menus.length);
    menu.rationale = String(candidate.rationale || menu.rationale).slice(0, 300);
    menus.push(menu);
  }
  if (!menus.length) throw new Error("AI returned no menu that passed recipe and budget validation.");
  return { menus, intent, source: "ai", limitation: "", estimateNote: "Ingredient costs are catalog estimates per guest in EUR, not live local prices." };
}

async function planRequest(input) {
  input = validateInput(input);
  const localIntent = planner.parseRequest(input);
  if (!process.env.OPENAI_API_KEY) return planner.composeMenus(recipes, input, { intent: localIntent, source: "local" });
  try {
    const aiResult = await requestAiPlan(input, localIntent);
    return createAiMenus(aiResult, input, localIntent);
  } catch (error) {
    const fallback = planner.composeMenus(recipes, input, { intent: localIntent, source: "local" });
    fallback.fallbackReason = "AI planning is unavailable or returned an invalid menu; these results use the local structured recipe catalog instead.";
    console.error("AI menu planner fallback:", error.message);
    return fallback;
  }
}

function serveStatic(urlPath, response) {
  const requested = urlPath === "/" ? "/index.html" : urlPath;
  const allowed = new Set(["/index.html", "/planner-core.js", "/recipe-catalog.js"]);
  if (!allowed.has(requested)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  const filePath = path.join(root, requested.slice(1));
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "content-type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { aiEnabled: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_API_KEY ? model : null });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/plan") {
    try {
      const input = await readJson(request);
      const result = await planRequest(input);
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, 400, { error: error.message || "Invalid request." });
    }
    return;
  }
  if (request.method === "GET") {
    serveStatic(url.pathname, response);
    return;
  }
  response.writeHead(405, { allow: "GET, POST" });
  response.end("Method not allowed");
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Tablepop planner listening on http://localhost:${port}`);
  console.log(`AI provider: ${process.env.OPENAI_API_KEY ? model : "not configured; local planner enabled"}`);
});
