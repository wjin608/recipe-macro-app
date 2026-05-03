// api/debug.js — test that USDA key is working
// Visit /api/debug in your browser to check

export default async function handler(req, res) {
  const key = process.env.USDA_API_KEY;

  if (!key) {
    return res.status(200).json({
      status: 'error',
      message: 'USDA_API_KEY is not set in Vercel environment variables',
    });
  }

  try {
    const r = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=butter&pageSize=1&api_key=${key}`
    );
    const data = await r.json();
    if (data.foods && data.foods.length > 0) {
      return res.status(200).json({
        status: 'ok',
        message: 'USDA API key is working correctly',
        sample: data.foods[0].description,
        anthropicKey: process.env.ANTHROPIC_API_KEY ? 'set' : 'NOT SET',
        usdaKey: 'set',
      });
    }
    return res.status(200).json({ status: 'error', message: 'USDA API returned no results', raw: data });
  } catch (e) {
    return res.status(200).json({ status: 'error', message: e.message });
  }
}
