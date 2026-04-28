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
