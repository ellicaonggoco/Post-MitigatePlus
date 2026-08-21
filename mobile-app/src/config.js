import { Platform } from 'react-native';

/**
 * MitigatePlus Mobile App Central Configuration
 * Supports environment variable overrides for live production deployment
 * Automatically uses Local LAN IP for Expo Go on physical mobile devices
 */
const DEV_LAN_IP = '192.168.100.101';
const LOCAL_DEV_URL = Platform.OS === 'web' ? 'http://localhost:5000' : `http://${DEV_LAN_IP}:5000`;

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || `${LOCAL_DEV_URL}/api`;
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || LOCAL_DEV_URL;


