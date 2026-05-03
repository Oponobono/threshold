import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, SectionList, Animated, Easing, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../src/styles/theme';
import { recordingsStyles as styles } from '../src/styles/RecordingsScreen.styles';
import { useAudioRecorder, RecordingItem } from '../src/hooks/useAudioRecorder';
import { AudioPlayerItem } from '../src/components/AudioPlayerItem';
import { PremiumLoading } from '../src/components/PremiumLoading';
import { getYouTubeVideos, createYouTubeVideo, YouTubeVideo, deleteYouTubeVideo } from '../src/services/api';

interface MediaItem extends RecordingItem {
  type?: 'recording' | 'video';
  youtube_url?: string;
  video_id?: string;
}

interface GroupedSection {
  title: string;
  data: MediaItem[];
  subtype?: 'recordings' | 'videos';
  mediaType?: 'recordings' | 'videos';
  isFirstInType?: boolean;
}

export default function RecordingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Audio recordings state
  const {
    isRecording,
    isPaused,
    recordings,
    recordingDuration,
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

  // YouTube videos state
  const [youTubeVideos, setYouTubeVideos] = useState<YouTubeVideo[]>([]);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isAddingYouTubeVideo, setIsAddingYouTubeVideo] = useState(false);

  useEffect(() => {
    if (isRecording && !isPaused) {
      startPulse();
    } else {
      stopPulse();
    }
  }, [isRecording, isPaused]);

  // Auto-refresh list when recording stops
  const prevIsRecording = useRef(isRecording);
  useEffect(() => {
    if (prevIsRecording.current === true && isRecording === false) {
      setTimeout(() => loadRecordings(), 800);
    }
    prevIsRecording.current = isRecording;
  }, [isRecording]);

  // Load data when screen comes into focus
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

  const renderRecordingItem = ({ item }: { item: MediaItem }) => {
    const isVideo = item.type === 'video';

    if (isVideo) {
      // Render video item
      return (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 12,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 8,
            }}
            onPress={() => router.push(`/recordings/${item.id}?type=video` as any)}
          >
            <MaterialCommunityIcons name="youtube" size={40} color={theme.colors.text.error} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: theme.colors.text.primary, fontWeight: '600', fontSize: 15 }}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.name || 'Video de YouTube'}
              </Text>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginTop: 4 }}>
                {item.subject_name || 'Sin materia'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (item.id) {
                  deleteYouTubeVideo(item.id).catch(e => console.warn('Error deleting video:', e));
                  loadYouTubeVideos();
                }
              }}
              style={{ padding: 8 }}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.text.error} />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      );
    }

    // Render audio recording item
    return (
      <AudioPlayerItem
        item={item}
        isPlaying={playingId === (item.id_string || item.id)}
        onPlay={playSound}
        onStop={stopSound}
        onDelete={deleteRecordingConfirmed}
        onPress={() => router.push(`/recordings/${encodeURIComponent(item.id_string || item.id?.toString() || '')}?type=recording` as any)}
      />
    );
  };

  const groupedRecordings = useMemo(() => {
    const recordingsBySubject: { [key: string]: MediaItem[] } = {};
    const videosBySubject: { [key: string]: MediaItem[] } = {};

    // Group audio recordings by subject
    recordings.forEach(rec => {
      const subjectName = rec.subject_name || (t('dashboard.audioRecorderModal.unclassified') || 'Sin clasificar');
      const item: MediaItem = { ...rec, type: 'recording' };
      if (!recordingsBySubject[subjectName]) recordingsBySubject[subjectName] = [];
      recordingsBySubject[subjectName].push(item);
    });

    // Group YouTube videos by subject
    youTubeVideos.forEach(video => {
      const subjectName = video.subject_name || (t('dashboard.audioRecorderModal.unclassified') || 'Sin clasificar');
      const item: MediaItem = {
        ...video,
        id_string: video.id?.toString(),
        type: 'video',
        name: video.title || 'Video de YouTube',
      } as MediaItem;
      if (!videosBySubject[subjectName]) videosBySubject[subjectName] = [];
      videosBySubject[subjectName].push(item);
    });

    const sections: (GroupedSection & { mediaType: 'recordings' | 'videos'; isFirstInType: boolean })[] = [];
    let isFirstRecording = true;
    let isFirstVideo = true;

    // Add recordings grouped by subject
    Object.keys(recordingsBySubject)
      .sort((a, b) => {
        const unclassified = t('dashboard.audioRecorderModal.unclassified') || 'Sin clasificar';
        if (a === unclassified) return 1;
        if (b === unclassified) return -1;
        return a.localeCompare(b);
      })
      .forEach(subjectName => {
        sections.push({
          title: subjectName,
          data: recordingsBySubject[subjectName],
          subtype: 'recordings',
          mediaType: 'recordings',
          isFirstInType: isFirstRecording
        });
        isFirstRecording = false;
      });

    // Add videos grouped by subject
    Object.keys(videosBySubject)
      .sort((a, b) => {
        const unclassified = t('dashboard.audioRecorderModal.unclassified') || 'Sin clasificar';
        if (a === unclassified) return 1;
        if (b === unclassified) return -1;
        return a.localeCompare(b);
      })
      .forEach(subjectName => {
        sections.push({
          title: subjectName,
          data: videosBySubject[subjectName],
          subtype: 'videos',
          mediaType: 'videos',
          isFirstInType: isFirstVideo
        });
        isFirstVideo = false;
      });

    return sections;
  }, [recordings, youTubeVideos, t]);

  const handleAddYoutube = async () => {
    // Validate URL format
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

      // Extract video ID from URL
      let videoId = '';
      if (trimmedUrl.includes('youtube.com/watch?v=')) {
        videoId = trimmedUrl.split('v=')[1]?.split('&')[0]?.trim() || '';
      } else if (trimmedUrl.includes('youtu.be/')) {
        videoId = trimmedUrl.split('youtu.be/')[1]?.split('?')[0]?.split('#')[0]?.trim() || '';
      }

      if (!videoId || videoId.length < 10) {
        alert('No se pudo extraer un ID de video válido de este enlace. Verifica que sea un enlace directo a un video.');
        setIsAddingYouTubeVideo(false);
        return;
      }

      // Get video metadata from YouTube
      let videoTitle = 'Video de YouTube';
      let thumbnailUrl = '';
      try {
        const metadataRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        if (metadataRes.ok) {
          const metadata = await metadataRes.json();
          if (metadata.title) videoTitle = metadata.title;
          if (metadata.thumbnail_url) thumbnailUrl = metadata.thumbnail_url;
        } else if (metadataRes.status === 404) {
          alert('No se encontró información sobre este video. Verifica que el enlace sea válido.');
          setIsAddingYouTubeVideo(false);
          return;
        }
      } catch (err) {
        console.warn('Error fetching video metadata:', err);
        // Continue anyway with default title
      }

      // Create YouTube video record
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
      alert(`Error al agregar el video: ${errorMsg}. Por favor, intenta de nuevo.`);
    } finally {
      setIsAddingYouTubeVideo(false);
    }
  };

  if (isLoadingVideos && youTubeVideos.length === 0 && recordings.length === 0) {
    return <PremiumLoading text={t('recordings.loadingList') || 'CARGANDO'} />;
  }

  return (
    <View style={[styles.container, { flex: 1 }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.card} translucent={false} />

      {/* Status bar safe area */}
      <View style={{ height: insets.top, backgroundColor: theme.colors.card }} />

      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dashboard.audioRecorderModal.recordingsList')}</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setShowYoutubeModal(true)}
        >
          <MaterialCommunityIcons name="youtube" size={28} color={theme.colors.text.error} />
        </TouchableOpacity>
      </View>

      <SectionList
        sections={groupedRecordings}
        keyExtractor={(item, index) => item.id_string || item.id?.toString() || `${index}`}
        renderItem={renderRecordingItem}
        renderSectionHeader={({ section }: { section: GroupedSection }) => {
          const isVideo = section.subtype === 'videos';
          const mediaTypeLabel = isVideo ? 'Videos' : (t('dashboard.audioRecorderModal.recordingsList') || 'Grabaciones');
          
          return (
            <View style={{ backgroundColor: theme.colors.background }}>
              {/* Main type header (Grabaciones/Videos) - only shown for first of each type */}
              {section.isFirstInType && (
                <View style={{ paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {isVideo ? (
                      <MaterialCommunityIcons name="youtube" size={20} color={theme.colors.text.error} />
                    ) : (
                      <Ionicons name="mic" size={20} color={theme.colors.primary} />
                    )}
                    <Text style={{ color: theme.colors.text.primary, fontWeight: '700', fontSize: 18 }}>
                      {mediaTypeLabel}
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Subject category header */}
              <View style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: `${theme.colors.border}20` }}>
                <Text style={{ color: theme.colors.text.secondary, fontWeight: '600', fontSize: 13 }}>
                  {section.title}
                </Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="microphone-off" size={64} color={theme.colors.border} />
            <Text style={styles.emptyText}>{t('dashboard.audioRecorderModal.emptyState')}</Text>
          </View>
        }
      />

      {/* ── YOUTUBE MODAL ─────────────────────────────── */}
      {showYoutubeModal && (
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <View style={{ backgroundColor: theme.colors.card, width: '85%', borderRadius: 16, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: theme.colors.text.primary }}>{t('recordings.addYoutubeVideo')}</Text>
            <Text style={{ color: theme.colors.text.secondary, marginBottom: 12 }}>{t('recordings.youtubeLinkPrompt')}</Text>
            <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 12, marginBottom: 20 }}>
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
                <Text style={{ color: theme.colors.text.secondary, fontWeight: '600' }}>{t('recordings.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddYoutube}
                disabled={isAddingYouTubeVideo || !youtubeUrl.trim()}
                style={{
                  backgroundColor: (isAddingYouTubeVideo || !youtubeUrl.trim()) ? theme.colors.border : theme.colors.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8
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

      {/* ── BOTONES DE GRABACIÓN TIPO WHATSAPP ─────────────────────────────── */}
      {!isRecording ? (
        <View style={[styles.idleRecorderContainer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <TouchableOpacity 
            onPress={startRecording}
            style={styles.startRecordingBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="mic" size={20} color="white" style={{marginRight: 8}}/>
            <Text style={styles.startRecordingText}>{t('dashboard.audioRecorderModal.startRecording') || 'Iniciar Grabación'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={[
          styles.activeRecorderContainer,
          {
            bottom: Math.max(insets.bottom, 16) + 8,
            borderColor: isPaused ? theme.colors.border : theme.colors.primary,
          }
        ]}>
          {/* Izquierda: Timer y Ondas (WhatsApp Style) */}
          <View style={styles.recordingInfo}>
            <Animated.View style={[
              styles.recordingDot, 
              isPaused && { backgroundColor: theme.colors.text.secondary },
              !isPaused && { opacity: pulseAnim } // El punto rojo palpita cuando graba
            ]} />
            <Text style={styles.recordingTimerText}>
              {formatDuration(recordingDuration)}
            </Text>
            
            <View style={styles.wavesContainer}>
              {/* Animación falsa de ondas */}
              {[0.4, 0.8, 0.5, 1, 0.6, 0.3, 0.7, 0.9, 0.4, 0.6].map((h, i) => (
                <Animated.View key={i} style={[
                  styles.waveBar,
                  {
                    height: isPaused ? 4 : 24 * h,
                    backgroundColor: isPaused ? theme.colors.text.placeholder : theme.colors.primary,
                    opacity: isPaused ? 0.5 : pulseAnim.interpolate({
                      inputRange: [1, 1.2],
                      outputRange: [0.5, 1] // Variación de opacidad para que se vea vivo
                    })
                  }
                ]} />
              ))}
            </View>
          </View>

          {/* Derecha: Controles */}
          <View style={styles.recordingControls}>
            <TouchableOpacity onPress={isPaused ? resumeRecording : pauseRecording} style={styles.iconBtn}>
              <Ionicons name={isPaused ? "play" : "pause"} size={20} color={theme.colors.text.primary} />
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
