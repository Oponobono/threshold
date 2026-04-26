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

// En desarrollo (__DEV__), priorizamos la red local y usamos la nube (Render) como plan B.
// En producción, forzamos usar solo la URL de la nube si existe.
let API_BASE_URLS: string[] = [];

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

export type Assessment = {
  id?: number;
  subject_id: number;
  name: string;
  type?: string | null;
  date?: string | null;
  weight?: string | null;
  out_of?: number | null;
  score?: number | null;
  percentage?: number | null;
  grade_value?: number | null;
  is_completed?: boolean;
};

export type Photo = {
  id?: number;
  subject_id: number;
  local_uri: string;
  created_at?: string;
  es_favorita?: number;
};

export type Schedule = {
  id: number;
  subject_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  name?: string;
  color?: string;
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
 * Registra el token biométrico del dispositivo en el backend para un usuario autenticado.
 * @param userId ID del usuario
 * @param biometricToken Token UUID generado de forma segura en el dispositivo
 */
export const enrollBiometric = async (userId: string, biometricToken: string): Promise<void> => {
  const response = await fetchWithFallback('/auth/enroll-biometric', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, biometric_token: biometricToken }),
  });

  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error || 'Error al registrar biometría.');
  }
};

/**
 * Autentica al usuario usando el token biométrico almacenado en el dispositivo.
 * La huella dactilar NUNCA sale del dispositivo — el OS la valida localmente.
 * @param biometricToken Token recuperado del SecureStore tras validación del OS
 */
export const biometricLogin = async (biometricToken: string) => {
  const response = await fetchWithFallback('/biometric-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ biometric_token: biometricToken }),
  });

  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error || 'Autenticación biométrica fallida.');
  }

  // Guardar sesión igual que en loginUser
  if (Platform.OS === 'web') {
    localStorage.setItem('app_session_token', `biometric-token-${Date.now()}`);
    localStorage.setItem('app_user_email', data.user.email);
    localStorage.setItem('app_user_id', data.user.id.toString());
  } else {
    await SecureStore.setItemAsync('app_session_token', `biometric-token-${Date.now()}`);
    await SecureStore.setItemAsync('app_user_email', data.user.email);
    await SecureStore.setItemAsync('app_user_id', data.user.id.toString());
  }

  return data;
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
 * Obtiene una materia específica
 */
export const getSubjectById = async (subjectId: number | string): Promise<Subject | null> => {
  const response = await fetchWithFallback(`/subject/${subjectId}`);
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
 * Obtiene todas las evaluaciones del usuario
 */
export const getAllAssessments = async (): Promise<any[]> => {
  const userId = await getUserId();
  if (!userId) return [];
  const response = await fetchWithFallback(`/assessments/user/${userId}`);
  return (await parseJsonSafely(response)) || [];
};

/**
 * Obtiene la materia sugerida según el horario actual
 */
export const getPredictedSubject = async (): Promise<Subject | null> => {
  const userId = await getUserId();
  if (!userId) return null;
  const response = await fetchWithFallback(`/prediction/${userId}`);
  return await parseJsonSafely(response);
};

/**
 * Obtiene los horarios de hoy
 */
export const getTodaySchedules = async (): Promise<any[]> => {
  const userId = await getUserId();
  if (!userId) return [];
  const response = await fetchWithFallback(`/schedules/today/${userId}`);
  return (await parseJsonSafely(response)) || [];
};

/**
 * Crea un nuevo horario (soporta repetición enviando múltiples peticiones si es necesario)
 */
export const createSchedule = async (payload: { subject_id: number, day_of_week: number, start_time: string, end_time: string }) => {
  const response = await fetchWithFallback('/schedules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo crear el horario.');
  }

  return data;
};

/**
 * Elimina un horario
 */
export const deleteSchedule = async (id: number) => {
  return await fetchWithFallback(`/schedules/${id}`, { method: 'DELETE' });
};

// ==========================================
// FLASHCARDS
// ==========================================

export interface FlashcardDeck {
  id: number;
  subject_id: number;
  title: string;
  description: string;
  created_at: string;
  card_count?: number;
  review_count?: number;
  learning_count?: number;
  new_count?: number;
  subject_name?: string;
  subject_color?: string;
  subject_icon?: string;
}

export interface Flashcard {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  status: string; // 'new', 'learning', 'review'
  created_at: string;
}

export const getFlashcardDecks = async (): Promise<FlashcardDeck[]> => {
  const userId = await getUserId();
  const response = await fetchWithFallback(`/flashcard-decks?user_id=${userId}`);
  return (await parseJsonSafely(response)) || [];
};

export const createFlashcardDeck = async (payload: { subject_id: number; title: string; description?: string }) => {
  const userId = await getUserId();
  const payloadWithUser = { ...payload, user_id: userId };
  
  const response = await fetchWithFallback('/flashcard-decks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadWithUser),
  });
  const data = await parseJsonSafely(response);
  if (!response.ok) throw new Error(data?.error || 'Error al crear el mazo');
  return data;
};

export const getFlashcards = async (deckId: number): Promise<Flashcard[]> => {
  const response = await fetchWithFallback(`/flashcard-decks/${deckId}/cards`);
  return (await parseJsonSafely(response)) || [];
};

export const createFlashcard = async (payload: { deck_id: number; front: string; back: string }) => {
  const response = await fetchWithFallback(`/flashcard-decks/${payload.deck_id}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafely(response);
  if (!response.ok) throw new Error(data?.error || 'Error al crear tarjeta');
  return data;
};

export const updateFlashcardStatus = async (cardId: number, status: string) => {
  const response = await fetchWithFallback(`/flashcards/${cardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return await parseJsonSafely(response);
};

/**
 * Obtiene horarios por materia
 */
export const getSchedulesBySubject = async (subjectId: number): Promise<any[]> => {
  const response = await fetchWithFallback(`/schedules/subject/${subjectId}`);
  return (await parseJsonSafely(response)) || [];
};

/**
 * Obtiene todos los horarios del usuario
 */
export const getAllSchedules = async (): Promise<any[]> => {
  const userId = await getUserId();
  if (!userId) return [];
  const response = await fetchWithFallback(`/schedules/user/${userId}`);
  return (await parseJsonSafely(response)) || [];
};

/**
 * Crea una nueva evaluación o tarea
 */
export const createAssessment = async (payload: Assessment) => {
  const response = await fetchWithFallback('/assessments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo crear la evaluación.');
  }

  return data;
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
    return data;
  } catch (error) {
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

/**
 * Crea una nueva entrada de foto en la base de datos
 */
export const createPhoto = async (photoData: {
  subject_id: number;
  local_uri: string;
  es_favorita?: number;
}) => {
  try {
    const response = await fetchWithFallback('/photos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(photoData),
    });

    const data = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Error al guardar la foto en la base de datos');
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al intentar guardar la foto');
  }
};

/**
 * Obtiene las fotos de una materia específica
 */
export const getPhotosBySubject = async (subjectId: number): Promise<Photo[]> => {
  try {
    const response = await fetchWithFallback(`/photos/${subjectId}`);
    const data = await parseJsonSafely(response);
    if (!response.ok) {
      console.warn('[getPhotosBySubject] Error:', data?.error);
      return [];
    }
    return data || [];
  } catch (error: any) {
    console.warn('[getPhotosBySubject] Network error:', error.message);
    return [];
  }
};

/**
 * Elimina una foto por ID
 */
export const deletePhoto = async (photoId: number) => {
  try {
    const response = await fetchWithFallback(`/photos/${photoId}`, {
      method: 'DELETE',
    });
    const data = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Error al eliminar la foto');
    }
    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al intentar eliminar la foto');
  }
};

// ==========================================
// AUDIO RECORDINGS & TRANSCRIPTS
// ==========================================

export interface AudioRecording {
  id?: number;
  user_id: number;
  subject_id?: number | null;
  name?: string | null;
  local_uri: string;
  duration?: number;
  created_at?: string;
  subject_name?: string;
  subject_color?: string;
  subject_icon?: string;
  transcript_uri?: string;
  summary_uri?: string;
}

/**
 * Obtiene todas las grabaciones de audio del usuario
 */
export const getAudioRecordings = async (): Promise<AudioRecording[]> => {
  const userId = await getUserId();
  if (!userId) return [];
  const response = await fetchWithFallback(`/audio-recordings/${userId}`);
  return (await parseJsonSafely(response)) || [];
};

/**
 * Crea una nueva grabación de audio
 */
export const createAudioRecording = async (payload: {
  subject_id?: number | null;
  name?: string | null;
  local_uri: string;
  duration?: number;
}) => {
  const userId = await getUserId();
  if (!userId) throw new Error('No hay sesión activa.');

  const payloadWithUser = { ...payload, user_id: Number(userId) };

  const response = await fetchWithFallback('/audio-recordings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadWithUser),
  });

  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo guardar la grabación en BD.');
  }

  return data;
};

/**
 * Actualiza una grabación (ej: asociar materia o renombrar)
 */
export const updateAudioRecording = async (id: number, payload: { subject_id?: number | null; name?: string | null }) => {
  const response = await fetchWithFallback(`/audio-recordings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo actualizar la grabación.');
  }

  return data;
};

/**
 * Elimina una grabación de la base de datos
 */
export const deleteAudioRecording = async (id: number) => {
  const response = await fetchWithFallback(`/audio-recordings/${id}`, { method: 'DELETE' });
  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo eliminar la grabación.');
  }
  return data;
};

/**
 * Upsert para guardar rutas de transcripciones/resúmenes
 */
export const upsertAudioTranscript = async (payload: {
  recording_id: number;
  transcript_uri?: string | null;
  summary_uri?: string | null;
}) => {
  const response = await fetchWithFallback('/audio-transcripts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo guardar la transcripción.');
  }

  return data;
};

