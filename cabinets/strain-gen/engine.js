/*
 * Strain drop generator — mirrors projects/strain-gen/strain.py pools and logic.
 * Built for the Minion Arcade 777 (cabinet 04). Uses deterministic mulberry32 hashing per batch.
 */
(function (root) {
  "use strict";

  // ---------- POOLS (mirrored from strain.py) ----------
  const PREFIXES = [
    "Siam", "Bangkok", "Chang", "Khao", "Pai", "Phu", "Sae", "Nam", "Kaeng",
    "Nak", "Mae", "Yai", "Kong", "Tong", "Mekong", "Doi", "Lam", "Nan", "Chiang",
    "Wiang", "Taeng", "Huai", "Pong", "Phit", "Suk", "Chon", "Dan",
  ];
  const FLAVORS = [
    "Haze", "Fire", "Gold", "Ghost", "Dream", "Express", "Sativa", "Indica",
    "Blonde", "Sour", "Pure", "Kilo", "Kush", "Diesel", "Blunt", "Wild", "Green",
    "Thai", "Acid",
  ];
  const REGIONS = [
    "Yai", "Angkhang", "Phongsali", "Pai", "Samui", "Phangan", "Tao", "Kood",
    "Pong", "Nam", "Suk", "Tha", "Kaeng", "Huai", "Dan", "Lam", "Nan", "Wiang",
  ];
  const CULTURES = [
    "Koh Samui greenhouse", "Khao Yai hillside", "Pai mountain plot",
    "Bangkok loft grow", "Chiang Mai temple garden", "Koh Phangan beach plot",
    "Rayong coastal farm", "Lampang horse ranch", "Chiang Rai highland",
    "Ayutthaya heritage barn",
  ];
  const PARENTS = [
    "Thai Landrace", "Siam Sativa", "Chang Indica", "Mae Haze", "Pai Fire",
    "Khao Kush", "Nok Diesel", "Yim Ghost", "Kong Gold", "Phu Sativa", "Sae Fire",
    "Nam Haze", "Kaeng Kush", "Nak Gold", "Doi Fire", "Lam Sativa", "Nan Haze",
    "Chiang Fire", "Wiang Gold", "Taeng Haze",
  ];
  const CROSSOVERS = [
    "Haze", "Fire", "Sativa", "Indica", "Gold", "Diesel", "Dream", "Ghost",
    "Express", "Sour", "Pure", "Blonde", "Kush", "Blunt", "Wild", "Acid",
  ];
  const THAI_WORDS = [
    "Mae", "Kong", "Nok", "Yim", "Phu", "Sae", "Tong", "Yai", "Tai", "Kru", "Pa",
    "Nai", "Fah", "Som", "Rang", "Lek", "Tee",
  ];
  const THAI_PAIRS = [
    "Mae Nak", "Sae Nam", "Kaeng Pong", "Huai Yai", "Nong Bua", "Tha Chang",
    "Suan Dok", "Khao Hom", "Huai Thar", "Pong Nam", "Dan Sai", "Pha Taew",
  ];
  const ROASTS = [
    "Small batch energy. One grower, one plot, zero apologies.",
    "They call it Thai fire because it burns the whole plane down.",
    "Sunrise hits different here. Smells like a Bangkok morning.",
    "Grown slow, smoked slow, hit hard fast.",
    "Smells like a street vendor's secret recipe at 2am.",
    "If this were a DJ set, it would be the last track of the night.",
    "Three seasons in the making. Worth the wait.",
    "Cured in the dark, in the humidity, like it owes you something.",
    "Trimmed by hand at 5am because the dew was still on it.",
    "The kind of bag that comes with a story you have to finish.",
    "Punches the ceiling. You will smell it from the soi.",
    "Nobody on the hill knows what is in the jars. Ask again later.",
    "Resin on your fingers at 9pm and dinner still in the pot. Priorities.",
    "One jar, one bag, one very loud neighbour.",
    "Named after the road it was planted beside. Everyone drives past.",
    "Hits like a tuk-tuk at full throttle. Hold on.",
    "Sweet on the front, diesel on the back. No notes, just moves.",
    "Best after midnight, best before the rain starts.",
    "The soil does the talking. We just moved the tent.",
    "Old school in a new bag. Nothing about it is trying.",
    "Mango, diesel, and a stubbornness that smells like family.",
    "You will not find this at a market stall. That is the point.",
    "Two hands, one pair of scissors, one very good year.",
    "So smooth it should come with a written apology to other strains.",
  ];

  // ---------- HELPERS ----------
  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // mulberry32 PRNG (deterministic by seed)
  function mulberry32(seed) {
    return function() {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function roastPool(rng, count) {
    const pool = ROASTS.slice();
    const picked = [];
    while (picked.length < count) {
      shuffle(pool, rng);
      const take = Math.min(pool.length, count - picked.length);
      picked.push(...pool.slice(0, take));
      // pool now used; continue shuffling again for next batch if needed
    }
    return picked;
  }

  function genStrain(rng) {
    const style = Math.floor(rng() * 4);
    const prefix = pick(PREFIXES, rng);
    const flavor = pick(FLAVORS, rng);
    let name;
    if (style === 0) {
      name = `${prefix} ${flavor}`;
    } else if (style === 1) {
      name = `${prefix} ${pick(REGIONS, rng)} ${flavor}`;
    } else if (style === 2) {
      name = `${pick(THAI_PAIRS, rng)} ${flavor}`;
    } else {
      name = `${pick(THAI_WORDS, rng)} ${flavor}`;
    }
    const lineage = `${pick(PARENTS, rng)} x ${pick(CROSSOVERS, rng)}`;
    const culture = pick(CULTURES, rng);
    return { name, lineage, culture, roast: null }; // roast filled later
  }

  // ---------- API ----------
  function build({ batch, count }) {
    if (typeof batch !== "string" || !batch.trim()) {
      throw new Error("Give the moth a batch code (1-40 characters).");
    }
    const batchTrim = batch.trim();
    if (batchTrim.length > 40) {
      throw new Error("Batch code must be 40 characters or less.");
    }
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      throw new Error("Count must be a whole number between 1 and 20.");
    }
    const rng = mulberry32(fnv1a(batchTrim));
    const roasts = roastPool(rng, count);
    const strains = roasts.map((roast, idx) => {
      const s = genStrain(rng);
      s.roast = roast;
      return s;
    });
    return { batch: batchTrim, count, strains };
  }

  function receiptText(result) {
    const width = 44;
    const rule = "=".repeat(width);
    const lines = [];
    lines.push(rule);
    lines.push("TRIP 777 STRAIN DROP GENERATOR");
    lines.push("Bangkok - Small Batch Genetics");
    lines.push(rule);
    lines.push(`BATCH:  ${result.batch}`);
    lines.push(`${result.count} STRAIN${result.count === 1 ? "" : "S"} IN THE DROP`);
    lines.push(rule);
    for (let i = 0; i < result.strains.length; i++) {
      const s = result.strains[i];
      lines.push(`STRAIN ${String(i + 1).padStart(3, "0")}`);
      lines.push(`  NAME:     ${s.name}`);
      lines.push(`  LINEAGE:  ${s.lineage}`);
      lines.push(`  CULTURE:  ${s.culture}`);
      lines.push(`  ROAST:     ${s.roast}`);
      lines.push("-".repeat(width));
    }
    lines.push(`[dropped ${result.count} strains :: batch ${result.batch} :: small batch, zero synthetic hype]`);
    lines.push(rule);
    return lines.join("\n");
  }

  const api = { build, receiptText, pools: { PREFIXES, FLAVORS, REGIONS, CULTURES, PARENTS, CROSSOVERS, THAI_WORDS, THAI_PAIRS, ROASTS } };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.StrainDrop = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);