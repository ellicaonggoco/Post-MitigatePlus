/**
 * Team Matching Helper for MitigatePlus Field Operations
 * Compares user team assignment with event or task team assignment
 */

function cleanStr(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if a staff user is authorized for an event/task based on their team assignment.
 * @param {string} userTeamName - e.g. "Field Team Bravo"
 * @param {string} eventTeamName - e.g. "Field Team Alpha" or "Field Team Bravo"
 * @param {string} userName - Optional staff user's name
 * @returns {boolean}
 */
function isStaffTeamMatch(userTeamName, eventTeamName, userName = '') {
  if (!userTeamName && !userName) return true; // Fallback if staff has no team assignment yet
  if (!eventTeamName) return false; // If event is unassigned, don't allow arbitrary team

  const uTeam = cleanStr(userTeamName);
  const eTeam = cleanStr(eventTeamName);
  const uName = cleanStr(userName);

  if (uTeam && eTeam && uTeam === eTeam) return true;

  // Known canonical team tokens
  const canonicalTeams = ['alpha', 'bravo', 'charlie', 'delta', 'qru1', 'qru2', 'qru', 'quickresponse'];
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

module.exports = {
  isStaffTeamMatch,
  cleanStr,
};
