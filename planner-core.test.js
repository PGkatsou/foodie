const test = require("node:test");
const assert = require("node:assert/strict");
const recipes = require("./recipe-catalog.js");
const planner = require("./planner-core.js");

function input(overrides = {}) {
  return {
    budget: 160,
    guests: 4,
    occasion: "Family dinner",
    cuisine: "",
    courseCount: 4,
    recipeRequest: "",
    ...overrides
  };
}

test("interprets natural-language occasion and hard dietary restrictions", () => {
  const intent = planner.parseRequest(input({
    occasion: "Something romantic for an anniversary",
    recipeRequest: "No meat involved, no dairy products, and no seafood"
  }));
  assert.ok(intent.occasion.includes("romantic"));
  assert.equal(intent.dietary.meatFree, true);
  assert.equal(intent.dietary.seafoodFree, true);
  assert.equal(intent.dietary.dairyFree, true);
  assert.ok(!intent.freeTextTerms.includes("meat"));
});

test("composes a Greek meat-free four-course menu within the guest budget", () => {
  const request = input({ cuisine: "Greek", recipeRequest: "No meat involved", guests: 6, budget: 120 });
  const result = planner.composeMenus(recipes, request);
  assert.ok(result.menus.length > 0, result.limitation);
  for (const menu of result.menus) {
    assert.equal(menu.courseCount, 4);
    assert.deepEqual(menu.recipes.map((recipe) => recipe.role), ["starter", "main", "side", "dessert"]);
    assert.ok(menu.totalCost <= request.budget);
    assert.equal(menu.totalCost, menu.recipes.reduce((total, recipe) => total + recipe.costPerGuest * request.guests, 0));
    assert.ok(menu.recipes.every((recipe) => !recipe.dietary.meat && !recipe.dietary.seafood));
    assert.ok(menu.recipes.find((recipe) => recipe.role === "main").cuisines.includes("Greek"));
  }
  assert.match(result.estimateNote, /estimates per guest/i);
});

test("scales ingredient quantities with the number of guests", () => {
  const fourGuests = planner.composeMenus(recipes, input({ guests: 4, courseCount: 1 }));
  const eightGuests = planner.composeMenus(recipes, input({ guests: 8, courseCount: 1 }));
  const recipe4 = fourGuests.menus[0].recipes[0];
  const recipe8 = eightGuests.menus.find((menu) => menu.recipes[0].id === recipe4.id).recipes[0];
  assert.equal(recipe8.servings, 8);
  assert.equal(recipe8.estimatedCost, recipe4.estimatedCost * 2);
});

test("treats seafood exclusion as a hard constraint", () => {
  const result = planner.composeMenus(recipes, input({ recipeRequest: "No seafood or fish" }));
  assert.ok(result.menus.length > 0, result.limitation);
  assert.ok(result.menus.every((menu) => menu.recipes.every((recipe) => !recipe.dietary.seafood)));
});

test("ranks pasta menus for a natural-language pasta preference", () => {
  const result = planner.composeMenus(recipes, input({
    cuisine: "Italian",
    courseCount: 1,
    recipeRequest: "Italian food, preferably pasta-based"
  }));
  assert.ok(result.menus.length > 0, result.limitation);
  assert.match(result.menus[0].recipes[0].name, /pasta|Bolognese|ragu|gnocchi/i);
});

test("does not relax an impossible budget", () => {
  const request = input({ budget: 20, guests: 8 });
  const result = planner.composeMenus(recipes, request);
  assert.equal(result.menus.length, 0);
  assert.match(result.limitation, /above your .* budget/i);
});

test("reports contradictory cuisine requests instead of ignoring either", () => {
  const result = planner.composeMenus(recipes, input({ cuisine: "Greek", recipeRequest: "Italian pasta" }));
  assert.equal(result.menus.length, 0);
  assert.match(result.limitation, /conflicts/i);
});

test("rejects an AI menu that violates the user's hard dietary constraint", () => {
  const request = input({ courseCount: 1, recipeRequest: "No meat involved" });
  const ids = ["classicBurger"];
  const validation = planner.validateMenu(recipes, ids, request);
  assert.equal(validation.valid, false);
  assert.ok(validation.problems.some((problem) => /contains meat/i.test(problem)));
});

test("builds a URL for ordered missing ingredients on efood Market", () => {
  const url = planner.generateEfoodCheckoutUrl(["sourdough", "ripe tomatoes", "ricotta"]);
  assert.match(url, /^https:\/\/www\.efood\.com\//i);
  assert.match(url, /sourdough/i);
  assert.match(url, /ripe\+tomatoes/i);
  assert.match(url, /ricotta/i);
  assert.match(url, /q=|query=|search=/i);
});
