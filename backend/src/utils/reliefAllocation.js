/**
 * Right-Sized Relief Allocation Engine
 * 
 * Computes exact base packs and top-up units based on verified household headcount.
 * Applies to headcount_scaled relief item types (e.g. food, water, hygiene kits).
 * 
 * Formula:
 * n = household.memberCount (verified)
 * c = item.baseCoverage (pax per base pack, default 5)
 * 
 * basePacks  = max(1, floor(n / c))
 * remainder  = n - (basePacks * c)
 * topUpUnits = remainder if remainder > 0 else 0
 * 
 * Examples:
 * n = 7, c = 5  -> basePacks = 1, topUpUnits = 2
 * n = 12, c = 5 -> basePacks = 2, topUpUnits = 2
 * n = 3, c = 5  -> basePacks = 1, topUpUnits = 0
 */

function calculateReliefAllocation(memberCount, baseCoverage = 5, category = 'headcount_scaled') {
  const n = Math.max(1, parseInt(memberCount) || 1);
  const c = Math.max(1, parseInt(baseCoverage) || 5);

  if (category === 'fixed_unit') {
    return {
      category: 'fixed_unit',
      basePacks: 1,
      topUpUnits: 0,
      totalHeadcountCovered: n,
      explanation: 'Fixed unit allocation based on assessed need.',
    };
  }

  const basePacks = Math.max(1, Math.floor(n / c));
  const remainder = n - (basePacks * c);
  const topUpUnits = remainder > 0 ? remainder : 0;

  return {
    category: 'headcount_scaled',
    basePacks,
    topUpUnits,
    totalHeadcountCovered: n,
    explanation: `For ${n} verified household member(s): ${basePacks} base pack(s) (covers ${basePacks * c}) + ${topUpUnits} top-up unit(s).`,
  };
}

module.exports = { calculateReliefAllocation };
