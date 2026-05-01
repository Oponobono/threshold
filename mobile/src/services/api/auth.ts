import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { fetchWithFallback, parseJsonSafely } from './client';
import { UserProfile } from './types';

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
 * Rastrea la visita de un usuario invitado
 */
export const trackGuestVisit = async () => {
  try {
    const { DEFAULT_LAN_IP } = require('./client');
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
 * Actualiza el perfil del usuario (nombre, apellido, usuario, universidad)
 */
export const updateUserProfile = async (payload: {
  name?: string;
  lastname?: string;
  username?: string;
  university?: string;
  share_pin?: string;
}) => {
  const userId = await getUserId();
  if (!userId) throw new Error('No hay sesión activa.');

  const response = await fetchWithFallback(`/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error || 'Error al actualizar el perfil');
  }
  return data;
};

/**
 * Actualiza la contraseña del usuario
 */
export const updateUserPassword = async (currentPassword: string, newPassword: string) => {
  const userId = await getUserId();
  if (!userId) throw new Error('No hay sesión activa.');

  const response = await fetchWithFallback(`/users/${userId}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error || 'Error al actualizar la contraseña');
  }
  return data;
};

/**
 * Revoca el token biométrico en el servidor
 */
export const removeBiometricToken = async () => {
  const userId = await getUserId();
  if (!userId) throw new Error('No hay sesión activa.');

  const response = await fetchWithFallback(`/users/${userId}/biometric`, {
    method: 'DELETE',
  });
  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error || 'Error al eliminar token biométrico');
  }
  return data;
};

/**
 * Solicita la eliminación de la cuenta (Soft Delete con 14 días de gracia)
 * Requiere contraseña para confirmación
 */
export const requestAccountDeletion = async (password: string) => {
  const userId = await getUserId();
  if (!userId) throw new Error('No hay sesión activa.');

  const response = await fetchWithFallback(`/users/${userId}/password-verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  });
  
  const verifyData = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(verifyData?.error || 'Contraseña incorrecta');
  }

  // Si la contraseña es correcta, proceder con la eliminación
  const deleteResponse = await fetchWithFallback(`/users/${userId}`, {
    method: 'DELETE',
  });
  const deleteData = await parseJsonSafely(deleteResponse);
  if (!deleteResponse.ok) {
    throw new Error(deleteData?.error || 'Error al solicitar eliminación de cuenta');
  }
  
  // NO limpiar sesión aún, el usuario tiene 14 días para cambiar de idea
  return deleteData;
};

/**
 * Reactivar una cuenta que está pendiente de eliminación
 */
export const reactivateAccount = async (userId: string) => {
  const response = await fetchWithFallback(`/users/${userId}/reactivate`, {
    method: 'POST',
  });
  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error || 'Error al reactivar la cuenta');
  }
  return data;
};

/**
 * Obtener información de datos que se perderán al eliminar la cuenta
 */
export const getDeletionDataCount = async (userId: string) => {
  const response = await fetchWithFallback(`/users/${userId}/deletion-data-count`, {
    method: 'GET',
  });
  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error || 'Error al obtener información de datos');
  }
  return data;
};

/**
 * Deshabilita permanentemente la cuenta del usuario (Legacy - ahora es soft delete)
 */
export const disableAccount = async () => {
  const userId = await getUserId();
  if (!userId) throw new Error('No hay sesión activa.');

  const response = await fetchWithFallback(`/users/${userId}`, {
    method: 'DELETE',
  });
  const data = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error || 'Error al deshabilitar la cuenta');
  }
  
  // Limpiar sesión localmente
  await signOut();
  return data;
};
