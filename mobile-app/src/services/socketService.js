import { io } from 'socket.io-client/dist/socket.io.js';
import { API_BASE_URL } from '../config.js';

// Extract base server URL (without /api path)
const SERVER_URL = API_BASE_URL.replace('/api', '');

let socket = null;

/**
 * Initialize Socket.IO connection
 */
export function initSocket(householdId = null, barangayCode = null) {
  if (socket && socket.connected) return socket;

  try {
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[Socket.IO Mobile] Connected to server ID:', socket.id);

      if (householdId) {
        socket.emit('join_room', `household:${householdId}`);
      }
      if (barangayCode) {
        socket.emit('join_room', `brgy:${barangayCode}`);
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.IO Mobile Warning] Connection error:', err.message);
    });
  } catch (err) {
    console.warn('[Socket.IO Mobile Warning] Socket initialization failed:', err.message);
  }

  return socket;
}

/**
 * Listen for real-time verification status updates
 */
export function onVerificationUpdated(callback) {
  if (!socket) return () => {};
  socket.on('verification_updated', callback);
  return () => socket.off('verification_updated', callback);
}

/**
 * Listen for real-time announcements
 */
export function onNewAnnouncement(callback) {
  if (!socket) return () => {};
  socket.on('new_announcement', callback);
  return () => socket.off('new_announcement', callback);
}

/**
 * Listen for recovery status updates
 */
export function onRecoveryStatusUpdated(callback) {
  if (!socket) return () => {};
  socket.on('recovery_status_updated', callback);
  return () => socket.off('recovery_status_updated', callback);
}

/**
 * Listen for real-time duplicate claim alerts (for Field Staff)
 */
export function onDuplicateClaimAlert(callback) {
  if (!socket) return () => {};
  socket.on('duplicate_claim_alert', callback);
  return () => socket.off('duplicate_claim_alert', callback);
}

/**
 * Disconnect socket
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
