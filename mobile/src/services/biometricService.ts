/**
 * biometricService.ts
 *
 * Servicio de autenticación biométrica (Touch ID / Face ID).
 *
 * MODELO DE SEGURIDAD:
 * - La huella dactilar NUNCA sale del dispositivo. El SO es quien la valida.
 * - Solo manejamos un token opaco aleatorio (UUID), cifrado en hardware
 *   mediante expo-secure-store.
 * - El backend almacena este token en biometric_token y lo usa como
 *   credencial de segundo factor, igual que una contraseña de un solo uso
 *   persistente pero nunca transmitida en claro de forma útil.
 *
 * FLUJO DE ENROLLMENT (registro de huella):
 *   1. Login exitoso con email/contraseña.
 *   2. Se genera un UUID criptográficamente seguro.
 *   3. Se guarda en SecureStore (cifrado en el chip de hardware del dispositivo).
 *   4. Se envía al backend → columna biometric_token en la tabla users.
 *
 * FLUJO DE LOGIN CON HUELLA:
 *   1. Usuario toca el botón Touch ID.
 *   2. El OS muestra el escáner y valida la huella.
 *   3. Si el OS confirma la identidad, recuperamos el token de SecureStore.
 *   4. Enviamos el token al endpoint /api/biometric-login.
 *   5. El backend busca al usuario con ese token y responde.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import i18n from '../locales/i18n';

const BIOMETRIC_TOKEN_KEY = 'threshold_biometric_token';
const BIOMETRIC_USER_EMAIL_KEY = 'threshold_biometric_email';

// ─────────────────────────────────────────────
// CONSULTAS AL HARDWARE
// ─────────────────────────────────────────────

/**
 * Verifica si el dispositivo tiene hardware biométrico disponible y enrollado.
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return isEnrolled;
};

/**
 * Devuelve los tipos de biometría soportados (fingerprint, face, iris).
 */
export const getBiometricType = async (): Promise<string> => {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'face';
  }
  return 'unknown';
};

// ─────────────────────────────────────────────
// ESTADO LOCAL DEL TOKEN
// ─────────────────────────────────────────────

/**
 * Verifica si el usuario ya tiene un token de huella registrado en este dispositivo.
 */
export const hasBiometricTokenStored = async (): Promise<boolean> => {
  try {
    const token = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
    return !!token;
  } catch {
    return false;
  }
};

/**
 * Recupera el email asociado al token biométrico guardado localmente.
 */
export const getBiometricUserEmail = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(BIOMETRIC_USER_EMAIL_KEY);
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────
// ENROLLMENT (REGISTRO)
// ─────────────────────────────────────────────

/**
 * Genera un nuevo token biométrico y lo almacena de forma segura en el dispositivo.
 * Devuelve el token para que sea enviado al backend.
 *
 * @param userEmail El email del usuario que está registrando su huella.
 */
export const enrollBiometricToken = async (userEmail: string): Promise<string | null> => {
  try {
    // 1. Verificar disponibilidad
    const available = await isBiometricAvailable();
    if (!available) return null;

    // 2. Pedir confirmación biométrica al usuario antes de registrar
    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage: i18n.t('biometric.promptEnroll'),
      cancelLabel: i18n.t('biometric.cancel'),
      disableDeviceFallback: false,
    });

    if (!authResult.success) return null;

    // 3. Generar token criptográficamente seguro (128 bits = 32 hex chars)
    const token = Crypto.randomUUID();

    // 4. Guardar token y email en el Secure Store del dispositivo (cifrado en hardware)
    await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token);
    await SecureStore.setItemAsync(BIOMETRIC_USER_EMAIL_KEY, userEmail);

    return token;
  } catch (error) {
    console.error('[BiometricService] Error durante enrollment:', error);
    return null;
  }
};

// ─────────────────────────────────────────────
// AUTENTICACIÓN
// ─────────────────────────────────────────────

/**
 * Resultado de un intento de autenticación biométrica.
 */
export type BiometricAuthResult =
  | { success: true; token: string }
  | { success: false; reason: 'not_enrolled' | 'cancelled' | 'failed' | 'no_token' };

/**
 * Lanza el escáner biométrico del SO y, si tiene éxito, devuelve el token
 * almacenado en SecureStore para ser enviado al backend.
 */
export const authenticateWithBiometrics = async (): Promise<BiometricAuthResult> => {
  try {
    // 1. Verificar que ya existe un token registrado en este dispositivo
    const token = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
    if (!token) {
      return { success: false, reason: 'not_enrolled' };
    }

    // 2. Lanzar el escáner nativo del SO
    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage: i18n.t('biometric.promptLogin'),
      cancelLabel: i18n.t('biometric.cancel'),
      disableDeviceFallback: false, // Permite PIN como fallback si la huella falla
    });

    if (!authResult.success) {
      const reason = authResult.error === 'user_cancel' ? 'cancelled' : 'failed';
      return { success: false, reason };
    }

    // 3. El SO confirmó la identidad. Devolver el token para validar con el backend.
    return { success: true, token };

  } catch (error) {
    console.error('[BiometricService] Error durante autenticación:', error);
    return { success: false, reason: 'failed' };
  }
};

// ─────────────────────────────────────────────
// REVOCACIÓN
// ─────────────────────────────────────────────

/**
 * Elimina el token biométrico del dispositivo (p.ej. al cerrar sesión o
 * desde los ajustes de seguridad de la cuenta).
 */
export const revokeBiometricToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_USER_EMAIL_KEY);
  } catch (error) {
    console.error('[BiometricService] Error al revocar token biométrico:', error);
  }
};
