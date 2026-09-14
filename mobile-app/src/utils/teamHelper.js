/**
 * Team Matching Helper for MitigatePlus Mobile App
 * Compares user team assignment with event or task team assignment
 */

function cleanStr(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function normalizeTeam(str) {
  let s = cleanStr(str);
  s = s.replace(/quickresponseunit1|quickresponse1|unit1/g, 'qru1');
  s = s.replace(/quickresponseunit2|quickresponse2|unit2/g, 'qru2');
  s = s.replace(/quickresponseunit3|quickresponse3|unit3/g, 'qru3');
  return s;
}

/**
 * Checks if a staff user is authorized for an event/task based on their team assignment.
 * @param {string} userTeamName - e.g. "Field Team Bravo" or "Quick Response Unit 1"
 * @param {string} eventTeamName - e.g. "Field Team Alpha" or "Quick Response Unit 2"
 * @param {string} userName - Optional staff user's name
 * @returns {boolean}
 */
export function isStaffTeamMatch(userTeamName, eventTeamName, userName = '') {
  if (!userTeamName && !userName) return true; // Fallback if staff has no team assignment yet
  if (!eventTeamName) return false; // If event is unassigned, don't allow arbitrary team

  const uTeam = normalizeTeam(userTeamName);
  const eTeam = normalizeTeam(eventTeamName);
  const uName = cleanStr(userName);

  if (uTeam && eTeam && uTeam === eTeam) return true;

  // Specific numbered units must match strictly and not collapse into generic quickresponse
  const isUserQru1 = uTeam.includes('qru1');
  const isUserQru2 = uTeam.includes('qru2');
  const isEventQru1 = eTeam.includes('qru1');
  const isEventQru2 = eTeam.includes('qru2');

  if (isUserQru1 || isEventQru1) {
    return isUserQru1 && isEventQru1;
  }
  if (isUserQru2 || isEventQru2) {
    return isUserQru2 && isEventQru2;
  }

  // Known canonical field team tokens
  const canonicalTeams = ['alpha', 'bravo', 'charlie', 'delta', 'qru', 'quickresponse'];
  for (const token of canonicalTeams) {
    if (uTeam.includes(token)) {
      return eTeam.includes(token);
    }
  }

  // Check if staff officer's personal name is specifically named in assignedTeam or staffAssigned
  if (uName && uName.length >= 3 && eTeam.includes(uName)) {
    return true;
  }

  return uTeam.includes(eTeam) || eTeam.includes(uTeam);
}

export default {
  isStaffTeamMatch,
  normalizeTeam,
  cleanStr,
};
