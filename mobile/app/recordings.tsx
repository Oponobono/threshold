import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../src/styles/theme';
import { recordingsStyles as styles } from '../src/styles/RecordingsScreen.styles';
import { useAudioRecorder, RecordingItem } from '../src/hooks/useAudioRecorder';
import { PremiumLoading } from '../src/components/PremiumLoading';
import { RecordingsGrid, GridMediaItem, SubjectSection } from '../src/components/RecordingsGrid';
import {
  getYouTubeVideos,
  createYouTubeVideo,
  YouTubeVideo,
  deleteYouTubeVideo,
} from '../src/services/api';

// ─────────────────────────────────────────────────────────────────────────────
export default function RecordingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Audio recordings ───────────────────────────────────────────────────────
  const {
    isRecording,
    isPaused,
    recordings,
    recordingDuration,
    meteringDb,
    playingId,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    playSound,
    stopSound,
    deleteRecordingConfirmed,
    formatDuration,
    loadRecordings,
  } = useAudioRecorder();

  // ── YouTube videos ─────────────────────────────────────────────────────────
  const [youTubeVideos, setYouTubeVideos] = useState<YouTubeVideo[]>([]);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isAddingYouTubeVideo, setIsAddingYouTubeVideo] = useState(false);

  // ── Search & filter ────────────────────────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'recording' | 'video'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const searchAnim = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  // ── Search bar animation ───────────────────────────────────────────────────
  const toggleSearch = () => {
    const opening = !showSearch;
    setShowSearch(opening);
    Animated.spring(searchAnim, {
      toValue: opening ? 1 : 0,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
    if (opening) {
      setTimeout(() => searchInputRef.current?.focus(), 150);
    } else {
      setSearchQuery('');
    }
  };

  // ── Smooth metering animation: dBFS (-160…0) → normalised 0…1 ─────────────
  const meterAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const normalised = Math.max(0, Math.min(1, (meteringDb + 60) / 60));
    Animated.timing(meterAnim, {
      toValue: normalised,
      duration: 80,
      useNativeDriver: false,
    }).start();
  }, [meteringDb]);

  // ── Pulse animation (while recording) ─────────────────────────────────────
  useEffect(() => {
    if (isRecording && !isPaused) startPulse();
    else stopPulse();
  }, [isRecording, isPaused]);

  const prevIsRecording = useRef(isRecording);
  useEffect(() => {
    if (prevIsRecording.current === true && isRecording === false) {
      setTimeout(() => loadRecordings(), 800);
    }
    prevIsRecording.current = isRecording;
  }, [isRecording]);

  useFocusEffect(
    useCallback(() => {
      loadYouTubeVideos();
      loadRecordings();
    }, [loadRecordings])
  );

  const loadYouTubeVideos = async () => {
    setIsLoadingVideos(true);
    try {
      const videos = await getYouTubeVideos();
      setYouTubeVideos(videos);
    } catch (e) {
      console.warn('Error loading YouTube videos:', e);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const startPulse = () => {
    pulseAnim.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  // ── Build unified subject sections ─────────────────────────────────────────
  const sections: SubjectSection[] = useMemo(() => {
    const UNCLASSIFIED = t('dashboard.audioRecorderModal.unclassified') || 'Sin clasificar';
    const bySubject = new Map<string, SubjectSection>();
    const q = searchQuery.trim().toLowerCase();

    const getOrCreate = (name: string, color?: string): SubjectSection => {
      if (!bySubject.has(name)) {
        bySubject.set(name, { subjectName: name, subjectColor: color, items: [] });
      }
      return bySubject.get(name)!;
    };

    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const ONE_WEEK_MS = 7 * ONE_DAY_MS;
    const ONE_MONTH_MS = 30 * ONE_DAY_MS;

    const passesDateFilter = (dateString?: string) => {
      if (dateFilter === 'all') return true;
      if (!dateString) return true;
      const t = new Date(dateString).getTime();
      if (isNaN(t)) return true;
      const diff = now - t;
      if (dateFilter === 'today') return diff <= ONE_DAY_MS;
      if (dateFilter === 'week') return diff <= ONE_WEEK_MS;
      if (dateFilter === 'month') return diff <= ONE_MONTH_MS;
      return true;
    };

    // Audio recordings
    if (activeFilter !== 'video') {
      recordings.forEach((rec) => {
        if (q && !rec.name?.toLowerCase().includes(q) && !(rec.subject_name || '').toLowerCase().includes(q)) return;
        if (!passesDateFilter(rec.created_at || rec.date)) return;
        const subjectName = rec.subject_name || UNCLASSIFIED;
        const section = getOrCreate(subjectName, rec.subject_color || undefined);
        const item: GridMediaItem = {
          id: rec.id_string || rec.id?.toString() || '',
          name: rec.name || 'Grabación',
          type: 'recording',
          date: rec.date,
          created_at: rec.created_at,
          subject_name: rec.subject_name,
          subject_color: rec.subject_color || undefined,
          uri: rec.uri,
          duration: rec.duration ?? undefined,
          missingFile: (rec as any).missingFile,
        };
        section.items.push(item);
      });
    }

    // YouTube videos
    if (activeFilter !== 'recording') {
      youTubeVideos.forEach((video) => {
        const title = video.title || 'Video de YouTube';
        if (q && !title.toLowerCase().includes(q) && !(video.subject_name || '').toLowerCase().includes(q)) return;
        if (!passesDateFilter(video.created_at)) return;
        const subjectName = video.subject_name || UNCLASSIFIED;
        const section = getOrCreate(subjectName, undefined);
        const item: GridMediaItem = {
          id: video.id?.toString() || '',
          name: title,
          type: 'video',
          date: video.created_at
            ? new Date(video.created_at).toLocaleString()
            : 'Fecha desconocida',
          created_at: video.created_at,
          subject_name: video.subject_name,
          thumbnail_url: video.thumbnail_url || undefined,
          video_id: video.video_id,
        };
        section.items.push(item);
      });
    }

    // Remove empty sections, then sort items within sections by date, and finally sort sections
    return Array.from(bySubject.values())
      .filter((s) => s.items.length > 0)
      .map((section) => {
        section.items.sort((a, b) => {
          const timeA = new Date(a.created_at || a.date).getTime();
          const timeB = new Date(b.created_at || b.date).getTime();
          return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });
        return section;
      })
      .sort((a, b) => {
        if (a.subjectName === UNCLASSIFIED) return 1;
        if (b.subjectName === UNCLASSIFIED) return -1;
        return a.subjectName.localeCompare(b.subjectName);
      });
  }, [recordings, youTubeVideos, t, searchQuery, activeFilter, sortOrder, dateFilter]);

  // ── Delete handlers ────────────────────────────────────────────────────────
  const handleDeleteItem = useCallback(
    (id: string) => {
      // check if it's a video
      const video = youTubeVideos.find((v) => v.id?.toString() === id);
      if (video) {
        deleteYouTubeVideo(video.id!)
          .catch((e) => console.warn('Error deleting video:', e))
          .finally(() => loadYouTubeVideos());
        return;
      }
      // otherwise it's an audio recording
      const rec = recordings.find(
        (r) => (r.id_string || r.id?.toString()) === id
      );
      if (rec) {
        deleteRecordingConfirmed(rec.id_string || rec.id || 0, rec.uri);
      }
    },
    [youTubeVideos, recordings, deleteRecordingConfirmed]
  );

  const handlePressItem = useCallback(
    (item: GridMediaItem) => {
      if (item.type === 'video') {
        router.push(`/recordings/${item.id}?type=video` as any);
      } else {
        router.push(
          `/recordings/${encodeURIComponent(item.id)}?type=recording` as any
        );
      }
    },
    [router]
  );

  // ── YouTube add ────────────────────────────────────────────────────────────
  const handleAddYoutube = async () => {
    const trimmedUrl = youtubeUrl.trim();
    if (!trimmedUrl) {
      alert('Por favor, ingresa un enlace de YouTube.');
      return;
    }
    if (!trimmedUrl.includes('youtube.com') && !trimmedUrl.includes('youtu.be')) {
      alert('Por favor, ingresa un enlace válido de YouTube (youtube.com o youtu.be).');
      return;
    }
    try {
      setIsAddingYouTubeVideo(true);

      let videoId = '';
      if (trimmedUrl.includes('youtube.com/watch?v=')) {
        videoId = trimmedUrl.split('v=')[1]?.split('&')[0]?.trim() || '';
      } else if (trimmedUrl.includes('youtu.be/')) {
        videoId = trimmedUrl.split('youtu.be/')[1]?.split('?')[0]?.split('#')[0]?.trim() || '';
      }

      if (!videoId || videoId.length < 10) {
        alert('No se pudo extraer un ID de video válido.');
        setIsAddingYouTubeVideo(false);
        return;
      }

      let videoTitle = 'Video de YouTube';
      let thumbnailUrl = '';
      try {
        const metadataRes = await fetch(
          `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
        );
        if (metadataRes.ok) {
          const metadata = await metadataRes.json();
          if (metadata.title) videoTitle = metadata.title;
          if (metadata.thumbnail_url) thumbnailUrl = metadata.thumbnail_url;
        }
      } catch (err) {
        console.warn('Error fetching video metadata:', err);
      }

      await createYouTubeVideo({
        youtube_url: trimmedUrl,
        video_id: videoId,
        title: videoTitle,
        thumbnail_url: thumbnailUrl,
        subject_id: null,
      });

      setShowYoutubeModal(false);
      setYoutubeUrl('');
      await loadYouTubeVideos();
    } catch (e) {
      console.error('Error adding YouTube video:', e);
      const errorMsg = e instanceof Error ? e.message : 'Error desconocido';
      alert(`Error al agregar el video: ${errorMsg}.`);
    } finally {
      setIsAddingYouTubeVideo(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoadingVideos && youTubeVideos.length === 0 && recordings.length === 0) {
    return <PremiumLoading text={t('recordings.loadingList') || 'CARGANDO'} />;
  }

  const isEmpty = sections.length === 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { flex: 1 }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.card}
        translucent={false}
      />

      {/* Safe-area top */}
      <View style={{ height: insets.top, backgroundColor: theme.colors.card }} />

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('recordings.multimedia')}
        </Text>
        {/* Right actions: Search · YouTube */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            style={[
              styles.backBtn,
              showSearch && {
                backgroundColor: `${theme.colors.primary}12`,
                borderRadius: 20,
              },
            ]}
            onPress={toggleSearch}
          >
            <Ionicons
              name={showSearch ? 'search' : 'search-outline'}
              size={22}
              color={showSearch ? theme.colors.primary : theme.colors.text.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setShowYoutubeModal(true)}
          >
            <MaterialCommunityIcons name="youtube" size={26} color={theme.colors.text.error} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons
              name={dateFilter !== 'all' || sortOrder === 'asc' ? 'filter' : 'filter-outline'}
              size={22}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Collapsible search bar ─────────────────────────────────────── */}
      <Animated.View
        style={{
          overflow: 'hidden',
          maxHeight: searchAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 56],
          }),
          opacity: searchAnim,
          backgroundColor: theme.colors.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          paddingHorizontal: 16,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.background,
            borderRadius: 14,
            paddingHorizontal: 12,
            height: 40,
            gap: 8,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Ionicons name="search" size={16} color={theme.colors.text.placeholder} />
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('recordings.searchPlaceholder')}
            placeholderTextColor={theme.colors.text.placeholder}
            style={{ flex: 1, fontSize: 14, color: theme.colors.text.primary, paddingVertical: 0 }}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.text.placeholder} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* ── Tab indicators (subtle, always visible) ─────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: theme.colors.card,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        {(['all', 'recording', 'video'] as const).map((f) => {
          const labels = { all: t('recordings.filterAll'), recording: t('recordings.filterAudio'), video: t('recordings.filterVideo') };
          const isActive = activeFilter === f;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderBottomWidth: 2,
                borderBottomColor: isActive ? theme.colors.text.primary : 'transparent',
                marginBottom: -1,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? '700' : '400',
                  color: isActive ? theme.colors.text.primary : theme.colors.text.placeholder,
                }}
              >
                {labels[f]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main scrollable content */}
      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="microphone-off"
              size={64}
              color={theme.colors.border}
            />
            <Text style={styles.emptyText}>
              {t('dashboard.audioRecorderModal.emptyState')}
            </Text>
          </View>
        ) : (
          <RecordingsGrid
            sections={sections}
            playingId={playingId}
            onPlay={playSound}
            onStop={stopSound}
            onDelete={handleDeleteItem}
            onPress={handlePressItem}
          />
        )}
      </ScrollView>

      {/* ── FILTER & SORT MODAL ─────────────────────────────────────────── */}
      {showFilterModal && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.colors.card,
              width: '85%',
              borderRadius: 20,
              padding: 24,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary }}>
                Filtros y Orden
              </Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text.secondary, marginBottom: 8 }}>
              Ordenar por
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {(['desc', 'asc'] as const).map((order) => (
                <TouchableOpacity
                  key={order}
                  onPress={() => setSortOrder(order)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: sortOrder === order ? theme.colors.primary : theme.colors.background,
                    borderWidth: 1,
                    borderColor: sortOrder === order ? theme.colors.primary : theme.colors.border,
                  }}
                >
                  <Text style={{ color: sortOrder === order ? '#fff' : theme.colors.text.primary, fontSize: 13, fontWeight: '600' }}>
                    {order === 'desc' ? 'Más recientes' : 'Más antiguos'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text.secondary, marginBottom: 8 }}>
              Filtrar por fecha
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {(['all', 'today', 'week', 'month'] as const).map((filter) => {
                const labels = { all: 'Todas', today: 'Hoy', week: 'Esta semana', month: 'Este mes' };
                return (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => setDateFilter(filter)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: dateFilter === filter ? theme.colors.primary : theme.colors.background,
                      borderWidth: 1,
                      borderColor: dateFilter === filter ? theme.colors.primary : theme.colors.border,
                    }}
                  >
                    <Text style={{ color: dateFilter === filter ? '#fff' : theme.colors.text.primary, fontSize: 13, fontWeight: '600' }}>
                      {labels[filter]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => setShowFilterModal(false)}
              style={{
                backgroundColor: theme.colors.primary,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Aplicar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* ── YOUTUBE MODAL ───────────────────────────────────────────────── */}
      {showYoutubeModal && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.card,
              width: '85%',
              borderRadius: 20,
              padding: 24,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: 'bold',
                marginBottom: 16,
                color: theme.colors.text.primary,
              }}
            >
              {t('recordings.addYoutubeVideo')}
            </Text>
            <Text style={{ color: theme.colors.text.secondary, marginBottom: 12 }}>
              {t('recordings.youtubeLinkPrompt')}
            </Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                marginBottom: 20,
              }}
            >
              <TextInput
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                placeholder={t('recordings.youtubePlaceholder')}
                placeholderTextColor={theme.colors.text.placeholder}
                style={{ height: 44, color: theme.colors.text.primary }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isAddingYouTubeVideo}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowYoutubeModal(false);
                  setYoutubeUrl('');
                }}
                disabled={isAddingYouTubeVideo}
                style={{ padding: 10, opacity: isAddingYouTubeVideo ? 0.5 : 1 }}
              >
                <Text style={{ color: theme.colors.text.secondary, fontWeight: '600' }}>
                  {t('recordings.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddYoutube}
                disabled={isAddingYouTubeVideo || !youtubeUrl.trim()}
                style={{
                  backgroundColor:
                    isAddingYouTubeVideo || !youtubeUrl.trim()
                      ? theme.colors.border
                      : theme.colors.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {isAddingYouTubeVideo && <ActivityIndicator size="small" color="white" />}
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  {isAddingYouTubeVideo ? 'Añadiendo...' : 'Añadir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── BOTONES DE GRABACIÓN (WhatsApp style) ──────────────────────── */}
      {!isRecording ? (
        <View
          style={[
            styles.idleRecorderContainer,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
        >
          <TouchableOpacity
            onPress={startRecording}
            style={styles.startRecordingBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="mic" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.startRecordingText}>
              {t('dashboard.audioRecorderModal.startRecording') || 'Iniciar Grabación'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View
          style={[
            styles.activeRecorderContainer,
            {
              bottom: Math.max(insets.bottom, 16) + 8,
              borderColor: isPaused ? theme.colors.border : theme.colors.primary,
            },
          ]}
        >
          {/* Timer + waveform */}
          <View style={styles.recordingInfo}>
            <Animated.View
              style={[
                styles.recordingDot,
                isPaused && { backgroundColor: theme.colors.text.secondary },
                !isPaused && { opacity: pulseAnim },
              ]}
            />
            <Text style={styles.recordingTimerText}>{formatDuration(recordingDuration)}</Text>

            <View style={styles.wavesContainer}>
              {Array.from({ length: 15 }, (_, i) => {
                const baseRatio = 0.25 + Math.sin((i / 14) * Math.PI) * 0.75;
                const minH = 4;
                const maxH = 24;
                const barH = isPaused ? minH : meterAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [minH, minH + (maxH - minH) * baseRatio],
                });
                return (
                  <Animated.View
                    key={i}
                    style={[
                      styles.waveBar,
                      {
                        height: barH,
                        backgroundColor: isPaused
                          ? theme.colors.text.placeholder
                          : theme.colors.primary,
                        opacity: isPaused ? 0.5 : 1,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* Controls */}
          <View style={styles.recordingControls}>
            <TouchableOpacity
              onPress={isPaused ? resumeRecording : pauseRecording}
              style={styles.iconBtn}
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={20}
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={stopRecording} style={styles.stopBtn}>
              <Ionicons name="stop" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
