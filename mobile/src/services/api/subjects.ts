import { fetchWithFallback, parseJsonSafely } from './client';
import { getUserId } from './auth';
import { Subject } from './types';

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
 * Obtiene la materia sugerida según el horario actual
 */
export const getPredictedSubject = async (): Promise<Subject | null> => {
  const userId = await getUserId();
  if (!userId) return null;
  const response = await fetchWithFallback(`/prediction/${userId}`);
  return await parseJsonSafely(response);
};
