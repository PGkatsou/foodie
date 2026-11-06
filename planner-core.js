(function (root) {
  const courseRoles = {
    1: ["main"],
    2: ["starter", "main"],
    3: ["starter", "main", "dessert"],
    4: ["starter", "main", "side", "dessert"]
  };

  const cuisineGroups = {
    Greek: ["greekChicken", "greekSpinachPie", "ovenChickenPotatoes", "cucumberDillCups", "oliveCake"],
    Italian: ["tomatoToast", "mushroomPasta", "oliveCake", "bolognese", "margheritaPizza", "tiramisu", "sausageRagu", "tomatoGnocchi", "roastedPepperCrostini", "onionThymeTartlets"],
    Asian: ["sesameNoodles", "gingerChickenRice", "crispyTofuRice", "salmonSushiRolls", "misoRamen"],
    American: ["classicBurger", "bbqChickenSandwiches", "chocolateMousse", "appleCrumble", "steakFrites"],
    European: ["carrotSoup", "lemonChicken", "mushroomPasta", "roastSquash", "potatoes", "berryCups", "eggsBenedict", "smokedSalmonRosti", "roastSalmon", "steakFrites", "mushroomWellington", "beefStroganoff", "appleCrumble", "onionThymeTartlets", "poachedPears"],
    Mediterranean: ["tomatoToast", "lemonChicken", "roastSquash", "greenSalad", "potatoes", "oliveCake", "hummusPlate", "lemonHerbCouscous", "greekChicken", "greekSpinachPie", "ovenChickenPotatoes", "roastedPepperCrostini", "cucumberDillCups", "garlicGreenBeans", "spicedCauliflower", "honeyRoastCarrots", "poachedPears", "bakedSalmonFennel"],
    Mexican: ["blackBeanTacos", "chickenFajitas", "sweetCornEnchiladas", "veggieChilli"],
    Indian: ["chickpeaCurry", "redLentilDal", "butterChicken", "paneerTikka"],
    "Street food": ["falafelPitas", "blackBeanTacos", "chickenFajitas"]
  };

  const neutralRecipes = new Set([
    "greenSalad", "potatoes", "berryCups", "chocolateMousse", "appleCrumble",
    "garlicGreenBeans", "honeyRoastCarrots", "spicedCauliflower", "lemonHerbCouscous"
  ]);
  const roleOverrides = {
    tomatoToast: "starter", carrotSoup: "starter", hummusPlate: "starter",
    roastedPepperCrostini: "starter", cucumberDillCups: "starter", onionThymeTartlets: "starter",
    greenSalad: "side", potatoes: "side", lemonHerbCouscous: "side",
    garlicGreenBeans: "side", spicedCauliflower: "side", honeyRoastCarrots: "side",
    oliveCake: "dessert", berryCups: "dessert", chocolateMousse: "dessert",
    tiramisu: "dessert", appleCrumble: "dessert", poachedPears: "dessert",
    avocadoToast: "main", shakshuka: "main", eggsBenedict: "main", smokedSalmonRosti: "main"
  };
  const timingMinutes = {
    tomatoToast: 20, carrotSoup: 40, lemonChicken: 55, mushroomPasta: 30, roastSquash: 45,
    greenSalad: 15, potatoes: 45, oliveCake: 55, berryCups: 20, chocolateMousse: 25,
    avocadoToast: 20, shakshuka: 35, eggsBenedict: 35, smokedSalmonRosti: 40,
    roastSalmon: 40, steakFrites: 60, mushroomWellington: 70, sesameNoodles: 25,
    blackBeanTacos: 25, chickpeaCurry: 35, falafelPitas: 40, classicBurger: 30,
    greekChicken: 60, gingerChickenRice: 35, crispyTofuRice: 35, chickenFajitas: 35,
    sweetCornEnchiladas: 45, redLentilDal: 35, butterChicken: 55, greekSpinachPie: 65,
    ovenChickenPotatoes: 70, bolognese: 50, margheritaPizza: 30, tiramisu: 40,
    salmonSushiRolls: 55, misoRamen: 35, paneerTikka: 40, sausageRagu: 45,
    tomatoGnocchi: 35, bbqChickenSandwiches: 50, hummusPlate: 20, lemonHerbCouscous: 15,
    appleCrumble: 55, beefStroganoff: 35, veggieChilli: 40, bakedSalmonFennel: 40,
    roastedPepperCrostini: 40, cucumberDillCups: 15, onionThymeTartlets: 40,
    garlicGreenBeans: 15, spicedCauliflower: 40, honeyRoastCarrots: 40, poachedPears: 40
  };
  const tagGroups = {
    romantic: ["mushroomWellington", "steakFrites", "roastSalmon", "bakedSalmonFennel", "beefStroganoff", "tiramisu", "chocolateMousse", "poachedPears", "roastedPepperCrostini", "onionThymeTartlets"],
    family: ["tomatoToast", "carrotSoup", "mushroomPasta", "roastSquash", "potatoes", "berryCups", "chickenFajitas", "sweetCornEnchiladas", "classicBurger", "greekSpinachPie", "bolognese", "margheritaPizza", "tomatoGnocchi", "appleCrumble", "veggieChilli", "honeyRoastCarrots"],
    childFriendly: ["tomatoToast", "mushroomPasta", "roastSquash", "potatoes", "berryCups", "classicBurger", "sweetCornEnchiladas", "bolognese", "margheritaPizza", "tomatoGnocchi", "appleCrumble", "honeyRoastCarrots"],
    light: ["greenSalad", "cucumberDillCups", "hummusPlate", "lemonHerbCouscous", "garlicGreenBeans", "spicedCauliflower", "poachedPears", "bakedSalmonFennel", "roastedPepperCrostini"],
    highProtein: ["lemonChicken", "roastSalmon", "steakFrites", "beefStroganoff", "greekChicken", "gingerChickenRice", "crispyTofuRice", "blackBeanTacos", "chickpeaCurry", "falafelPitas", "redLentilDal", "paneerTikka", "veggieChilli", "bakedSalmonFennel", "eggsBenedict", "shakshuka", "salmonSushiRolls"],
    festive: ["roastSalmon", "steakFrites", "mushroomWellington", "beefStroganoff", "bakedSalmonFennel", "tiramisu", "poachedPears", "appleCrumble"],
    quick: ["tomatoToast", "greenSalad", "avocadoToast", "sesameNoodles", "blackBeanTacos", "hummusPlate", "lemonHerbCouscous", "cucumberDillCups", "garlicGreenBeans"]
  };

  const meatTerms = ["beef", "chicken", "pork", "ham", "sausage", "bacon", "turkey", "lamb", "duck", "meat stock"];
  const seafoodTerms = ["salmon", "fish", "tuna", "shrimp", "prawn", "crab", "anchovy", "seafood"];
  const dairyTerms = ["yoghurt", "yogurt", "cheese", "feta", "butter", "cream", "milk", "mascarpone", "ricotta", "paneer", "crème fraîche", "soured cream"];
  const eggTerms = ["egg"];
  const glutenTerms = ["flour", "wheat", "bread", "pita", "muffin", "pastry", "noodle", "pasta", "couscous", "ladyfinger", "shortbread", "soy sauce"];
  const soyTerms = ["soy", "tofu", "miso"];
  const sesameTerms = ["sesame", "tahini"];
  const nutTerms = ["almond", "cashew", "walnut", "hazelnut", "peanut", "pistachio", "pecan"];
  const honeyTerms = ["honey"];
  const ambiguousProducts = ["puff pastry", "pastry", "pizza base", "burger bun", "soft roll", "tortilla", "pita bread", "barbecue sauce", "coleslaw", "fajita seasoning", "curry powder", "dark chocolate", "shortbread", "stock"];
  const cuisineNames = Object.keys(cuisineGroups);
  const stopWords = new Set([
    "a", "an", "and", "are", "but", "can", "could", "dinner", "food", "for", "have", "i", "in", "is", "it", "me", "menu", "my", "of", "or", "please", "prefer", "preferably", "recipe", "recipes", "something", "that", "the", "there", "to", "want", "with", "would"
  ]);

  function hasTerm(text, terms) {
    return terms.some((term) => new RegExp(`(?:^|\\b)${escapeRegExp(term)}(?:$|\\b)`, "i").test(text));
  }

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function normalize(value) {
    return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function parseRequest(input) {
    const occasionText = normalize(input.occasion);
    const requestText = normalize(input.recipeRequest);
    const combined = `${occasionText} ${requestText}`.trim();
    const dietary = {
      vegetarian: false,
      vegan: false,
      meatFree: false,
      seafoodFree: false,
      dairyFree: false,
      eggFree: false,
      glutenFree: false,
      soyFree: false,
      sesameFree: false,
      nutFree: false,
      honeyFree: false
    };
    const fishAllowed = /\b(pescatarian|pescetarian)\b|\b(fish|seafood)\b.{0,24}\b(okay|fine|allowed|include)\b|\b(allow|include)\b.{0,18}\b(fish|seafood)\b/.test(combined);
      const noMeat = /\b(no|without|avoid|exclude|free from)\b.{0,28}\b(meat|chicken|beef|pork|animal products?)\b|\b(meat free|meatless|vegetarian|pescatarian|pescetarian|plant based|vegan)\b/.test(combined);
    const noSeafood = /\b(no|without|avoid|exclude|free from|allergic to)\b.{0,28}\b(seafood|fish|salmon|shrimp|prawns?)\b|\b(seafood free|fish free)\b/.test(combined);
    dietary.vegan = /\b(vegan|plant based|no animal products?|free from animal products?)\b/.test(combined);
    dietary.vegetarian = dietary.vegan || /\b(vegetarian|meatless)\b/.test(combined) || (noMeat && !fishAllowed);
    dietary.meatFree = dietary.vegetarian || noMeat;
    dietary.seafoodFree = dietary.vegan || noSeafood || (dietary.vegetarian && !fishAllowed);
    dietary.dairyFree = dietary.vegan || /\b(no dairy|dairy free|without dairy|lactose intolerant|allergic to dairy|dairy allergy|no milk|milk free)\b/.test(combined);
    dietary.eggFree = dietary.vegan || /\b(no eggs?|egg free|without eggs?|allergic to eggs?)\b/.test(combined);
    dietary.glutenFree = /\b(gluten free|no gluten|without gluten|allergic to gluten|gluten allergy|celiac|coeliac)\b/.test(combined);
    dietary.soyFree = /\b(no soy|soy free|without soy|allergic to soy|soy allergy)\b/.test(combined);
    dietary.sesameFree = /\b(no sesame|sesame free|without sesame|allergic to sesame|sesame allergy)\b/.test(combined);
    dietary.nutFree = /\b(no nuts?|nut free|without nuts?|peanut allergy|allergic to peanuts?|allergic to nuts?|nut allergy)\b/.test(combined);
    dietary.honeyFree = dietary.vegan || /\b(no honey|honey free|without honey)\b/.test(combined);

    const mentionedCuisines = cuisineNames.filter((name) => new RegExp(`\\b${escapeRegExp(normalize(name))}\\b`).test(combined));
    const selectedCuisine = input.cuisine || "";
    const conflictingCuisines = selectedCuisine ? mentionedCuisines.filter((name) => name !== selectedCuisine) : [];
    const occasion = [];
    if (/\b(anniversary|romantic|date night|candlelight|candlelit|for two)\b/.test(combined)) occasion.push("romantic");
    if (/\b(family|family dinner|family lunch|relatives|reunion)\b/.test(occasionText)) occasion.push("family");
    if (/\b(kid|kids|children|child friendly|little ones)\b/.test(combined)) occasion.push("childFriendly");
    if (/\b(birthday|graduation|celebration|milestone|promotion)\b/.test(combined)) occasion.push("celebration");
    if (/\b(friends|mates|potluck|get together|game night|party|picnic|barbecue|bbq|housewarming|baby shower)\b/.test(occasionText)) occasion.push("social");
    if (/\b(christmas|thanksgiving|easter|festive|holiday|new year)\b/.test(occasionText)) occasion.push("festive");
    if (/\b(brunch|breakfast|late morning)\b/.test(occasionText)) occasion.push("brunch");
    if (/\b(fancy|formal|black tie|gala|elegant|wedding|engagement)\b/.test(combined)) occasion.push("formal");
    if (/\b(summer|summer lunch|hot weather)\b/.test(combined)) occasion.push("summer");

    const preferences = [];
    if (/\b(pasta|noodles|pasta based)\b/.test(requestText)) preferences.push("pasta");
    if (/\b(high protein|protein rich|protein packed)\b/.test(combined)) preferences.push("highProtein");
    if (/\b(light|lighter|refreshing|not too heavy)\b/.test(combined)) preferences.push("light");
    if (/\b(budget|inexpensive|cheap|affordable|without spending too much|low cost)\b/.test(combined)) preferences.push("budgetFriendly");
    if (/\b(fancy|special|elegant|impressive|date night|romantic)\b/.test(combined)) preferences.push("polished");
    if (/\b(quick|easy|simple|weeknight)\b/.test(combined)) preferences.push("quick");
    if (/\b(traditional|classic|authentic)\b/.test(combined)) preferences.push("traditional");
    const restrictedWords = new Set(["vegetarian", "vegan", "meatless", "pescatarian", "pescetarian", "dairy", "gluten", "seafood", "fish", "protein", "based"]);
    if (dietary.meatFree) ["meat", "chicken", "beef", "pork", "ham", "sausage"].forEach((word) => restrictedWords.add(word));
    if (dietary.seafoodFree) ["salmon", "shrimp", "prawn", "tuna"].forEach((word) => restrictedWords.add(word));
    if (dietary.dairyFree) ["milk", "cheese", "cream", "butter", "yoghurt", "yogurt"].forEach((word) => restrictedWords.add(word));
    const freeTextTerms = requestText.split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word) && !restrictedWords.has(word));
    const cuisine = selectedCuisine || mentionedCuisines[0] || "";

    return {
      occasion,
      dietary,
      preferences: [...new Set(preferences)],
      cuisine,
      selectedCuisine,
      conflictingCuisines,
      freeTextTerms: [...new Set(freeTextTerms)],
      guests: Math.max(1, Number(input.guests) || 1),
      budget: Math.max(0, Number(input.budget) || 0),
      courseCount: Math.max(1, Math.min(4, Number(input.courseCount) || 4)),
      occasionText: String(input.occasion || "").trim(),
      recipeRequest: String(input.recipeRequest || "").trim()
    };
  }

  function recipeRole(recipe, id) {
    if (roleOverrides[id]) return roleOverrides[id];
    const course = normalize(recipe.course);
    if (course.includes("first things") || course.includes("little something")) return "starter";
    if (course.includes("side")) return "side";
    if (course.includes("sweet finish")) return "dessert";
    if (course.includes("brunch favourite")) return "starter";
    return "main";
  }

  function recipeCuisines(id) {
    return cuisineNames.filter((cuisine) => cuisineGroups[cuisine].includes(id));
  }

  function ingredientFlags(name) {
    const value = normalize(name);
    const matches = (terms) => terms.some((term) => value.includes(normalize(term)));
    return {
      meat: matches(meatTerms),
      seafood: matches(seafoodTerms),
      dairy: matches(dairyTerms),
      egg: matches(eggTerms),
      gluten: matches(glutenTerms),
      soy: matches(soyTerms),
      sesame: matches(sesameTerms),
      nuts: matches(nutTerms),
      honey: matches(honeyTerms),
      ambiguous: matches(ambiguousProducts)
    };
  }

  function recipeFacts(recipe, id) {
    const ingredients = recipe.ingredients.map((ingredient) => ingredient[2]);
    const flags = ingredients.map(ingredientFlags);
    const tags = [];
    for (const [tag, ids] of Object.entries(tagGroups)) if (ids.includes(id)) tags.push(tag);
    const role = recipeRole(recipe, id);
    if (role === "main" && flags.some((item) => item.meat || item.seafood || item.egg || /tofu|lentil|bean|chickpea|paneer/i.test(ingredients.join(" ")))) tags.push("highProtein");
    if (neutralRecipes.has(id)) tags.push("neutralCourse");
    return {
      id,
      role,
      cuisines: recipeCuisines(id),
      tags: [...new Set(tags)],
      prepMinutes: timingMinutes[id] || 45,
      ingredients,
      dietary: {
        meat: flags.some((item) => item.meat),
        seafood: flags.some((item) => item.seafood),
        dairy: flags.some((item) => item.dairy),
        egg: flags.some((item) => item.egg),
        gluten: flags.some((item) => item.gluten),
        soy: flags.some((item) => item.soy),
        sesame: flags.some((item) => item.sesame),
        nuts: flags.some((item) => item.nuts),
        honey: flags.some((item) => item.honey),
        ambiguous: flags.some((item) => item.ambiguous)
      },
      allergens: [
        flags.some((item) => item.dairy) && "dairy",
        flags.some((item) => item.egg) && "egg",
        flags.some((item) => item.gluten) && "gluten",
        flags.some((item) => item.soy) && "soy",
        flags.some((item) => item.sesame) && "sesame",
        flags.some((item) => item.nuts) && "tree nuts/peanuts"
      ].filter(Boolean)
    };
  }

  function recipeViolations(recipe, id, intent) {
    return recipeViolationsFromFacts(recipeFacts(recipe, id), intent);
  }

  function recipeViolationsFromFacts(facts, intent) {
    const restrictions = intent.dietary;
    const violations = [];
    if (restrictions.meatFree && facts.dietary.meat) violations.push("contains meat");
    if ((restrictions.seafoodFree || restrictions.vegetarian || restrictions.vegan) && facts.dietary.seafood) violations.push("contains fish or seafood");
    if ((restrictions.vegan || restrictions.dairyFree) && facts.dietary.dairy) violations.push("contains dairy");
    if ((restrictions.vegan || restrictions.eggFree) && facts.dietary.egg) violations.push("contains egg");
    if (restrictions.vegan && facts.dietary.honey) violations.push("contains honey");
    if (restrictions.glutenFree && facts.dietary.gluten) violations.push("contains gluten");
    if (restrictions.soyFree && facts.dietary.soy) violations.push("contains soy");
    if (restrictions.sesameFree && facts.dietary.sesame) violations.push("contains sesame");
    if (restrictions.nutFree && facts.dietary.nuts) violations.push("contains nuts");
    if ((restrictions.dairyFree || restrictions.glutenFree || restrictions.eggFree || restrictions.vegan) && facts.dietary.ambiguous) violations.push("has an ingredient whose packaged formulation is not specified");
    if (intent.cuisine && !facts.cuisines.includes(intent.cuisine) && !(facts.tags.includes("neutralCourse") && facts.role !== "main")) violations.push(`not catalogued as ${intent.cuisine}`);
    return [...new Set(violations)];
  }

  function scaleQuantity(quantity, guests, servings = 4) {
    const amount = quantity * guests / servings;
    if (amount === 0) return "to taste";
    const rounded = amount >= 10 ? Math.round(amount / 5) * 5 : amount >= 2 ? Math.round(amount * 2) / 2 : Math.round(amount * 4) / 4;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }

  function formatIngredient(ingredient, guests, servings = 4) {
    const [quantity, unit, name] = ingredient;
    return `${scaleQuantity(quantity, guests, servings)}${unit ? ` ${unit}` : ""} ${name}`.trim();
  }

  function cuisineCompatible(facts, role, cuisine) {
    if (!cuisine) return true;
    return facts.cuisines.includes(cuisine) || (role !== "main" && facts.tags.includes("neutralCourse"));
  }

  function preferenceScore(facts, recipe, intent) {
    let score = 0;
    for (const preference of intent.preferences) {
      if (preference === "pasta" && /pasta|noodle|gnocchi|tagliatelle|rigatoni|ramen/i.test(`${recipe.name} ${facts.ingredients.join(" ")}`)) score += 5;
      if (preference === "highProtein" && facts.tags.includes("highProtein")) score += 2;
      if (preference === "light" && facts.tags.includes("light")) score += 2;
      if (preference === "budgetFriendly" && recipe.cost <= 5) score += 1.5;
      if (preference === "polished" && facts.tags.includes("romantic")) score += 1.5;
      if (preference === "quick" && facts.tags.includes("quick")) score += 1.5;
      if (preference === "traditional" && facts.cuisines.includes(intent.cuisine)) score += 1;
    }
    for (const term of intent.freeTextTerms) {
      if (`${recipe.name} ${facts.ingredients.join(" ")}`.toLowerCase().includes(term)) score += 1.25;
    }
    for (const signal of intent.occasion) {
      if (signal === "romantic" && facts.tags.includes("romantic")) score += 1.5;
      if (signal === "family" && facts.tags.includes("family")) score += 1.25;
      if (signal === "childFriendly" && facts.tags.includes("childFriendly")) score += 1.5;
      if (signal === "festive" && facts.tags.includes("festive")) score += 1;
      if (signal === "summer" && facts.tags.includes("light")) score += 1;
      if (signal === "brunch" && /brunch/i.test(recipe.course)) score += 3;
      if (signal === "formal" && facts.tags.includes("romantic")) score += 0.75;
    }
    return score;
  }

  function ingredientOverlapPenalty(selection, factsById) {
    const seen = new Map();
    let penalty = 0;
    for (const id of selection) {
      const ingredientNames = factsById.get(id).ingredients.map(normalize).filter((name) => !/^(olive oil|water|lemon|garlic|onion|salt|black pepper)$/.test(name));
      let shared = 0;
      for (const name of ingredientNames) if (seen.has(name)) shared += 1;
      penalty += shared * 0.8;
      for (const name of ingredientNames) seen.set(name, true);
    }
    return penalty;
  }

  function composeMenus(recipes, input, options = {}) {
    const intent = options.intent || parseRequest(input);
    const limit = Math.max(1, Math.min(6, Number(options.limit) || 3));
    if (intent.conflictingCuisines.length) {
      return { menus: [], intent, source: options.source || "local", limitation: `The selected cuisine (${intent.selectedCuisine}) conflicts with the cuisine request (${intent.conflictingCuisines.join(", ")}). Choose one cuisine to continue.` };
    }
    const roles = courseRoles[intent.courseCount] || courseRoles[4];
    const factsById = new Map(Object.entries(recipes).map(([id, recipe]) => [id, recipeFacts(recipe, id)]));
    const pools = roles.map((role) => Object.entries(recipes).filter(([id, recipe]) => {
      const facts = factsById.get(id);
      return facts.role === role && cuisineCompatible(facts, role, intent.cuisine) && recipeViolationsFromFacts(facts, intent).length === 0;
    }).map(([id]) => id));
    const missingRoleIndex = pools.findIndex((pool) => pool.length === 0);
    if (missingRoleIndex !== -1) {
      const missingRole = roles[missingRoleIndex];
      const reason = intent.cuisine ? `The catalog has no ${missingRole} recipes for ${intent.cuisine} that satisfy the dietary requirements.` : `The catalog has no ${missingRole} recipes that satisfy the dietary requirements.`;
      return { menus: [], intent, source: options.source || "local", limitation: `${reason} Try fewer dietary restrictions, another cuisine, or a different number of courses.` };
    }

    const candidates = [];
    const selection = [];
    function visit(roleIndex) {
      if (roleIndex === pools.length) {
        const total = selection.reduce((sum, id) => sum + recipes[id].cost * intent.guests, 0);
        if (total > intent.budget) return;
        let score = selection.reduce((sum, id) => sum + preferenceScore(factsById.get(id), recipes[id], intent), 0);
        score -= ingredientOverlapPenalty(selection, factsById);
        score -= Math.max(0, total / intent.budget - 0.78) * 4;
        if (intent.preferences.includes("budgetFriendly")) score -= total / Math.max(1, intent.budget) * 2;
        candidates.push({ ids: [...selection], total, score });
        return;
      }
      for (const id of pools[roleIndex]) {
        selection.push(id);
        visit(roleIndex + 1);
        selection.pop();
      }
    }
    visit(0);

    if (!candidates.length) {
      const cheapest = pools.reduce((cost, pool) => cost + Math.min(...pool.map((id) => recipes[id].cost * intent.guests)), 0);
      return {
        menus: [], intent, source: options.source || "local",
        limitation: `The lowest estimated complete menu costs ${formatMoney(cheapest)}, above your ${formatMoney(intent.budget)} budget. Increase the budget, reduce guests or choose fewer courses.`
      };
    }

    candidates.sort((left, right) => right.score - left.score || left.total - right.total);
    const chosen = [];
    const usedIds = new Set();
    for (const candidate of candidates) {
      if (chosen.some((menu) => menu.ids.join("|") === candidate.ids.join("|"))) continue;
      const shared = candidate.ids.filter((id) => usedIds.has(id)).length;
      if (chosen.length && shared >= Math.min(roles.length, 2)) continue;
      chosen.push(candidate);
      candidate.ids.forEach((id) => usedIds.add(id));
      if (chosen.length === limit) break;
    }
    return {
      menus: chosen.map((candidate, index) => buildMenu(recipes, candidate.ids, intent, candidate.score, index)),
      intent,
      source: options.source || "local",
      limitation: "",
      estimateNote: "Ingredient costs are catalog estimates per guest in EUR, not live local prices."
    };
  }

  function formatMoney(amount) {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(amount);
  }

  function generateEfoodCheckoutUrl(missingIngredients = []) {
    const items = Array.isArray(missingIngredients)
      ? missingIngredients
          .filter((value) => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

    const cleanItems = [...new Set(items.map((item) => item.replace(/\s+/g, " ").trim()))];
    if (!cleanItems.length) return "https://www.e-food.gr/";

    const query = cleanItems.join(" ");
    return `https://www.e-food.gr/?s=${encodeURIComponent(query)}`;
  }

  function buildMenu(recipes, ids, intent, score, index = 0) {
    const selected = ids.map((id) => {
      const recipe = recipes[id];
      const facts = recipeFacts(recipe, id);
      return {
        id,
        name: recipe.name,
        role: facts.role,
        course: recipe.course,
        image: recipe.image,
        description: `${facts.role[0].toUpperCase()}${facts.role.slice(1)} featuring ${facts.ingredients.slice(0, 3).join(", ")}.`,
        prepMinutes: facts.prepMinutes,
        servings: intent.guests,
        costPerGuest: recipe.cost,
        estimatedCost: recipe.cost * intent.guests,
        ingredients: recipe.ingredients.map((ingredient) => formatIngredient(ingredient, intent.guests, recipe.servings || 4)),
        dietary: facts.dietary,
        allergens: facts.allergens,
        cuisines: facts.cuisines,
        tags: facts.tags
      };
    });
    const total = selected.reduce((sum, recipe) => sum + recipe.estimatedCost, 0);
    const occasion = intent.occasion.includes("romantic") ? "A more polished, candlelit" : intent.occasion.includes("family") ? "A relaxed, family-style" : intent.occasion.includes("festive") ? "A celebratory" : intent.occasion.includes("brunch") ? "A leisurely brunch" : "A balanced";
    const cuisine = intent.cuisine ? `${intent.cuisine} ` : "seasonal ";
    return {
      id: ids.join("-"),
      name: `${cuisine}${occasion.toLowerCase()} menu ${index + 1}`,
      rationale: `${occasion} menu arranged from ${selected.map((item) => item.role).join(", ")}, with estimated costs scaled for ${intent.guests} guests.`,
      courseCount: selected.length,
      totalCost: total,
      costPerGuest: total / intent.guests,
      budget: intent.budget,
      budgetRemaining: intent.budget - total,
      score,
      recipes: selected
    };
  }

  function validateMenu(recipes, ids, input, options = {}) {
    const intent = options.intent || parseRequest(input);
    const problems = [];
    const roles = courseRoles[intent.courseCount] || courseRoles[4];
    if (!Array.isArray(ids) || ids.length !== intent.courseCount) problems.push(`Menu must contain exactly ${intent.courseCount} recipes.`);
    if (Array.isArray(ids) && new Set(ids).size !== ids.length) problems.push("Menu repeats a recipe.");
    if (Array.isArray(ids)) {
      ids.forEach((id, index) => {
        const recipe = recipes[id];
        if (!recipe) {
          problems.push(`Unknown recipe: ${id}.`);
          return;
        }
        const facts = recipeFacts(recipe, id);
        if (facts.role !== roles[index]) problems.push(`${recipe.name} is not in the required ${roles[index]} course position.`);
        problems.push(...recipeViolations(recipe, id, intent).map((reason) => `${recipe.name} ${reason}.`));
      });
    }
    const total = Array.isArray(ids) ? ids.reduce((sum, id) => sum + (recipes[id]?.cost || 0) * intent.guests, 0) : Infinity;
    if (total > intent.budget) problems.push(`Estimated menu cost ${formatMoney(total)} exceeds the ${formatMoney(intent.budget)} budget.`);
    return { valid: problems.length === 0, problems, totalCost: total, intent };
  }

  function mergeAiIntent(localIntent, aiIntent = {}) {
    const dietary = { ...localIntent.dietary };
    const recognized = new Set(["vegetarian", "vegan", "meatFree", "seafoodFree", "dairyFree", "eggFree", "glutenFree", "soyFree", "sesameFree", "nutFree", "honeyFree"]);
    for (const key of recognized) if (aiIntent.dietary?.includes(key)) dietary[key] = true;
    if (dietary.vegetarian) Object.assign(dietary, { meatFree: true, seafoodFree: true });
    if (dietary.vegan) Object.assign(dietary, { vegetarian: true, meatFree: true, seafoodFree: true, dairyFree: true, eggFree: true, honeyFree: true });
    const occasion = [...new Set([...localIntent.occasion, ...(Array.isArray(aiIntent.occasion) ? aiIntent.occasion : [])])];
    const preferences = [...new Set([...localIntent.preferences, ...(Array.isArray(aiIntent.preferences) ? aiIntent.preferences : [])])];
    return { ...localIntent, dietary, occasion, preferences };
  }

  function summarizeCatalog(recipes) {
    return Object.entries(recipes).map(([id, recipe]) => {
      const facts = recipeFacts(recipe, id);
      return {
        id,
        name: recipe.name,
        role: facts.role,
        course: recipe.course,
        cuisines: facts.cuisines,
        ingredients: facts.ingredients,
        dietary: facts.dietary,
        tags: facts.tags,
        estimatedCostPerGuest: recipe.cost,
        estimatedMinutes: facts.prepMinutes
      };
    });
  }

  const api = {
    courseRoles,
    parseRequest,
    recipeFacts,
    recipeViolations,
    composeMenus,
    buildMenu,
    validateMenu,
    mergeAiIntent,
    summarizeCatalog,
    scaleQuantity,
    formatIngredient,
    formatMoney,
    generateEfoodCheckoutUrl
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TablepopPlanner = api;
})(globalThis);
