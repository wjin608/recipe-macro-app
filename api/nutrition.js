// api/nutrition.js
// Looks up each ingredient in the USDA FoodData Central database
// and calculates macros based on the actual amount specified

const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

// Unit conversion table — everything converts to grams
const TO_GRAMS = {
  g: 1, kg: 1000, mg: 0.001,
  oz: 28.3495, lb: 453.592,
  cup: 240, cups: 240,
  tbsp: 14.787, tablespoon: 14.787, tablespoons: 14.787,
  tsp: 4.929, teaspoon: 4.929, teaspoons: 4.929,
  ml: 1, l: 1000, liter: 1000, liters: 1000,
  fl_oz: 29.574,
  piece: null, pieces: null, slice: null, slices: null,
  clove: 5, cloves: 5,
  large: null, medium: null, small: null,
  handful: 30, pinch: 0.36,
};

// Density adjustments for common liquids (ml → g)
const LIQUID_DENSITY = {
  milk: 1.03, cream: 1.01, oil: 0.92, butter: 0.91,
  honey: 1.42, yogurt: 1.04, water: 1.0,
};

function parseAmount(amountStr) {
  if (!amountStr) return { grams: null, unit: null, quantity: null };
  const str = amountStr.trim().toLowerCase();

  // Handle fractions like 1/2, 3/4
  const fracMatch = str.match(/^(\d+)?\s*(\d+)\/(\d+)\s*(.*)$/);
  if (fracMatch) {
    const whole = parseFloat(fracMatch[1] || 0);
    const frac = parseFloat(fracMatch[2]) / parseFloat(fracMatch[3]);
    const qty = whole + frac;
    const unit = fracMatch[4].trim();
    return convertToGrams(qty, unit);
  }

  // Handle ranges like "2-3" — take the average
  const rangeMatch = str.match(/^([\d.]+)\s*[-–]\s*([\d.]+)\s*(.*)$/);
  if (rangeMatch) {
    const qty = (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
    const unit = rangeMatch[3].trim();
    return convertToGrams(qty, unit);
  }

  // Standard: number + unit
  const stdMatch = str.match(/^([\d.]+)\s*(.*)$/);
  if (stdMatch) {
    const qty = parseFloat(stdMatch[1]);
    const unit = stdMatch[2].trim();
    return convertToGrams(qty, unit);
  }

  return { grams: null, unit: null, quantity: null };
}

function convertToGrams(qty, unit) {
  const cleanUnit = unit.replace(/\.$/, '').trim();
  const factor = TO_GRAMS[cleanUnit] ?? TO_GRAMS[cleanUnit + 's'] ?? null;

  if (factor !== null && factor !== undefined) {
    return { grams: qty * (factor || 1), unit: cleanUnit, quantity: qty };
  }
  // Unknown unit — return quantity only, we'll estimate by weight
  return { grams: null, unit: cleanUnit, quantity: qty };
}

async function searchFood(query) {
  const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&dataType=SR Legacy,Foundation,Branded&pageSize=5&api_key=${USDA_API_KEY}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`USDA search failed: ${resp.status}`);
  const data = await resp.json();
  return data.foods || [];
}

async function getFoodDetails(fdcId) {
  const url = `${USDA_BASE}/food/${fdcId}?api_key=${USDA_API_KEY}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`USDA detail failed: ${resp.status}`);
  return resp.json();
}

function extractNutrients(food) {
  const nutrients = food.foodNutrients || [];
  const get = (names) => {
    for (const name of names) {
      const found = nutrients.find(n =>
        (n.nutrientName || n.name || '').toLowerCase().includes(name.toLowerCase())
      );
      if (found) return found.value || found.amount || 0;
    }
    return 0;
  };
  return {
    cal: get(['energy', 'calorie']),
    protein: get(['protein']),
    carbs: get(['carbohydrate']),
    fat: get(['total lipid', 'fat']),
  };
}

// Estimate grams for countable items (1 egg, 2 chicken breasts, etc.)
function estimateGramsForCountable(itemName, quantity) {
  const name = itemName.toLowerCase();
  const estimates = {
    egg: 50, eggs: 50,
    'chicken breast': 174, 'chicken thigh': 130,
    'banana': 118, 'apple': 182, 'orange': 131,
    'tomato': 123, 'onion': 110, 'garlic clove': 5,
    'potato': 213, 'carrot': 61,
    'slice bread': 28, 'slice': 28,
  };
  for (const [key, grams] of Object.entries(estimates)) {
    if (name.includes(key)) return quantity * grams;
  }
  return quantity * 100; // default assumption
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!USDA_API_KEY) {
    return res.status(500).json({ error: 'USDA API key not configured on server.' });
  }

  const { ingredients, servings } = req.body;
  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: 'ingredients array required' });
  }

  const results = [];
  let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

  for (const ing of ingredients) {
    const { item, rawAmount } = ing;
    if (!item) continue;

    try {
      // Parse the amount
      const parsed = parseAmount(rawAmount || '');
      let grams = parsed.grams;

      // If no gram conversion, estimate from quantity
      if (!grams && parsed.quantity) {
        grams = estimateGramsForCountable(item, parsed.quantity);
      }
      if (!grams) grams = 100; // fallback

      // Search USDA
      const foods = await searchFood(item);
      if (foods.length === 0) {
        results.push({ item, rawAmount, cal: null, protein: null, carbs: null, fat: null, source: 'not_found' });
        continue;
      }

      // Prefer Foundation or SR Legacy over Branded
      const preferred = foods.find(f => ['Foundation', 'SR Legacy'].includes(f.dataType)) || foods[0];
      const details = await getFoodDetails(preferred.fdcId);
      const per100g = extractNutrients(details);

      // Scale to actual amount
      const scale = grams / 100;
      const ingResult = {
        item,
        rawAmount,
        grams: Math.round(grams),
        cal: Math.round(per100g.cal * scale),
        protein: parseFloat((per100g.protein * scale).toFixed(1)),
        carbs: parseFloat((per100g.carbs * scale).toFixed(1)),
        fat: parseFloat((per100g.fat * scale).toFixed(1)),
        source: 'usda',
        fdcId: preferred.fdcId,
        matchedFood: preferred.description,
      };

      totalCal += ingResult.cal;
      totalProtein += ingResult.protein;
      totalCarbs += ingResult.carbs;
      totalFat += ingResult.fat;
      results.push(ingResult);
    } catch (e) {
      results.push({ item, rawAmount, cal: null, protein: null, carbs: null, fat: null, source: 'error', error: e.message });
    }
  }

  const srv = servings || 1;
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
    usdaFound: results.filter(r => r.source === 'usda').length,
    notFound: results.filter(r => r.source !== 'usda').length,
  });
}
