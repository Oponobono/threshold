import { fetchWithFallback, parseJsonSafely } from './client';
import { getUserId } from './auth';

export interface ScannedDocument {
  id?: number;
  user_id?: number;
  subject_id?: number | null;
  name?: string | null;
  local_uri: string;
  created_at?: string;
}

export const getScannedDocumentsBySubject = async (subjectId: number | string): Promise<ScannedDocument[]> => {
  try {
    const response = await fetchWithFallback(`/scanned_documents/subject/${subjectId}`);
    const data = await parseJsonSafely(response);
    if (!response.ok) {
      console.warn('[getScannedDocumentsBySubject] Error:', data?.error);
      return [];
    }
    return data || [];
  } catch (error: any) {
    console.warn('[getScannedDocumentsBySubject] Network error:', error.message);
    return [];
  }
};

export const createScannedDocument = async (
  data: Omit<ScannedDocument, 'id' | 'created_at' | 'user_id'>
): Promise<ScannedDocument> => {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    const response = await fetchWithFallback('/scanned_documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, user_id: userId }),
    });
    
    const responseData = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(responseData?.error || 'Error al guardar el documento escaneado');
    }
    return responseData;
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al crear el documento escaneado');
  }
};

export const deleteScannedDocument = async (documentId: number | string): Promise<any> => {
  try {
    const response = await fetchWithFallback(`/scanned_documents/${documentId}`, {
      method: 'DELETE',
    });
    const data = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Error al eliminar el documento escaneado');
    }
    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al intentar eliminar el documento escaneado');
  }
};

export const extractTextFromImage = async (base64Image: string): Promise<string> => {
  try {
    const response = await fetchWithFallback('/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image }),
    });
    const data = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Error al procesar el OCR de la imagen');
    }
    return data.text || '';
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al invocar el servicio de OCR');
  }
};
