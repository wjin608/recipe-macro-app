// api/nutrition.js — USDA FoodData Central lookup
// Uses inline nutrients from search results to avoid extra per-food API calls

const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

// USDA nutrient IDs we care about
const NUTRIENT_IDS = {
  cal:     [1008, 2047, 2048],  // Energy (kcal)
  protein: [1003],               // Protein
  carbs:   [1005],               // Carbohydrate
  fat:     [1004],               // Total lipid (fat)
};

// ── Unit → grams ──────────────────────────────────────────────────────────
const TO_GRAMS = {
  g:1, gram:1, grams:1,
  kg:1000,
  oz:28.3495, ounce:28.3495, ounces:28.3495,
  lb:453.592, lbs:453.592, pound:453.592, pounds:453.592,
  cup:240, cups:240,
  tbsp:14.787, tablespoon:14.787, tablespoons:14.787,
  tsp:4.929, teaspoon:4.929, teaspoons:4.929,
  ml:1, milliliter:1, milliliters:1,
  l:1000, liter:1000, liters:1000,
  pinch:0.36, dash:0.6, handful:30,
};

// Countable item weights in grams each
const COUNTABLE = {
  egg:50, eggs:50,
  'whole egg':50, 'whole eggs':50,
  'large egg':57, 'large eggs':57,
  'medium egg':44, 'medium eggs':44,
  'small egg':38, 'small eggs':38,
  'chicken breast':174, 'chicken thigh':130,
  banana:118, apple:182, orange:131,
  lemon:84, lime:67, tomato:123,
  onion:110, shallot:30, potato:213, carrot:61,
  clove:5, cloves:5,
  'bay leaf':0.6, 'bay leaves':0.6,
  'ladyfinger':11, 'ladyfingers':11, 'savoiardi':11,
  cookie:16, cookies:16, biscuit:16, biscuits:16,
  cracker:7, crackers:7,
  'egg yolk':17, 'egg yolks':17,
  'egg white':33, 'egg whites':33,
  stalk:40, stalks:40, sprig:2, sprigs:2,
  strip:15, strips:15, slice:28, piece:50,
  'sundried tomato':5, 'sun-dried tomato':5,
};

// Liquid density g/ml for volume conversions
const LIQUID_DENSITY = {
  'milk':1.03, 'cream':1.01, 'heavy cream':1.01, 'whipping cream':1.01,
  'double cream':1.01, 'sour cream':0.96, 'yogurt':1.04,
  'oil':0.92, 'olive oil':0.92, 'vegetable oil':0.92, 'coconut oil':0.92,
  'butter':0.91, 'honey':1.42, 'maple syrup':1.32,
  'water':1.0, 'broth':1.0, 'stock':1.0,
  'coffee':1.0, 'espresso':1.0, 'juice':1.05,
  'vinegar':1.01, 'soy sauce':1.18,   'coconut milk':1.02,
  'tomato paste':1.07,
  'cream cheese':1.0,
  'tahini':0.95,
};

// Dry ingredient cup weights (grams per cup) — overrides the 240ml water assumption
const DRY_CUP_WEIGHTS = {
  // Flours
  'flour':125, 'all-purpose flour':125, 'bread flour':127,
  'whole wheat flour':120, 'self-raising flour':125,
  'almond flour':96, 'cornstarch':128, 'corn starch':128,
  // Sugars
  'powdered sugar':120, 'icing sugar':120, 'brown sugar':220,
  'granulated sugar':200, 'white sugar':200, 'caster sugar':200, 'sugar':200,
  // Cocoa & chocolate
  'cocoa powder':85, 'cocoa':85,
  // Grains & dry goods
  // Milks - explicit cup weights
  'whole milk':244, 'milk':244, '2% milk':244, 'skim milk':245,
  'almond milk':240, 'oat milk':240, 'soy milk':243, 'buttermilk':245,
  // Grains
  'oats':90, 'rolled oats':90, 'oatmeal':90, 'instant oats':90,
  'quick oats':90, 'steel cut oats':170,
  'breadcrumbs':108, 'bread crumbs':108,
  'rice':185, 'basmati rice':185, 'jasmine rice':185,
  'brown rice':195, 'quinoa':170, 'couscous':173,
  'cornmeal':138, 'polenta':138,
  // Produce (dried/dense)
  'sundried tomato':55, 'sun-dried tomato':55, 'sundried tomatoes':55,
  'sun-dried tomatoes':55, 'raisin':145, 'raisins':145,
  'dried cranberry':145, 'dried cranberries':145,
  // Nuts & seeds
  'almond':143, 'almonds':143, 'walnut':117, 'walnuts':117,
  'pecan':109, 'pecans':109, 'cashew':137, 'cashews':137,
  'peanut':146, 'peanuts':146, 'sesame seed':144, 'chia seed':160,
  // Other dry
  'salt':288, 'parmesan':100, 'shredded cheese':113,
  'peanut butter':258, 'almond butter':258, 'tahini':240,
};

// Ingredient name → specific USDA search term
// Ingredients that correctly have zero (or near-zero) macros
// USDA should return 0 for these — don't let scoring override them
const ZERO_MACRO_INGREDIENTS = new Set([
  'water','salt','kosher salt','sea salt','table salt','baking soda',
  'bicarbonate of soda','bicarbonate','gelatin','unflavored gelatin',
  'black pepper','white pepper','pepper','spices','herbs',
]);


const ALIASES = {
  // Baked goods
  'ladyfinger':'cookies ladyfingers',
  'ladyfingers':'cookies ladyfingers',
  'savoiardi':'cookies ladyfingers',
  'all purpose flour':'wheat flour all-purpose',
  'all-purpose flour':'wheat flour all-purpose',
  'plain flour':'wheat flour all-purpose',
  'bread flour':'wheat flour bread',
  'self raising flour':'wheat flour self-rising',
  'breadcrumbs':'bread crumbs dry',
  'panko':'bread crumbs panko',
  // Dairy
  'mascarpone':'mascarpone',
  'heavy cream':'cream heavy whipping',
  'double cream':'cream heavy whipping',
  'whipping cream':'cream heavy whipping',
  'light cream':'cream light',
  'half and half':'cream half and half',
  'whole milk':'milk whole 3.25%',
  'skim milk':'milk nonfat',
  '2% milk':'milk reduced fat 2% milkfat',
  'butter':'butter without salt',
  'cream cheese':'cream cheese',
  'sour cream':'sour cream',
  'greek yogurt':'yogurt greek plain',
  'greek yoghurt':'yogurt greek plain',
  'parmesan':'cheese parmesan grated',
  'mozzarella':'cheese mozzarella whole milk',
  'cheddar':'cheese cheddar',
  'feta':'cheese feta',
  'ricotta':'cheese ricotta whole milk',
  // Sugars
  'white sugar':'sugars white granulated',
  'granulated sugar':'sugars white granulated',
  'caster sugar':'sugars white granulated',
  'cane sugar':'sugars white granulated',
  'brown sugar':'sugars brown packed',
  'powdered sugar':'sugars powdered confectioners',
  'icing sugar':'sugars powdered confectioners',
  'honey':'honey',
  'maple syrup':'syrups maple',
  // Eggs
  'egg yolk':'egg yolk raw fresh',
  'egg yolks':'egg yolk raw fresh',
  'egg white':'egg white raw fresh',
  'egg whites':'egg white raw fresh',
  // Leavening & baking
  'baking soda':'leavening baking soda',
  'bicarbonate of soda':'leavening baking soda',
  'baking powder':'leavening baking powder',
  'cornstarch':'cornstarch',
  'corn starch':'cornstarch',
  'gelatin':'gelatin dry',
  'vanilla extract':'vanilla extract',
  // Cocoa & chocolate
  'cocoa powder':'cocoa powder unsweetened',
  'dark chocolate':'chocolate dark',
  'milk chocolate':'chocolate milk',
  'white chocolate':'chocolate white',
  // Oils & fats
  'olive oil':'oil olive salad or cooking',
  'vegetable oil':'oil vegetable salad or cooking',
  'coconut oil':'oil coconut',
  'sesame oil':'oil sesame salad or cooking',
  'canola oil':'oil canola',
  'sunflower oil':'oil sunflower',
  // Beverages
  'espresso':'beverages coffee brewed espresso',
  'strong coffee':'beverages coffee brewed',
  'brewed espresso':'beverages coffee brewed espresso',
  // Condiments & sauces
  'soy sauce':'soy sauce',
  'fish sauce':'fish sauce',
  'tomato paste':'tomato paste',
  'tomato puree':'tomato puree',
  'passata':'tomato puree',
  // Broths
  'chicken stock':'soup chicken broth',
  'chicken broth':'chicken broth or bouillon dry ready-to-use',
  'chicken breast':'chicken raw breast boneless',
  'chicken thigh':'chicken broilers fryers thigh meat only raw',
  'turkey':'turkey breast meat only raw',
  'salmon':'fish salmon atlantic raw',
  'tuna':'fish tuna light canned water',
  'shrimp':'crustaceans shrimp mixed species raw',
  'chicken stock':'chicken broth or bouillon ready to serve',
  'beef broth':'soup stock beef home-prepared',
  'beef stock':'soup stock beef home-prepared',
  'vegetable broth':'soup stock vegetable home-prepared',
  'beef stock':'soup beef broth',
  'beef broth':'soup beef broth',
  'vegetable stock':'vegetable broth',
  // Grains & pasta
  'white rice':'rice white long-grain raw',
  'brown rice':'rice brown long-grain',
  'pasta':'pasta dry enriched',
  'rolled oats':'oats rolled old fashioned',
  'oatmeal':'oats rolled old fashioned',
  'instant oatmeal':'cereals oatmeal cooked',
  'quick oats':'oats rolled',
  'steel cut oats':'oats steel cut',
  'quinoa':'quinoa grain raw',
  // Other
  'peanut butter':'peanut butter smooth style without salt',
  'almond butter':'nut butter almond',
  'coconut milk':'coconut milk canned unsweetened',
  'water':'water tap drinking',
  'warm water':'water tap drinking',
  'cold water':'water tap drinking',
  'hot water':'water tap drinking',
  'lukewarm water':'water tap drinking',
  'water':'water tap drinking',
  'warm water':'water tap drinking',
  'cold water':'water tap drinking',
  'lukewarm water':'water tap drinking',
  'banana':'bananas raw',
  'apple':'apples raw',
  'tomato':'tomatoes red ripe raw',
  'onion':'onions raw',
  'garlic clove':'garlic raw',
  'garlic':'garlic raw',
  'lemon juice':'lemon juice raw',
  'lime juice':'lime juice raw',
  'orange juice':'orange juice raw',
  // Eggs
  'egg':'egg whole raw fresh',
  'eggs':'egg whole raw fresh',
  'whole egg':'egg whole raw fresh',
  'whole eggs':'egg whole raw fresh',
  // Sundried tomatoes
  'sundried tomato':'tomatoes sun-dried',
  'sundried tomatoes':'tomatoes sun-dried',
  'sun dried tomato':'tomatoes sun-dried',
  'sun dried tomatoes':'tomatoes sun-dried',
  'sun-dried tomato':'tomatoes sun-dried',
  'sun-dried tomatoes':'tomatoes sun-dried',
  // Flour
  'flour':'wheat flour all-purpose',
};

const STRIP = new Set([
  'fresh','dried','frozen','canned','cooked','raw','whole','chopped','diced',
  'minced','sliced','grated','shredded','peeled','boneless','skinless',
  'unsalted','salted','large','medium','small','extra','organic',
  'softened','melted','beaten','room','temperature','optional',
]);

// Ingredients with known zero macros — skip USDA lookup entirely
const ZERO_MACRO_ITEMS = new Set([
  'water', 'salt', 'kosher salt', 'sea salt', 'table salt',
  'black pepper', 'white pepper', 'pepper',
]);

// ── Amount parsing ────────────────────────────────────────────────────────
function parseAmount(str, itemName) {
  if (!str) return { grams: null, qty: 1, unit: '' };
  let s = str.trim().toLowerCase()
    .replace(/½/g,'0.5').replace(/¼/g,'0.25').replace(/¾/g,'0.75')
    .replace(/⅓/g,'0.333').replace(/⅔/g,'0.667').replace(/⅛/g,'0.125');

  let qty, unit;
  let m;

  if ((m = s.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)/))) {
    qty = parseFloat(m[1]) + parseFloat(m[2])/parseFloat(m[3]);
    unit = m[4].trim().split(/\s/)[0];
  } else if ((m = s.match(/^(\d+)\/(\d+)\s*(.*)/))) {
    qty = parseFloat(m[1])/parseFloat(m[2]);
    unit = m[3].trim().split(/\s/)[0];
  } else if ((m = s.match(/^([\d.]+)\s*[-–]\s*([\d.]+)\s*(.*)/))) {
    qty = (parseFloat(m[1])+parseFloat(m[2]))/2;
    unit = m[3].trim().split(/\s/)[0];
  } else if ((m = s.match(/^([\d.]+)\s*(.*)/))) {
    qty = parseFloat(m[1]);
    unit = m[2].trim().split(/\s/)[0].replace(/[.,]$/,'');
  } else {
    return { grams: null, qty: 1, unit: '' };
  }

  return toGrams(qty, unit, itemName);
}

function toGrams(qty, unit, itemName) {
  const u = (unit||'').toLowerCase().replace(/[.,]$/,'');
  const name = (itemName||'').toLowerCase();

  // Direct weight unit
  const f = TO_GRAMS[u] ?? TO_GRAMS[u.replace(/s$/,'')];
  if (f != null) {
    let grams = qty * f;
    // Apply liquid density for volume units
    const volUnits = new Set(['cup','cups','tbsp','tablespoon','tablespoons','tsp','teaspoon','teaspoons','ml','l','liter','liters']);
    if (volUnits.has(u)) {
      // For cup/tbsp/tsp, check dry ingredient weights first
      // Map common ingredient name variants to their DRY_CUP_WEIGHTS key
      const DRY_SYNONYMS = {
        'oatmeal':'oats', 'instant oatmeal':'oats', 'quick oats':'oats',
        'rolled oat':'oats', 'porridge oats':'oats',
        'all purpose flour':'flour', 'all-purpose flour':'flour',
        'plain flour':'flour', 'bread flour':'flour',
        'self raising flour':'flour', 'whole wheat flour':'flour',
        'ap flour':'flour', 'ap flour':'flour',
        'powdered sugar':'powdered sugar', 'icing sugar':'powdered sugar',
        'confectioners sugar':'powdered sugar',
        'granulated sugar':'granulated sugar', 'caster sugar':'granulated sugar',
        'white sugar':'granulated sugar', 'cane sugar':'granulated sugar',
        'dutch process cocoa':'cocoa powder', 'cocoa':'cocoa powder',
        'unsweetened cocoa':'cocoa powder',
        'whole milk':'milk','2% milk':'milk','skim milk':'milk',
        'low fat milk':'milk','nonfat milk':'milk',
      };
      const resolvedName = DRY_SYNONYMS[name] || name;
      const isDryMatch = (rName, dry) =>
        rName.includes(dry) || (dry === rName);
      const dryEntry = Object.entries(DRY_CUP_WEIGHTS).find(([dry]) => isDryMatch(resolvedName, dry));
      if (dryEntry) {
        const [, gramsPerCup] = dryEntry;
        if (u === 'cup' || u === 'cups') {
          return { grams: qty * gramsPerCup, qty, unit: u };
        }
        if (u === 'tbsp' || u === 'tablespoon' || u === 'tablespoons') {
          return { grams: qty * (gramsPerCup / 16), qty, unit: u };
        }
        if (u === 'tsp' || u === 'teaspoon' || u === 'teaspoons') {
          return { grams: qty * (gramsPerCup / 48), qty, unit: u };
        }
      }
      // Liquid density for wet ingredients
      for (const [liquid, density] of Object.entries(LIQUID_DENSITY)) {
        if (name.includes(liquid)) { grams *= density; break; }
      }
    }
    return { grams, qty, unit: u };
  }

  // Countable units — look up by item name
  const countableUnits = new Set(['piece','pieces','slice','slices','cookie','cookies','biscuit','biscuits','cracker','crackers','stalk','stalks','sprig','sprigs','strip','strips','clove','cloves','sheet','sheets','whole']);
  if (countableUnits.has(u) || u === '') {
    // Try to match item name against COUNTABLE table
    for (const [k,v] of Object.entries(COUNTABLE).sort((a,b)=>b[0].length-a[0].length)) {
      if (name.includes(k) || k.includes(name.split(' ')[0])) {
        return { grams: qty * v, qty, unit: u };
      }
    }
    // Unit-based fallback
    const unitDefaults = { piece:50, pieces:50, whole:100, slice:28, cookie:16, biscuit:16, cracker:7, stalk:40, sprig:2, clove:5, sheet:3, strip:15 };
    return { grams: qty * (unitDefaults[u] ?? unitDefaults[u.replace(/s$/,'')] ?? 50), qty, unit: u };
  }

  return { grams: null, qty, unit: u };
}

function estimateGrams(name, qty, unit) {
  const n = name.toLowerCase();
  const u = (unit||'').toLowerCase();

  // Check full "name + unit" combo first e.g. "large eggs" with unit "large"
  const combined = (u + ' ' + n).trim();
  const nameWithUnit = (n + ' ' + u).trim();
  for (const [k,v] of Object.entries(COUNTABLE).sort((a,b)=>b[0].length-a[0].length)) {
    if (combined.includes(k) || nameWithUnit.includes(k) || n.includes(k)) return qty * v;
  }

  // Descriptor words used as units (e.g. "2 large" eggs)
  const descriptors = { large:57, medium:44, small:38, whole:50, extra:57 };
  if (u && descriptors[u]) return qty * descriptors[u];

  return qty * 100;
}

// ── Name cleaning ─────────────────────────────────────────────────────────
function cleanName(raw) {
  let name = raw.toLowerCase()
    .replace(/\(.*?\)/g,'').replace(/,.*$/,'').replace(/\bor\b.*/g,'').trim();

  // Longest alias match wins
  let best = null, bestLen = 0;
  for (const [k,v] of Object.entries(ALIASES)) {
    if (name.includes(k) && k.length > bestLen) { best = v; bestLen = k.length; }
  }
  if (best) return best;

  // Strip modifier words
  const words = name.split(/\s+/).filter(w => !STRIP.has(w) && w.length > 1);
  return words.join(' ') || raw.toLowerCase();
}

// ── Extract nutrients from search result inline data ─────────────────────
// Search results include foodNutrients array with nutrientId and value
function extractFromSearchResult(food) {
  const ns = food.foodNutrients || [];

  const getById = (ids) => {
    for (const id of ids) {
      const hit = ns.find(n => n.nutrientId === id || n.nutrientNumber === String(id));
      if (hit && (hit.value > 0)) return hit.value;
    }
    return 0;
  };

  // Search results use nutrientId field
  const cal     = getById(NUTRIENT_IDS.cal);
  const protein = getById(NUTRIENT_IDS.protein);
  const carbs   = getById(NUTRIENT_IDS.carbs);
  const fat     = getById(NUTRIENT_IDS.fat);

  return { cal, protein, carbs, fat };
}

// ── USDA search ───────────────────────────────────────────────────────────
async function searchUSDA(query) {
  // Request specific nutrient IDs inline so we don't need detail calls
  const nutrients = [...NUTRIENT_IDS.cal, ...NUTRIENT_IDS.protein, ...NUTRIENT_IDS.carbs, ...NUTRIENT_IDS.fat].join('&nutrients=');
  const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy,Branded&pageSize=10&nutrients=${nutrients}&api_key=${USDA_API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const d = await r.json();
  return d.foods || [];
}

// Pick best match: food with most complete macros
function pickBest(foods, itemName) {
  const name = (itemName||'').toLowerCase();
  const isZeroMacro = [...ZERO_MACRO_INGREDIENTS].some(z => name.includes(z));

  let best = null, bestScore = -1;
  for (const food of foods) {
    const n = extractFromSearchResult(food);
    let score;
    if (isZeroMacro) {
      // For zero-macro ingredients, prefer foods where cal AND carbs are both 0
      // Score highest if both are 0, penalize if carbs > 0 (wrong match)
      score = (n.cal === 0 ? 3 : 0) + (n.carbs === 0 ? 3 : -5) + (n.fat === 0 ? 1 : 0);
    } else {
      // For normal ingredients, prefer foods with complete non-zero macro data
      score = (n.cal > 0 ? 2 : 0) + (n.protein > 0 ? 1 : 0) + (n.carbs > 0 ? 2 : 0) + (n.fat > 0 ? 1 : 0);
    }
    console.log(`  candidate: "${food.description}" cal:${n.cal} carbs:${n.carbs} score:${score} (zero-macro:${isZeroMacro})`);
    if (score > bestScore) { bestScore = score; best = food; }
  }
  // For zero-macro ingredients, accept any match (even score 0)
  return (isZeroMacro && best) ? best : (bestScore > 0 ? best : null);
}

async function findFood(name) {
  const cleaned = cleanName(name);
  const queries = [
    cleaned,
    cleaned.split(' ').slice(0,3).join(' '),
    cleaned.split(' ').slice(0,2).join(' '),
    cleaned.split(' ')[0],
  ];

  for (const q of [...new Set(queries)]) {
    if (!q || q.length < 2) continue;
    const foods = await searchUSDA(q);
    const best = pickBest(foods, name);
    if (best) {
      console.log(`findFood: "${name}" → search "${q}": "${best.description}"`);
      return { food: best, nutrients: extractNutrients(best) };
    }
  }
  return null;
}
// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!USDA_API_KEY) return res.status(500).json({ error: 'USDA API key not configured.' });

  const { ingredients, servings } = req.body || {};
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'ingredients array required' });
  }

  const results = [];
  let totCal = 0, totPro = 0, totCarb = 0, totFat = 0;

  for (const ing of ingredients) {
    const { item, rawAmount } = ing;
    if (!item?.trim()) continue;

    try {
      const parsed = parseAmount(rawAmount || '', item);
      let grams = parsed.grams;
      if (!grams && parsed.qty) grams = estimateGrams(item, parsed.qty, parsed.unit);
      if (!grams || grams <= 0) grams = 100;

      // Short-circuit for known zero-macro items
      const itemLower = item.toLowerCase();
      if (ZERO_MACRO_ITEMS.has(itemLower) || [...ZERO_MACRO_ITEMS].some(z => itemLower.includes(z))) {
        results.push({ item, rawAmount, grams: Math.round(grams), cal:0, protein:0, carbs:0, fat:0, source:'usda', matchedFood: item + ' (zero macros)' });
        continue;
      }

      const match = await findFood(item);
      if (!match) {
        console.log(`Not found: "${item}"`);
        results.push({ item, rawAmount, grams: Math.round(grams), cal:null, protein:null, carbs:null, fat:null, source:'not_found' });
        continue;
      }

      const { food, nutrients: per100g } = match;
      const scale = grams / 100;

      const row = {
        item, rawAmount,
        grams: Math.round(grams),
        cal: Math.round(per100g.cal * scale),
        protein: parseFloat((per100g.protein * scale).toFixed(1)),
        carbs: parseFloat((per100g.carbs * scale).toFixed(1)),
        fat: parseFloat((per100g.fat * scale).toFixed(1)),
        source: 'usda',
        matchedFood: food.description,
        fdcId: food.fdcId,
      };

      console.log(`[${item}] grams:${Math.round(grams)} per100g:{cal:${per100g.cal},carbs:${per100g.carbs}} → cal:${row.cal} carbs:${row.carbs}`);

      totCal += row.cal; totPro += row.protein;
      totCarb += row.carbs; totFat += row.fat;
      results.push(row);

    } catch (e) {
      console.error(`Error "${item}":`, e.message);
      results.push({ item, rawAmount, cal:null, protein:null, carbs:null, fat:null, source:'error', error:e.message });
    }
  }

  const srv = Math.max(1, servings || 1);
  const usdaFound = results.filter(r => r.source === 'usda').length;

  return res.status(200).json({
    ingredients: results,
    totals: {
      cal: Math.round(totCal), protein: parseFloat(totPro.toFixed(1)),
      carbs: parseFloat(totCarb.toFixed(1)), fat: parseFloat(totFat.toFixed(1)),
    },
    perServing: {
      cal: Math.round(totCal / srv), protein: parseFloat((totPro / srv).toFixed(1)),
      carbs: parseFloat((totCarb / srv).toFixed(1)), fat: parseFloat((totFat / srv).toFixed(1)),
    },
    servings: srv, usdaFound, notFound: results.length - usdaFound, total: results.length,
  });
}
