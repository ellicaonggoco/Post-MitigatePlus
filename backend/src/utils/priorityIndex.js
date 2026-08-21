/**
 * Smart Recovery Priority Index Engine
 * 
 * Formula:
 * priorityScore = (damageWeight * 10) + vulnerabilityPoints + min(daysPending, 30) - assistanceReceivedPenalty
 * 
 * damageWeight: Minor=1, Moderate=2, Severe=3, Totally Damaged=4
 * vulnerabilityPoints:
 *   +5 per senior citizen
 *   +5 per PWD member
 *   +5 per pregnant member
 *   +3 per child
 *   +5 if medical needs flagged
 * assistanceReceivedPenalty: flat -10 if household already received substantial assistance
 *   this cycle (NOT scaled by count of past distributions — a household that legitimately
 *   needs food AND medicine AND shelter shouldn't be penalized multiple times just for
 *   having multiple distinct needs already partly met).
 * 
 * priorityLevel:
 *   High   -> score >= 50
 *   Medium -> score 25-49
 *   Low    -> score < 25
 */

function calculatePriorityIndex(household, createdDate = null, assistanceReceivedCount = 0) {
  let damageWeight = 1;
  switch (household.damageLevel) {
    case 'Moderate': damageWeight = 2; break;
    case 'Severe': damageWeight = 3; break;
    case 'Totally Damaged': damageWeight = 4; break;
    case 'Minor':
    default: damageWeight = 1; break;
  }

  let vulnerabilityPoints = 0;
  if (Array.isArray(household.members)) {
    household.members.forEach(member => {
      const conds = member.specialConditions || [];
      if (conds.includes('senior')) vulnerabilityPoints += 5;
      if (conds.includes('pwd')) vulnerabilityPoints += 5;
      if (conds.includes('pregnant')) vulnerabilityPoints += 5;
      if (conds.includes('child')) vulnerabilityPoints += 3;
      if (conds.includes('medical')) vulnerabilityPoints += 5;
    });
  }

  const createdAt = createdDate || household.createdAt || new Date();
  const diffTime = Math.abs(new Date() - new Date(createdAt));
  const daysPending = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const pendingPoints = Math.min(daysPending, 30);

  // Flat penalty, not scaled by count — see note above.
  const assistanceReceivedPenalty = assistanceReceivedCount > 0 ? 10 : 0;

  const priorityScore = (damageWeight * 10) + vulnerabilityPoints + pendingPoints - assistanceReceivedPenalty;

  let priorityLevel = 'Low';
  if (priorityScore >= 50) {
    priorityLevel = 'High';
  } else if (priorityScore >= 25) {
    priorityLevel = 'Medium';
  }

  return { priorityScore, priorityLevel };
}

module.exports = { calculatePriorityIndex };
