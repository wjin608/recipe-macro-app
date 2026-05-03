// api/nutrition.js — USDA FoodData Central lookup

const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

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

// Countable item default weights (grams each)
const COUNTABLE = {
  egg:50, eggs:50,
  'chicken breast':174, 'chicken thigh':130,
  banana:118, apple:182, orange:131,
  lemon:84, lime:67,
  tomato:123, onion:110, potato:213, carrot:61,
  clove:5, cloves:5,
  slice:28, piece:100, stalk:40, sprig:2,
};

// Recipe name → USDA search term
const ALIASES = {
  'mascarpone':'mascarpone cheese',
  'heavy cream':'cream fluid heavy whipping',
  'double cream':'cream fluid heavy whipping',
  'whipping cream':'cream fluid heavy whipping',
  'all purpose flour':'wheat flour',
  'all-purpose flour':'wheat flour',
  'plain flour':'wheat flour',
  'bread flour':'wheat flour bread',
  'self raising flour':'wheat flour self rising',
  'powdered sugar':'sugar powdered',
  'icing sugar':'sugar powdered',
  'caster sugar':'sugar white granulated',
  'brown sugar':'sugars brown',
  'baking soda':'leavening baking soda',
  'bicarbonate of soda':'leavening baking soda',
  'baking powder':'leavening baking powder',
  'vanilla extract':'vanilla extract',
  'cocoa powder':'cocoa powder unsweetened',
  'dark chocolate':'chocolate dark',
  'milk chocolate':'chocolate milk',
  'butter':'butter unsalted',
  'olive oil':'oil olive',
  'vegetable oil':'oil vegetable',
  'coconut oil':'oil coconut',
  'sesame oil':'oil sesame',
  'greek yogurt':'yogurt greek plain',
  'greek yoghurt':'yogurt greek plain',
  'cream cheese':'cream cheese',
  'sour cream':'sour cream',
  'parmesan':'cheese parmesan',
  'mozzarella':'cheese mozzarella',
  'cheddar':'cheese cheddar',
  'feta':'cheese feta',
  'ricotta':'cheese ricotta',
  'ladyfinger':'ladyfingers',
  'savoiardi':'ladyfingers',
  'espresso':'coffee brewed espresso',
  'chicken stock':'chicken broth',
  'beef stock':'beef broth',
  'vegetable stock':'vegetable broth',
  'coconut milk':'coconut milk',
  'tomato paste':'tomato paste',
  'tomato puree':'tomato puree',
  'passata':'tomato puree',
  'cornstarch':'cornstarch',
  'corn starch':'cornstarch',
  'breadcrumbs':'bread crumbs dry',
  'panko':'bread crumbs japanese',
  'whole milk':'milk whole',
  'skim milk':'milk nonfat',
  'almond milk':'almond milk',
  'peanut butter':'peanut butter',
  'maple syrup':'syrups maple',
  'soy sauce':'soy sauce',
  'fish sauce':'fish sauce',
  'lemon juice':'lemon juice',
  'lime juice':'lime juice',
  'orange juice':'orange juice',
  'white rice':'rice white long-grain',
  'brown rice':'rice brown long-grain',
  'basmati rice':'rice white long-grain',
  'pasta':'pasta dry',
  'rolled oats':'oats rolled',
  'quinoa':'quinoa cooked',
  'peanut butter smooth':'peanut butter smooth',
  'kosher salt':'salt table',
  'sea salt':'salt table',
  'coarse salt':'salt table',
  'fine salt':'salt table',
  'table salt':'salt table',
  'rock salt':'salt table',
  'flaky salt':'salt table',
  'black pepper':'spices pepper black',
  'white pepper':'spices pepper white',
  'cayenne pepper':'spices pepper red cayenne',
  'red pepper flakes':'spices pepper red cayenne',
  'chili powder':'spices chili powder',
  'cumin':'spices cumin seed',
  'paprika':'spices paprika',
  'turmeric':'spices turmeric ground',
  'cinnamon':'spices cinnamon ground',
  'nutmeg':'spices nutmeg ground',
  'oregano':'spices oregano dried',
  'thyme':'spices thyme dried',
  'rosemary':'spices rosemary dried',
  'basil':'spices basil dried',
  'bay leaf':'spices bay leaf',
  'garlic powder':'spices garlic powder',
  'onion powder':'spices onion powder',
  'smoked paprika':'spices paprika smoked',
};

const STRIP = new Set([
  'fresh','dried','frozen','canned','cooked','raw','whole','chopped',
  'diced','minced','sliced','grated','shredded','peeled','boneless',
  'skinless','unsalted','salted','large','medium','small','extra',
  'organic','optional','softened','melted','beaten','room','temperature',
]);

// ── Helpers ───────────────────────────────────────────────────────────────
function parseAmount(str) {
  if (!str) return { grams: null, qty: 1, unit: '' };
  let s = str.trim().toLowerCase()
    .replace(/½/g,'0.5').replace(/¼/g,'0.25').replace(/¾/g,'0.75')
    .replace(/⅓/g,'0.333').replace(/⅔/g,'0.667').replace(/⅛/g,'0.125');

  // "1 1/2 cups"
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)/);
  if (m) return toG(parseFloat(m[1]) + parseFloat(m[2])/parseFloat(m[3]), m[4].split(/\s/)[0]);

  // "1/2 cup"
  m = s.match(/^(\d+)\/(\d+)\s*(.*)/);
  if (m) return toG(parseFloat(m[1])/parseFloat(m[2]), m[3].split(/\s/)[0]);

  // "2-3 tbsp"
  m = s.match(/^([\d.]+)\s*[-–]\s*([\d.]+)\s*(.*)/);
  if (m) return toG((parseFloat(m[1])+parseFloat(m[2]))/2, m[3].split(/\s/)[0]);

  // "200 g"
  m = s.match(/^([\d.]+)\s*(.*)/);
  if (m) return toG(parseFloat(m[1]), m[2].split(/\s/)[0].replace(/[.,]$/,''));

  return { grams: null, qty: 1, unit: '' };
}

function toG(qty, unit) {
  const u = (unit||'').toLowerCase().replace(/[.,]$/,'');
  const f = TO_GRAMS[u] ?? TO_GRAMS[u.replace(/s$/,'')];
  if (f != null) return { grams: qty * f, qty, unit: u };
  return { grams: null, qty, unit: u };
}

function estimateGrams(name, qty) {
  const n = name.toLowerCase();
  for (const [k,v] of Object.entries(COUNTABLE)) {
    if (n.includes(k)) return qty * v;
  }
  return qty * 100;
}

function cleanName(raw) {
  let name = raw.toLowerCase()
    .replace(/\(.*?\)/g,'').replace(/,.*$/,'').replace(/\bor\b.*/g,'').trim();

  // Check aliases (longest match wins)
  let best = null, bestLen = 0;
  for (const [k,v] of Object.entries(ALIASES)) {
    if (name.includes(k) && k.length > bestLen) { best = v; bestLen = k.length; }
  }
  if (best) return best;

  // Strip modifier words
  const words = name.split(/\s+/).filter(w => !STRIP.has(w) && w.length > 1);
  return words.join(' ') || raw.toLowerCase();
}

async function usdaSearch(query, includesBranded = false) {
  const dataType = includesBranded
    ? 'SR Legacy,Foundation,Branded'
    : 'SR Legacy,Foundation';
  const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&dataType=${encodeURIComponent(dataType)}&pageSize=5&api_key=${USDA_API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const d = await r.json();
  return d.foods || [];
}

async function findFood(name) {
  const cleaned = cleanName(name);

  // 4 attempts with progressively looser queries
  const queries = [
    cleaned,
    cleaned.split(' ').slice(0,2).join(' '),
    cleaned.split(' ')[0],
  ];

  for (const q of queries) {
    if (!q || q.length < 2) continue;
    const foods = await usdaSearch(q);
    // Try each result until we find one with valid nutrients (handles 404 IDs)
    for (const food of foods) {
      try {
        await getNutrients(food.fdcId); // test it's accessible
        return food;
      } catch(e) {
        console.log(`Skipping fdcId ${food.fdcId} for "${q}": ${e.message}`);
        continue;
      }
    }
  }

  // Last resort: include branded
  const foods = await usdaSearch(cleaned, true);
  for (const food of foods) {
    try {
      await getNutrients(food.fdcId);
      return food;
    } catch(e) { continue; }
  }
  return null;
}

async function getNutrients(fdcId) {
  const r = await fetch(`${USDA_BASE}/food/${fdcId}?api_key=${USDA_API_KEY}`);
  if (r.status === 404) throw new Error(`USDA food ID ${fdcId} not found (404)`);
  if (!r.ok) throw new Error(`USDA ${r.status}`);
  const food = await r.json();
  const ns = food.foodNutrients || [];

  // USDA returns nutrients in different shapes depending on data type:
  // SR Legacy / Foundation: { nutrient: { name, number }, amount }
  // Branded: { nutrientName, value }
  // Search results: { nutrientName, value }
  // We handle all three shapes here
  const getName = n =>
    (n.nutrient && n.nutrient.name) ||
    n.nutrientName ||
    n.name ||
    '';

  const getValue = n =>
    n.amount ?? n.value ?? 0;

  const get = (...terms) => {
    for (const term of terms) {
      const hit = ns.find(n => getName(n).toLowerCase().includes(term));
      if (hit) {
        const v = getValue(hit);
        if (v > 0) return v;
      }
    }
    return 0;
  };

  const result = {
    cal: get('energy','calorie'),
    protein: get('protein'),
    carbs: get('carbohydrate'),
    fat: get('total lipid','fat'),
  };

  // Debug log to verify extraction
  console.log(`fdcId ${fdcId} nutrients:`, JSON.stringify(result), '| sample field:', JSON.stringify(ns[0]));

  return result;
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!USDA_API_KEY) {
    console.error('USDA_API_KEY not set');
    return res.status(500).json({ error: 'USDA API key not configured on server.' });
  }

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
      // Parse amount
      const parsed = parseAmount(rawAmount || '');
      let grams = parsed.grams;
      if (!grams && parsed.qty) grams = estimateGrams(item, parsed.qty);
      if (!grams || grams <= 0) grams = 100;

      // USDA lookup
      const food = await findFood(item);
      if (!food) {
        console.log(`Not found in USDA: "${item}" (cleaned: "${cleanName(item)}")`);
        results.push({ item, rawAmount, grams: Math.round(grams), cal:null, protein:null, carbs:null, fat:null, source:'not_found' });
        continue;
      }

      const per100g = await getNutrients(food.fdcId);
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

      totCal += row.cal; totPro += row.protein;
      totCarb += row.carbs; totFat += row.fat;
      results.push(row);

    } catch (e) {
      console.error(`Error processing "${item}":`, e.message);
      results.push({ item, rawAmount, cal:null, protein:null, carbs:null, fat:null, source:'error', error:e.message });
    }
  }

  const srv = Math.max(1, servings || 1);
  const usdaFound = results.filter(r => r.source === 'usda').length;

  return res.status(200).json({
    ingredients: results,
    totals: { cal:Math.round(totCal), protein:parseFloat(totPro.toFixed(1)), carbs:parseFloat(totCarb.toFixed(1)), fat:parseFloat(totFat.toFixed(1)) },
    perServing: {
      cal: Math.round(totCal / srv),
      protein: parseFloat((totPro / srv).toFixed(1)),
      carbs: parseFloat((totCarb / srv).toFixed(1)),
      fat: parseFloat((totFat / srv).toFixed(1)),
    },
    servings: srv,
    usdaFound,
    notFound: results.length - usdaFound,
    total: results.length,
  });
}
