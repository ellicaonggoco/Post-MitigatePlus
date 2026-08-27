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

/**
 * Autonomous Household Entitlement Engine
 * 
 * Computes exact entitlement for a verified household:
 * - 1 Base All-in-One Family Relief Pack (covers up to 5 members: Food, Medicine, Water)
 * - Extra member top-ups only if headcount > 5
 * - Profile-based automated vulnerability top-ups:
 *   - Senior Citizen (60+ yo): +1 Senior Maintenance Medicine & Nutrition Pack (no diapers)
 *   - Infant / Sanggol (0-2 yo): +1 Infant Care & Baby Nutrition Pack
 *   - PWD: +1 PWD Health & Mobility Support Pack
 */
function calculateHouseholdEntitlement(household) {
  const memberCount = Math.max(1, parseInt(household?.memberCount) || (household?.members?.length || 1));
  const baseCoverage = 5; // 1 Base All-in-One Pack covers up to 5 members
  
  // Base All-in-One Relief Packs (Food + Medicine + Water)
  const basePacks = Math.max(1, Math.floor(memberCount / baseCoverage));
  const remainder = memberCount > baseCoverage ? memberCount - (basePacks * baseCoverage) : 0;
  const extraMemberTopUps = remainder; // extra units for headcount > 5

  // Inspect members array for vulnerabilities
  const members = Array.isArray(household?.members) ? household.members : [];
  const seniorCount = members.filter(m => (m.age !== undefined && m.age >= 60) || m.specialConditions?.includes('senior')).length;
  const infantCount = members.filter(m => (m.age !== undefined && m.age <= 2) || (m.specialConditions?.includes('child') && m.age <= 2)).length;
  const pwdCount = members.filter(m => m.specialConditions?.includes('pwd')).length;

  const items = [];
  // 1. Base All-in-One Package
  items.push({
    id: 'base_all_in_one',
    name: 'All-in-One Family Relief Pack',
    nameTl: 'Pamilyang All-in-One Relief Pack',
    description: 'Sapat na Pagkain & Bigas, Gamot & First Aid, at Malinis na Inuming Tubig',
    quantity: basePacks,
    unit: basePacks > 1 ? 'packs' : 'pack',
    badge: `Sakop ang ${Math.min(memberCount, basePacks * baseCoverage)} miyembro`,
    icon: '🍱',
    color: '#1557B0',
    isBase: true,
  });

  // 2. Extra Member Top-Up (if headcount > 5)
  if (extraMemberTopUps > 0) {
    items.push({
      id: 'extra_headcount_topup',
      name: `Extra Member Nutrition Top-Up (+${extraMemberTopUps})`,
      nameTl: `Dagdag Pagkain para sa Sumobrang Miyembro (+${extraMemberTopUps})`,
      description: `Karagdagang pagkain para sa ${extraMemberTopUps} miyembrong lampas sa 5-pax base capacity`,
      quantity: extraMemberTopUps,
      unit: 'units',
      badge: `+${extraMemberTopUps} pax`,
      icon: '🍚',
      color: '#0284C7',
      isTopUp: true,
    });
  }

  // 3. Senior Citizen Maintenance & Nutrition Top-Up (NO diapers, focused on nutrition and maintenance medicines)
  if (seniorCount > 0) {
    items.push({
      id: 'senior_maintenance_topup',
      name: `Senior Maintenance & Nutrition Pack (+${seniorCount})`,
      nameTl: `Senior Maintenance Meds & Nutrition Pack (+${seniorCount})`,
      description: 'Masustansyang pagkain at Maintenance Medicines (BP, diabetes, vitamins) para sa Senior Citizen',
      quantity: seniorCount,
      unit: seniorCount > 1 ? 'packs' : 'pack',
      badge: `${seniorCount} Senior Citizen`,
      icon: '🧓',
      color: '#D97706',
      isTopUp: true,
    });
  }

  // 4. Infant & Toddler Care Top-Up
  if (infantCount > 0) {
    items.push({
      id: 'infant_care_topup',
      name: `Infant Care & Baby Nutrition Pack (+${infantCount})`,
      nameTl: `Gatas at Nutrisyon para sa Sanggol (+${infantCount})`,
      description: 'Gatas/infant formula, baby cereal/food, at pangunahing baby hygiene care',
      quantity: infantCount,
      unit: infantCount > 1 ? 'packs' : 'pack',
      badge: `${infantCount} Sanggol (0-2 yo)`,
      icon: '👶',
      color: '#EC4899',
      isTopUp: true,
    });
  }

  // 5. PWD Health Support Top-Up
  if (pwdCount > 0) {
    items.push({
      id: 'pwd_support_topup',
      name: `PWD Health & Mobility Support Pack (+${pwdCount})`,
      nameTl: `Tulong Pangkalusugan para sa PWD (+${pwdCount})`,
      description: 'Pangunahing medikal at health support para sa miyembrong may kapansanan',
      quantity: pwdCount,
      unit: pwdCount > 1 ? 'packs' : 'pack',
      badge: `${pwdCount} PWD Member`,
      icon: '♿',
      color: '#7C3AED',
      isTopUp: true,
    });
  }

  return {
    memberCount,
    baseCoverage,
    basePacks,
    extraMemberTopUps,
    seniorCount,
    infantCount,
    pwdCount,
    items,
    summaryText: `${basePacks}x Base All-in-One Pack` + 
      (seniorCount > 0 ? ` + ${seniorCount}x Senior Pack` : '') +
      (infantCount > 0 ? ` + ${infantCount}x Infant Pack` : '') +
      (extraMemberTopUps > 0 ? ` + ${extraMemberTopUps}x Extra Member Unit` : ''),
  };
}

module.exports = { calculateReliefAllocation, calculateHouseholdEntitlement };

