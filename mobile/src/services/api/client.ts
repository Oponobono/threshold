import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const isValidIpv4 = (value: string): boolean => {
  const parts = value.split('.');
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
};

export const isPrivateLanIpv4 = (value: string): boolean => {
  if (!isValidIpv4(value)) return false;

  if (value.startsWith('10.') || value.startsWith('192.168.')) return true;

  if (value.startsWith('172.')) {
    const secondOctet = Number(value.split('.')[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
};

export const getExpoHostIp = (): string | null => {
  if (Platform.OS === 'web') {
    return window.location.hostname || '127.0.0.1';
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    null;

  if (!hostUri) return null;

  const match = hostUri.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  const candidateIp = match?.[0]?.trim();

  if (!candidateIp) return null;
  return isPrivateLanIpv4(candidateIp) ? candidateIp : null;
};

export const DEFAULT_LAN_IP =
  Platform.OS === 'web'
    ? (typeof window !== 'undefined' && window.location.hostname) || '127.0.0.1'
    : getExpoHostIp() || process.env.EXPO_PUBLIC_API_HOST || '127.0.0.1';

export const API_PORTS = [3000, 3001];

export let API_BASE_URLS: string[] = [];

if (__DEV__) {
  API_BASE_URLS = API_PORTS.map((port) => `http://${DEFAULT_LAN_IP}:${port}/api`);
  if (process.env.EXPO_PUBLIC_API_URL) {
    API_BASE_URLS.push(process.env.EXPO_PUBLIC_API_URL);
  }
} else {
  API_BASE_URLS = process.env.EXPO_PUBLIC_API_URL 
    ? [process.env.EXPO_PUBLIC_API_URL]
    : API_PORTS.map((port) => `http://${DEFAULT_LAN_IP}:${port}/api`);
}

export let activeBaseUrl = API_BASE_URLS[0];

export const buildApiError = (message: string): Error => new Error(message);

export const fetchWithFallback = async (path: string, init?: RequestInit): Promise<Response> => {
  const candidates = [
    activeBaseUrl,
    ...API_BASE_URLS.filter((base) => base !== activeBaseUrl),
  ];

  let lastError: unknown = null;

  for (const base of candidates) {
    try {
      const response = await fetch(`${base}${path}`, init);
      activeBaseUrl = base;
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || buildApiError('No se pudo conectar con el servidor.');
};

export const parseJsonSafely = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};
