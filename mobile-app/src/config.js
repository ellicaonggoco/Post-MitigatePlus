import { Platform } from 'react-native';

/**
 * MitigatePlus Mobile App Central Configuration
 * Supports environment variable overrides for live production deployment
 * Automatically uses Local LAN IP for Expo Go on physical mobile devices
 */
const LIVE_RENDER_API = 'https://post-mitigateplus.onrender.com';
const DEV_LAN_IP = '192.168.100.101';
const LOCAL_DEV_URL = Platform.OS === 'web' ? 'http://localhost:5000' : `http://${DEV_LAN_IP}:5000`;

const BASE_HOST = process.env.EXPO_PUBLIC_API_URL 
  ? process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/?$/, '') 
  : LOCAL_DEV_URL;

export const API_BASE_URL = `${BASE_HOST}/api`;
export const SOCKET_URL = BASE_HOST;



