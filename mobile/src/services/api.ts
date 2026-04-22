import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';

const isValidIpv4 = (value: string): boolean => {
  const parts = value.split('.');
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
};

const isPrivateLanIpv4 = (value: string): boolean => {
  if (!isValidIpv4(value)) return false;

  if (value.startsWith('10.') || value.startsWith('192.168.')) return true;

  if (value.startsWith('172.')) {
    const secondOctet = Number(value.split('.')[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
};

const getExpoHostIp = (): string | null => {
  // En la web, preferimos usar localhost o la IP actual del navegador si es posible
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

const DEFAULT_LAN_IP =
  Platform.OS === 'web'
    ? (typeof window !== 'undefined' && window.location.hostname) || '127.0.0.1'
    : getExpoHostIp() || process.env.EXPO_PUBLIC_API_HOST || '127.0.0.1';
const API_PORTS = [3000, 3001];
const API_BASE_URLS = API_PORTS.map((port) => `http://${DEFAULT_LAN_IP}:${port}/api`);
let activeBaseUrl = API_BASE_URLS[0];

const buildApiError = (message: string): Error => new Error(message);

const fetchWithFallback = async (path: string, init?: RequestInit): Promise<Response> => {
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

const parseJsonSafely = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export type UserProfile = {
  id: number;
  email: string;
  name?: string | null;
  lastname?: string | null;
  username?: string | null;
  grading_scale?: string | null;
  approval_threshold?: number | null;
  major?: string | null;
  university?: string | null;
  created_at?: string | null;
  last_login?: string | null;
};

export type Subject = {
  id: number;
  user_id: number;
  code: string;
  name: string;
  credits?: number | null;
  professor?: string | null;
  color?: string | null;
  icon?: string | null;
  target_grade?: number | null;
  avg_score?: number | null;
  completion_percent?: number | null;
};

/**
 * Obtiene o crea un identificador único persistente para el dispositivo
 */
export const getDeviceId = async (): Promise<string> => {
  try {
    let storedId: string | null = null;
    if (Platform.OS === 'web') {
      storedId = localStorage.getItem('app_device_id');
    } else {
      storedId = await SecureStore.getItemAsync('app_device_id');
    }

    if (!storedId) {
      const newId = Crypto.randomUUID();
      if (Platform.OS === 'web') {
        localStorage.setItem('app_device_id', newId);
      } else {
        await SecureStore.setItemAsync('app_device_id', newId);
      }
      return newId;
    }
    return storedId;
  } catch (error) {
    console.error('Error accediendo al Device ID:', error);
    return 'unknown-device';
  }
};

/**
 * Registra un nuevo usuario en la base de datos
 */
export const registerUser = async (userData: {
  email: string;
  password?: string;
  name?: string;
  lastname?: string;
  username?: string;
  grading_scale?: string;
  approval_threshold?: number;
  major?: string;
  university?: string;
}) => {
  try {
    const response = await fetchWithFallback('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Error en el registro');
    }

    // Guardar datos de sesión localmente para login automático tras registro
    const sessionToken = `dummy-token-${Date.now()}`;
    if (Platform.OS === 'web') {
      localStorage.setItem('app_session_token', sessionToken);
      localStorage.setItem('app_user_email', userData.email);
      localStorage.setItem('app_user_id', data.userId.toString());
    } else {
      await SecureStore.setItemAsync('app_session_token', sessionToken);
      await SecureStore.setItemAsync('app_user_email', userData.email);
      await SecureStore.setItemAsync('app_user_id', data.userId.toString());
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al intentar registrar');
  }
};

/**
 * Inicia sesión de un usuario existente
 */
export const loginUser = async (email: string, password: string) => {
  try {
    const response = await fetchWithFallback('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Error en el login');
    }

    // Guardar datos de sesión localmente
    const sessionToken = `dummy-token-${Date.now()}`; // En producción esto vendría del backend
    if (Platform.OS === 'web') {
      localStorage.setItem('app_session_token', sessionToken);
      localStorage.setItem('app_user_email', email);
      localStorage.setItem('app_user_id', data.user.id.toString());
    } else {
      await SecureStore.setItemAsync('app_session_token', sessionToken);
      await SecureStore.setItemAsync('app_user_email', email);
      await SecureStore.setItemAsync('app_user_id', data.user.id.toString());
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al intentar iniciar sesión');
  }
};

/**
 * Obtiene el ID del usuario actual almacenado localmente
 */
export const getUserId = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('app_user_id');
  } else {
    return await SecureStore.getItemAsync('app_user_id');
  }
};

/**
 * Obtiene el perfil del usuario actual
 */
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  const userId = await getUserId();
  if (!userId) return null;

  const response = await fetchWithFallback(`/users/${userId}`);
  if (!response.ok) return null;
  return await parseJsonSafely(response);
};

/**
 * Obtiene las materias del usuario
 */
export const getSubjects = async () => {
  const userId = await getUserId();
  if (!userId) return [];
  const response = await fetchWithFallback(`/subjects/${userId}`);
  return (await parseJsonSafely(response)) || [];
};

/**
 * Crea una materia para el usuario actual
 */
export const createSubject = async (payload: {
  name: string;
  professor?: string;
  color?: string;
  icon?: string;
  target_grade?: number;
}) => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('No hay sesión activa.');
  }

  const response = await fetchWithFallback('/subjects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: Number(userId),
      ...payload,
    }),
  });

  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo crear la materia.');
  }

  return data as Subject;
};

/**
 * Obtiene evaluaciones por materia
 */
export const getAssessments = async (subjectId: number) => {
  const response = await fetchWithFallback(`/assessments/${subjectId}`);
  return (await parseJsonSafely(response)) || [];
};

/**
 * Obtiene ítems de la galería
 */
export const getGalleryItems = async () => {
  const userId = await getUserId();
  if (!userId) return [];
  const response = await fetchWithFallback(`/gallery/${userId}`);
  return (await parseJsonSafely(response)) || [];
};

/**
 * Rastrea la visita de un usuario invitado
 */
export const trackGuestVisit = async () => {
  try {
    // En dispositivo físico, 127.0.0.1 apunta al propio celular y no al backend de la PC.
    if (Platform.OS !== 'web' && DEFAULT_LAN_IP === '127.0.0.1') {
      console.warn('[Guest] Visita no enviada: configura EXPO_PUBLIC_API_HOST con la IP LAN de tu PC.');
      return { skipped: true };
    }

    const deviceId = await getDeviceId();
    const response = await fetchWithFallback('/track-guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_id: deviceId }),
    });

    const data = await parseJsonSafely(response);
    if (!response.ok) {
      console.warn('Advertencia en track-guest:', data?.error);
    }
    return data;
  } catch (error) {
    console.warn('No se pudo registrar la visita de invitado (continuando sin bloqueo):', error);
    return { skipped: true };
  }
};

/**
 * Cierra la sesión del usuario eliminando todos los datos
 * de autenticación almacenados localmente en el dispositivo.
 * El device_id se preserva para seguir contando visitas futuras.
 */
export const signOut = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem('app_session_token');
      localStorage.removeItem('app_user_email');
      localStorage.removeItem('app_user_id');
    } else {
      await SecureStore.deleteItemAsync('app_session_token');
      await SecureStore.deleteItemAsync('app_user_email');
      await SecureStore.deleteItemAsync('app_user_id');
    }
    console.log('[Auth] Sesión cerrada. Datos de autenticación eliminados.');
  } catch (error) {
    console.warn('[Auth] Advertencia al limpiar sesión:', error);
  }
};
