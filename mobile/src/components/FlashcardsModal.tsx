import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../styles/theme';
import {
  type Subject,
  type FlashcardDeck,
  type Flashcard,
  getFlashcardDecks,
  createFlashcardDeck,
  getFlashcards,
  createFlashcard,
  updateFlashcardStatus,
} from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = 'hub' | 'study' | 'newDeck' | 'newCard';

interface Props {
  isVisible: boolean;
  onClose: () => void;
  subjects: Subject[];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const FlashcardsModal: React.FC<Props> = ({ isVisible, onClose, subjects }) => {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<Screen>('hub');
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  // New deck form
  const [deckTitle, setDeckTitle] = useState('');
  const [deckDesc, setDeckDesc] = useState('');
  const [deckSubjectId, setDeckSubjectId] = useState<number | null>(null);
  const [isSavingDeck, setIsSavingDeck] = useState(false);

  // New card form
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Flip animation
  const flipAnim = useRef(new Animated.Value(0)).current;

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadDecks = async () => {
    try {
      const data = await getFlashcardDecks();
      setDecks(data || []);
    } catch (e) {
      console.warn('Error loading decks:', e);
    }
  };

  useEffect(() => {
    if (isVisible) {
      loadDecks();
      setScreen('hub');
    }
  }, [isVisible]);

  // ── Study session ──────────────────────────────────────────────────────────

  const openStudySession = async (deck: FlashcardDeck) => {
    try {
      const data = await getFlashcards(deck.id);
      if (!data || data.length === 0) {
        Alert.alert(t('flashcards.noCards'), t('flashcards.noCardsMsg'));
        return;
      }
      // Prioritise 'new' and 'learning' cards first
      const sorted = [...data].sort((a, b) => {
        const order: Record<string, number> = { new: 0, learning: 1, review: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      });
      setCards(sorted);
      setCardIndex(0);
      setIsFlipped(false);
      setSessionDone(false);
      setActiveDeck(deck);
      flipAnim.setValue(0);
      setScreen('study');
    } catch (e) {
      console.warn('Error loading cards:', e);
    }
  };

  const handleFlip = () => {
    const toValue = isFlipped ? 0 : 1;
    Animated.timing(flipAnim, {
      toValue,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setIsFlipped(!isFlipped));
  };

  const handleFeedback = async (status: 'learning' | 'review') => {
    const card = cards[cardIndex];
    try {
      await updateFlashcardStatus(card.id, status);
    } catch (_) {}

    const next = cardIndex + 1;
    if (next >= cards.length) {
      setSessionDone(true);
    } else {
      setIsFlipped(false);
      flipAnim.setValue(0);
      setCardIndex(next);
    }
  };

  // ── Create deck ────────────────────────────────────────────────────────────

  const handleSaveDeck = async () => {
    if (!deckTitle.trim() || !deckSubjectId) {
      Alert.alert(t('common.error'), t('flashcards.deckFormError'));
      return;
    }
    try {
      setIsSavingDeck(true);
      await createFlashcardDeck({ subject_id: deckSubjectId, title: deckTitle.trim(), description: deckDesc.trim() });
      setDeckTitle('');
      setDeckDesc('');
      setDeckSubjectId(null);
      await loadDecks();
      setScreen('hub');
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('flashcards.deckSaveError'));
    } finally {
      setIsSavingDeck(false);
    }
  };

  // ── Create card ────────────────────────────────────────────────────────────

  const handleSaveCard = async () => {
    if (!cardFront.trim() || !cardBack.trim() || !activeDeck) return;
    try {
      setIsSavingCard(true);
      await createFlashcard({ deck_id: activeDeck.id, front: cardFront.trim(), back: cardBack.trim() });
      setCardFront('');
      setCardBack('');
      await loadDecks();
      setScreen('hub');
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setIsSavingCard(false);
    }
  };

  // ── Flip interpolations ────────────────────────────────────────────────────

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });
  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity  = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] });

  // ── Render screens ─────────────────────────────────────────────────────────

  const renderHub = () => (
    <View style={{ flex: 1 }}>
      <View style={s.modalHeader}>
        <Text style={s.modalTitle}>{t('flashcards.title')}</Text>
        <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
      <Text style={s.modalSubtitle}>{t('flashcards.subtitle')}</Text>

      <TouchableOpacity style={s.newDeckBtn} onPress={() => setScreen('newDeck')}>
        <Ionicons name="add-circle-outline" size={18} color={theme.colors.white} />
        <Text style={s.newDeckBtnText}>{t('flashcards.newDeck')}</Text>
      </TouchableOpacity>

      {decks.length === 0 ? (
        <View style={s.emptyState}>
          <MaterialCommunityIcons name="cards-outline" size={48} color={theme.colors.text.placeholder} />
          <Text style={s.emptyText}>{t('flashcards.emptyDecks')}</Text>
        </View>
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(d) => d.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.deckCard} activeOpacity={0.75} onPress={() => openStudySession(item)}>
              <View style={[s.deckBadge, { backgroundColor: (item as any).subject_color || '#DDE7FF' }]}>
                <MaterialCommunityIcons
                  name={((item as any).subject_icon as any) || 'cards-outline'}
                  size={20}
                  color={theme.colors.text.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.deckTitle}>{item.title}</Text>
                <Text style={s.deckMeta} numberOfLines={1}>
                  {(item as any).subject_name} · {(item as any).card_count ?? 0} {t('flashcards.cards')}
                </Text>
              </View>
              <TouchableOpacity
                style={s.addCardBtn}
                onPress={() => {
                  setActiveDeck(item);
                  setScreen('newCard');
                }}
              >
                <Ionicons name="add" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.text.placeholder} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  const renderStudy = () => {
    const card = cards[cardIndex];

    if (sessionDone) {
      return (
        <View style={s.sessionDone}>
          <Text style={s.sessionDoneEmoji}>🌟</Text>
          <Text style={s.sessionDoneTitle}>{t('flashcards.sessionDone')}</Text>
          <Text style={s.sessionDoneSubtitle}>{t('flashcards.sessionDoneMsg', { count: cards.length })}</Text>
          <TouchableOpacity style={s.newDeckBtn} onPress={() => setScreen('hub')}>
            <Text style={s.newDeckBtnText}>{t('flashcards.backToDecks')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.studyHeader}>
          <TouchableOpacity onPress={() => setScreen('hub')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={s.studyDeckTitle} numberOfLines={1}>{activeDeck?.title}</Text>
          <Text style={s.studyCounter}>{cardIndex + 1}/{cards.length}</Text>
        </View>

        {/* Progress bar */}
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${((cardIndex + 1) / cards.length) * 100}%` as any }]} />
        </View>

        {/* Card flip area */}
        <TouchableOpacity activeOpacity={0.95} onPress={handleFlip} style={s.flipWrapper}>
          {/* Front */}
          <Animated.View style={[s.card, s.cardFront, { opacity: frontOpacity, transform: [{ rotateY: frontRotate }] }]}>
            <Text style={s.cardHint}>{t('flashcards.front')}</Text>
            <Text style={s.cardText}>{card.front}</Text>
            <View style={s.tapHint}>
              <Ionicons name="sync-outline" size={16} color={theme.colors.text.placeholder} />
              <Text style={s.tapHintText}>{t('flashcards.tapToFlip')}</Text>
            </View>
          </Animated.View>

          {/* Back */}
          <Animated.View style={[s.card, s.cardBack, { opacity: backOpacity, transform: [{ rotateY: backRotate }] }]}>
            <Text style={s.cardHint}>{t('flashcards.back')}</Text>
            <Text style={s.cardText}>{card.back}</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Feedback buttons — only show after flip */}
        {isFlipped && (
          <View style={s.feedbackRow}>
            <TouchableOpacity style={[s.feedbackBtn, s.feedbackBtnHard]} onPress={() => handleFeedback('learning')}>
              <Text style={s.feedbackBtnTextDark}>😅 {t('flashcards.hard')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.feedbackBtn, s.feedbackBtnEasy]} onPress={() => handleFeedback('review')}>
              <Text style={s.feedbackBtnTextDark}>✅ {t('flashcards.easy')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderNewDeck = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.modalHeader}>
        <TouchableOpacity onPress={() => setScreen('hub')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.modalTitle}>{t('flashcards.newDeck')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={s.formLabel}>{t('flashcards.deckName')}</Text>
      <TextInput
        style={s.input}
        value={deckTitle}
        onChangeText={setDeckTitle}
        placeholder={t('flashcards.deckNamePlaceholder')}
        placeholderTextColor={theme.colors.text.placeholder}
      />

      <Text style={s.formLabel}>{t('flashcards.deckDesc')}</Text>
      <TextInput
        style={[s.input, { height: 72, textAlignVertical: 'top' }]}
        value={deckDesc}
        onChangeText={setDeckDesc}
        multiline
        placeholder={t('flashcards.deckDescPlaceholder')}
        placeholderTextColor={theme.colors.text.placeholder}
      />

      <Text style={s.formLabel}>{t('flashcards.subject')}</Text>
      <View style={s.subjectsWrap}>
        {subjects.map((sub) => (
          <TouchableOpacity
            key={sub.id}
            style={[s.subjectChip, deckSubjectId === sub.id && s.subjectChipActive]}
            onPress={() => setDeckSubjectId(sub.id)}
          >
            <View style={[s.subjectChipDot, { backgroundColor: sub.color || '#CCC' }]} />
            <Text style={[s.subjectChipText, deckSubjectId === sub.id && { color: theme.colors.primary, fontWeight: '600' }]}>
              {sub.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[s.newDeckBtn, { marginTop: 28 }, isSavingDeck && { opacity: 0.6 }]}
        onPress={handleSaveDeck}
        disabled={isSavingDeck}
      >
        <Text style={s.newDeckBtnText}>{isSavingDeck ? t('common.saving') : t('flashcards.createDeck')}</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderNewCard = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.modalHeader}>
        <TouchableOpacity onPress={() => setScreen('hub')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.modalTitle}>{t('flashcards.newCard')}</Text>
        <View style={{ width: 22 }} />
      </View>
      <Text style={s.deckSubMeta}>{activeDeck?.title}</Text>

      <Text style={s.formLabel}>{t('flashcards.frontLabel')}</Text>
      <TextInput
        style={[s.input, { height: 100, textAlignVertical: 'top' }]}
        value={cardFront}
        onChangeText={setCardFront}
        multiline
        placeholder={t('flashcards.frontPlaceholder')}
        placeholderTextColor={theme.colors.text.placeholder}
      />

      <Text style={s.formLabel}>{t('flashcards.backLabel')}</Text>
      <TextInput
        style={[s.input, { height: 100, textAlignVertical: 'top' }]}
        value={cardBack}
        onChangeText={setCardBack}
        multiline
        placeholder={t('flashcards.backPlaceholder')}
        placeholderTextColor={theme.colors.text.placeholder}
      />

      <TouchableOpacity
        style={[s.newDeckBtn, { marginTop: 28 }, isSavingCard && { opacity: 0.6 }]}
        onPress={handleSaveCard}
        disabled={isSavingCard}
      >
        <Text style={s.newDeckBtnText}>{isSavingCard ? t('common.saving') : t('flashcards.addCard')}</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  // ── Root render ────────────────────────────────────────────────────────────

  return (
    <Modal visible={isVisible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={screen === 'hub' ? onClose : undefined}>
        <Pressable style={s.sheet} onPress={() => null}>
          <View style={s.handle} />
          {screen === 'hub'     && renderHub()}
          {screen === 'study'   && renderStudy()}
          {screen === 'newDeck' && renderNewDeck()}
          {screen === 'newCard' && renderNewCard()}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '92%',
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    letterSpacing: -0.4,
    flex: 1,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newDeckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 20,
  },
  newDeckBtnText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 220,
  },
  // Deck card
  deckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  deckBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  deckMeta: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  addCardBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Study session
  studyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  studyDeckTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  studyCounter: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  flipWrapper: {
    height: 240,
    marginBottom: 24,
  },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    padding: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  } as any,
  cardFront: {
    backgroundColor: theme.colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardBack: {
    backgroundColor: theme.colors.primary + '0D',
  },
  cardHint: {
    position: 'absolute',
    top: 14,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.colors.text.placeholder,
  },
  cardText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
    lineHeight: 28,
  },
  tapHint: {
    position: 'absolute',
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapHintText: {
    fontSize: 11,
    color: theme.colors.text.placeholder,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  feedbackBtnHard: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFCC80',
  },
  feedbackBtnEasy: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  feedbackBtnTextDark: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  // Session done
  sessionDone: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  sessionDoneEmoji: {
    fontSize: 52,
  },
  sessionDoneTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text.primary,
    letterSpacing: -0.4,
  },
  sessionDoneSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  // Forms
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  subjectsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  subjectChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  subjectChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subjectChipText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  deckSubMeta: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
});
