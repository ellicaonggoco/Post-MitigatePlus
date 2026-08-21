// Keep local development convenient while allowing the same build to deploy
// behind a reverse proxy or a hosted API without source edits.
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
