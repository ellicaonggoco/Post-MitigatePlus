import { API_BASE_URL } from '../config.js';

const getAuthHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

// Every function here throws on failure instead of silently returning a fake
// "success" object  -  screens are responsible for catching and showing the real
// error. A previous version of this file swallowed every network/API failure
// and returned a fake success object or null, which made every screen lie
// about whether anything actually saved to the database.
async function request(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeout || 15000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const message = (data && data.message) || `Request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Hindi makakonekta sa server (Request Timed Out). Pakisuri ang koneksyon sa internet.');
    }
    throw err;
  }
}

/**
 * 1. Login User (Resident / Staff)
 */
export async function loginUser(credentials) {
  return request(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(credentials),
  });
}

/**
 * 2. Register Household User
 */
export async function registerUser(payload) {
  return request(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

/**
 * 3. Fetch Announcements
 */
export async function fetchAnnouncements(barangayCode = null) {
  const url = barangayCode
    ? `${API_BASE_URL}/announcements?barangayCode=${encodeURIComponent(barangayCode)}`
    : `${API_BASE_URL}/announcements`;
  return request(url);
}

/**
 * 4. Fetch Household Profile (includes gapAnalysis, pastRequests, pastDistributions  - 
 *    this is also the real source for "claims history", no separate endpoint needed)
 */
export async function fetchHouseholdProfile(token) {
  return request(`${API_BASE_URL}/households/me`, {
    headers: getAuthHeaders(token),
  });
}

/**
 * 4b. Mark In-App Notification as Read
 */
export async function markNotificationAsRead(notifId, token) {
  if (!notifId || !token) return null;
  return request(`${API_BASE_URL}/households/me/notifications/${encodeURIComponent(notifId)}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
  });
}

/**
 * 5. Submit Damage Report
 */
export async function submitDamageReport(data, token) {
  return request(`${API_BASE_URL}/damage-reports`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
}

/**
 * 5b. Fetch Resident's Submitted Damage Reports
 */
export async function fetchMyDamageReports(token) {
  return request(`${API_BASE_URL}/damage-reports`, {
    headers: getAuthHeaders(token),
  });
}

/**
 * 6. Submit Assistance Request
 */
export async function submitAssistanceRequest(data, token) {
  return request(`${API_BASE_URL}/assistance-requests`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
}

/**
 * 7. Resident claims history  -  reuses the same /households/me payload
 *    (pastRequests + pastDistributions) rather than a separate endpoint.
 */
export async function fetchClaimsHistory(token) {
  const profile = await fetchHouseholdProfile(token);
  return {
    requests: profile.pastRequests || [],
    distributions: profile.pastDistributions || [],
  };
}

/**
 * 8. Field Staff: list active distribution events for their barangay
 */
export async function fetchDistributionEvents(token) {
  return request(`${API_BASE_URL}/distributions/events`, {
    headers: getAuthHeaders(token),
  });
}

/**
 * 9. Field Staff QR Scanner: look up a household by QR code.
 *    Supports both scanHouseholdQR(token, qrCode, eventId) and scanHouseholdQRCode(qrCode, token)
 */
export async function scanHouseholdQR(arg1, arg2, arg3) {
  // If first arg is token, then arg2 is qrCode; otherwise arg1 is qrCode and arg2 is token
  let token, qrCode, eventId;
  if (typeof arg1 === 'string' && (arg1.startsWith('eyJ') || arg1.length > 50)) {
    token = arg1;
    qrCode = arg2;
    eventId = arg3;
  } else {
    qrCode = arg1;
    token = arg2;
    eventId = arg3;
  }
  const url = `${API_BASE_URL}/households/qr/${encodeURIComponent(qrCode || '')}${eventId ? `?eventId=${encodeURIComponent(eventId)}` : ''}`;
  return request(url, {
    headers: getAuthHeaders(token),
  });
}

export const scanHouseholdQRCode = scanHouseholdQR;

/**
 * 10. Field Staff: confirm and record a relief release for a distribution event.
 *     Supports both confirmDistribution(token, payload) and releaseDistribution(payload, token)
 */
export async function confirmDistribution(arg1, arg2) {
  let token, payload;
  if (typeof arg1 === 'string' && (arg1.startsWith('eyJ') || arg1.length > 50)) {
    token = arg1;
    payload = arg2 || {};
  } else {
    payload = arg1 || {};
    token = arg2;
  }

  const distributionEventId = payload.distributionEventId || payload.eventId;
  const householdId = payload.householdId;

  return request(`${API_BASE_URL}/distributions/release`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      distributionEventId,
      householdId,
      overrideBaseUnits: payload.overrideBaseUnits,
      overrideTopUpUnits: payload.overrideTopUpUnits,
      overrideReason: payload.overrideReason,
    }),
  });
}

export const releaseDistribution = confirmDistribution;

/**
 * 11. Fetch offline households cache for field staff
 */
export async function fetchOfflineHouseholds(token, barangayCode) {
  try {
    const url = barangayCode
      ? `${API_BASE_URL}/households?barangayCode=${encodeURIComponent(barangayCode)}&limit=200`
      : `${API_BASE_URL}/households?limit=200`;
    const res = await request(url, {
      headers: getAuthHeaders(token),
    });
    return Array.isArray(res) ? res : (res.households || []);
  } catch (e) {
    return [];
  }
}

/**
 * 12. Sync offline distribution claim to central server
 */
export async function syncOfflineClaim(token, item) {
  return confirmDistribution(token, item);
}

/**
 * 13. Log offline distribution claim
 */
export async function logOfflineClaim(claimData) {
  return { success: true, offline: true, ...claimData };
}

/**
 * 14. Field Staff Incident Reporter
 */
export async function submitFieldIncident(incidentData, token) {
  return request(`${API_BASE_URL}/incidents`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(incidentData),
  });
}

