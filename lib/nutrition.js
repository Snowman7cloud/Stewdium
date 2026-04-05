// Nutrition data per standard unit (USDA FoodData Central reference values)
// All values are per the amount specified in "per" field
// cal = calories, p = protein(g), c = carbs(g), f = fat(g), fiber = fiber(g)

const NUTRITION_DB = {
  // ─── PROTEINS ───
  "chicken breast": { per: "oz", cal: 46, p: 8.8, c: 0, f: 1 },
  "chicken thigh": { per: "oz", cal: 55, p: 7.2, c: 0, f: 2.7 },
  "chicken": { per: "oz", cal: 50, p: 8, c: 0, f: 1.8 },
  "ground beef": { per: "oz", cal: 72, p: 6.4, c: 0, f: 5 },
  "ground turkey": { per: "oz", cal: 50, p: 7.5, c: 0, f: 2 },
  "beef": { per: "oz", cal: 68, p: 7, c: 0, f: 4.2 },
  "steak": { per: "oz", cal: 68, p: 7, c: 0, f: 4.2 },
  "pork": { per: "oz", cal: 60, p: 7, c: 0, f: 3.4 },
  "pork chop": { per: "oz", cal: 55, p: 7.8, c: 0, f: 2.4 },
  "bacon": { per: "slice", cal: 43, p: 3, c: 0.1, f: 3.3 },
  "sausage": { per: "oz", cal: 85, p: 4.5, c: 0.5, f: 7.2 },
  "salmon": { per: "oz", cal: 52, p: 7, c: 0, f: 2.3 },
  "tuna": { per: "oz", cal: 36, p: 8.2, c: 0, f: 0.3 },
  "shrimp": { per: "oz", cal: 24, p: 5.7, c: 0, f: 0.3 },
  "tilapia": { per: "oz", cal: 36, p: 7.5, c: 0, f: 0.6 },
  "cod": { per: "oz", cal: 26, p: 5.7, c: 0, f: 0.2 },
  "tofu": { per: "oz", cal: 22, p: 2.3, c: 0.5, f: 1.3 },
  "tempeh": { per: "oz", cal: 54, p: 5.5, c: 2.7, f: 3.1 },
  "egg": { per: "whole", cal: 72, p: 6.3, c: 0.4, f: 4.8 },
  "egg white": { per: "whole", cal: 17, p: 3.6, c: 0.2, f: 0.1 },

  // ─── DAIRY ───
  "milk": { per: "cup", cal: 149, p: 8, c: 12, f: 8 },
  "whole milk": { per: "cup", cal: 149, p: 8, c: 12, f: 8 },
  "skim milk": { per: "cup", cal: 83, p: 8.3, c: 12.2, f: 0.2 },
  "heavy cream": { per: "tbsp", cal: 51, p: 0.4, c: 0.4, f: 5.4 },
  "sour cream": { per: "tbsp", cal: 23, p: 0.3, c: 0.5, f: 2.4 },
  "cream cheese": { per: "oz", cal: 99, p: 1.7, c: 1.6, f: 9.8 },
  "butter": { per: "tbsp", cal: 102, p: 0.1, c: 0, f: 11.5 },
  "cheddar cheese": { per: "oz", cal: 113, p: 7, c: 0.4, f: 9.3 },
  "mozzarella": { per: "oz", cal: 85, p: 6.3, c: 0.7, f: 6.3 },
  "parmesan": { per: "tbsp", cal: 21, p: 1.4, c: 0.2, f: 1.4 },
  "feta cheese": { per: "oz", cal: 75, p: 4, c: 1.2, f: 6 },
  "cheese": { per: "oz", cal: 113, p: 7, c: 0.4, f: 9.3 },
  "yogurt": { per: "cup", cal: 149, p: 8.5, c: 11.4, f: 8 },
  "greek yogurt": { per: "cup", cal: 100, p: 17, c: 6, f: 0.7 },

  // ─── GRAINS & STARCHES ───
  "all-purpose flour": { per: "cup", cal: 455, p: 12.9, c: 95.4, f: 1.2 },
  "flour": { per: "cup", cal: 455, p: 12.9, c: 95.4, f: 1.2 },
  "whole wheat flour": { per: "cup", cal: 407, p: 16.4, c: 86.4, f: 2.2 },
  "bread": { per: "slice", cal: 75, p: 2.6, c: 13.8, f: 0.9 },
  "rice": { per: "cup", cal: 206, p: 4.3, c: 44.5, f: 0.4 },
  "brown rice": { per: "cup", cal: 216, p: 5, c: 44.8, f: 1.8 },
  "pasta": { per: "cup", cal: 220, p: 8.1, c: 43.2, f: 1.3 },
  "spaghetti": { per: "cup", cal: 220, p: 8.1, c: 43.2, f: 1.3 },
  "oats": { per: "cup", cal: 307, p: 10.7, c: 54.8, f: 5.3 },
  "quinoa": { per: "cup", cal: 222, p: 8.1, c: 39.4, f: 3.6 },
  "cornstarch": { per: "tbsp", cal: 30, p: 0, c: 7.3, f: 0 },
  "tortilla": { per: "piece", cal: 120, p: 3, c: 20, f: 3 },
  "bread crumbs": { per: "cup", cal: 427, p: 13.5, c: 78, f: 5.8 },
  "potato": { per: "whole", cal: 161, p: 4.3, c: 36.6, f: 0.2 },
  "sweet potato": { per: "whole", cal: 103, p: 2.3, c: 24, f: 0.1 },
  "baby potatoes": { per: "cup", cal: 120, p: 3, c: 27, f: 0.1 },

  // ─── FATS & OILS ───
  "olive oil": { per: "tbsp", cal: 119, p: 0, c: 0, f: 13.5 },
  "vegetable oil": { per: "tbsp", cal: 120, p: 0, c: 0, f: 13.6 },
  "coconut oil": { per: "tbsp", cal: 121, p: 0, c: 0, f: 13.5 },
  "sesame oil": { per: "tbsp", cal: 120, p: 0, c: 0, f: 13.6 },
  "avocado oil": { per: "tbsp", cal: 124, p: 0, c: 0, f: 14 },
  "mayonnaise": { per: "tbsp", cal: 94, p: 0.1, c: 0.1, f: 10.3 },

  // ─── VEGETABLES ───
  "onion": { per: "whole", cal: 44, p: 1.2, c: 10.3, f: 0.1 },
  "garlic": { per: "clove", cal: 4, p: 0.2, c: 1, f: 0 },
  "tomato": { per: "whole", cal: 22, p: 1.1, c: 4.8, f: 0.2 },
  "cherry tomatoes": { per: "cup", cal: 27, p: 1.3, c: 5.8, f: 0.3 },
  "crushed tomatoes": { per: "cup", cal: 39, p: 2, c: 8.8, f: 0.3 },
  "tomato sauce": { per: "cup", cal: 59, p: 2.6, c: 12, f: 0.5 },
  "tomato paste": { per: "tbsp", cal: 13, p: 0.7, c: 3, f: 0.1 },
  "bell pepper": { per: "whole", cal: 24, p: 1, c: 4.6, f: 0.2 },
  "carrot": { per: "whole", cal: 25, p: 0.6, c: 5.8, f: 0.1 },
  "celery": { per: "whole", cal: 6, p: 0.3, c: 1.2, f: 0.1 },
  "broccoli": { per: "cup", cal: 31, p: 2.6, c: 6, f: 0.3 },
  "spinach": { per: "cup", cal: 7, p: 0.9, c: 1.1, f: 0.1 },
  "kale": { per: "cup", cal: 7, p: 0.6, c: 0.9, f: 0.3 },
  "mixed greens": { per: "cup", cal: 9, p: 0.8, c: 1.5, f: 0.1 },
  "lettuce": { per: "cup", cal: 5, p: 0.5, c: 1, f: 0.1 },
  "cucumber": { per: "whole", cal: 45, p: 2, c: 11, f: 0.3 },
  "zucchini": { per: "whole", cal: 33, p: 2.4, c: 6.1, f: 0.6 },
  "mushroom": { per: "cup", cal: 15, p: 2.2, c: 2.3, f: 0.2 },
  "mushrooms": { per: "cup", cal: 15, p: 2.2, c: 2.3, f: 0.2 },
  "corn": { per: "cup", cal: 132, p: 5, c: 29.3, f: 1.8 },
  "peas": { per: "cup", cal: 118, p: 7.9, c: 21, f: 0.6 },
  "green beans": { per: "cup", cal: 31, p: 1.8, c: 7, f: 0.1 },
  "asparagus": { per: "cup", cal: 27, p: 2.9, c: 5.2, f: 0.2 },
  "cauliflower": { per: "cup", cal: 25, p: 1.9, c: 5.3, f: 0.3 },
  "cabbage": { per: "cup", cal: 22, p: 1.1, c: 5.2, f: 0.1 },
  "red onion": { per: "whole", cal: 44, p: 1.2, c: 10.3, f: 0.1 },
  "avocado": { per: "whole", cal: 234, p: 2.9, c: 12.5, f: 21.4 },
  "jalapeño": { per: "whole", cal: 4, p: 0.2, c: 0.5, f: 0.1 },

  // ─── FRUITS ───
  "banana": { per: "whole", cal: 105, p: 1.3, c: 27, f: 0.4 },
  "apple": { per: "whole", cal: 95, p: 0.5, c: 25.1, f: 0.3 },
  "lemon": { per: "whole", cal: 17, p: 0.6, c: 5.4, f: 0.2 },
  "lemon juice": { per: "tbsp", cal: 3, p: 0.1, c: 1, f: 0 },
  "lime": { per: "whole", cal: 20, p: 0.5, c: 7.1, f: 0.1 },
  "orange": { per: "whole", cal: 62, p: 1.2, c: 15.4, f: 0.2 },
  "strawberries": { per: "cup", cal: 49, p: 1, c: 11.7, f: 0.5 },
  "blueberries": { per: "cup", cal: 84, p: 1.1, c: 21.4, f: 0.5 },
  "fresh blueberries": { per: "cup", cal: 84, p: 1.1, c: 21.4, f: 0.5 },
  "raspberries": { per: "cup", cal: 64, p: 1.5, c: 14.7, f: 0.8 },

  // ─── LEGUMES & NUTS ───
  "black beans": { per: "cup", cal: 227, p: 15.2, c: 40.8, f: 0.9 },
  "chickpeas": { per: "cup", cal: 269, p: 14.5, c: 45, f: 4.2 },
  "lentils": { per: "cup", cal: 230, p: 17.9, c: 39.9, f: 0.8 },
  "kidney beans": { per: "cup", cal: 225, p: 15.3, c: 40.4, f: 0.9 },
  "peanut butter": { per: "tbsp", cal: 94, p: 4, c: 3.6, f: 8 },
  "almond butter": { per: "tbsp", cal: 98, p: 3.4, c: 3, f: 8.9 },
  "almonds": { per: "oz", cal: 164, p: 6, c: 6.1, f: 14.2 },
  "walnuts": { per: "oz", cal: 185, p: 4.3, c: 3.9, f: 18.5 },
  "pecans": { per: "oz", cal: 196, p: 2.6, c: 3.9, f: 20.4 },
  "cashews": { per: "oz", cal: 157, p: 5.2, c: 8.6, f: 12.4 },
  "pine nuts": { per: "oz", cal: 191, p: 3.9, c: 3.7, f: 19.4 },

  // ─── SWEETENERS ───
  "sugar": { per: "cup", cal: 774, p: 0, c: 200, f: 0 },
  "brown sugar": { per: "cup", cal: 836, p: 0, c: 216, f: 0 },
  "honey": { per: "tbsp", cal: 64, p: 0.1, c: 17.3, f: 0 },
  "maple syrup": { per: "tbsp", cal: 52, p: 0, c: 13.4, f: 0 },
  "powdered sugar": { per: "cup", cal: 467, p: 0, c: 119.5, f: 0 },
  "vanilla extract": { per: "tsp", cal: 12, p: 0, c: 0.5, f: 0 },

  // ─── CONDIMENTS & SAUCES ───
  "soy sauce": { per: "tbsp", cal: 9, p: 0.9, c: 0.9, f: 0 },
  "fish sauce": { per: "tbsp", cal: 6, p: 0.9, c: 0.7, f: 0 },
  "worcestershire": { per: "tbsp", cal: 13, p: 0, c: 3.3, f: 0 },
  "hot sauce": { per: "tsp", cal: 1, p: 0.1, c: 0, f: 0 },
  "mustard": { per: "tsp", cal: 3, p: 0.2, c: 0.3, f: 0.2 },
  "dijon mustard": { per: "tsp", cal: 5, p: 0.3, c: 0.3, f: 0.3 },
  "ketchup": { per: "tbsp", cal: 17, p: 0.2, c: 4.8, f: 0 },
  "vinegar": { per: "tbsp", cal: 3, p: 0, c: 0.1, f: 0 },
  "balsamic vinegar": { per: "tbsp", cal: 14, p: 0.1, c: 2.7, f: 0 },
  "sriracha": { per: "tsp", cal: 5, p: 0.1, c: 1, f: 0.1 },

  // ─── BAKING ───
  "baking powder": { per: "tsp", cal: 2, p: 0, c: 1.3, f: 0 },
  "baking soda": { per: "tsp", cal: 0, p: 0, c: 0, f: 0 },
  "cocoa powder": { per: "tbsp", cal: 12, p: 1, c: 3.1, f: 0.7 },
  "chocolate chips": { per: "cup", cal: 805, p: 8, c: 100, f: 50 },
  "yeast": { per: "tsp", cal: 8, p: 1, c: 1, f: 0 },
  "gelatin": { per: "tbsp", cal: 23, p: 6, c: 0, f: 0 },

  // ─── SPICES (minimal calories but included for completeness) ───
  "salt": { per: "tsp", cal: 0, p: 0, c: 0, f: 0 },
  "black pepper": { per: "tsp", cal: 6, p: 0.2, c: 1.5, f: 0.1 },
  "cinnamon": { per: "tsp", cal: 6, p: 0.1, c: 2.1, f: 0 },
  "paprika": { per: "tsp", cal: 6, p: 0.3, c: 1.2, f: 0.3 },
  "cumin": { per: "tsp", cal: 8, p: 0.4, c: 0.9, f: 0.5 },
  "chili powder": { per: "tsp", cal: 8, p: 0.3, c: 1.4, f: 0.4 },
  "oregano": { per: "tsp", cal: 3, p: 0.1, c: 0.7, f: 0 },
  "basil": { per: "tbsp", cal: 1, p: 0.1, c: 0.1, f: 0 },
  "fresh basil": { per: "cup", cal: 2, p: 0.3, c: 0.2, f: 0 },
  "thyme": { per: "tsp", cal: 3, p: 0.1, c: 0.6, f: 0.1 },
  "fresh thyme": { per: "tbsp", cal: 1, p: 0.1, c: 0.2, f: 0 },
  "rosemary": { per: "tsp", cal: 2, p: 0, c: 0.4, f: 0.1 },
  "fresh rosemary": { per: "tbsp", cal: 2, p: 0, c: 0.3, f: 0.1 },
  "ginger": { per: "tsp", cal: 2, p: 0, c: 0.4, f: 0 },
  "turmeric": { per: "tsp", cal: 8, p: 0.3, c: 1.4, f: 0.2 },
  "nutmeg": { per: "tsp", cal: 12, p: 0.1, c: 1.1, f: 0.8 },
  "cayenne": { per: "tsp", cal: 6, p: 0.2, c: 1, f: 0.3 },
  "red pepper flakes": { per: "tsp", cal: 6, p: 0.2, c: 1, f: 0.3 },
  "sesame seeds": { per: "tbsp", cal: 52, p: 1.6, c: 2.1, f: 4.5 },
  "italian seasoning": { per: "tsp", cal: 3, p: 0.1, c: 0.7, f: 0.1 },

  // ─── BROTHS & LIQUIDS ───
  "chicken broth": { per: "cup", cal: 12, p: 1.4, c: 0.8, f: 0.4 },
  "vegetable broth": { per: "cup", cal: 12, p: 0.5, c: 2.3, f: 0.2 },
  "beef broth": { per: "cup", cal: 17, p: 2.7, c: 0.1, f: 0.5 },
  "coconut milk": { per: "cup", cal: 445, p: 4.6, c: 6.4, f: 48.2 },
  "wine": { per: "cup", cal: 200, p: 0.1, c: 4.7, f: 0 },
  "white wine": { per: "cup", cal: 194, p: 0.3, c: 4.1, f: 0 },
  "red wine": { per: "cup", cal: 200, p: 0.1, c: 4.7, f: 0 },
  "beer": { per: "cup", cal: 104, p: 0.8, c: 8.5, f: 0 },
};

// Common allergen categories
export const ALLERGEN_LIST = [
  { id: "dairy", label: "Dairy", icon: "🥛" },
  { id: "gluten", label: "Gluten", icon: "🌾" },
  { id: "nuts", label: "Tree Nuts", icon: "🥜" },
  { id: "peanuts", label: "Peanuts", icon: "🥜" },
  { id: "eggs", label: "Eggs", icon: "🥚" },
  { id: "soy", label: "Soy", icon: "🫘" },
  { id: "shellfish", label: "Shellfish", icon: "🦐" },
  { id: "fish", label: "Fish", icon: "🐟" },
  { id: "sesame", label: "Sesame", icon: "🌱" },
  { id: "sulfites", label: "Sulfites", icon: "🍷" },
  { id: "corn", label: "Corn", icon: "🌽" },
  { id: "nightshades", label: "Nightshades", icon: "🍅" },
];

// Diet tags that recipe uploaders can set
export const DIET_TAGS = [
  { id: "gluten-free", label: "Gluten Free" },
  { id: "dairy-free", label: "Dairy Free" },
  { id: "nut-free", label: "Nut Free" },
  { id: "egg-free", label: "Egg Free" },
  { id: "soy-free", label: "Soy Free" },
  { id: "vegan", label: "Vegan" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "keto", label: "Keto" },
  { id: "paleo", label: "Paleo" },
  { id: "low-carb", label: "Low Carb" },
];

// Ingredient-to-allergen mapping for auto-detection
const ALLERGEN_KEYWORDS = {
  dairy: ["milk","cream","butter","cheese","yogurt","cheddar","mozzarella","parmesan","feta","ricotta","whey","casein","ghee","sour cream","cream cheese","ice cream","custard"],
  gluten: ["flour","bread","pasta","spaghetti","noodle","wheat","barley","rye","tortilla","crouton","bread crumbs","panko","couscous","seitan","soy sauce"],
  nuts: ["almond","walnut","pecan","cashew","pistachio","macadamia","hazelnut","pine nut","brazil nut"],
  peanuts: ["peanut"],
  eggs: ["egg","meringue","mayonnaise"],
  soy: ["soy","tofu","tempeh","edamame","miso","soy sauce"],
  shellfish: ["shrimp","crab","lobster","crawfish","prawn","scallop","clam","mussel","oyster"],
  fish: ["salmon","tuna","cod","tilapia","anchovy","sardine","fish sauce","halibut","trout","bass","mahi"],
  sesame: ["sesame","tahini"],
  corn: ["corn","cornstarch","cornmeal","polenta","grits"],
  nightshades: ["tomato","pepper","potato","eggplant","paprika","cayenne","chili"],
};

// Unit conversion to a common base for nutrition lookup
const UNIT_TO_BASE = {
  tsp: { base: "tsp", factor: 1 },
  tbsp: { base: "tbsp", factor: 1 },
  cup: { base: "cup", factor: 1 },
  oz: { base: "oz", factor: 1 },
  lb: { base: "oz", factor: 16 },
  g: { base: "oz", factor: 0.03527 },
  kg: { base: "oz", factor: 35.274 },
  ml: { base: "cup", factor: 0.00423 },
  l: { base: "cup", factor: 4.227 },
  clove: { base: "clove", factor: 1 },
  piece: { base: "piece", factor: 1 },
  slice: { base: "slice", factor: 1 },
  whole: { base: "whole", factor: 1 },
  pinch: { base: "tsp", factor: 0.0625 },
};

// Find best match for an ingredient name
function findIngredient(name) {
  const lower = name.toLowerCase().replace(/,.*$/, "").trim();

  // Exact match
  if (NUTRITION_DB[lower]) return NUTRITION_DB[lower];

  // Try removing common suffixes/prefixes
  const cleaned = lower
    .replace(/\b(fresh|dried|frozen|canned|chopped|diced|minced|sliced|shredded|grated|crushed|melted|softened|room temperature|packed|sifted|cooked|uncooked|raw|ripe|large|medium|small|boneless|skinless|lean|extra-virgin|virgin)\b/g, "")
    .replace(/\s+/g, " ").trim();

  if (NUTRITION_DB[cleaned]) return NUTRITION_DB[cleaned];

  // Partial match
  for (const [key, val] of Object.entries(NUTRITION_DB)) {
    if (cleaned.includes(key) || key.includes(cleaned)) return val;
  }

  return null;
}

// Calculate nutrition for a full recipe
export function calculateNutrition(ingredients, servings = 1) {
  let total = { calories: 0, protein: 0, carbs: 0, fat: 0, matched: 0, total: ingredients.length };

  for (const ing of ingredients) {
    const nutData = findIngredient(ing.name);
    if (!nutData) continue;

    const ingUnit = (ing.unit || "whole").toLowerCase();
    const dataUnit = nutData.per;

    let conversionFactor = 1;
    const ingBase = UNIT_TO_BASE[ingUnit];
    const dataBase = UNIT_TO_BASE[dataUnit];

    if (ingBase && dataBase && ingBase.base === dataBase.base) {
      conversionFactor = ingBase.factor / dataBase.factor;
    } else if (ingUnit === dataUnit) {
      conversionFactor = 1;
    } else {
      // Rough approximations for cross-unit
      const approx = {
        "tsp-tbsp": 1/3, "tbsp-tsp": 3, "tbsp-cup": 1/16, "cup-tbsp": 16,
        "tsp-cup": 1/48, "cup-tsp": 48, "oz-cup": 1/8, "cup-oz": 8,
        "oz-tbsp": 2, "tbsp-oz": 0.5, "oz-lb": 1/16, "lb-oz": 16,
      };
      const key = `${ingUnit}-${dataUnit}`;
      conversionFactor = approx[key] || 1;
    }

    const amount = (ing.amount || 0) * conversionFactor;
    total.calories += nutData.cal * amount;
    total.protein += nutData.p * amount;
    total.carbs += nutData.c * amount;
    total.fat += nutData.f * amount;
    total.matched++;
  }

  // Per serving
  const s = servings || 1;
  return {
    perServing: {
      calories: Math.round(total.calories / s),
      protein: Math.round(total.protein / s * 10) / 10,
      carbs: Math.round(total.carbs / s * 10) / 10,
      fat: Math.round(total.fat / s * 10) / 10,
    },
    total: {
      calories: Math.round(total.calories),
      protein: Math.round(total.protein * 10) / 10,
      carbs: Math.round(total.carbs * 10) / 10,
      fat: Math.round(total.fat * 10) / 10,
    },
    coverage: `${total.matched}/${total.total}`,
    matched: total.matched,
    totalIngredients: total.total,
  };
}

// Detect allergens in ingredients
export function detectAllergens(ingredients) {
  const found = new Set();
  for (const ing of ingredients) {
    const lower = ing.name.toLowerCase();
    for (const [allergen, keywords] of Object.entries(ALLERGEN_KEYWORDS)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          found.add(allergen);
          break;
        }
      }
    }
  }
  return Array.from(found);
}

export default NUTRITION_DB;
