import { fetchWithFallback, parseJsonSafely } from './client';
import { getUserId } from './auth';

export const sendAIChatMessage = async (contextText: string, messages: any[]) => {
  try {
    const response = await fetchWithFallback('/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context_text: contextText,
        messages: messages,
      }),
    });
    
    const data = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Error al comunicarse con la IA');
    }
    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Error de red al intentar chatear con la IA');
  }
};
