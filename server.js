const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const recipes = require("./recipe-catalog.js");
const planner = require("./planner-core.js");

const root = __dirname;
const port = Number(process.env.PORT) || 8000;
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY || "";
const unsplashSearchCache = new Map();
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

const imageStopWords = new Set(["and", "with", "the", "from", "roast", "roasted", "baked", "grilled", "creamy", "crispy", "classic", "fresh", "wild", "easy", "style", "home", "made", "served", "recipe", "dish"]);

function normalizeImageText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function imageTokenSet(value) {
  const tokens = normalizeImageText(value).split(/\s+/).filter(Boolean);
  for (const token of [...tokens]) {
    if (token.endsWith("ies") && token.length > 4) tokens.push(`${token.slice(0, -3)}y`);
    else if (token.endsWith("oes") && token.length > 4) tokens.push(token.slice(0, -2));
    else if (token.endsWith("es") && token.length > 4) tokens.push(token.slice(0, -2));
    else if (token.endsWith("s") && token.length > 3) tokens.push(token.slice(0, -1));
  }
  return new Set(tokens);
}

function unsplashSearchTerms(recipe) {
  const text = normalizeImageText(`${recipe.name} ${recipe.ingredients.slice(0, 4).map((ingredient) => ingredient[2]).join(" ")}`);
  return [...new Set(text.split(/\s+/).filter((word) => word.length > 3 && !imageStopWords.has(word)))];
}

async function searchUnsplashRecipe(recipe) {
  if (!unsplashAccessKey) return [];
  const cacheKey = recipe.name.toLowerCase();
  if (unsplashSearchCache.has(cacheKey)) return unsplashSearchCache.get(cacheKey);
  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.search = new URLSearchParams({ query: recipe.name, per_page: "10", orientation: "landscape", content_filter: "high" }).toString();
    const response = await fetch(url, {
      headers: { authorization: `Client-ID ${unsplashAccessKey}`, "accept-version": "v1" },
      signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) throw new Error(`Unsplash returned HTTP ${response.status}.`);
    const result = await response.json();
    const terms = unsplashSearchTerms(recipe);
    const photos = (Array.isArray(result.results) ? result.results : []).map((photo) => {
      const url = photo.urls?.regular;
      if (typeof photo.id !== "string" || typeof url !== "string") return null;
      try {
        if (new URL(url).hostname !== "images.unsplash.com" || new URL(url).protocol !== "https:") return null;
      } catch {
        return null;
      }
      const searchable = imageTokenSet(`${photo.alt_description || ""} ${photo.description || ""} ${(photo.tags || []).map((tag) => tag.title || "").join(" ")}`);
      const matches = terms.filter((term) => searchable.has(term));
      if (!matches.length) return null;
      let pageUrl = "";
      try {
        const photoPage = new URL(photo.links?.html || "");
        if (photoPage.protocol === "https:" && photoPage.hostname === "unsplash.com") {
          photoPage.searchParams.set("utm_source", "tablepop");
          photoPage.searchParams.set("utm_medium", "referral");
          pageUrl = photoPage.toString();
        }
      } catch {}
      return {
        id: photo.id,
        url,
        alt: photo.alt_description || recipe.name,
        photographer: photo.user?.name || "Unsplash contributor",
        pageUrl,
        downloadUrl: photo.links?.download_location || ""
      };
    }).filter(Boolean).sort((left, right) => {
      const score = (photo) => terms.filter((term) => imageTokenSet(photo.alt).has(term)).length;
      return score(right) - score(left);
    });
    unsplashSearchCache.set(cacheKey, photos);
    if (unsplashSearchCache.size > 160) unsplashSearchCache.delete(unsplashSearchCache.keys().next().value);
    return photos;
  } catch (error) {
    console.error("Unsplash recipe image search failed:", error.message);
    return [];
  }
}

async function attachRelevantImages(plan) {
  if (!unsplashAccessKey || !Array.isArray(plan?.menus)) return plan;
  const uniqueRecipes = [...new Set(plan.menus.flatMap((menu) => menu.recipes.map((recipe) => recipe.id)))];
  const candidates = new Map();
  for (let offset = 0; offset < uniqueRecipes.length; offset += 4) {
    const batch = uniqueRecipes.slice(offset, offset + 4);
    const batchResults = await Promise.all(batch.map(async (id) => [id, await searchUnsplashRecipe(recipes[id])]));
    batchResults.forEach(([id, photos]) => candidates.set(id, photos));
  }
  const usedImageIds = new Set(plan.intent?.recentImageIds || []);
  for (const menu of plan.menus) {
    for (const item of menu.recipes) {
      const photo = (candidates.get(item.id) || []).find((candidate) => !usedImageIds.has(`unsplash-${candidate.id}`));
      if (photo) {
        item.image = photo.url;
        item.imageId = `unsplash-${photo.id}`;
        item.imageAlt = photo.alt;
        item.imageCredit = photo.photographer;
        item.imageCreditUrl = photo.pageUrl;
        usedImageIds.add(item.imageId);
        if (photo.downloadUrl) {
          try {
            const downloadUrl = new URL(photo.downloadUrl);
            if (downloadUrl.protocol === "https:" && downloadUrl.hostname === "api.unsplash.com") {
              fetch(downloadUrl, { headers: { authorization: `Client-ID ${unsplashAccessKey}`, "accept-version": "v1" }, signal: AbortSignal.timeout(5000) }).catch(() => {});
            }
            } catch {}
        }
        continue;
      }
      const fallbackImage = recipes[item.id]?.image;
      if (fallbackImage && !usedImageIds.has(fallbackImage)) {
        item.image = fallbackImage;
        item.imageId = fallbackImage;
        usedImageIds.add(fallbackImage);
      } else {
        item.image = "";
        item.imageId = "";
      }
    }
  }
  return plan;
}

function compactIntent(intent) {
  return {
    occasion: intent.occasion,
    dietary: intent.dietary,
    preferences: intent.preferences,
    cuisine: intent.cuisine,
    guests: intent.guests,
    budget: intent.budget,
    courseCount: intent.courseCount,
    recentRecipeIds: intent.recentRecipeIds,
    recentImageIds: intent.recentImageIds,
    recentMenuTitles: intent.recentMenuTitles
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
  const knownRecipeIds = new Set(Object.keys(recipes));
  const recentRecipeIds = [...new Set((Array.isArray(input.recentRecipeIds) ? input.recentRecipeIds : []).filter((id) => typeof id === "string" && knownRecipeIds.has(id)))].slice(-120);
    const recentImageIds = [...new Set((Array.isArray(input.recentImageIds) ? input.recentImageIds : []).filter((id) => typeof id === "string" && /^(?:photo-|unsplash-)[a-zA-Z0-9-]{4,80}$/.test(id)))].slice(-120);
  const recentMenuTitles = [...new Set((Array.isArray(input.recentMenuTitles) ? input.recentMenuTitles : []).filter((title) => typeof title === "string" && title.trim()))].slice(-120);
  return { ...input, budget, guests, courseCount, cuisine: input.cuisine || "", recentRecipeIds, recentImageIds, recentMenuTitles, recentDishProfiles: [] };
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
      instructions: "You are a professional food editor and menu planner. Parse the request semantically and treat dietary exclusions, ingredient bans, cuisine, budget, guests, and course count as hard constraints. Prioritize them over novelty. Create varied, regionally grounded culinary experiences by balancing technique, texture, freshness, richness, and course progression; avoid relying on the same proteins or flavor profiles across menus. Use only recipe IDs from the catalog, never choose any previously generated ID, and avoid close ingredient-profile matches. Do not copy external recipe text or invent facts. If no valid new menu exists, do not repeat recipes. Return only the required structured data.",
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
        previouslyGeneratedRecipes: localIntent.recentRecipeIds.slice(-40).map((id) => planner.recipeIdentity(recipes[id], id)),
        previouslyGeneratedMenuTitles: localIntent.recentMenuTitles,
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
  try {
    return JSON.parse(outputText);
  } catch {
    const cleaned = outputText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    if (!cleaned) throw new Error("AI response was empty.");
    return JSON.parse(cleaned);
  }
}

function createAiMenus(aiResult, input, localIntent) {
  const intent = planner.mergeAiIntent(localIntent, aiResult.intent);
  const menus = [];
  const usedRecipeIds = new Set();
  const usedImageIds = new Set(intent.recentImageIds);
  const usedTitles = new Set(intent.recentMenuTitles.map((title) => title.trim().toLowerCase()));
  for (const candidate of aiResult.menus.slice(0, 3)) {
    const validation = planner.validateMenu(recipes, candidate.recipeIds, input, { intent });
    if (!validation.valid) continue;
    if (candidate.recipeIds.some((id) => usedRecipeIds.has(id))) continue;
    const menu = planner.buildMenu(recipes, candidate.recipeIds, intent, 0, menus.length, usedImageIds, usedTitles);
    menus.push(menu);
    candidate.recipeIds.forEach((id) => usedRecipeIds.add(id));
  }
  if (!menus.length) throw new Error("AI returned no menu that passed recipe and budget validation.");
  return { menus, intent, source: "ai", limitation: "", estimateNote: "Ingredient costs are catalog estimates per guest in EUR, not live local prices." };
}

async function planRequest(input) {
  input = validateInput(input);
  const localIntent = planner.parseRequest(input);
  if (!process.env.OPENAI_API_KEY) return attachRelevantImages(planner.composeMenus(recipes, input, { intent: localIntent, source: "local" }));
  try {
    const aiResult = await requestAiPlan(input, localIntent);
    return attachRelevantImages(createAiMenus(aiResult, input, localIntent));
  } catch (error) {
    const fallback = planner.composeMenus(recipes, input, { intent: localIntent, source: "local" });
    fallback.fallbackReason = "AI planning is unavailable or returned an invalid menu; these results use the local structured recipe catalog instead.";
    console.error("AI menu planner fallback:", error.message);
    return attachRelevantImages(fallback);
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
    sendJson(response, 200, { aiEnabled: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_API_KEY ? model : null, imageSearchEnabled: Boolean(unsplashAccessKey) });
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
  console.log(`Recipe image search: ${unsplashAccessKey ? "Unsplash API enabled" : "not configured; catalog images enabled"}`);
});
