import { fetchWithFallback, parseJsonSafely } from './client';
import { getUserId } from './auth';

export interface StudySession {
  id?: number;
  user_id?: number;
  subject_id?: number | null;
  session_type: 'Pomodoro' | 'Threshold';
  config_value?: number | null;
  duration_seconds: number;
  performance_rating?: number | null;
  start_timestamp?: string;
}

export interface CardLog {
  id?: number;
  card_id: number;
  user_id?: number;
  result?: string | null;
  response_time_ms?: number | null;
  timestamp?: string;
}

export interface GroupMembership {
  id?: number;
  user_id?: number;
  group_pin_id: string;
  role?: string;
  joined_at?: string;
}

// ================= STUDY SESSIONS =================

export const getStudySessions = async (): Promise<StudySession[]> => {
  try {
    const userId = await getUserId();
    if (!userId) return [];
    
    const response = await fetchWithFallback(`/learning/sessions/${userId}`);
    const data = await parseJsonSafely(response);
    if (!response.ok) {
      console.warn('[getStudySessions] Error:', data?.error);
      return [];
    }
    return data || [];
  } catch (error: any) {
    console.warn('[getStudySessions] Network error:', error.message);
    return [];
  }
};

export const createStudySession = async (
  sessionData: Omit<StudySession, 'id' | 'start_timestamp' | 'user_id'>
): Promise<any> => {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    const response = await fetchWithFallback('/learning/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sessionData, user_id: userId }),
    });
    
    const responseData = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(responseData?.error || 'Error al guardar la sesión de estudio');
    }
    return responseData;
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al crear la sesión');
  }
};


// ================= CARD LOGS =================

export const getCardLogs = async (): Promise<CardLog[]> => {
  try {
    const userId = await getUserId();
    if (!userId) return [];
    
    const response = await fetchWithFallback(`/learning/card_logs/${userId}`);
    const data = await parseJsonSafely(response);
    if (!response.ok) {
      console.warn('[getCardLogs] Error:', data?.error);
      return [];
    }
    return data || [];
  } catch (error: any) {
    console.warn('[getCardLogs] Network error:', error.message);
    return [];
  }
};

export const createCardLog = async (
  logData: Omit<CardLog, 'id' | 'timestamp' | 'user_id'>
): Promise<any> => {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    const response = await fetchWithFallback('/learning/card_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...logData, user_id: userId }),
    });
    
    const responseData = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(responseData?.error || 'Error al registrar log de tarjeta');
    }
    return responseData;
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al crear el log de tarjeta');
  }
};


// ================= GROUP MEMBERSHIPS =================

export const getUserGroups = async (): Promise<GroupMembership[]> => {
  try {
    const userId = await getUserId();
    if (!userId) return [];
    
    const response = await fetchWithFallback(`/learning/groups/${userId}`);
    const data = await parseJsonSafely(response);
    if (!response.ok) {
      console.warn('[getUserGroups] Error:', data?.error);
      return [];
    }
    return data || [];
  } catch (error: any) {
    console.warn('[getUserGroups] Network error:', error.message);
    return [];
  }
};

export const joinGroup = async (group_pin_id: string): Promise<any> => {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    const response = await fetchWithFallback('/learning/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, group_pin_id }),
    });
    
    const responseData = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(responseData?.error || 'Error al unirse al grupo');
    }
    return responseData;
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al intentar unirse al grupo');
  }
};
export const leaveGroup = async (group_pin_id: string): Promise<any> => {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    const response = await fetchWithFallback('/learning/groups/leave', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, group_pin_id }),
    });
    
    const responseData = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(responseData?.error || 'Error al salir del grupo');
    }
    return responseData;
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al intentar salir del grupo');
  }
};
