// Keep local development convenient while allowing the same build to deploy
// behind a reverse proxy or a hosted API without source edits.

const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '::1'
);

const RENDER_PROD_API = 'https://post-mitigateplus.onrender.com/api';
const RENDER_PROD_ORIGIN = 'https://post-mitigateplus.onrender.com';

const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL = (
  envApiUrl
    ? (envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl.replace(/\/+$/, '')}/api`)
    : (isLocalhost ? '/api' : RENDER_PROD_API)
).replace(/\/+$/, '');

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  API_BASE_URL.startsWith('http')
    ? API_BASE_URL.replace(/\/api\/?$/, '')
    : (isLocalhost ? 'http://localhost:5000' : RENDER_PROD_ORIGIN)
);
