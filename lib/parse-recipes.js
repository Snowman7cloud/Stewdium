// Split a big block of pasted text into separate recipes.
// Used by "Paste many recipes" on My Board.
//
// How it finds the breaks between recipes:
//   1. If the text has separator lines (---, ===, ***, ___) it splits on those.
//   2. Otherwise every "Ingredients" heading starts a new recipe, and the
//      recipe's title is the short line just above it (after a blank line).
//   3. A single recipe with no headings at all still works.
// The page always shows a preview so the person can fix titles before saving.

import { parseIngredientLine } from './parse-ingredients';

const SEPARATOR = /^\s*([-=*_~#])(\s*\1){2,}\s*$/;
const ING_HEAD = /^(ingredients?|what you'?ll need|you'?ll need)$/i;
const STEP_HEAD = /^(instructions?|directions?|steps?|method|preparation|how to make( it)?)$/i;
const NOTE_HEAD = /^(notes?|tips?|cook'?s notes?)$/i;
const NUMBERED = /^\s*(step\s*)?\d+\s*[.):]\s+/i;
const QTY_START = /^\s*[-•*]?\s*(\d|[½⅓⅔¼¾⅛⅜⅝⅞]|a\s+(pinch|dash|handful)|pinch)/i;

const CATEGORY_WORDS = [
  ['Breakfast', /pancake|waffle|oatmeal|granola|omelet|frittata|french toast|breakfast|smoothie bowl/i],
  ['Dessert', /cookie|\bcakes?\b|cupcake|cheesecake|brownie|\bpie\b|pudding|ice cream|fudge|frosting|\btart\b|cobbler|crumble|dessert/i],
  ['Baking', /bread|muffin|scone|biscuit|loaf|roll(s)?\b|focaccia|bagel|croissant/i],
  ['Drinks', /smoothie|lemonade|latte|tea\b|cocktail|punch\b|shake\b|drink/i],
  ['Sauce', /sauce|dressing|salsa|pesto|gravy|marinade|dip\b|aioli|vinaigrette/i],
  ['Sides', /side|slaw|mashed|roasted (veg|potato|carrot|broccoli)|rice pilaf|salad/i],
  ['Snack', /snack|bites|popcorn|trail mix|energy ball|chips/i],
  ['Lunch', /sandwich|wrap\b|panini|quesadilla|soup/i],
];

// "## Ingredients:", "**Ingredients**" -> "Ingredients"
function bare(line) {
  return line.trim().replace(/^#+\s*/, '').replace(/^\*+|\*+$/g, '').replace(/^_+|_+$/g, '').replace(/:\s*$/, '').trim();
}
const isIngHead = l => ING_HEAD.test(bare(l));
const isStepHead = l => STEP_HEAD.test(bare(l));
const isNoteHead = l => NOTE_HEAD.test(bare(l));
const isHead = l => isIngHead(l) || isStepHead(l) || isNoteHead(l);

const META = /^(serves|servings?|yield|yields|makes|prep(\s*time)?|cook(\s*time)?|bake(\s*time)?|total(\s*time)?|time|category|course)\b\s*:?/i;
const isMeta = l => META.test(bare(l));

// A title is short, not a sentence, not a list item, not a heading or meta line.
function looksLikeTitle(l) {
  const t = bare(l);
  if (!t || t.length > 70) return false;
  if (isHead(l) || isMeta(l) || NUMBERED.test(l) || QTY_START.test(l)) return false;
  if (/[.!?]$/.test(t)) return false;
  return true;
}

// Pull "Serves 4 | Prep 10 min | Cook 1 hr" style info out of a line.
function readMeta(line, out) {
  const parts = bare(line).split(/\s*[|•·]\s*|\s{2,}|;\s*/);
  let used = false;
  for (const p of parts) {
    let m;
    if ((m = p.match(/^(serves|servings?|yields?|makes)\s*:?\s*(\d+)/i))) { out.servings = parseInt(m[2]); used = true; }
    else if ((m = p.match(/^prep(\s*time)?\s*:?\s*(.+)$/i))) { out.prepTime = m[2].trim(); used = true; }
    else if ((m = p.match(/^(cook|bake)(\s*time)?\s*:?\s*(.+)$/i))) { out.cookTime = m[3].trim(); used = true; }
    else if (/^total(\s*time)?\b/i.test(p)) { used = true; }
    else if ((m = p.match(/^(category|course)\s*:?\s*(.+)$/i))) { out.category = m[2].trim(); used = true; }
  }
  return used;
}

function guessCategory(title, explicit) {
  if (explicit) {
    const hit = ['Breakfast', 'Lunch', 'Dinner', 'Baking', 'Dessert', 'Snack', 'Drinks', 'Sides', 'Sauce']
      .find(c => c.toLowerCase() === explicit.toLowerCase().replace(/s$/, '') || c.toLowerCase() === explicit.toLowerCase());
    if (hit) return hit;
  }
  for (const [cat, re] of CATEGORY_WORDS) if (re.test(title)) return cat;
  return 'Dinner';
}

function cleanStep(l) {
  return l.trim().replace(/^[-•*]\s*/, '').replace(NUMBERED, '').trim();
}

// Turn the lines of ONE recipe into a recipe object.
export function parseOneRecipe(lines) {
  const ls = lines.map(l => l.replace(/\s+$/, ''));
  const r = { title: '', description: '', servings: 4, prepTime: '', cookTime: '', category: '', ingredients: [], steps: [], notes: '' };
  let i = 0;
  while (i < ls.length && !ls[i].trim()) i++;
  if (i < ls.length && !isHead(ls[i])) {
    r.title = bare(ls[i]).replace(/^(recipe\s*\d*|title)\s*[:.-]\s*/i, '').trim();
    i++;
  }

  const hasHeads = ls.some(isIngHead) || ls.some(isStepHead);
  let section = 'pre';
  const desc = [], notes = [];
  for (; i < ls.length; i++) {
    const line = ls[i];
    if (!line.trim()) continue;
    if (isIngHead(line)) { section = 'ing'; continue; }
    if (isStepHead(line)) { section = 'step'; continue; }
    if (isNoteHead(line)) { section = 'note'; continue; }

    if (!hasHeads && section === 'pre') {
      // No headings: guess line by line.
      if (isMeta(line) && readMeta(line, r)) continue;
      if (NUMBERED.test(line)) { r.steps.push(cleanStep(line)); continue; }
      if (QTY_START.test(line)) { const ing = parseIngredientLine(line); if (ing) r.ingredients.push(ing); continue; }
      if (r.ingredients.length || r.steps.length) r.steps.push(cleanStep(line));
      else desc.push(line.trim());
      continue;
    }

    if (section === 'pre') {
      if (isMeta(line) && readMeta(line, r)) continue;
      desc.push(line.trim());
    } else if (section === 'ing') {
      // "For the frosting:" sub-headings are not ingredients.
      if (/:$/.test(line.trim()) && !QTY_START.test(line)) continue;
      if (isMeta(line) && readMeta(line, r)) continue;
      const ing = parseIngredientLine(line);
      if (ing) r.ingredients.push(ing);
    } else if (section === 'step') {
      const s = cleanStep(line);
      if (s) r.steps.push(s);
    } else {
      notes.push(line.trim().replace(/^[-•*]\s*/, ''));
    }
  }
  r.description = desc.join(' ');
  r.notes = notes.join('\n');
  r.category = guessCategory(r.title, r.category);
  return r;
}

// Find where each recipe starts when there are no separator lines.
function splitByHeadings(lines) {
  const ingIdx = [];
  lines.forEach((l, k) => { if (isIngHead(l)) ingIdx.push(k); });
  if (ingIdx.length < 2) return [lines];

  const starts = [0];
  for (let n = 1; n < ingIdx.length; n++) {
    const prevIng = ingIdx[n - 1];
    const hi = ingIdx[n];
    let start = -1;
    // Walk up from this Ingredients heading. Skip meta and description lines
    // until we find a short title line that sits after a blank line.
    for (let k = hi - 1; k > prevIng; k--) {
      const l = lines[k];
      if (!l.trim()) continue;
      if (isStepHead(l) || isNoteHead(l)) break;
      const blankAbove = k === 0 || !lines[k - 1].trim() || SEPARATOR.test(lines[k - 1]);
      if (looksLikeTitle(l) && blankAbove) { start = k; break; }
    }
    // Fallback: first non-blank line after the last blank line above the heading.
    if (start === -1) {
      start = hi;
      for (let k = hi - 1; k > prevIng; k--) {
        if (!lines[k].trim()) break;
        start = k;
      }
    }
    starts.push(start);
  }
  return starts.map((s, n) => lines.slice(s, n + 1 < starts.length ? starts[n + 1] : lines.length));
}

export function parseRecipeBatch(text) {
  if (!text || !text.trim()) return [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');

  let chunks;
  if (lines.some(l => SEPARATOR.test(l))) {
    chunks = [];
    let cur = [];
    for (const l of lines) {
      if (SEPARATOR.test(l)) { chunks.push(cur); cur = []; } else cur.push(l);
    }
    chunks.push(cur);
    // A chunk can still hold several recipes if someone forgot a separator.
    chunks = chunks.flatMap(splitByHeadings);
  } else {
    chunks = splitByHeadings(lines);
  }

  return chunks
    .filter(c => c.some(l => l.trim()))
    .map(parseOneRecipe)
    .filter(r => r.title || r.ingredients.length || r.steps.length)
    .map(r => ({ ...r, title: r.title || 'Untitled recipe' }));
}
