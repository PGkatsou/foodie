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

test("treats mandatory ingredient exclusions as hard requirements", () => {
  const request = input({
    cuisine: "Italian",
    recipeRequest: "No mushrooms, no onions and no spicy food",
    budget: 200,
    courseCount: 4
  });
  const intent = planner.parseRequest(request);
  assert.ok(intent.excludedIngredients.includes("mushroom") || intent.excludedIngredients.includes("onion"));
  const result = planner.composeMenus(recipes, request);
  assert.ok(result.menus.length > 0, result.limitation);
  assert.ok(result.menus.every((menu) => menu.recipes.every((recipe) => !recipe.ingredients.join(" ").toLowerCase().includes("mushroom") && !recipe.ingredients.join(" ").toLowerCase().includes("onion"))));
});

test("keeps a vegetarian high-protein request in the valid generation path", () => {
  const intent = planner.parseRequest(input({ recipeRequest: "Vegetarian but high in protein" }));
  assert.equal(intent.dietary.vegetarian, true);
  assert.ok(intent.preferences.includes("highProtein"));
  const result = planner.composeMenus(recipes, input({ courseCount: 1, recipeRequest: "Vegetarian but high in protein", budget: 150 }));
  assert.ok(result.menus.length > 0, result.limitation);
});

test("keeps dishes unique across menus returned in the same generation", () => {
  const result = planner.composeMenus(recipes, input({ cuisine: "Italian", budget: 300 }));
  const generatedRecipes = result.menus.flatMap((menu) => menu.recipes);
  const recipeIds = generatedRecipes.map((recipe) => recipe.id);
  const imageIds = generatedRecipes.map((recipe) => recipe.image).filter(Boolean);
  assert.equal(new Set(recipeIds).size, recipeIds.length);
  assert.equal(new Set(result.menus.map((menu) => menu.name)).size, result.menus.length);
  assert.equal(new Set(imageIds).size, imageIds.length);
});

test("creates dish-grounded titles and avoids recent menu titles", () => {
  const request = input({ cuisine: "Italian", courseCount: 1, budget: 300 });
  const first = planner.composeMenus(recipes, request);
  assert.ok(first.menus.length > 1);
  assert.ok(first.menus.every((menu) => menu.name.includes(menu.recipes[0].name)));
  assert.ok(first.menus.every((menu) => !/\bmenu\b/i.test(menu.name)));
  const previousTitles = first.menus.map((menu) => menu.name);
  const next = planner.composeMenus(recipes, { ...request, recentMenuTitles: previousTitles });
  assert.ok(next.menus.length > 0);
  assert.ok(next.menus.every((menu) => !previousTitles.includes(menu.name)));
});

test("excludes previously generated dishes while preserving new valid results", () => {
  const request = input({ cuisine: "Italian", budget: 300 });
  const first = planner.composeMenus(recipes, request);
  const previousRecipes = first.menus[0].recipes.map((recipe) => planner.recipeIdentity(recipes[recipe.id], recipe.id));
  const next = planner.composeMenus(recipes, {
    ...request,
    recentRecipeIds: previousRecipes.map((recipe) => recipe.id),
    recentDishProfiles: previousRecipes
  });
  assert.ok(next.menus.length > 0, next.limitation);
  assert.ok(next.menus.every((menu) => menu.recipes.every((recipe) => !previousRecipes.some((previous) => previous.id === recipe.id))));
});

test("does not reuse recent image IDs when selecting new dishes", () => {
  const request = input({ cuisine: "Italian", budget: 300 });
  const first = planner.composeMenus(recipes, request);
  const previousImages = first.menus.flatMap((menu) => menu.recipes.map((recipe) => recipe.image)).filter(Boolean);
  const next = planner.composeMenus(recipes, { ...request, recentImageIds: previousImages });
  const nextImages = next.menus.flatMap((menu) => menu.recipes.map((recipe) => recipe.image)).filter(Boolean);
  assert.ok(nextImages.every((image) => !previousImages.includes(image)));
});

test("reports when history exhausts all new dishes for the requested course", () => {
  const request = input({ courseCount: 1 });
  const result = planner.composeMenus(recipes, { ...request, recentRecipeIds: Object.keys(recipes) });
  assert.equal(result.menus.length, 0);
  assert.match(result.limitation, /no new main recipes remain/i);
});

test("rejects near-identical dishes with a different catalog ID", () => {
  const request = input({ courseCount: 1 });
  const intent = planner.parseRequest({
    ...request,
    recentDishProfiles: [{
      id: "otherRecipe",
      name: "A slightly renamed dish",
      role: "main",
      ingredients: ["chicken thighs", "lemon", "garlic", "olive oil", "rosemary"]
    }]
  });
  const validation = planner.validateMenu(recipes, ["lemonChicken"], request, { intent });
  assert.equal(validation.valid, false);
  assert.ok(validation.problems.some((problem) => /duplicates a recently generated dish/i.test(problem)));
});

test("rejects an AI menu that violates the user's hard dietary constraint", () => {
  const request = input({ courseCount: 1, recipeRequest: "No meat involved" });
  const ids = ["classicBurger"];
  const validation = planner.validateMenu(recipes, ids, request);
  assert.equal(validation.valid, false);
  assert.ok(validation.problems.some((problem) => /contains meat/i.test(problem)));
});

test("rejects an AI menu that violates an explicit ingredient exclusion", () => {
  const request = input({ courseCount: 1, cuisine: "Italian", recipeRequest: "No mushrooms" });
  const validation = planner.validateMenu(recipes, ["mushroomPasta"], request);
  assert.equal(validation.valid, false);
  assert.ok(validation.problems.some((problem) => /excluded mushroom/i.test(problem)));
});

test("builds a URL for ordered missing ingredients on efood Market", () => {
  const url = planner.generateEfoodCheckoutUrl(["sourdough", "ripe tomatoes", "ricotta"]);
  assert.match(url, /^https:\/\/www\.e-food\.gr\//i);
  assert.match(url, /sourdough/i);
  assert.match(url, /ripe%20tomatoes/i);
  assert.match(url, /ricotta/i);
  assert.match(url, /\?s=/i);
});
