// Parse a block of pasted text into structured ingredients
// Handles: "2 cups flour", "1/2 tsp salt", "3 cloves garlic, minced",
// "1 (14 oz) can tomatoes", "salt and pepper to taste", "2 1/2 tbsp oil"

const UNIT_MAP = {
  // Volume
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  cup: "cup", cups: "cup", c: "cup",
  "fl oz": "oz", "fluid ounce": "oz", "fluid ounces": "oz",
  ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml",
  l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
  quart: "cup", quarts: "cup", qt: "cup",
  pint: "cup", pints: "cup", pt: "cup",
  gallon: "cup", gallons: "cup", gal: "cup",
  // Weight
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  g: "g", gram: "g", grams: "g",
  kg: "kg", kilogram: "kg", kilograms: "kg",
  // Count
  clove: "clove", cloves: "clove",
  piece: "piece", pieces: "piece", pcs: "piece",
  slice: "slice", slices: "slice",
  whole: "whole",
  can: "piece", cans: "piece",
  bunch: "piece", bunches: "piece",
  head: "piece", heads: "piece",
  stalk: "piece", stalks: "piece",
  sprig: "piece", sprigs: "piece",
  // Approximate
  pinch: "pinch", pinches: "pinch",
  dash: "pinch", dashes: "pinch",
  handful: "cup", handfuls: "cup",
  large: "whole", medium: "whole", small: "whole",
};

// Unicode and text fractions
const FRACTION_MAP = {
  "½": 0.5, "⅓": 0.333, "⅔": 0.667,
  "¼": 0.25, "¾": 0.75, "⅛": 0.125,
  "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
  "⅙": 0.167, "⅚": 0.833,
};

function parseFraction(str) {
  // Unicode fraction
  if (FRACTION_MAP[str]) return FRACTION_MAP[str];

  // "1/2", "3/4"
  const fracMatch = str.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) return parseInt(fracMatch[1]) / parseInt(fracMatch[2]);

  // Plain number
  const num = parseFloat(str);
  if (!isNaN(num)) return num;

  return null;
}

function parseAmount(text) {
  const trimmed = text.trim();

  // "2 1/2" or "2 ½"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+\s*\/\s*\d+|[½⅓⅔¼¾⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚])$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const frac = parseFraction(mixedMatch[2]);
    return frac !== null ? whole + frac : whole;
  }

  // Single fraction or number
  return parseFraction(trimmed);
}

export function parseIngredientLine(line) {
  let text = line.trim();
  if (!text) return null;

  // Remove bullet points, dashes, numbers at start (list formatting)
  text = text.replace(/^[\s]*[-•*]\s*/, "");
  text = text.replace(/^\d+\.\s+/, ""); // "1. " numbered list
  text = text.trim();
  if (!text) return null;

  // Try to extract amount from the beginning
  // Pattern: optional amount, optional unit, rest is ingredient name
  const amountPattern = /^(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+\.?\d*\s*[½⅓⅔¼¾⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚]?|[½⅓⅔¼¾⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚])\s*/;

  const amountMatch = text.match(amountPattern);

  let amount = 1;
  let remaining = text;

  if (amountMatch) {
    const parsed = parseAmount(amountMatch[1]);
    if (parsed !== null) {
      amount = parsed;
      remaining = text.slice(amountMatch[0].length).trim();
    }
  }

  // Handle parenthetical amounts like "(14 oz)"
  remaining = remaining.replace(/\([\d.]+\s*(?:oz|lb|g|ml|fl\s*oz)\)/gi, match => {
    return match.replace(/[()]/g, "");
  });

  // Try to find a unit at the start of remaining text
  let unit = "whole";
  let name = remaining;

  // Sort units by length descending so "fluid ounces" matches before "fluid"
  const unitKeys = Object.keys(UNIT_MAP).sort((a, b) => b.length - a.length);

  for (const uKey of unitKeys) {
    const pattern = new RegExp(`^${uKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[.]?\\s+`, "i");
    const unitMatch = remaining.match(pattern);
    if (unitMatch) {
      unit = UNIT_MAP[uKey];
      name = remaining.slice(unitMatch[0].length).trim();
      break;
    }
  }

  // Handle "of" after unit: "2 cups of flour" -> "flour"
  name = name.replace(/^of\s+/i, "");

  // If no amount was found and it's just a plain ingredient
  if (!amountMatch && !name) {
    name = text;
    amount = 1;
    unit = "whole";
  }

  if (!name) return null;

  return {
    amount: Math.round(amount * 1000) / 1000,
    unit,
    name: name.charAt(0).toLowerCase() + name.slice(1),
  };
}

export function parseIngredientBlock(text) {
  if (!text || !text.trim()) return [];

  const lines = text.split(/\n/).filter(l => l.trim());
  const results = [];

  for (const line of lines) {
    const parsed = parseIngredientLine(line);
    if (parsed) results.push(parsed);
  }

  return results;
}
