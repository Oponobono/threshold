import { fetchWithFallback, parseJsonSafely } from './client';
import { getUserId } from './auth';
import { FlashcardDeck, Flashcard } from './types';

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

export const generateFlashcardsFromText = async (payload: {
  text: string;
  count: number;
  title: string;
  subject_id: number;
  user_id: number;
}) => {
  const response = await fetchWithFallback('/flashcard-decks/generate-from-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafely(response);
  if (!response.ok) throw new Error(data?.error || 'Error generating flashcards');
  return data;
};

export const generateFlashcardsFromImage = async (payload: {
  image_base64: string;
  count: number;
  title: string;
  subject_id: number;
  user_id: number;
}) => {
  const response = await fetchWithFallback('/flashcard-decks/generate-from-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafely(response);
  if (!response.ok) throw new Error(data?.error || 'Error generating flashcards from image');
  return data;
};

export const shareDeck = async (deckId: number, recipientPin: string): Promise<{ message: string; recipient_name: string }> => {
  const userId = await getUserId();
  const response = await fetchWithFallback(`/flashcard-decks/${deckId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, recipient_pin: recipientPin.trim().toUpperCase() }),
  });
  const data = await parseJsonSafely(response);
  if (!response.ok) throw new Error(data?.error || 'Error al compartir el mazo');
  return data;
};

export const deleteFlashcardDeck = async (deckId: number) => {
  const response = await fetchWithFallback(`/flashcard-decks/${deckId}`, {
    method: 'DELETE',
  });
  const data = await parseJsonSafely(response);
  if (!response.ok) throw new Error(data?.error || 'Error al eliminar el mazo');
  return data;
};

export const deleteFlashcard = async (cardId: number) => {
  const response = await fetchWithFallback(`/flashcards/${cardId}`, {
    method: 'DELETE',
  });
  const data = await parseJsonSafely(response);
  if (!response.ok) throw new Error(data?.error || 'Error al eliminar la tarjeta');
  return data;
};
