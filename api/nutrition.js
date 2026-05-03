// api/nutrition.js
// Looks up ingredients in USDA FoodData Central with improved matching

const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

// ── Unit → grams conversion ───────────────────────────────────────────────
const TO_GRAMS = {
  g: 1, gram: 1, grams: 1,
  kg: 1000, kilogram: 1000,
  mg: 0.001,
  oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
  lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
  cup: 240, cups: 240,
  tbsp: 14.787, tablespoon: 14.787, tablespoons: 14.787,
  tsp: 4.929, teaspoon: 4.929, teaspoons: 4.929,
  ml: 1, milliliter: 1, milliliters: 1,
  l: 1000, liter: 1000, liters: 1000,
  fl_oz: 29.574,
  pinch: 0.36, dash: 0.6, handful: 30,
};

// Countable item default weights in grams
const COUNTABLE_WEIGHTS = {
  egg: 50, eggs: 50,
  'chicken breast': 174,
  'chicken thigh': 130,
  'chicken drumstick': 110,
  banana: 118, bananas: 118,
  apple: 182, apples: 182,
  orange: 131, oranges: 131,
  lemon: 84, lemons: 84,
  lime: 67, limes: 67,
  tomato: 123, tomatoes: 123,
  onion: 110, onions: 110,
  potato: 213, potatoes: 213,
  carrot: 61, carrots: 61,
  clove: 5, cloves: 5,
  'bay leaf': 0.6, 'bay leaves': 0.6,
  slice: 28, slices: 28,
  piece: 100, pieces: 100,
  strip: 15, strips: 15,
  stalk: 40, stalks: 40,
  sprig: 2, sprigs: 2,
};

// Words to strip from ingredient names before USDA search
const STRIP_WORDS = new Set([
  'fresh','dried','frozen','canned','cooked','raw','whole','chopped','diced',
  'minced','sliced','grated','shredded','peeled','boneless','skinless',
  'unsalted','salted','sweetened','unsweetened','low-fat','full-fat',
  'reduced-fat','fat-free','skim','large','medium','small','extra','organic',
  'packed','heaping','level','about','approximately','roughly','optional',
  'ripe','room','temperature','temperature,','softened','melted','beaten',
]);

// Common recipe name → better USDA search term
const ALIASES = {
  'mascarpone': 'mascarpone cheese',
  'heavy cream': 'heavy whipping cream',
  'double cream': 'heavy whipping cream',
  'all purpose flour': 'wheat flour',
  'all-purpose flour': 'wheat flour',
  'plain flour': 'wheat flour',
  'bread flour': 'wheat flour bread',
  'self raising flour': 'wheat flour self rising',
  'powdered sugar': 'powdered sugar confectioners',
  'icing sugar': 'powdered sugar confectioners',
  'caster sugar': 'sugar white granulated',
  'cane sugar': 'sugar white granulated',
  'brown sugar': 'sugars brown',
  'baking soda': 'leavening agents baking soda',
  'bicarbonate soda': 'leavening agents baking soda',
  'baking powder': 'leavening agents baking powder',
  'vanilla extract': 'vanilla extract imitation',
  'cocoa powder': 'cocoa dry powder unsweetened',
  'dark chocolate': 'chocolate dark',
  'milk chocolate': 'chocolate milk',
  'white chocolate': 'chocolate white',
  'soy sauce': 'soy sauce',
  'fish sauce': 'fish sauce',
  'sesame oil': 'oil sesame',
  'olive oil': 'oil olive salad',
  'vegetable oil': 'oil vegetable',
  'coconut oil': 'oil coconut',
  'butter': 'butter without salt',
  'greek yogurt': 'yogurt greek plain nonfat',
  'greek yoghurt': 'yogurt greek plain nonfat',
  'cream cheese': 'cream cheese',
  'sour cream': 'sour cream cultured',
  'parmesan': 'cheese parmesan grated',
  'mozzarella': 'cheese mozzarella',
  'cheddar': 'cheese cheddar',
  'feta': 'cheese feta',
  'ricotta': 'cheese ricotta',
  'ladyfinger': 'ladyfingers',
  'savoiardi': 'ladyfingers',
  'espresso': 'beverages coffee brewed espresso',
  'strong coffee': 'beverages coffee brewed',
  'breadcrumbs': 'breadcrumbs dry grated',
  'panko': 'breadcrumbs japanese panko',
  'cornstarch': 'cornstarch',
  'corn starch': 'cornstarch',
  'gelatin': 'gelatin dry powder unsweetened',
  'chicken stock': 'soup chicken broth',
  'beef stock': 'soup beef broth',
  'vegetable stock': 'soup vegetable broth',
  'chicken broth': 'soup chicken broth',
  'beef broth': 'soup beef broth',
  'coconut milk': 'coconut milk',
  'tomato paste': 'tomato paste',
  'tomato puree': 'tomato puree',
  'passata': 'tomato puree',
  'crushed tomatoes': 'tomatoes red canned',
  'diced tomatoes': 'tomatoes red canned',
  'heavy whipping cream': 'cream fluid heavy whipping',
  'whipping cream': 'cream fluid heavy whipping',
  'light cream': 'cream fluid light',
  'half and half': 'cream half and half',
  'whole milk': 'milk whole 3.25%',
  'skim milk': 'milk nonfat',
  '2% milk': 'milk reduced fat 2%',
  'almond milk': 'beverages almond milk',
  'oat milk': 'beverages oat milk',
  'peanut butter': 'peanut butter smooth',
  'almond butter': 'butter almond',
  'maple syrup': 'syrups maple',
  'honey': 'honey',
  'agave': 'agave syrup',
  'sriracha': 'hot sauce',
  'worcestershire': 'worcestershire sauce',
  'dijon mustard': 'mustard dijon',
  'whole grain mustard': 'mustard',
  'white wine': 'wine white table',
  'red wine': 'wine red table',
  'apple cider vinegar': 'vinegar apple cider',
  'white vinegar': 'vinegar distilled',
  'balsamic vinegar': 'vinegar balsamic',
  'rice vinegar': 'vinegar rice',
  'lemon juice': 'lemon juice raw',
  'lime juice': 'lime juice raw',
  'orange juice': 'orange juice raw',
  'rolled oats': 'cereals oatmeal rolled oats',
  'oats': 'cereals oatmeal rolled oats',
  'basmati rice': 'rice white long-grain raw',
  'jasmine rice': 'rice white long-grain raw',
  'white rice': 'rice white long-grain raw',
  'brown rice': 'rice brown long-grain raw',
  'quinoa': 'quinoa cooked',
  'pasta': 'pasta dry enriched',
  'spaghetti': 'spaghetti dry enriched',
  'penne': 'pasta dry enriched',
};

// ── Amount parsing ────────────────────────────────────────────────────────
function parseAmount(amountStr) {
  if (!amountStr) return { grams: null, quantity: 1, unit: '' };
  const str = amountStr.trim().toLowerCase()
    .replace(/½/g, '0.5').replace(/¼/g, '0.25')
    .replace(/¾/g, '0.75').replace(/⅓/g, '0.333')
    .replace(/⅔/g, '0.667').replace(/⅛/g, '0.125');

  // Fraction with optional whole: "1 1/2 cups"
  const fracMatch = str.match(/^(\d+)?\s*(\d+)\/(\d+)\s*(.*)$/);
  if (fracMatch) {
    const whole = parseFloat(fracMatch[1] || 0);
    const frac = parseFloat(fracMatch[2]) / parseFloat(fracMatch[3]);
    const qty = whole + frac;
    const unit = fracMatch[4].trim().split(/[\s,]+/)[0];
    return toGrams(qty, unit);
  }

  // Range: "2-3 tbsp"
  const rangeMatch = str.match(/^([\d.]+)\s*[-–]\s*([\d.]+)\s*(.*)$/);
  if (rangeMatch) {
    const qty = (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
    const unit = rangeMatch[3].trim().split(/[\s,]+/)[0];
    return toGrams(qty, unit);
  }

  // Standard: "200 g", "2 cups"
  const stdMatch = str.match(/^([\d.]+)\s*(.*)$/);
  if (stdMatch) {
    const qty = parseFloat(stdMatch[1]);
    const unit = stdMatch[2].trim().split(/[\s,]+/)[0].replace(/[.,]$/, '');
    return toGrams(qty, unit);
  }

  return { grams: null, quantity: 1, unit: '' };
}

function toGrams(qty, unit) {
  const u = (unit || '').toLowerCase().replace(/[.,]$/, '');
  const factor = TO_GRAMS[u] ?? TO_GRAMS[u.replace(/s$/, '')];
  if (factor != null) return { grams: qty * factor, quantity: qty, unit: u };
  return { grams: null, quantity: qty, unit: u };
}

function estimateGramsCountable(itemName, qty) {
  const name = itemName.toLowerCase();
  for (const [key, grams] of Object.entries(COUNTABLE_WEIGHTS)) {
    if (name.includes(key)) return qty * grams;
  }
  return qty * 100;
}

// ── Name cleaning ─────────────────────────────────────────────────────────
function cleanName(raw) {
  let name = raw.toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/,.*$/, '')
    .replace(/\bor\b.*/g, '')
    .trim();

  // Check aliases first (longest match wins)
  let bestAlias = null, bestLen = 0;
  for (const [alias, replacement] of Object.entries(ALIASES)) {
    if (name.includes(alias) && alias.length > bestLen) {
      bestAlias = replacement;
      bestLen = alias.length;
    }
  }
  if (bestAlias) return bestAlias;

  // Strip modifier words
  const words = name.split(/\s+/).filter(w => !STRIP_WORDS.has(w) && w.length > 1);
  return words.join(' ').trim() || raw.toLowerCase();
}

// ── USDA search with multi-attempt fallback ───────────────────────────────
async function searchUSDA(query, dataType = 'SR Legacy,Foundation') {
  const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&dataType=${encodeURIComponent(dataType)}&pageSize=5&api_key=${USDA_API_KEY}`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.foods || [];
}

async function findFood(ingredientName) {
  const cleaned = cleanName(ingredientName);

  // Attempt 1: cleaned name, SR Legacy + Foundation only
  let foods = await searchUSDA(cleaned);
  if (foods.length > 0) return foods[0];

  // Attempt 2: first 2 words
  const twoWords = cleaned.split(' ').slice(0, 2).join(' ');
  if (twoWords !== cleaned && twoWords.length > 3) {
    foods = await searchUSDA(twoWords);
    if (foods.length > 0) return foods[0];
  }

  // Attempt 3: first word only
  const oneWord = cleaned.split(' ')[0];
  if (oneWord !== twoWords && oneWord.length > 3) {
    foods = await searchUSDA(oneWord);
    if (foods.length > 0) return foods[0];
  }

  // Attempt 4: include Branded foods
  foods = await searchUSDA(cleaned, 'SR Legacy,Foundation,Branded');
  if (foods.length > 0) return foods[0];

  return null;
}

async function getNutrientsPer100g(fdcId) {
  const url = `${USDA_BASE}/food/${fdcId}?api_key=${USDA_API_KEY}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`USDA detail ${resp.status}`);
  const food = await resp.json();

  const nutrients = food.foodNutrients || [];
  const get = (...terms) => {
    for (const term of terms) {
      const hit = nutrients.find(n =>
        (n.nutrientName || n.name || '').toLowerCase().includes(term)
      );
      if (hit) {
        const val = hit.value ?? hit.amount ?? 0;
        if (val > 0) return val;
      }
    }
    return 0;
  };

  return {
    cal: get('energy', 'calorie'),
    protein: get('protein'),
    carbs: get('carbohydrate'),
    fat: get('total lipid', ' fat'),
  };
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!USDA_API_KEY) return res.status(500).json({ error: 'USDA API key not configured.' });

  const { ingredients, servings } = req.body;
  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: 'ingredients array required' });
  }

  const results = [];
  let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

  for (const ing of ingredients) {
    const { item, rawAmount } = ing;
    if (!item?.trim()) continue;

    try {
      // Parse amount to grams
      const parsed = parseAmount(rawAmount || '');
      let grams = parsed.grams;
      if (!grams && parsed.quantity) grams = estimateGramsCountable(item, parsed.quantity);
      if (!grams || grams <= 0) grams = 100;

      // Find food in USDA
      const food = await findFood(item);
      if (!food) {
        results.push({ item, rawAmount, grams: Math.round(grams), cal: null, protein: null, carbs: null, fat: null, source: 'not_found' });
        continue;
      }

      const per100g = await getNutrientsPer100g(food.fdcId);
      const scale = grams / 100;

      const row = {
        item,
        rawAmount,
        grams: Math.round(grams),
        cal: Math.round(per100g.cal * scale),
        protein: parseFloat((per100g.protein * scale).toFixed(1)),
        carbs: parseFloat((per100g.carbs * scale).toFixed(1)),
        fat: parseFloat((per100g.fat * scale).toFixed(1)),
        source: 'usda',
        matchedFood: food.description,
        fdcId: food.fdcId,
      };

      totalCal += row.cal;
      totalProtein += row.protein;
      totalCarbs += row.carbs;
      totalFat += row.fat;
      results.push(row);
    } catch (e) {
      results.push({ item, rawAmount, cal: null, protein: null, carbs: null, fat: null, source: 'error', error: e.message });
    }
  }

  const srv = Math.max(1, servings || 1);
  const usdaFound = results.filter(r => r.source === 'usda').length;

  return res.status(200).json({
    ingredients: results,
    totals: {
      cal: Math.round(totalCal),
      protein: parseFloat(totalProtein.toFixed(1)),
      carbs: parseFloat(totalCarbs.toFixed(1)),
      fat: parseFloat(totalFat.toFixed(1)),
    },
    perServing: {
      cal: Math.round(totalCal / srv),
      protein: parseFloat((totalProtein / srv).toFixed(1)),
      carbs: parseFloat((totalCarbs / srv).toFixed(1)),
      fat: parseFloat((totalFat / srv).toFixed(1)),
    },
    servings: srv,
    usdaFound,
    notFound: results.length - usdaFound,
    total: results.length,
  });
}
