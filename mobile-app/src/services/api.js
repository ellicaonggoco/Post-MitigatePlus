import { API_BASE_URL } from '../config.js';

const getAuthHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

// Every function here throws on failure instead of silently returning a fake
// "success" object — screens are responsible for catching and showing the real
// error. A previous version of this file swallowed every network/API failure
// and returned a fake success object or null, which made every screen lie
// about whether anything actually saved to the database.
async function request(url, options = {}) {
  const res = await fetch(url, options);
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
 * 4. Fetch Household Profile (includes gapAnalysis, pastRequests, pastDistributions —
 *    this is also the real source for "claims history", no separate endpoint needed)
 */
export async function fetchHouseholdProfile(token) {
  return request(`${API_BASE_URL}/households/me`, {
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
 * 7. Resident claims history — reuses the same /households/me payload
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
 *    Returns household info + priority + per-item relief recommendations +
 *    gap analysis. Does NOT check duplicate-claim status by itself — that check
 *    happens atomically inside releaseDistribution() below, backed by a DB-level
 *    unique index, so it can't be bypassed by a race condition between two scans.
 */
export async function scanHouseholdQRCode(qrCode, token) {
  return request(`${API_BASE_URL}/households/qr/${encodeURIComponent(qrCode)}`, {
    headers: getAuthHeaders(token),
  });
}

/**
 * 10. Field Staff: confirm and record a relief release for a distribution event.
 *     This is the real anti-duplicate-claim + right-sized-allocation endpoint.
 *     On a duplicate, the backend returns HTTP 409 with { isDuplicate: true, ... } —
 *     callers should catch that specifically to show the duplicate-claim banner,
 *     not treat it as a generic failure.
 */
export async function releaseDistribution({ distributionEventId, householdId, overrideBaseUnits, overrideTopUpUnits, overrideReason }, token) {
  return request(`${API_BASE_URL}/distributions/release`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ distributionEventId, householdId, overrideBaseUnits, overrideTopUpUnits, overrideReason }),
  });
}

/**
 * 11. Field Staff Incident Reporter
 */
export async function submitFieldIncident(incidentData, token) {
  return request(`${API_BASE_URL}/incidents`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(incidentData),
  });
}
