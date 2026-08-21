/**
 * Assistance Gap Detection Engine
 * 
 * Compares standard expected post-disaster assistance categories against
 * a household's past requests and distributions to identify unfulfilled needs.
 * 
 * IMPORTANT: these names must match ReliefItemType.name / DistributionEvent.itemType /
 * Distribution.itemType exactly (string equality), or gaps will never resolve to
 * "Received" even after relief was actually given. Keep this list in sync with seed.js.
 */

const STANDARD_RELIEF_ITEMS = [
  'Family Food Pack',
  'Water',
  'Hygiene Kit',
  'Clothing',
  'Medicine',
  'Temporary Shelter',
  'Shelter Repair Materials',
];

function detectAssistanceGaps(requests = [], distributions = []) {
  const receivedTypes = new Set(distributions.map(d => d.itemType));
  const requestedTypes = new Set(requests.map(r => r.itemType));

  const gaps = STANDARD_RELIEF_ITEMS.map(item => {
    const isReceived = receivedTypes.has(item);
    const isRequested = requestedTypes.has(item);
    
    let status = 'Needed';
    let detail = 'Not yet requested';

    if (isReceived) {
      status = 'Received';
      detail = 'Assistance provided';
    } else if (isRequested) {
      const request = requests.find(r => r.itemType === item);
      status = 'Pending Review';
      detail = `Request status: ${request ? request.status : 'Pending'}`;
    }

    return {
      itemType: item,
      status,
      detail,
      isGap: status !== 'Received',
    };
  });

  return {
    totalGaps: gaps.filter(g => g.isGap).length,
    gaps,
  };
}

module.exports = { detectAssistanceGaps, STANDARD_RELIEF_ITEMS };
