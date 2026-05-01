import { useState } from 'react';
import { generateFlashcardsFromText, generateFlashcardsFromImage } from '../services/api/flashcards';
import { useTranslation } from 'react-i18next';

interface GenerateCardsParams {
  text?: string;
  imageBase64?: string;
  count: number;
  title: string;
  subjectId: number;
  userId: number;
}

interface GeneratedDeck {
  id: number;
  subject_id: number;
  user_id: number;
  title: string;
  description: string;
  card_count: number;
  cards: Array<{
    id: number;
    deck_id: number;
    front: string;
    back: string;
    status: 'new' | 'learning' | 'review';
    created_at: string;
  }>;
}

export const useFlashcardGenerator = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedDeck, setGeneratedDeck] = useState<GeneratedDeck | null>(null);

  const generate = async (params: GenerateCardsParams): Promise<{ success: boolean; deck?: GeneratedDeck; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      // Validar entrada
      if (!params.text && !params.imageBase64) {
        const errorMsg = 'Se requiere texto o imagen base64';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      if (params.text && params.text.trim().length < 50) {
        const errorMsg = t('flashcards.generate.tooShort', { count: params.count, recommended: 5 });
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      let result;

      if (params.imageBase64) {
        // Llamar a la API de imagen
        result = await generateFlashcardsFromImage({
          image_base64: params.imageBase64,
          count: params.count,
          title: params.title,
          subject_id: params.subjectId,
          user_id: params.userId,
        });
      } else if (params.text) {
        // Llamar a la API de texto
        result = await generateFlashcardsFromText({
          text: params.text,
          count: params.count,
          title: params.title,
          subject_id: params.subjectId,
          user_id: params.userId,
        });
      }

      setGeneratedDeck(result);
      return { success: true, deck: result };
    } catch (err: any) {
      const errorMsg = err.message || t('flashcards.generate.errors.generationFailed');
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);
  const clearGeneratedDeck = () => setGeneratedDeck(null);

  return {
    generate,
    loading,
    error,
    generatedDeck,
    clearError,
    clearGeneratedDeck,
  };
};
