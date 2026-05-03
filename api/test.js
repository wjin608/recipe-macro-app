// api/test.js — Nutrition accuracy test suite
// Visit /api/test in your browser to see the dashboard
// Fetches /api/test?run=1 as JSON internally

const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

// ── Test cases ────────────────────────────────────────────────────────────
const TEST_CASES = [
  // Grains
  { item:'oatmeal',           rawAmount:'1 cup',    expectedGrams:90,  expectedCal:307, expectedCarbs:55,  expectedProtein:11, expectedFat:5  },
  { item:'rolled oats',       rawAmount:'0.5 cup',  expectedGrams:45,  expectedCal:172, expectedCarbs:31,  expectedProtein:6,  expectedFat:3  },
  { item:'bread flour',       rawAmount:'1 cup',    expectedGrams:127, expectedCal:455, expectedCarbs:95,  expectedProtein:15, expectedFat:1  },
  { item:'all purpose flour', rawAmount:'0.25 cup', expectedGrams:31,  expectedCal:113, expectedCarbs:24,  expectedProtein:3,  expectedFat:0  },
  { item:'white rice',        rawAmount:'1 cup',    expectedGrams:185, expectedCal:675, expectedCarbs:149, expectedProtein:13, expectedFat:1  },
  { item:'pasta',             rawAmount:'100 g',    expectedGrams:100, expectedCal:371, expectedCarbs:75,  expectedProtein:13, expectedFat:2  },
  { item:'quinoa',            rawAmount:'0.5 cup',  expectedGrams:85,  expectedCal:313, expectedCarbs:55,  expectedProtein:12, expectedFat:5  },
  { item:'breadcrumbs',       rawAmount:'0.25 cup', expectedGrams:27,  expectedCal:104, expectedCarbs:20,  expectedProtein:3,  expectedFat:1  },
  // Sugars
  { item:'white sugar',       rawAmount:'1 tbsp',   expectedGrams:13,  expectedCal:49,  expectedCarbs:13,  expectedProtein:0,  expectedFat:0  },
  { item:'brown sugar',       rawAmount:'1 tbsp',   expectedGrams:14,  expectedCal:52,  expectedCarbs:13,  expectedProtein:0,  expectedFat:0,  tolerance:0.25 },
  { item:'honey',             rawAmount:'1 tbsp',   expectedGrams:21,  expectedCal:64,  expectedCarbs:17,  expectedProtein:0,  expectedFat:0  },
  { item:'maple syrup',       rawAmount:'1 tbsp',   expectedGrams:20,  expectedCal:52,  expectedCarbs:13,  expectedProtein:0,  expectedFat:0  },
  { item:'powdered sugar',    rawAmount:'0.25 cup', expectedGrams:30,  expectedCal:116, expectedCarbs:30,  expectedProtein:0,  expectedFat:0  },
  // Dairy
  { item:'whole milk',        rawAmount:'1 cup',    expectedGrams:244, expectedCal:149, expectedCarbs:12,  expectedProtein:8,  expectedFat:8  },
  { item:'2% milk',           rawAmount:'0.5 cup',  expectedGrams:122, expectedCal:61,  expectedCarbs:6,   expectedProtein:4,  expectedFat:2  },
  { item:'heavy cream',       rawAmount:'0.25 cup', expectedGrams:60,  expectedCal:206, expectedCarbs:2,   expectedProtein:1,  expectedFat:22 },
  { item:'butter',            rawAmount:'1 tbsp',   expectedGrams:14,  expectedCal:102, expectedCarbs:0,   expectedProtein:0,  expectedFat:12 },
  { item:'cream cheese',      rawAmount:'2 tbsp',   expectedGrams:29,  expectedCal:99,  expectedCarbs:1,   expectedProtein:2,  expectedFat:10 },
  { item:'greek yogurt',      rawAmount:'100 g',    expectedGrams:100, expectedCal:61,  expectedCarbs:4,   expectedProtein:10, expectedFat:1  },
  { item:'sour cream',        rawAmount:'2 tbsp',   expectedGrams:29,  expectedCal:60,  expectedCarbs:1,   expectedProtein:1,  expectedFat:6  },
  { item:'mascarpone',        rawAmount:'100 g',    expectedGrams:100, expectedCal:367, expectedCarbs:4,   expectedProtein:4,  expectedFat:37 },
  { item:'parmesan',          rawAmount:'1 tbsp',   expectedGrams:6,   expectedCal:26,  expectedCarbs:0,   expectedProtein:2,  expectedFat:2  },
  { item:'mozzarella',        rawAmount:'50 g',     expectedGrams:50,  expectedCal:149, expectedCarbs:1,   expectedProtein:10, expectedFat:11 },
  { item:'ricotta',           rawAmount:'0.5 cup',  expectedGrams:120, expectedCal:180, expectedCarbs:9,   expectedProtein:9,  expectedFat:12 },
  // Eggs
  { item:'egg',               rawAmount:'1 piece',  expectedGrams:50,  expectedCal:72,  expectedCarbs:0,   expectedProtein:6,  expectedFat:5  },
  { item:'egg yolk',          rawAmount:'2 piece',  expectedGrams:34,  expectedCal:110, expectedCarbs:1,   expectedProtein:5,  expectedFat:9  },
  { item:'egg white',         rawAmount:'2 piece',  expectedGrams:66,  expectedCal:34,  expectedCarbs:0,   expectedProtein:7,  expectedFat:0  },
  // Oils
  { item:'olive oil',         rawAmount:'1 tbsp',   expectedGrams:14,  expectedCal:119, expectedCarbs:0,   expectedProtein:0,  expectedFat:14 },
  { item:'vegetable oil',     rawAmount:'1 tbsp',   expectedGrams:14,  expectedCal:120, expectedCarbs:0,   expectedProtein:0,  expectedFat:14 },
  { item:'coconut oil',       rawAmount:'1 tbsp',   expectedGrams:14,  expectedCal:121, expectedCarbs:0,   expectedProtein:0,  expectedFat:14 },
  { item:'sesame oil',        rawAmount:'1 tsp',    expectedGrams:5,   expectedCal:40,  expectedCarbs:0,   expectedProtein:0,  expectedFat:5  },
  // Produce
  { item:'banana',            rawAmount:'1 piece',  expectedGrams:118, expectedCal:105, expectedCarbs:27,  expectedProtein:1,  expectedFat:0  },
  { item:'apple',             rawAmount:'1 piece',  expectedGrams:182, expectedCal:95,  expectedCarbs:25,  expectedProtein:0,  expectedFat:0  },
  { item:'lemon juice',       rawAmount:'1 tbsp',   expectedGrams:16,  expectedCal:3,   expectedCarbs:1,   expectedProtein:0,  expectedFat:0  },
  { item:'tomato',            rawAmount:'1 piece',  expectedGrams:123, expectedCal:22,  expectedCarbs:5,   expectedProtein:1,  expectedFat:0  },
  { item:'onion',             rawAmount:'1 piece',  expectedGrams:110, expectedCal:44,  expectedCarbs:10,  expectedProtein:1,  expectedFat:0  },
  { item:'garlic clove',      rawAmount:'2 piece',  expectedGrams:10,  expectedCal:15,  expectedCarbs:3,   expectedProtein:1,  expectedFat:0  },
  // Proteins
  { item:'chicken breast',    rawAmount:'1 piece',  expectedGrams:174, expectedCal:165, expectedCarbs:0,   expectedProtein:31, expectedFat:3  },
  { item:'salmon',            rawAmount:'100 g',    expectedGrams:100, expectedCal:208, expectedCarbs:0,   expectedProtein:20, expectedFat:13 },
  { item:'ground beef',       rawAmount:'100 g',    expectedGrams:100, expectedCal:254, expectedCarbs:0,   expectedProtein:17, expectedFat:20 },
  // Baking
  { item:'cocoa powder',      rawAmount:'1 tbsp',   expectedGrams:5,   expectedCal:12,  expectedCarbs:3,   expectedProtein:1,  expectedFat:1  },
  { item:'dark chocolate',    rawAmount:'30 g',     expectedGrams:30,  expectedCal:170, expectedCarbs:13,  expectedProtein:2,  expectedFat:12 },
  { item:'baking powder',     rawAmount:'1 tsp',    expectedGrams:5,   expectedCal:5,   expectedCarbs:2,   expectedProtein:0,  expectedFat:0  },
  { item:'vanilla extract',   rawAmount:'1 tsp',    expectedGrams:5,   expectedCal:14,  expectedCarbs:1,   expectedProtein:0,  expectedFat:0  },
  { item:'ladyfingers',       rawAmount:'12 piece', expectedGrams:132, expectedCal:482, expectedCarbs:79,  expectedProtein:14, expectedFat:12 },
  // Pantry
  { item:'peanut butter',     rawAmount:'2 tbsp',   expectedGrams:32,  expectedCal:191, expectedCarbs:7,   expectedProtein:7,  expectedFat:16 },
  { item:'soy sauce',         rawAmount:'1 tbsp',   expectedGrams:17,  expectedCal:11,  expectedCarbs:1,   expectedProtein:1,  expectedFat:0  },
  { item:'tomato paste',      rawAmount:'1 tbsp',   expectedGrams:16,  expectedCal:13,  expectedCarbs:3,   expectedProtein:1,  expectedFat:0  },
  { item:'coconut milk',      rawAmount:'0.5 cup',  expectedGrams:120, expectedCal:200, expectedCarbs:3,   expectedProtein:2,  expectedFat:21,  tolerance:0.30 },
  { item:'chicken broth',     rawAmount:'1 cup',    expectedGrams:240, expectedCal:15,  expectedCarbs:1,   expectedProtein:2,  expectedFat:0  },
  // Seeds & nuts
  { item:'chia seed',         rawAmount:'1 tbsp',   expectedGrams:10,  expectedCal:49,  expectedCarbs:4,   expectedProtein:2,  expectedFat:3  },
  { item:'almond',            rawAmount:'0.25 cup', expectedGrams:36,  expectedCal:207, expectedCarbs:8,   expectedProtein:8,  expectedFat:18 },
  { item:'walnut',            rawAmount:'0.25 cup', expectedGrams:29,  expectedCal:196, expectedCarbs:4,   expectedProtein:5,  expectedFat:20 },
  // Zero-macro
  { item:'water',             rawAmount:'1 cup',    expectedGrams:240, expectedCal:0,   expectedCarbs:0,   expectedProtein:0,  expectedFat:0,  tolerance:0.01 },
  { item:'salt',              rawAmount:'1 tsp',    expectedGrams:6,   expectedCal:0,   expectedCarbs:0,   expectedProtein:0,  expectedFat:0,  tolerance:0.01 },
  { item:'kosher salt',       rawAmount:'1 tsp',    expectedGrams:6,   expectedCal:0,   expectedCarbs:0,   expectedProtein:0,  expectedFat:0,  tolerance:0.01 },
  { item:'baking soda',       rawAmount:'1 tsp',    expectedGrams:5,   expectedCal:0,   expectedCarbs:0,   expectedProtein:0,  expectedFat:0,  tolerance:0.01 },
];

// ── Shared logic (mirrors nutrition.js) ───────────────────────────────────
const TO_GRAMS = { g:1,gram:1,grams:1,kg:1000,oz:28.3495,ounce:28.3495,ounces:28.3495,lb:453.592,lbs:453.592,pound:453.592,pounds:453.592,cup:240,cups:240,tbsp:14.787,tablespoon:14.787,tablespoons:14.787,tsp:4.929,teaspoon:4.929,teaspoons:4.929,ml:1,milliliter:1,milliliters:1,l:1000,liter:1000,liters:1000,pinch:0.36,dash:0.6,handful:30 };
const COUNTABLE = { egg:50,eggs:50,'whole egg':50,'whole eggs':50,'large egg':57,'large eggs':57,'medium egg':44,'small egg':38,'chicken breast':174,'chicken thigh':130,banana:118,apple:182,orange:131,lemon:84,lime:67,tomato:123,onion:110,shallot:30,potato:213,carrot:61,clove:5,cloves:5,'garlic clove':5,'garlic cloves':5,'ladyfinger':11,'ladyfingers':11,'savoiardi':11,cookie:16,cookies:16,biscuit:16,biscuits:16,stalk:40,stalks:40,sprig:2,sprigs:2,strip:15,strips:15,slice:28,piece:50,'egg yolk':17,'egg yolks':17,'egg white':33,'egg whites':33 };
const LIQUID_DENSITY = { 'milk':1.03,'cream':1.01,'heavy cream':1.01,'whipping cream':1.01,'double cream':1.01,'sour cream':0.96,'yogurt':1.04,'oil':0.92,'olive oil':0.92,'vegetable oil':0.92,'coconut oil':0.92,'butter':0.91,'honey':1.42,'maple syrup':1.32,'water':1.0,'broth':1.0,'stock':1.0,'coffee':1.0,'espresso':1.0,'juice':1.05,'vinegar':1.01,'soy sauce':1.18,'coconut milk':1.02,'tomato paste':1.07,'cream cheese':1.0,'tahini':0.95 };
const DRY_CUP_WEIGHTS = { 'flour':125,'all-purpose flour':125,'bread flour':127,'whole wheat flour':120,'self-raising flour':125,'almond flour':96,'cornstarch':128,'corn starch':128,'powdered sugar':120,'icing sugar':120,'brown sugar':220,'granulated sugar':200,'white sugar':200,'caster sugar':200,'sugar':200,'cocoa powder':85,'cocoa':85,'whole milk':244,'milk':244,'2% milk':244,'skim milk':245,'almond milk':240,'oat milk':240,'soy milk':243,'buttermilk':245,'oats':90,'rolled oats':90,'oatmeal':90,'instant oats':90,'quick oats':90,'breadcrumbs':108,'bread crumbs':108,'rice':185,'basmati rice':185,'jasmine rice':185,'brown rice':195,'quinoa':170,'couscous':173,'cornmeal':138,'polenta':138,'salt':288,'parmesan':100,'shredded cheese':113,'peanut butter':258,'almond butter':258,'tahini':240,'sundried tomato':55,'sun-dried tomato':55,'almond':143,'almonds':143,'walnut':117,'walnuts':117,'pecan':109,'pecans':109,'cashew':137,'peanut':146,'sesame seed':144,'chia seed':160,'chia seeds':160 };
const DRY_SYNONYMS = { 'oatmeal':'oats','instant oatmeal':'oats','quick oats':'oats','rolled oat':'oats','porridge oats':'oats','all purpose flour':'flour','all-purpose flour':'flour','plain flour':'flour','bread flour':'flour','self raising flour':'flour','whole wheat flour':'flour','ap flour':'flour','powdered sugar':'powdered sugar','icing sugar':'powdered sugar','confectioners sugar':'powdered sugar','granulated sugar':'granulated sugar','caster sugar':'granulated sugar','white sugar':'granulated sugar','cane sugar':'granulated sugar','dutch process cocoa':'cocoa powder','cocoa':'cocoa powder','unsweetened cocoa':'cocoa powder','whole milk':'milk','2% milk':'milk','skim milk':'milk','low fat milk':'milk','nonfat milk':'milk' };
const ZERO_MACRO = new Set(['water','salt','kosher salt','sea salt','table salt','baking soda','bicarbonate','gelatin','black pepper','white pepper','pepper']);

const ALIASES = { 'ladyfinger':'cookies ladyfingers','ladyfingers':'cookies ladyfingers','savoiardi':'cookies ladyfingers','all purpose flour':'wheat flour all-purpose','all-purpose flour':'wheat flour all-purpose','plain flour':'wheat flour all-purpose','bread flour':'wheat flour bread','self raising flour':'wheat flour self-rising','mascarpone':'mascarpone','heavy cream':'cream heavy whipping','double cream':'cream heavy whipping','whole milk':'milk whole 3.25%','skim milk':'milk nonfat','2% milk':'milk reduced fat 2% milkfat','butter':'butter without salt','cream cheese':'cream cheese','sour cream':'sour cream cultured','greek yogurt':'yogurt greek plain','greek yoghurt':'yogurt greek plain','parmesan':'cheese parmesan grated','mozzarella':'cheese mozzarella whole milk','ricotta':'cheese ricotta whole milk','white sugar':'sugars white granulated','granulated sugar':'sugars white granulated','caster sugar':'sugars white granulated','cane sugar':'sugars white granulated','brown sugar':'sugars brown packed','powdered sugar':'sugars powdered confectioners','icing sugar':'sugars powdered confectioners','honey':'honey','maple syrup':'syrups maple','egg yolk':'egg yolk raw fresh','egg yolks':'egg yolk raw fresh','egg white':'egg white raw fresh','egg whites':'egg white raw fresh','egg':'egg whole raw fresh','eggs':'egg whole raw fresh','cocoa powder':'cocoa powder unsweetened','vanilla extract':'vanilla extract','baking soda':'leavening baking soda','baking powder':'leavening baking powder','olive oil':'oil olive salad or cooking','vegetable oil':'oil vegetable salad or cooking','coconut oil':'oil coconut','sesame oil':'oil sesame salad or cooking','espresso':'beverages coffee brewed espresso','banana':'bananas raw','apple':'apples raw','tomato':'tomatoes red ripe raw','onion':'onions raw','garlic clove':'garlic raw','garlic':'garlic raw','chicken breast':'chicken raw breast boneless','chicken thigh':'chicken broilers fryers thigh meat only raw','salmon':'fish salmon atlantic raw','tuna':'fish tuna light canned water','shrimp':'crustaceans shrimp mixed species raw','ground beef':'beef ground 80% lean','chicken broth':'chicken broth ready-to-serve','chicken stock':'chicken broth ready-to-serve','beef broth':'soup stock beef home-prepared','beef stock':'soup stock beef home-prepared','tomato paste':'tomato paste','coconut milk':'coconut milk canned unsweetened','peanut butter':'peanut butter smooth style without salt','soy sauce':'soy sauce','oatmeal':'oats rolled old fashioned','rolled oats':'oats rolled old fashioned','water':'water tap drinking','warm water':'water tap drinking','salt':'salt table','kosher salt':'salt table','sea salt':'salt table','lemon juice':'lemon juice raw','lime juice':'lime juice raw','chia seed':'seeds chia dried','chia seeds':'seeds chia dried','almond':'nuts almonds','almonds':'nuts almonds','walnut':'nuts walnuts','walnuts':'nuts walnuts','dark chocolate':'chocolate dark 70-85%','white rice':'rice white long-grain raw','brown rice':'rice brown long-grain raw','basmati rice':'rice white long-grain raw','jasmine rice':'rice white long-grain raw','quinoa':'quinoa uncooked','almond':'nuts almonds raw','almonds':'nuts almonds raw','greek yogurt':'yogurt greek plain nonfat','mascarpone':'mascarpone cheese' };
const STRIP = new Set(['fresh','dried','frozen','canned','cooked','raw','whole','chopped','diced','minced','sliced','grated','shredded','peeled','boneless','skinless','unsalted','salted','large','medium','small','extra','organic','softened','melted','beaten','room','temperature','optional']);
const NUTRIENT_IDS = { cal:[1008,2047,2048],protein:[1003],carbs:[1005],fat:[1004] };

function parseAmount(str, itemName) {
  if (!str) return { grams:null, qty:1, unit:'' };
  let s = str.trim().toLowerCase().replace(/\u00BD/g,'0.5').replace(/\u00BC/g,'0.25').replace(/\u00BE/g,'0.75').replace(/\u2153/g,'0.333').replace(/\u2154/g,'0.667').replace(/\u215B/g,'0.125');
  let qty, unit, m;
  if ((m=s.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)/))) { qty=parseFloat(m[1])+parseFloat(m[2])/parseFloat(m[3]); unit=m[4].trim().split(/\s/)[0]; }
  else if ((m=s.match(/^(\d+)\/(\d+)\s*(.*)/))) { qty=parseFloat(m[1])/parseFloat(m[2]); unit=m[3].trim().split(/\s/)[0]; }
  else if ((m=s.match(/^([\d.]+)\s*[-\u2013]\s*([\d.]+)\s*(.*)/))) { qty=(parseFloat(m[1])+parseFloat(m[2]))/2; unit=m[3].trim().split(/\s/)[0]; }
  else if ((m=s.match(/^([\d.]+)\s*(.*)/))) { qty=parseFloat(m[1]); unit=m[2].trim().split(/\s/)[0].replace(/[.,]$/,''); }
  else return { grams:null, qty:1, unit:'' };
  return toGrams(qty, unit, itemName);
}

function toGrams(qty, unit, itemName) {
  const u=(unit||'').toLowerCase().replace(/[.,]$/,'');
  const name=(itemName||'').toLowerCase();
  const f=TO_GRAMS[u]??TO_GRAMS[u.replace(/s$/,'')];
  if (f!=null) {
    let grams=qty*f;
    const volUnits=new Set(['cup','cups','tbsp','tablespoon','tablespoons','tsp','teaspoon','teaspoons']);
    if (volUnits.has(u)) {
      const resolvedName=DRY_SYNONYMS[name]||name;
      const isDryMatch=(rName,dry)=>rName.includes(dry)||(dry===rName);
      const dryEntry=Object.entries(DRY_CUP_WEIGHTS).find(([dry])=>isDryMatch(resolvedName,dry));
      if (dryEntry) {
        const gramsPerCup=dryEntry[1];
        if (u==='cup'||u==='cups') return {grams:qty*gramsPerCup,qty,unit:u};
        if (u==='tbsp'||u==='tablespoon'||u==='tablespoons') return {grams:qty*(gramsPerCup/16),qty,unit:u};
        if (u==='tsp'||u==='teaspoon'||u==='teaspoons') return {grams:qty*(gramsPerCup/48),qty,unit:u};
      }
      for (const [liquid,density] of Object.entries(LIQUID_DENSITY)) { if (name.includes(liquid)){grams*=density;break;} }
    }
    return {grams,qty,unit:u};
  }
  const countableUnits=new Set(['piece','pieces','slice','slices','cookie','cookies','biscuit','biscuits','cracker','crackers','stalk','stalks','sprig','sprigs','strip','strips','clove','cloves','sheet','sheets','whole']);
  if (countableUnits.has(u)||u==='') {
    for (const [k,v] of Object.entries(COUNTABLE).sort((a,b)=>b[0].length-a[0].length)) { if (name.includes(k)||k.includes(name.split(' ')[0])) return {grams:qty*v,qty,unit:u}; }
    const ud={piece:50,pieces:50,whole:100,slice:28,cookie:16,biscuit:16,cracker:7,stalk:40,sprig:2,clove:5,sheet:3,strip:15};
    return {grams:qty*(ud[u]??ud[u.replace(/s$/, '')]??50),qty,unit:u};
  }
  return {grams:null,qty,unit:u};
}

function estimateGrams(name,qty,unit) {
  const n=name.toLowerCase(),u=(unit||'').toLowerCase();
  const combined=(u+' '+n).trim(),nwu=(n+' '+u).trim();
  for (const [k,v] of Object.entries(COUNTABLE).sort((a,b)=>b[0].length-a[0].length)) { if (combined.includes(k)||nwu.includes(k)||n.includes(k)) return qty*v; }
  const desc={large:57,medium:44,small:38,whole:50,extra:57};
  if (u&&desc[u]) return qty*desc[u];
  return qty*100;
}

function cleanName(raw) {
  let name=raw.toLowerCase().replace(/\(.*?\)/g,'').replace(/,.*$/,'').replace(/\bor\b.*/g,'').trim();
  let best=null,bestLen=0;
  for (const [k,v] of Object.entries(ALIASES)) { if (name.includes(k)&&k.length>bestLen){best=v;bestLen=k.length;} }
  if (best) return best;
  const words=name.split(/\s+/).filter(w=>!STRIP.has(w)&&w.length>1);
  return words.join(' ')||raw.toLowerCase();
}

function extractNutrients(food) {
  const ns=food.foodNutrients||[];
  const getById=(ids)=>{ for (const id of ids){const hit=ns.find(n=>n.nutrientId===id||n.nutrientNumber===String(id));if(hit&&hit.value>0)return hit.value;} return 0; };
  return {cal:getById(NUTRIENT_IDS.cal),protein:getById(NUTRIENT_IDS.protein),carbs:getById(NUTRIENT_IDS.carbs),fat:getById(NUTRIENT_IDS.fat)};
}

async function searchUSDA(query) {
  const nids=[...NUTRIENT_IDS.cal,...NUTRIENT_IDS.protein,...NUTRIENT_IDS.carbs,...NUTRIENT_IDS.fat].join('&nutrients=');
  const url=USDA_BASE+'/foods/search?query='+encodeURIComponent(query)+'&dataType=Foundation,SR%20Legacy,Branded&pageSize=10&nutrients='+nids+'&api_key='+USDA_API_KEY;
  const r=await fetch(url);
  if (!r.ok) return [];
  const d=await r.json();
  return d.foods||[];
}

function pickBest(foods,itemName) {
  const name=(itemName||'').toLowerCase();
  const isZero=[...ZERO_MACRO].some(z=>name.includes(z));
  let best=null,bestScore=-1;
  for (const food of foods) {
    const n=extractNutrients(food);
    const score=isZero?((n.cal===0?3:0)+(n.carbs===0?3:-5)+(n.fat===0?1:0)):((n.cal>0?2:0)+(n.protein>0?1:0)+(n.carbs>0?2:0)+(n.fat>0?1:0));
    if (score>bestScore){bestScore=score;best=food;}
  }
  return (isZero&&best)?best:(bestScore>0?best:null);
}

async function lookupIngredient(item,rawAmount) {
  const parsed=parseAmount(rawAmount,item);
  let grams=parsed.grams;
  if (!grams&&parsed.qty) grams=estimateGrams(item,parsed.qty,parsed.unit);
  if (!grams||grams<=0) grams=100;

  const cleaned=cleanName(item);
  const queries=[cleaned,cleaned.split(' ').slice(0,3).join(' '),cleaned.split(' ').slice(0,2).join(' '),cleaned.split(' ')[0]];
  let food=null, per100g=null;
  for (const q of [...new Set(queries)]) {
    if (!q||q.length<2) continue;
    const foods=await searchUSDA(q);
    const best=pickBest(foods,item);
    if (best){food=best;per100g=extractNutrients(best);break;}
  }

  if (!food) return {grams,matchedFood:null,cal:null,protein:null,carbs:null,fat:null};
  const scale=grams/100;
  return {grams:Math.round(grams),matchedFood:food.description,fdcId:food.fdcId,per100g,cal:Math.round(per100g.cal*scale),protein:parseFloat((per100g.protein*scale).toFixed(1)),carbs:parseFloat((per100g.carbs*scale).toFixed(1)),fat:parseFloat((per100g.fat*scale).toFixed(1))};
}

function pct(got,exp){if(exp===0)return got===0?0:Infinity;return Math.abs(got-exp)/exp;}

function grade(result,tc) {
  const tol=tc.tolerance??0.20;
  const issues=[];
  if(Math.abs(result.grams-tc.expectedGrams)/tc.expectedGrams>0.10) issues.push('grams: got '+result.grams+', expected '+tc.expectedGrams);
  if(tc.expectedCal>0&&pct(result.cal,tc.expectedCal)>tol) issues.push('cal: got '+result.cal+', expected '+tc.expectedCal+' ('+Math.round(pct(result.cal,tc.expectedCal)*100)+'% off)');
  if(tc.expectedCarbs>2&&pct(result.carbs,tc.expectedCarbs)>tol) issues.push('carbs: got '+result.carbs+', expected '+tc.expectedCarbs+' ('+Math.round(pct(result.carbs,tc.expectedCarbs)*100)+'% off)');
  if(tc.expectedProtein>2&&pct(result.protein,tc.expectedProtein)>tol) issues.push('protein: got '+result.protein+', expected '+tc.expectedProtein+' ('+Math.round(pct(result.protein,tc.expectedProtein)*100)+'% off)');
  if(tc.expectedFat>2&&pct(result.fat,tc.expectedFat)>tol) issues.push('fat: got '+result.fat+', expected '+tc.expectedFat+' ('+Math.round(pct(result.fat,tc.expectedFat)*100)+'% off)');
  if(tc.expectedCal===0&&result.cal>2) issues.push('cal should be 0, got '+result.cal);
  if(tc.expectedCarbs===0&&result.carbs>1) issues.push('carbs should be 0, got '+result.carbs);
  return issues;
}

// ── HTML dashboard (no backticks — uses string concatenation) ─────────────
function buildDashboard() {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0"/>'
    + '<title>Nutrition Accuracy Test</title>'
    + '<style>'
    + '*{box-sizing:border-box;margin:0;padding:0;}'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f5f5;color:#1a1a1a;padding:24px;font-size:14px;}'
    + 'h1{font-size:22px;margin-bottom:4px;}'
    + '.sub{font-size:13px;color:#666;margin-bottom:20px;}'
    + '.summary{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;}'
    + '.stat{background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:12px 18px;text-align:center;min-width:90px;}'
    + '.sv{font-size:24px;font-weight:700;display:block;}'
    + '.sl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;}'
    + '.green{color:#16a34a;}.red{color:#dc2626;}.orange{color:#d97706;}.blue{color:#2563eb;}'
    + '.sec{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#888;margin:18px 0 8px;}'
    + '.progress{height:6px;background:#e0e0e0;border-radius:99px;margin-bottom:20px;overflow:hidden;}'
    + '.pb{height:6px;border-radius:99px;}'
    + 'table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);margin-bottom:20px;}'
    + 'th{background:#f8f8f8;padding:9px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#666;border-bottom:1px solid #e0e0e0;}'
    + 'td{padding:9px 12px;border-bottom:1px solid #f0f0f0;vertical-align:top;font-size:13px;}'
    + 'tr:last-child td{border-bottom:none;}'
    + '.pass{color:#16a34a;font-weight:600;}.fail{color:#dc2626;font-weight:600;}'
    + '.nr{text-align:right;}.off{color:#dc2626;font-weight:600;}.ok{color:#16a34a;}'
    + '.issue{font-size:11px;color:#dc2626;margin-top:2px;}'
    + '.match{font-size:11px;color:#888;}'
    + '.btn{padding:8px 18px;background:#1a1a1a;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;margin-bottom:18px;}'
    + '.btn:hover{background:#333;}.btn:disabled{opacity:0.5;cursor:not-allowed;}'
    + '#st{font-size:13px;color:#666;margin-left:10px;}'
    + '</style></head><body>'
    + '<h1>Nutrition Accuracy Test Suite</h1>'
    + '<p class="sub">Tests ' + TEST_CASES.length + ' common ingredients against known USDA values. Tolerance: 20% macros, 10% grams.</p>'
    + '<button class="btn" id="rb" onclick="run()">Run tests</button><span id="st"></span>'
    + '<div id="out"></div>'
    + '<script>'
    + 'async function run(){'
    + 'var rb=document.getElementById("rb"),st=document.getElementById("st"),out=document.getElementById("out");'
    + 'rb.disabled=true;rb.textContent="Running\u2026";'
    + 'st.textContent="Testing all ingredients against USDA (\u223C60s)\u2026";'
    + 'out.innerHTML="";'
    + 'try{'
    + 'var r=await fetch("/api/test?run=1");'
    + 'var d=await r.json();'
    + 'if(d.error){st.textContent="Error: "+d.error;rb.disabled=false;rb.textContent="Run tests";return;}'
    + 'render(d);st.textContent="Done in "+d.summary.elapsed;'
    + '}catch(e){st.textContent="Error: "+e.message;}'
    + 'rb.disabled=false;rb.textContent="Run tests again";'
    + '}'
    + 'function nc(got,exp,tol){'
    + 'tol=tol||0.20;'
    + 'if(got==null)return "<td class=\\"nr off\\">\\u2014</td>";'
    + 'var p=exp>0?Math.abs(got-exp)/exp:(got>0?1:0);'
    + 'var c=p>tol?"off":p>tol/2?"":"ok";'
    + 'return "<td class=\\"nr "+c+"\\">"+got+"<br><span style=\\"color:#bbb;font-size:10px;\\">("+exp+")</span></td>";'
    + '}'
    + 'function gc(got,exp){'
    + 'var p=exp>0?Math.abs(got-exp)/exp:0;'
    + 'return "<td class=\\"nr "+(p>0.10?"off":"ok")+"\\">"+got+"<br><span style=\\"color:#bbb;font-size:10px;\\">("+exp+")</span></td>";'
    + '}'
    + 'function tbl(rows,showIssues){'
    + 'var h="<thead><tr><th>Ingredient</th><th>Amount</th><th>Matched food</th><th class=\\"nr\\">g</th><th class=\\"nr\\">Cal</th><th class=\\"nr\\">Carbs</th><th class=\\"nr\\">Prot</th><th class=\\"nr\\">Fat</th>"+(showIssues?"<th>Issues</th>":"")+"</tr></thead>";'
    + 'var b=rows.map(function(r){'
    + 'var issues=r.issues&&r.issues.length?r.issues.map(function(i){return "<div class=\\"issue\\">\u2022 "+i+"</div>";}).join(""):"";'
    + 'var mf=r.matchedFood==="NOT FOUND"?"<span class=\\"fail\\">NOT FOUND</span>":"<span class=\\"match\\">"+r.matchedFood+"</span>";'
    + 'return "<tr><td><strong>"+r.item+"</strong></td><td>"+r.amount+"</td><td>"+mf+"</td>"'
    + '+(r.grams?gc(r.grams.got,r.grams.expected):"<td class=\\"nr off\\">\u2014</td>")'
    + '+(r.cal?nc(r.cal.got,r.cal.expected):"<td class=\\"nr off\\">\u2014</td>")'
    + '+(r.carbs?nc(r.carbs.got,r.carbs.expected):"<td class=\\"nr off\\">\u2014</td>")'
    + '+(r.protein?nc(r.protein.got,r.protein.expected):"<td class=\\"nr off\\">\u2014</td>")'
    + '+(r.fat?nc(r.fat.got,r.fat.expected):"<td class=\\"nr off\\">\u2014</td>")'
    + '+(showIssues?"<td>"+issues+"</td>":"")+"</tr>";'
    + '}).join("");'
    + 'return "<table>"+h+"<tbody>"+b+"</tbody></table>";'
    + '}'
    + 'function render(d){'
    + 'var s=d.summary,score=parseInt(s.score);'
    + 'var color=score>=80?"green":score>=60?"orange":"red";'
    + 'var barColor=score>=80?"#16a34a":score>=60?"#d97706":"#dc2626";'
    + 'document.getElementById("out").innerHTML='
    + '"<div class=\\"summary\\">'
    + '<div class=\\"stat\\"><span class=\\"sv "+color+"\\">"+s.score+"</span><span class=\\"sl\\">Score</span></div>'
    + '<div class=\\"stat\\"><span class=\\"sv green\\">"+s.passed+"</span><span class=\\"sl\\">Passed</span></div>'
    + '<div class=\\"stat\\"><span class=\\"sv red\\">"+s.failed+"</span><span class=\\"sl\\">Failed</span></div>'
    + '<div class=\\"stat\\"><span class=\\"sv orange\\">"+s.errors+"</span><span class=\\"sl\\">Errors</span></div>'
    + '<div class=\\"stat\\"><span class=\\"sv blue\\">"+s.total+"</span><span class=\\"sl\\">Total</span></div>'
    + '</div>'
    + '<div class=\\"progress\\"><div class=\\"pb\\" style=\\"width:"+s.score+";background:"+barColor+";\\"></div></div>"'
    + '+(d.failing.length>0?"<div class=\\"sec\\">Failing ("+d.failing.length+")</div>"+tbl(d.failing,true):"<div class=\\"sec\\">\uD83C\uDF89 All tests passing!</div>")'
    + '+"<div class=\\"sec\\">Passing ("+d.passing.length+")</div>"+tbl(d.passing,false);'
    + '}'
    + '<\/script></body></html>';
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Serve HTML dashboard when browser visits without ?run=1
  const wantsJSON = req.query && req.query.run === '1';
  const acceptsHTML = (req.headers.accept||'').includes('text/html');

  if (acceptsHTML && !wantsJSON) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(buildDashboard());
  }

  if (!USDA_API_KEY) return res.status(500).json({error:'USDA_API_KEY not set'});

  const startTime = Date.now();
  const results = [];
  let passed = 0, failed = 0, errors = 0;

  for (const tc of TEST_CASES) {
    try {
      const result = await lookupIngredient(tc.item, tc.rawAmount);
      const issues = grade(result, tc);
      const ok = issues.length === 0;
      if (ok) passed++; else failed++;
      results.push({
        item: tc.item,
        amount: tc.rawAmount,
        status: ok ? '✓ pass' : '✗ fail',
        matchedFood: result.matchedFood || 'NOT FOUND',
        grams: { got: result.grams, expected: tc.expectedGrams },
        cal: { got: result.cal, expected: tc.expectedCal },
        carbs: { got: result.carbs, expected: tc.expectedCarbs },
        protein: { got: result.protein, expected: tc.expectedProtein },
        fat: { got: result.fat, expected: tc.expectedFat },
        issues,
      });
    } catch(e) {
      errors++;
      results.push({ item: tc.item, amount: tc.rawAmount, status: '⚠ error', matchedFood: 'ERROR', error: e.message, issues: [e.message] });
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total = TEST_CASES.length;
  const score = Math.round(passed / total * 100);

  return res.status(200).json({
    summary: { score: score+'%', passed, failed, errors, total, elapsed: elapsed+'s', timestamp: new Date().toISOString() },
    failing: results.filter(r => r.status !== '✓ pass'),
    passing: results.filter(r => r.status === '✓ pass'),
  });
}
