// Parse a block of pasted ingredient text into structured ingredients
// Keeps fractions as readable strings (1/2 not 0.5)

const UNIT_MAP = {
  tsp:"tsp",teaspoon:"tsp",teaspoons:"tsp",
  tbsp:"tbsp",tablespoon:"tbsp",tablespoons:"tbsp",
  cup:"cup",cups:"cup",c:"cup",
  "fl oz":"oz","fluid ounce":"oz","fluid ounces":"oz",
  ml:"ml",milliliter:"ml",milliliters:"ml",
  l:"l",liter:"l",liters:"l",litre:"l",litres:"l",
  oz:"oz",ounce:"oz",ounces:"oz",
  lb:"lb",lbs:"lb",pound:"lb",pounds:"lb",
  g:"g",gram:"g",grams:"g",
  kg:"kg",kilogram:"kg",kilograms:"kg",
  clove:"clove",cloves:"clove",
  piece:"piece",pieces:"piece",pcs:"piece",
  slice:"slice",slices:"slice",
  whole:"whole",can:"piece",cans:"piece",
  bunch:"piece",bunches:"piece",head:"piece",heads:"piece",
  stalk:"piece",stalks:"piece",sprig:"piece",sprigs:"piece",
  pinch:"pinch",pinches:"pinch",dash:"pinch",dashes:"pinch",
  large:"whole",medium:"whole",small:"whole",
};

// Unicode fraction to readable text
const UNICODE_TO_TEXT = {
  "½":"1/2","⅓":"1/3","⅔":"2/3","¼":"1/4","¾":"3/4",
  "⅛":"1/8","⅜":"3/8","⅝":"5/8","⅞":"7/8",
  "⅕":"1/5","⅖":"2/5","⅗":"3/5","⅘":"4/5",
  "⅙":"1/6","⅚":"5/6",
};

export function parseIngredientLine(line) {
  let text = line.trim();
  if (!text) return null;

  // Strip bullets, dashes, numbered list prefixes
  text = text.replace(/^[\s]*[-•*]\s*/, "").replace(/^\d+\.\s+/, "").trim();
  if (!text) return null;

  // Replace unicode fractions with text fractions
  for (const [uni, txt] of Object.entries(UNICODE_TO_TEXT)) {
    text = text.replace(new RegExp(uni, 'g'), txt);
  }

  // Match amount at start: "2 1/2", "1/4", "3", "3.5"
  const amountPattern = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)\s*/;
  const amountMatch = text.match(amountPattern);

  let amountStr = "1";
  let remaining = text;

  if (amountMatch) {
    amountStr = amountMatch[1].trim();
    remaining = text.slice(amountMatch[0].length).trim();
  }

  // Handle parenthetical like "(14 oz)"
  remaining = remaining.replace(/\([\d.]+\s*(?:oz|lb|g|ml|fl\s*oz)\)/gi, m => m.replace(/[()]/g, ""));

  // Find unit
  let unit = "whole";
  let name = remaining;
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

  // Strip leading "of"
  name = name.replace(/^of\s+/i, "");
  if (!name) { name = text; amountStr = "1"; unit = "whole"; }
  if (!name) return null;

  return { amount: amountStr, unit, name: name.charAt(0).toLowerCase() + name.slice(1) };
}

export function parseIngredientBlock(text) {
  if (!text?.trim()) return [];
  return text.split(/\n/).filter(l => l.trim()).map(parseIngredientLine).filter(Boolean);
}

// Also parse a block of steps (one per line or numbered)
export function parseStepsBlock(text) {
  if (!text?.trim()) return [];
  return text.split(/\n/)
    .map(l => l.trim())
    .filter(l => l)
    .map(l => l.replace(/^\d+[.)]\s*/, "").trim()) // strip "1. " or "1) "
    .filter(l => l);
}
