import { Platform, NativeModules } from 'react-native';

/**
 * MitigatePlus Mobile App Central Configuration
 * Dynamically resolves the Metro bundler host IP so it works automatically
 * across any Wi-Fi network or fallback to current LAN IP.
 */
const LIVE_RENDER_API = 'https://post-mitigateplus.onrender.com';

const getDevHost = () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return window.location.hostname;
    }
    return 'localhost';
  }

  // React Native NativeModules contains scriptURL in development mode
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/:\/\/([^:/]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      return match[1];
    }
  }

  // Active Wi-Fi IPv4 address of development machine
  return '192.168.100.101';
};

const DEV_LAN_IP = getDevHost();
const LOCAL_DEV_URL = Platform.OS === 'web' ? 'http://localhost:5000' : `http://${DEV_LAN_IP}:5000`;

const isProd = typeof __DEV__ !== 'undefined' ? !__DEV__ : process.env.NODE_ENV === 'production';
const BASE_HOST = process.env.EXPO_PUBLIC_API_URL 
  ? process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/?$/, '') 
  : (isProd ? LIVE_RENDER_API : LOCAL_DEV_URL);

export const API_BASE_URL = `${BASE_HOST}/api`;
export const SOCKET_URL = BASE_HOST;
