// api/debug.js — test USDA API and fdcId lookups
export default async function handler(req, res) {
  const key = process.env.USDA_API_KEY;
  if (!key) return res.status(200).json({ status: 'error', message: 'USDA_API_KEY not set' });

  const BASE = 'https://api.nal.usda.gov/fdc/v1';

  // Test the 6 failing fdcIds
  const toTest = [
    { name: 'brown sugar',    fdcId: 169655 },
    { name: 'egg yolk',       fdcId: 173423 },
    { name: 'egg white',      fdcId: 173424 },
    { name: 'coconut oil',    fdcId: 172337 },
    { name: 'apple',          fdcId: 171688 },
    { name: 'chicken breast', fdcId: 171477 },
    { name: 'coconut milk',   fdcId: 168351 },
  ];

  const results = [];
  for (const { name, fdcId } of toTest) {
    try {
      const r = await fetch(`${BASE}/food/${fdcId}?api_key=${key}`);
      const food = await r.json();
      const ns = food.foodNutrients || [];
      // Show first 3 nutrients to see the format
      const sample = ns.slice(0, 3).map(n => ({
        nutrientName: (n.nutrient && n.nutrient.name) || n.nutrientName || n.name,
        nutrientId: (n.nutrient && n.nutrient.id) || n.nutrientId,
        amount: n.amount,
        value: n.value,
      }));
      // Find energy specifically
      const energy = ns.find(n => {
        const nm = ((n.nutrient && n.nutrient.name) || n.nutrientName || '').toLowerCase();
        return nm.includes('energy');
      });
      results.push({
        name, fdcId,
        returnedFood: food.description,
        status: r.status,
        nutrientCount: ns.length,
        energyField: energy ? { name: (energy.nutrient&&energy.nutrient.name)||energy.nutrientName, amount: energy.amount, value: energy.value } : 'NOT FOUND',
        sampleNutrients: sample,
      });
    } catch(e) {
      results.push({ name, fdcId, error: e.message });
    }
  }

  return res.status(200).json({ results });
}
