// api/test.js
// Systematic accuracy checker for the nutrition lookup pipeline
// Visit /api/test in your browser to run all checks and get a report

const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

// ── Test cases ────────────────────────────────────────────────────────────
// Format: { item, rawAmount, expectedGrams, expectedCal, expectedCarbs, expectedProtein, expectedFat, tolerance }
// tolerance = fraction allowed off (0.20 = 20%). Defaults to 0.20.
// expectedCal/carbs/protein/fat are PER TOTAL AMOUNT (not per 100g)
// Source: USDA FoodData Central standard reference values

const TEST_CASES = [
  // ── Grains ──────────────────────────────────────────────────────────────
  { item:'oatmeal',          rawAmount:'1 cup',   expectedGrams:90,   expectedCal:307, expectedCarbs:55,  expectedProtein:11, expectedFat:5  },
  { item:'rolled oats',      rawAmount:'0.5 cup', expectedGrams:45,   expectedCal:154, expectedCarbs:27,  expectedProtein:5,  expectedFat:3  },
  { item:'bread flour',      rawAmount:'1 cup',   expectedGrams:127,  expectedCal:455, expectedCarbs:95,  expectedProtein:15, expectedFat:1  },
  { item:'all purpose flour',rawAmount:'0.25 cup',expectedGrams:31,   expectedCal:113, expectedCarbs:24,  expectedProtein:3,  expectedFat:0  },
  { item:'white rice',       rawAmount:'1 cup',   expectedGrams:185,  expectedCal:675, expectedCarbs:149, expectedProtein:13, expectedFat:1  },
  { item:'pasta',            rawAmount:'100 g',   expectedGrams:100,  expectedCal:371, expectedCarbs:75,  expectedProtein:13, expectedFat:2  },
  { item:'quinoa',           rawAmount:'0.5 cup', expectedGrams:85,   expectedCal:313, expectedCarbs:55,  expectedProtein:12, expectedFat:5  },
  { item:'breadcrumbs',      rawAmount:'0.25 cup',expectedGrams:27,   expectedCal:104, expectedCarbs:20,  expectedProtein:3,  expectedFat:1  },

  // ── Sugars & sweeteners ──────────────────────────────────────────────────
  { item:'white sugar',      rawAmount:'1 tbsp',  expectedGrams:13,   expectedCal:49,  expectedCarbs:13,  expectedProtein:0,  expectedFat:0  },
  { item:'brown sugar',      rawAmount:'1 tbsp',  expectedGrams:14,   expectedCal:52,  expectedCarbs:13,  expectedProtein:0,  expectedFat:0  },
  { item:'honey',            rawAmount:'1 tbsp',  expectedGrams:21,   expectedCal:64,  expectedCarbs:17,  expectedProtein:0,  expectedFat:0  },
  { item:'maple syrup',      rawAmount:'1 tbsp',  expectedGrams:20,   expectedCal:52,  expectedCarbs:13,  expectedProtein:0,  expectedFat:0  },
  { item:'powdered sugar',   rawAmount:'0.25 cup',expectedGrams:30,   expectedCal:116, expectedCarbs:30,  expectedProtein:0,  expectedFat:0  },

  // ── Dairy ────────────────────────────────────────────────────────────────
  { item:'whole milk',       rawAmount:'1 cup',   expectedGrams:244,  expectedCal:149, expectedCarbs:12,  expectedProtein:8,  expectedFat:8  },
  { item:'2% milk',          rawAmount:'0.5 cup', expectedGrams:122,  expectedCal:61,  expectedCarbs:6,   expectedProtein:4,  expectedFat:2  },
  { item:'heavy cream',      rawAmount:'0.25 cup',expectedGrams:60,   expectedCal:206, expectedCarbs:2,   expectedProtein:1,  expectedFat:22 },
  { item:'butter',           rawAmount:'1 tbsp',  expectedGrams:14,   expectedCal:102, expectedCarbs:0,   expectedProtein:0,  expectedFat:12 },
  { item:'cream cheese',     rawAmount:'2 tbsp',  expectedGrams:29,   expectedCal:99,  expectedCarbs:1,   expectedProtein:2,  expectedFat:10 },
  { item:'greek yogurt',     rawAmount:'100 g',   expectedGrams:100,  expectedCal:59,  expectedCarbs:3,   expectedProtein:10, expectedFat:1  },
  { item:'sour cream',       rawAmount:'2 tbsp',  expectedGrams:29,   expectedCal:60,  expectedCarbs:1,   expectedProtein:1,  expectedFat:6  },
  { item:'mascarpone',       rawAmount:'100 g',   expectedGrams:100,  expectedCal:429, expectedCarbs:4,   expectedProtein:5,  expectedFat:45 },
  { item:'parmesan',         rawAmount:'1 tbsp',  expectedGrams:5,    expectedCal:22,  expectedCarbs:0,   expectedProtein:2,  expectedFat:1  },
  { item:'mozzarella',       rawAmount:'50 g',    expectedGrams:50,   expectedCal:149, expectedCarbs:1,   expectedProtein:10, expectedFat:11 },
  { item:'ricotta',          rawAmount:'0.5 cup', expectedGrams:124,  expectedCal:216, expectedCarbs:4,   expectedProtein:14, expectedFat:16 },

  // ── Eggs ─────────────────────────────────────────────────────────────────
  { item:'egg',              rawAmount:'1 piece', expectedGrams:50,   expectedCal:72,  expectedCarbs:0,   expectedProtein:6,  expectedFat:5  },
  { item:'egg yolk',         rawAmount:'2 piece', expectedGrams:34,   expectedCal:110, expectedCarbs:1,   expectedProtein:5,  expectedFat:9  },
  { item:'egg white',        rawAmount:'2 piece', expectedGrams:66,   expectedCal:34,  expectedCarbs:0,   expectedProtein:7,  expectedFat:0  },

  // ── Oils & fats ───────────────────────────────────────────────────────────
  { item:'olive oil',        rawAmount:'1 tbsp',  expectedGrams:14,   expectedCal:119, expectedCarbs:0,   expectedProtein:0,  expectedFat:14 },
  { item:'vegetable oil',    rawAmount:'1 tbsp',  expectedGrams:14,   expectedCal:120, expectedCarbs:0,   expectedProtein:0,  expectedFat:14 },
  { item:'coconut oil',      rawAmount:'1 tbsp',  expectedGrams:14,   expectedCal:121, expectedCarbs:0,   expectedProtein:0,  expectedFat:14 },
  { item:'sesame oil',       rawAmount:'1 tsp',   expectedGrams:5,    expectedCal:40,  expectedCarbs:0,   expectedProtein:0,  expectedFat:5  },

  // ── Produce ───────────────────────────────────────────────────────────────
  { item:'banana',           rawAmount:'1 piece', expectedGrams:118,  expectedCal:105, expectedCarbs:27,  expectedProtein:1,  expectedFat:0  },
  { item:'apple',            rawAmount:'1 piece', expectedGrams:182,  expectedCal:95,  expectedCarbs:25,  expectedProtein:0,  expectedFat:0  },
  { item:'lemon juice',      rawAmount:'1 tbsp',  expectedGrams:15,   expectedCal:4,   expectedCarbs:1,   expectedProtein:0,  expectedFat:0  },
  { item:'tomato',           rawAmount:'1 piece', expectedGrams:123,  expectedCal:22,  expectedCarbs:5,   expectedProtein:1,  expectedFat:0  },
  { item:'onion',            rawAmount:'1 piece', expectedGrams:110,  expectedCal:44,  expectedCarbs:10,  expectedProtein:1,  expectedFat:0  },
  { item:'garlic clove',     rawAmount:'2 piece', expectedGrams:10,   expectedCal:15,  expectedCarbs:3,   expectedProtein:1,  expectedFat:0  },

  // ── Proteins ──────────────────────────────────────────────────────────────
  { item:'chicken breast',   rawAmount:'1 piece', expectedGrams:174,  expectedCal:186, expectedCarbs:0,   expectedProtein:35, expectedFat:4  },
  { item:'salmon',           rawAmount:'100 g',   expectedGrams:100,  expectedCal:208, expectedCarbs:0,   expectedProtein:20, expectedFat:13 },
  { item:'ground beef',      rawAmount:'100 g',   expectedGrams:100,  expectedCal:254, expectedCarbs:0,   expectedProtein:17, expectedFat:20 },

  // ── Cocoa & chocolate ────────────────────────────────────────────────────
  { item:'cocoa powder',     rawAmount:'1 tbsp',  expectedGrams:5,    expectedCal:12,  expectedCarbs:3,   expectedProtein:1,  expectedFat:1  },
  { item:'dark chocolate',   rawAmount:'30 g',    expectedGrams:30,   expectedCal:170, expectedCarbs:13,  expectedProtein:2,  expectedFat:12 },

  // ── Pantry ────────────────────────────────────────────────────────────────
  { item:'peanut butter',    rawAmount:'2 tbsp',  expectedGrams:32,   expectedCal:191, expectedCarbs:7,   expectedProtein:7,  expectedFat:16 },
  { item:'soy sauce',        rawAmount:'1 tbsp',  expectedGrams:17,   expectedCal:11,  expectedCarbs:1,   expectedProtein:1,  expectedFat:0  },
  { item:'tomato paste',     rawAmount:'1 tbsp',  expectedGrams:16,   expectedCal:13,  expectedCarbs:3,   expectedProtein:1,  expectedFat:0  },
  { item:'coconut milk',     rawAmount:'0.5 cup', expectedGrams:120,  expectedCal:223, expectedCarbs:3,   expectedProtein:2,  expectedFat:24 },
  { item:'chicken broth',    rawAmount:'1 cup',   expectedGrams:240,  expectedCal:15,  expectedCarbs:1,   expectedProtein:2,  expectedFat:0  },

  // ── Seeds & nuts ──────────────────────────────────────────────────────────
  { item:'chia seed',        rawAmount:'1 tbsp',  expectedGrams:10,   expectedCal:49,  expectedCarbs:4,   expectedProtein:2,  expectedFat:3  },
  { item:'almond',           rawAmount:'0.25 cup',expectedGrams:36,   expectedCal:207, expectedCarbs:8,   expectedProtein:8,  expectedFat:18 },
  { item:'walnut',           rawAmount:'0.25 cup',expectedGrams:29,   expectedCal:196, expectedCarbs:4,   expectedProtein:5,  expectedFat:20 },

  // ── Zero-macro ingredients ───────────────────────────────────────────────
  { item:'water',            rawAmount:'1 cup',   expectedGrams:240,  expectedCal:0,   expectedCarbs:0,   expectedProtein:0,  expectedFat:0,  tolerance:0.01 },
  { item:'salt',             rawAmount:'1 tsp',   expectedGrams:6,    expectedCal:0,   expectedCarbs:0,   expectedProtein:0,  expectedFat:0,  tolerance:0.01 },
  { item:'kosher salt',      rawAmount:'1 tsp',   expectedGrams:5,    expectedCal:0,   expectedCarbs:0,   expectedProtein:0,  expectedFat:0,  tolerance:0.01 },
  { item:'baking soda',      rawAmount:'1 tsp',   expectedGrams:5,    expectedCal:0,   expectedCarbs:0,   expectedProtein:0,  expectedFat:0,  tolerance:0.01 },

  // ── Baking leaveners ─────────────────────────────────────────────────────
  { item:'baking powder',    rawAmount:'1 tsp',   expectedGrams:4,    expectedCal:2,   expectedCarbs:1,   expectedProtein:0,  expectedFat:0  },
  { item:'vanilla extract',  rawAmount:'1 tsp',   expectedGrams:4,    expectedCal:12,  expectedCarbs:1,   expectedProtein:0,  expectedFat:0  },
  { item:'ladyfingers',      rawAmount:'12 piece',expectedGrams:132,  expectedCal:487, expectedCarbs:91,  expectedProtein:11, expectedFat:9  },
];

// ── Shared logic (mirrors nutrition.js) ──────────────────────────────────
const TO_GRAMS = {
  g:1,gram:1,grams:1,kg:1000,
  oz:28.3495,ounce:28.3495,ounces:28.3495,
  lb:453.592,lbs:453.592,pound:453.592,pounds:453.592,
  cup:240,cups:240,
  tbsp:14.787,tablespoon:14.787,tablespoons:14.787,
  tsp:4.929,teaspoon:4.929,teaspoons:4.929,
  ml:1,milliliter:1,milliliters:1,
  l:1000,liter:1000,liters:1000,
  pinch:0.36,dash:0.6,handful:30,
};
const COUNTABLE = {
  egg:50,eggs:50,'whole egg':50,'large egg':57,'large eggs':57,'medium egg':44,'small egg':38,
  'chicken breast':174,'chicken thigh':130,
  banana:118,apple:182,orange:131,lemon:84,lime:67,tomato:123,
  onion:110,shallot:30,potato:213,carrot:61,clove:5,cloves:5,
  'garlic clove':5,'garlic cloves':5,
  'ladyfinger':11,'ladyfingers':11,'savoiardi':11,
  cookie:16,cookies:16,biscuit:16,biscuits:16,
  stalk:40,stalks:40,sprig:2,sprigs:2,strip:15,strips:15,slice:28,piece:50,
  'egg yolk':17,'egg yolks':17,'egg white':33,'egg whites':33,
};
const LIQUID_DENSITY = {
  'milk':1.03,'cream':1.01,'heavy cream':1.01,'whipping cream':1.01,
  'double cream':1.01,'sour cream':0.96,'yogurt':1.04,
  'oil':0.92,'olive oil':0.92,'vegetable oil':0.92,'coconut oil':0.92,
  'butter':0.91,'honey':1.42,'maple syrup':1.32,
  'water':1.0,'broth':1.0,'stock':1.0,
  'coffee':1.0,'espresso':1.0,'juice':1.05,
  'vinegar':1.01,'soy sauce':1.18,'coconut milk':1.02,
};
const DRY_CUP_WEIGHTS = {
  'flour':125,'all-purpose flour':125,'bread flour':127,'whole wheat flour':120,
  'self-raising flour':125,'almond flour':96,'cornstarch':128,'corn starch':128,
  'powdered sugar':120,'icing sugar':120,'brown sugar':220,
  'granulated sugar':200,'white sugar':200,'caster sugar':200,'sugar':200,
  'cocoa powder':85,'cocoa':85,
  'oats':90,'rolled oats':90,'oatmeal':90,'instant oats':90,'quick oats':90,
  'breadcrumbs':108,'bread crumbs':108,
  'rice':185,'basmati rice':185,'jasmine rice':185,'brown rice':195,
  'quinoa':170,'couscous':173,'cornmeal':138,'polenta':138,
  'salt':288,'parmesan':100,'shredded cheese':113,
  'sundried tomato':55,'sun-dried tomato':55,
  'almond':143,'almonds':143,'walnut':117,'walnuts':117,
  'pecan':109,'pecans':109,'cashew':137,'peanut':146,
  'sesame seed':144,'chia seed':160,'chia seeds':160,
};
const DRY_SYNONYMS = {
  'oatmeal':'oats','instant oatmeal':'oats','quick oats':'oats',
  'rolled oat':'oats','porridge oats':'oats',
  'all purpose flour':'flour','all-purpose flour':'flour',
  'plain flour':'flour','bread flour':'flour','self raising flour':'flour',
  'whole wheat flour':'flour','ap flour':'flour',
  'powdered sugar':'powdered sugar','icing sugar':'powdered sugar','confectioners sugar':'powdered sugar',
  'granulated sugar':'granulated sugar','caster sugar':'granulated sugar',
  'white sugar':'granulated sugar','cane sugar':'granulated sugar',
  'dutch process cocoa':'cocoa powder','cocoa':'cocoa powder','unsweetened cocoa':'cocoa powder',
};
const ZERO_MACRO = new Set(['water','salt','kosher salt','sea salt','table salt','baking soda','bicarbonate','gelatin','black pepper','white pepper','pepper']);

function parseAmount(str, itemName) {
  if (!str) return { grams:null, qty:1, unit:'' };
  let s = str.trim().toLowerCase()
    .replace(/½/g,'0.5').replace(/¼/g,'0.25').replace(/¾/g,'0.75')
    .replace(/⅓/g,'0.333').replace(/⅔/g,'0.667').replace(/⅛/g,'0.125');
  let qty, unit, m;
  if ((m=s.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)/))) { qty=parseFloat(m[1])+parseFloat(m[2])/parseFloat(m[3]); unit=m[4].trim().split(/\s/)[0]; }
  else if ((m=s.match(/^(\d+)\/(\d+)\s*(.*)/))) { qty=parseFloat(m[1])/parseFloat(m[2]); unit=m[3].trim().split(/\s/)[0]; }
  else if ((m=s.match(/^([\d.]+)\s*[-–]\s*([\d.]+)\s*(.*)/))) { qty=(parseFloat(m[1])+parseFloat(m[2]))/2; unit=m[3].trim().split(/\s/)[0]; }
  else if ((m=s.match(/^([\d.]+)\s*(.*)/))) { qty=parseFloat(m[1]); unit=m[2].trim().split(/\s/)[0].replace(/[.,]$/,''); }
  else return { grams:null, qty:1, unit:'' };
  return toGrams(qty, unit, itemName);
}

function toGrams(qty, unit, itemName) {
  const u=(unit||'').toLowerCase().replace(/[.,]$/,'');
  const name=(itemName||'').toLowerCase();
  const f=TO_GRAMS[u]??TO_GRAMS[u.replace(/s$/, '')];
  if (f!=null) {
    let grams=qty*f;
    const volUnits=new Set(['cup','cups','tbsp','tablespoon','tablespoons','tsp','teaspoon','teaspoons']);
    if (volUnits.has(u)) {
      const resolvedName=DRY_SYNONYMS[name]||name;
      const isDryMatch=(rName,dry)=>rName.includes(dry)||dry.includes(rName)||dry.split(' ').some(w=>w.length>3&&rName.includes(w));
      const dryEntry=Object.entries(DRY_CUP_WEIGHTS).find(([dry])=>isDryMatch(resolvedName,dry));
      if (dryEntry) {
        const [,gramsPerCup]=dryEntry;
        if (u==='cup'||u==='cups') return {grams:qty*gramsPerCup,qty,unit:u};
        if (u==='tbsp'||u==='tablespoon'||u==='tablespoons') return {grams:qty*(gramsPerCup/16),qty,unit:u};
        if (u==='tsp'||u==='teaspoon'||u==='teaspoons') return {grams:qty*(gramsPerCup/48),qty,unit:u};
      }
      for (const [liquid,density] of Object.entries(LIQUID_DENSITY)) {
        if (name.includes(liquid)) { grams*=density; break; }
      }
    }
    return {grams,qty,unit:u};
  }
  const countableUnits=new Set(['piece','pieces','slice','slices','cookie','cookies','biscuit','biscuits','cracker','crackers','stalk','stalks','sprig','sprigs','strip','strips','clove','cloves','sheet','sheets','whole']);
  if (countableUnits.has(u)||u==='') {
    for (const [k,v] of Object.entries(COUNTABLE)) {
      if (name.includes(k)||k.includes(name.split(' ')[0])) return {grams:qty*v,qty,unit:u};
    }
    const unitDefaults={piece:50,pieces:50,whole:100,slice:28,cookie:16,biscuit:16,cracker:7,stalk:40,sprig:2,clove:5,sheet:3,strip:15};
    return {grams:qty*(unitDefaults[u]??unitDefaults[u.replace(/s$/, '')]??50),qty,unit:u};
  }
  return {grams:null,qty,unit:u};
}

function estimateGrams(name, qty, unit) {
  const n=name.toLowerCase(); const u=(unit||'').toLowerCase();
  const combined=(u+' '+n).trim(); const nameWithUnit=(n+' '+u).trim();
  for (const [k,v] of Object.entries(COUNTABLE)) {
    if (combined.includes(k)||nameWithUnit.includes(k)||n.includes(k)) return qty*v;
  }
  const descriptors={large:57,medium:44,small:38,whole:50,extra:57};
  if (u&&descriptors[u]) return qty*descriptors[u];
  return qty*100;
}

// ── USDA lookup (mirrors nutrition.js) ───────────────────────────────────
const NUTRIENT_IDS={cal:[1008,2047,2048],protein:[1003],carbs:[1005],fat:[1004]};

function extractNutrients(food) {
  const ns=food.foodNutrients||[];
  const getById=(ids)=>{
    for (const id of ids) {
      const hit=ns.find(n=>n.nutrientId===id||n.nutrientNumber===String(id));
      if (hit&&hit.value>0) return hit.value;
    }
    return 0;
  };
  return {cal:getById(NUTRIENT_IDS.cal),protein:getById(NUTRIENT_IDS.protein),carbs:getById(NUTRIENT_IDS.carbs),fat:getById(NUTRIENT_IDS.fat)};
}

async function searchUSDA(query) {
  const nutrients=[...NUTRIENT_IDS.cal,...NUTRIENT_IDS.protein,...NUTRIENT_IDS.carbs,...NUTRIENT_IDS.fat].join('&nutrients=');
  const url=`${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy,Branded&pageSize=10&nutrients=${nutrients}&api_key=${USDA_API_KEY}`;
  const r=await fetch(url);
  if (!r.ok) return [];
  const d=await r.json();
  return d.foods||[];
}

const ALIASES = {
  'ladyfinger':'cookies ladyfingers','ladyfingers':'cookies ladyfingers','savoiardi':'cookies ladyfingers',
  'all purpose flour':'wheat flour all-purpose','all-purpose flour':'wheat flour all-purpose','plain flour':'wheat flour all-purpose',
  'bread flour':'wheat flour bread','self raising flour':'wheat flour self-rising',
  'mascarpone':'mascarpone','heavy cream':'cream heavy whipping','double cream':'cream heavy whipping',
  'whole milk':'milk whole 3.25%','skim milk':'milk nonfat','2% milk':'milk reduced fat',
  'butter':'butter without salt','cream cheese':'cream cheese','sour cream':'sour cream cultured',
  'greek yogurt':'yogurt greek plain','greek yoghurt':'yogurt greek plain',
  'parmesan':'cheese parmesan grated','mozzarella':'cheese mozzarella',
  'ricotta':'cheese ricotta','mascarpone':'mascarpone',
  'white sugar':'sugars granulated','granulated sugar':'sugars granulated','caster sugar':'sugars granulated',
  'brown sugar':'sugars brown','powdered sugar':'sugars powdered','icing sugar':'sugars powdered',
  'honey':'honey','maple syrup':'syrups maple',
  'egg yolk':'egg yolk raw fresh','egg yolks':'egg yolk raw fresh',
  'egg white':'egg white raw fresh','egg whites':'egg white raw fresh',
  'egg':'egg whole raw fresh','eggs':'egg whole raw fresh',
  'cocoa powder':'cocoa powder unsweetened','vanilla extract':'vanilla extract',
  'baking soda':'leavening baking soda','baking powder':'leavening baking powder',
  'olive oil':'oil olive','vegetable oil':'oil vegetable','coconut oil':'oil coconut','sesame oil':'oil sesame',
  'espresso':'beverages coffee brewed espresso','chicken broth':'soup chicken broth',
  'tomato paste':'tomato paste','coconut milk':'coconut milk',
  'peanut butter':'peanut butter smooth','soy sauce':'soy sauce',
  'oatmeal':'cereals oatmeal cooked','rolled oats':'oats rolled',
  'water':'water tap drinking','warm water':'water tap drinking',
  'salt':'salt table','kosher salt':'salt table','sea salt':'salt table',
  'lemon juice':'lemon juice raw','lime juice':'lime juice raw',
  'chia seed':'seeds chia dried','chia seeds':'seeds chia dried',
  'almond':'nuts almonds','almonds':'nuts almonds',
  'walnut':'nuts walnuts','walnuts':'nuts walnuts',
  'salmon':'fish salmon atlantic','ground beef':'beef ground 80% lean',
  'chicken breast':'chicken broilers or fryers breast',
  'dark chocolate':'chocolate dark 70-85%',
};
const STRIP=new Set(['fresh','dried','frozen','canned','cooked','raw','whole','chopped','diced','minced','sliced','grated','shredded','peeled','boneless','skinless','unsalted','salted','large','medium','small','extra','organic','softened','melted','beaten','room','temperature','optional']);

function cleanName(raw) {
  let name=raw.toLowerCase().replace(/\(.*?\)/g,'').replace(/,.*$/,'').replace(/\bor\b.*/g,'').trim();
  let best=null,bestLen=0;
  for (const [k,v] of Object.entries(ALIASES)) {
    if (name.includes(k)&&k.length>bestLen){best=v;bestLen=k.length;}
  }
  if (best) return best;
  const words=name.split(/\s+/).filter(w=>!STRIP.has(w)&&w.length>1);
  return words.join(' ')||raw.toLowerCase();
}

function pickBest(foods, itemName) {
  const name=(itemName||'').toLowerCase();
  const isZeroMacro=[...ZERO_MACRO].some(z=>name.includes(z));
  let best=null,bestScore=-1;
  for (const food of foods) {
    const n=extractNutrients(food);
    let score;
    if (isZeroMacro) {
      score=(n.cal===0?3:0)+(n.carbs===0?3:-5)+(n.fat===0?1:0);
    } else {
      score=(n.cal>0?2:0)+(n.protein>0?1:0)+(n.carbs>0?2:0)+(n.fat>0?1:0);
    }
    if (score>bestScore){bestScore=score;best=food;}
  }
  return (isZeroMacro&&best)?best:(bestScore>0?best:null);
}

async function lookupIngredient(item, rawAmount) {
  const parsed=parseAmount(rawAmount,item);
  let grams=parsed.grams;
  if (!grams&&parsed.qty) grams=estimateGrams(item,parsed.qty,parsed.unit);
  if (!grams||grams<=0) grams=100;

  const cleaned=cleanName(item);
  const queries=[cleaned,cleaned.split(' ').slice(0,3).join(' '),cleaned.split(' ').slice(0,2).join(' '),cleaned.split(' ')[0]];
  let food=null;
  for (const q of [...new Set(queries)]) {
    if (!q||q.length<2) continue;
    const foods=await searchUSDA(q);
    const best=pickBest(foods,item);
    if (best){food=best;break;}
  }
  if (!food) return {grams,matchedFood:null,cal:null,protein:null,carbs:null,fat:null};

  const per100g=extractNutrients(food);
  const scale=grams/100;
  return {
    grams:Math.round(grams),
    matchedFood:food.description,
    fdcId:food.fdcId,
    per100g,
    cal:Math.round(per100g.cal*scale),
    protein:parseFloat((per100g.protein*scale).toFixed(1)),
    carbs:parseFloat((per100g.carbs*scale).toFixed(1)),
    fat:parseFloat((per100g.fat*scale).toFixed(1)),
  };
}

// ── Test runner ───────────────────────────────────────────────────────────
function pct(got, expected) {
  if (expected===0) return got===0?0:Infinity;
  return Math.abs(got-expected)/expected;
}

function grade(result, tc) {
  const tol=tc.tolerance??0.20;
  const issues=[];
  if (Math.abs(result.grams-tc.expectedGrams)/tc.expectedGrams>0.10) {
    issues.push(`grams: got ${result.grams}, expected ${tc.expectedGrams}`);
  }
  if (tc.expectedCal>0&&pct(result.cal,tc.expectedCal)>tol) {
    issues.push(`cal: got ${result.cal}, expected ${tc.expectedCal} (${Math.round(pct(result.cal,tc.expectedCal)*100)}% off)`);
  }
  if (tc.expectedCarbs>2&&pct(result.carbs,tc.expectedCarbs)>tol) {
    issues.push(`carbs: got ${result.carbs}, expected ${tc.expectedCarbs} (${Math.round(pct(result.carbs,tc.expectedCarbs)*100)}% off)`);
  }
  if (tc.expectedProtein>2&&pct(result.protein,tc.expectedProtein)>tol) {
    issues.push(`protein: got ${result.protein}, expected ${tc.expectedProtein} (${Math.round(pct(result.protein,tc.expectedProtein)*100)}% off)`);
  }
  if (tc.expectedFat>2&&pct(result.fat,tc.expectedFat)>tol) {
    issues.push(`fat: got ${result.fat}, expected ${tc.expectedFat} (${Math.round(pct(result.fat,tc.expectedFat)*100)}% off)`);
  }
  // Zero-macro checks
  if (tc.expectedCal===0&&result.cal>2) issues.push(`cal should be 0, got ${result.cal}`);
  if (tc.expectedCarbs===0&&result.carbs>1) issues.push(`carbs should be 0, got ${result.carbs}`);
  return issues;
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!USDA_API_KEY) return res.status(500).json({error:'USDA_API_KEY not set'});

  const startTime=Date.now();
  const results=[];
  let passed=0,failed=0,errors=0;

  for (const tc of TEST_CASES) {
    try {
      const result=await lookupIngredient(tc.item,tc.rawAmount);
      const issues=grade(result,tc);
      const ok=issues.length===0;
      if (ok) passed++; else failed++;
      results.push({
        item:tc.item,
        amount:tc.rawAmount,
        status:ok?'✓ pass':'✗ fail',
        matchedFood:result.matchedFood||'NOT FOUND',
        grams:{got:result.grams,expected:tc.expectedGrams},
        cal:{got:result.cal,expected:tc.expectedCal},
        carbs:{got:result.carbs,expected:tc.expectedCarbs},
        protein:{got:result.protein,expected:tc.expectedProtein},
        fat:{got:result.fat,expected:tc.expectedFat},
        issues,
      });
    } catch(e) {
      errors++;
      results.push({item:tc.item,amount:tc.rawAmount,status:'⚠ error',error:e.message,issues:[e.message]});
    }
  }

  const elapsed=((Date.now()-startTime)/1000).toFixed(1);
  const total=TEST_CASES.length;
  const score=Math.round(passed/total*100);

  const failing=results.filter(r=>r.status!=='✓ pass');
  const passing=results.filter(r=>r.status==='✓ pass');

  return res.status(200).json({
    summary:{
      score:`${score}%`,
      passed,failed,errors,total,
      elapsed:`${elapsed}s`,
      timestamp:new Date().toISOString(),
    },
    failing,
    passing,
  });
}
