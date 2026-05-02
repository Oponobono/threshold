import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useCustomAlert } from './CustomAlert';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../styles/theme';
import { flashcardsStyles as s } from '../styles/FlashcardsModal.styles';
import {
  type Subject,
  type FlashcardDeck,
  type Flashcard,
  getFlashcardDecks,
  createFlashcardDeck,
  getFlashcards,
  createFlashcard,
  updateFlashcardStatus,
  createCardLog,
  getUserId,
  shareDeck,
  deleteFlashcardDeck,
  deleteFlashcard,
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
  const { showAlert } = useCustomAlert();
  const [screen, setScreen] = useState<Screen>('hub');
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Share deck modal state
  const [shareDeckTarget, setShareDeckTarget] = useState<FlashcardDeck | null>(null);
  const [sharePin, setSharePin] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const handleShareDeck = async () => {
    if (!shareDeckTarget || !sharePin.trim()) return;
    setIsSharing(true);
    try {
      const result = await shareDeck(shareDeckTarget.id, sharePin.trim());
      showAlert({ title: '¡Compartido!', message: result.message, type: 'success' });
      setShareDeckTarget(null);
      setSharePin('');
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message, type: 'error' });
    } finally {
      setIsSharing(false);
    }
  };

  // New deck form
  const [deckTitle, setDeckTitle] = useState('');
  const [deckDesc, setDeckDesc] = useState('');
  const [deckSubjectId, setDeckSubjectId] = useState<number | null>(null);
  const [isSavingDeck, setIsSavingDeck] = useState(false);

  // New card form
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Feedback State
  const [selectedFeedback, setSelectedFeedback] = useState<'learning' | 'review' | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [cardStartTime, setCardStartTime] = useState<number>(0);

  // Flip and Reaction animations
  const flipAnim = useRef(new Animated.Value(0)).current;
  const reactionAnim = useRef(new Animated.Value(0)).current;

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadDecks = async () => {
    try {
      const data = await getFlashcardDecks();
      setDecks(data || []);
    } catch (e) {
      console.warn('Error loading decks:', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDecks();
    setRefreshing(false);
  };

  useEffect(() => {
    if (isVisible) {
      loadDecks();
      setScreen('hub');
      setAnswerRevealed(false);
      getUserId().then(id => setCurrentUserId(id ? Number(id) : null));
    }
  }, [isVisible]);

  // ── Study session ──────────────────────────────────────────────────────────

  const openStudySession = async (deck: FlashcardDeck) => {
    try {
      const data = await getFlashcards(deck.id);
      if (!data || data.length === 0) {
        showAlert({ title: t('flashcards.noCards'), message: t('flashcards.noCardsMsg'), type: 'info' });
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
      setSelectedFeedback(null);
      setActiveDeck(deck);
      flipAnim.setValue(0);
      reactionAnim.setValue(0);
      setAnswerRevealed(false);
      setCardStartTime(Date.now());
      setScreen('study');
    } catch (e) {
      console.warn('Error loading cards:', e);
    }
  };

  const goBackToHub = () => {
    loadDecks();
    setScreen('hub');
  };

  const handleFlip = () => {
    const nextFlipped = !isFlipped;
    
    // Animación de la tarjeta con spring para física más orgánica
    Animated.spring(flipAnim, {
      toValue: nextFlipped ? 1 : 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start(() => setIsFlipped(nextFlipped));

    if (nextFlipped && !answerRevealed) {
      setAnswerRevealed(true);
      // Secuencia de reacciones (Duda -> Asombro -> Botones) al mostrar reverso
      Animated.sequence([
        Animated.timing(reactionAnim, { toValue: 1, duration: 200, easing: Easing.ease, useNativeDriver: true }),
        // Mantenemos la cara de Eureka por el tiempo de delay mientras el usuario lee la respuesta
        Animated.delay(500),
        Animated.timing(reactionAnim, { toValue: 2, duration: 400, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
      ]).start();
    }
  };

  const handleFeedback = async (status: 'learning' | 'review') => {
    if (selectedFeedback) return;
    setSelectedFeedback(status);

    const card = cards[cardIndex];
    const responseTime = Date.now() - cardStartTime;

    try {
      await updateFlashcardStatus(card.id, status);
      await createCardLog({
        card_id: card.id,
        result: status,
        response_time_ms: responseTime,
      });
    } catch (_) {}

    // Esperar 1.2 segundos para procesar visualmente el botón
    setTimeout(() => {
      const next = cardIndex + 1;
      if (next >= cards.length) {
        setSessionDone(true);
      } else {
        setIsFlipped(false);
        flipAnim.setValue(0);
        reactionAnim.setValue(0);
        setAnswerRevealed(false);
        setCardIndex(next);
        setCardStartTime(Date.now());
      }
      setSelectedFeedback(null);
    }, 1200);
  };

  // ── Create deck ────────────────────────────────────────────────────────────

  const handleSaveDeck = async () => {
    if (!deckTitle.trim() || !deckSubjectId) {
      showAlert({ title: t('common.error'), message: t('flashcards.deckFormError'), type: 'warning' });
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
      showAlert({ title: t('common.error'), message: e.message || t('flashcards.deckSaveError'), type: 'error' });
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
      showAlert({ title: t('common.error'), message: e.message, type: 'error' });
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleDeleteDeck = (deck: FlashcardDeck) => {
    showAlert({
      title: 'Eliminar Mazo',
      message: `¿Estás seguro de que deseas eliminar el mazo "${deck.title}"? Esta acción no se puede deshacer.`,
      type: 'confirm',
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFlashcardDeck(deck.id);
              await loadDecks();
            } catch (e: any) {
              showAlert({ title: t('common.error'), message: e.message || 'Error al eliminar el mazo', type: 'error' });
            }
          }
        }
      ]
    });
  };

  const handleDeleteCard = (cardId: number) => {
    showAlert({
      title: 'Eliminar Tarjeta',
      message: '¿Estás seguro de que deseas eliminar esta tarjeta?',
      type: 'confirm',
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFlashcard(cardId);
              // Remover la tarjeta de la vista actual
              const updatedCards = cards.filter(c => c.id !== cardId);
              setCards(updatedCards);
              if (updatedCards.length === 0) {
                setSessionDone(true);
              } else if (cardIndex >= updatedCards.length) {
                setCardIndex(updatedCards.length - 1);
              }
            } catch (e: any) {
              showAlert({ title: t('common.error'), message: e.message || 'Error al eliminar la tarjeta', type: 'error' });
            }
          }
        }
      ]
    });
  };

  // ── Animations ─────────────────────────────────────────────────────────────
  // Perspectiva para dar profundidad real al giro 3D
  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate  = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.5, 0.51, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity  = flipAnim.interpolate({ inputRange: [0, 0.5, 0.51, 1], outputRange: [0, 0, 1, 1] });
  // Escala que "comprime" la tarjeta en el punto medio del volteo (efecto físico)
  const cardScale = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.94, 1] });

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
          style={{ maxHeight: 280 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => {
            const isShared = item.user_id != null && item.user_id !== currentUserId;
            const isOwner = item.user_id === currentUserId;
            return (
              <TouchableOpacity style={s.deckCard} activeOpacity={0.75} onPress={() => openStudySession(item)}>
                <View style={[s.deckBadge, { backgroundColor: (item as any).subject_color || '#DDE7FF' }]}>
                  <MaterialCommunityIcons
                    name={((item as any).subject_icon as any) || 'cards-outline'}
                    size={20}
                    color={theme.colors.text.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={s.deckTitle}>{item.title}</Text>
                    {isShared && (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 3,
                        backgroundColor: '#E8F5E9', borderRadius: 10,
                        paddingHorizontal: 7, paddingVertical: 2,
                      }}>
                        <Ionicons name="people" size={10} color="#388E3C" />
                        <Text style={{ fontSize: 10, color: '#388E3C', fontWeight: '700' }}>Compartido</Text>
                      </View>
                    )}
                  </View>
                  {isShared && (
                    <Text style={{ fontSize: 11, color: '#388E3C', marginTop: 1, fontStyle: 'italic' }}>
                      por @{item.owner_username || item.owner_name || 'compañero'}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={s.deckMeta} numberOfLines={1}>
                      {item.subject_name}
                    </Text>
                  </View>
                  {/* Visual Breakdown */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 }}>
                    <Text style={{ fontSize: 11, color: theme.colors.text.secondary }}>
                      {Number(item.card_count ?? 0)} {t('flashcards.cards')}
                    </Text>
                    {(Number(item.card_count ?? 0) > 0) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 11, color: '#4CAF50', fontWeight: '600' }}>
                          ✓ {Number(item.review_count ?? 0)}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#FF9800', fontWeight: '600' }}>
                          💪 {Number(item.learning_count ?? 0) + Number(item.new_count ?? 0)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              {isOwner && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    style={[s.addCardBtn, { marginRight: 2, backgroundColor: '#FFF5F5' }]}
                    onPress={() => handleDeleteDeck(item)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.addCardBtn, { marginRight: 2 }]}
                    onPress={() => {
                      setShareDeckTarget(item);
                      setSharePin('');
                    }}
                  >
                    <Ionicons name="share-social-outline" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
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
            );
          }}
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
          <TouchableOpacity style={s.newDeckBtn} onPress={goBackToHub}>
            <Text style={s.newDeckBtnText}>{t('flashcards.backToDecks')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ paddingBottom: 8 }}>
        {/* Header */}
        <View style={s.studyHeader}>
          <TouchableOpacity onPress={goBackToHub} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={s.studyDeckTitle} numberOfLines={1}>{activeDeck?.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={s.studyCounter}>{cardIndex + 1}/{cards.length}</Text>
            {activeDeck?.user_id === currentUserId && (
              <TouchableOpacity onPress={() => card.id && handleDeleteCard(card.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={20} color="#D32F2F" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Progress bar */}
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${((cardIndex + 1) / cards.length) * 100}%` as any }]} />
        </View>

        {/* Card flip area */}
        <TouchableOpacity activeOpacity={0.95} onPress={handleFlip} style={s.flipWrapper}>
          {/* Front */}
          <Animated.View style={[
            s.card, s.cardFront,
            { opacity: frontOpacity, transform: [{ perspective: 1000 }, { rotateY: frontRotate }, { scale: cardScale }] }
          ]}>
            <Text style={s.cardHint}>{t('flashcards.front')}</Text>
            <Text style={s.cardText}>{card.front}</Text>
            <View style={s.tapHint}>
              <Ionicons name="sync-outline" size={16} color={theme.colors.text.placeholder} />
              <Text style={s.tapHintText}>{t('flashcards.tapToFlip')}</Text>
            </View>
          </Animated.View>

          {/* Back */}
          <Animated.View style={[
            s.card, s.cardBack,
            { opacity: backOpacity, transform: [{ perspective: 1000 }, { rotateY: backRotate }, { scale: cardScale }] }
          ]}>
            <Text style={s.cardHint}>{t('flashcards.back')}</Text>
            <Text style={s.cardText}>{card.back}</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Feedback area with fixed height to prevent layout jumps */}
        <View style={s.feedbackArea}>
          {/* 1. Pensativo (0 a 0.5) */}
          <Animated.View style={[s.reactionAbsolute, { 
            opacity: reactionAnim.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0] }) 
          }]}>
            <LottieView 
              source={require('../lottieFiles/thinking.json')}
              autoPlay
              loop
              style={{ width: 80, height: 80 }}
            />
          </Animated.View>

          {/* 2. Asombro (0.5 a 1.5) */}
          <Animated.View style={[s.reactionAbsolute, { 
            opacity: reactionAnim.interpolate({ inputRange: [0.4, 1, 1.5], outputRange: [0, 1, 0] }),
            transform: [{ scale: reactionAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0.5, 1.2], extrapolate: 'clamp' }) }]
          }]}>
            <LottieView 
              key={`eureka-${cardIndex}`}
              source={require('../lottieFiles/eureka.json')}
              autoPlay
              loop={false}
              style={{ width: 80, height: 80 }}
            />
          </Animated.View>

          {/* 3. Botones (1.5 a 2) */}
          <Animated.View style={[s.reactionAbsolute, s.feedbackRow, { 
            opacity: reactionAnim.interpolate({ inputRange: [1.5, 2], outputRange: [0, 1] }),
            transform: [{ scale: reactionAnim.interpolate({ inputRange: [1.5, 2], outputRange: [0.9, 1], extrapolate: 'clamp' }) }]
          }]}>
            <TouchableOpacity 
              style={[
                s.feedbackBtn, 
                s.feedbackBtnHard, 
                selectedFeedback && selectedFeedback !== 'learning' && { opacity: 0.3 }
              ]} 
              onPress={() => handleFeedback('learning')}
              disabled={!!selectedFeedback}
            >
              <MaterialCommunityIcons name="brain" size={26} color="#FF9800" style={{ marginBottom: 6 }} />
              <Text style={[s.feedbackBtnTextDark, { color: '#FF9800', fontWeight: '700', fontSize: 13 }]}>{t('flashcards.hard')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                s.feedbackBtn, 
                s.feedbackBtnEasy, 
                selectedFeedback && selectedFeedback !== 'review' && { opacity: 0.3 }
              ]} 
              onPress={() => handleFeedback('review')}
              disabled={!!selectedFeedback}
            >
              <MaterialCommunityIcons name="check-decagram" size={26} color="#4CAF50" style={{ marginBottom: 6 }} />
              <Text style={[s.feedbackBtnTextDark, { color: '#4CAF50', fontWeight: '700', fontSize: 13 }]}>{t('flashcards.easy')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
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
    <>
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

      {/* ─── SHARE DECK MODAL ─── */}
      <Modal visible={!!shareDeckTarget} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setShareDeckTarget(null)}
        >
          <Pressable
            style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '85%', gap: 12 }}
            onPress={() => null}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.colors.text.primary }}>Compartir mazo</Text>
            <Text style={{ fontSize: 13, color: theme.colors.text.secondary }}>
              Ingresa el PIN del usuario con quien deseas compartir {shareDeckTarget?.title ? `"${shareDeckTarget?.title}"` : ''}.
            </Text>
            <TextInput
              style={{
                borderWidth: 1.5,
                borderColor: theme.colors.border,
                borderRadius: 10,
                padding: 12,
                fontSize: 20,
                fontWeight: '700',
                letterSpacing: 4,
                textAlign: 'center',
                color: theme.colors.text.primary,
              }}
              placeholder="Ej: ABC123"
              placeholderTextColor={theme.colors.text.placeholder}
              value={sharePin}
              onChangeText={setSharePin}
              autoCapitalize="characters"
              maxLength={8}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' }}
                onPress={() => setShareDeckTarget(null)}
              >
                <Text style={{ color: theme.colors.text.secondary, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center' }, (!sharePin.trim() || isSharing) && { opacity: 0.5 }]}
                onPress={handleShareDeck}
                disabled={!sharePin.trim() || isSharing}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{isSharing ? 'Compartiendo...' : 'Compartir'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
