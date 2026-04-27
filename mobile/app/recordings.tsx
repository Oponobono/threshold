import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, SectionList, Animated, Easing, SafeAreaView, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../src/styles/theme';
import { recordingsStyles as styles } from '../src/styles/RecordingsScreen.styles';
import { useAudioRecorder, RecordingItem } from '../src/hooks/useAudioRecorder';
import { AudioPlayerItem } from '../src/components/AudioPlayerItem';
import { globalStyles } from '../src/styles/globalStyles';
import { getYouTubeVideos, createYouTubeVideo, YouTubeVideo, deleteYouTubeVideo } from '../src/services/api';

interface MediaItem extends RecordingItem {
  type?: 'recording' | 'video';
  youtube_url?: string;
  video_id?: string;
}

interface GroupedSection {
  title: string;
  data: MediaItem[];
  subtype?: 'recordings' | 'videos'; // Para secciones tipo de contenido
}

export default function RecordingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
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
    deleteRecording,
    formatDuration,
    loadRecordings,
  } = useAudioRecorder();

  // YouTube videos state
  const [youTubeVideos, setYouTubeVideos] = useState<YouTubeVideo[]>([]);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);

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

  // Load YouTube videos
  useEffect(() => {
    loadYouTubeVideos();
  }, []);

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
              <Text style={{ color: theme.colors.text.primary, fontWeight: '600', fontSize: 15 }} numberOfLines={2}>
                {item.name || 'Video de YouTube'}
              </Text>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginTop: 2 }}>
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
        onDelete={deleteRecording}
        onPress={() => router.push(`/recordings/${encodeURIComponent(item.id_string || item.id?.toString() || '')}?type=recording` as any)}
      />
    );
  };

  const groupedRecordings = useMemo(() => {
    const groups: { [key: string]: { recordings: MediaItem[]; videos: MediaItem[] } } = {};
    const orphanRecordings: MediaItem[] = [];
    const orphanVideos: MediaItem[] = [];

    // Add audio recordings
    recordings.forEach(rec => {
      const item: MediaItem = { ...rec, type: 'recording' };
      if (rec.subject_name) {
        if (!groups[rec.subject_name]) groups[rec.subject_name] = { recordings: [], videos: [] };
        groups[rec.subject_name].recordings.push(item);
      } else {
        orphanRecordings.push(item);
      }
    });

    // Add YouTube videos
    youTubeVideos.forEach(video => {
      const item: MediaItem = {
        ...video,
        id_string: video.id?.toString(),
        type: 'video',
        name: video.title || 'Video de YouTube',
      } as MediaItem;
      if (video.subject_name) {
        if (!groups[video.subject_name]) groups[video.subject_name] = { recordings: [], videos: [] };
        groups[video.subject_name].videos.push(item);
      } else {
        orphanVideos.push(item);
      }
    });

    const sections: GroupedSection[] = [];

    // Create sections by subject with sub-sections for recordings/videos
    Object.keys(groups)
      .sort()
      .forEach(subjectName => {
        const { recordings: recs, videos: vids } = groups[subjectName];
        
        // Add recordings sub-section if any
        if (recs.length > 0) {
          sections.push({
            title: `${subjectName} • ${t('dashboard.audioRecorderModal.recordingsList') || 'Audios'}`,
            data: recs,
            subtype: 'recordings'
          });
        }
        
        // Add videos sub-section if any
        if (vids.length > 0) {
          sections.push({
            title: `${subjectName} • Videos`,
            data: vids,
            subtype: 'videos'
          });
        }
      });

    // Add orphan recordings
    if (orphanRecordings.length > 0) {
      sections.push({
        title: t('recordings.unclassified') || 'Sin clasificar • Audios',
        data: orphanRecordings,
        subtype: 'recordings'
      });
    }

    // Add orphan videos
    if (orphanVideos.length > 0) {
      sections.push({
        title: t('recordings.unclassified') || 'Sin clasificar • Videos',
        data: orphanVideos,
        subtype: 'videos'
      });
    }

    return sections;
  }, [recordings, youTubeVideos, t]);

  const handleAddYoutube = async () => {
    if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
      alert('Por favor, ingresa un enlace válido de YouTube.');
      return;
    }

    try {
      // Extract video ID from URL
      let videoId = '';
      if (youtubeUrl.includes('youtube.com/watch?v=')) {
        videoId = youtubeUrl.split('v=')[1]?.split('&')[0] || '';
      } else if (youtubeUrl.includes('youtu.be/')) {
        videoId = youtubeUrl.split('youtu.be/')[1]?.split('?')[0] || '';
      }

      // Create YouTube video record
      await createYouTubeVideo({
        youtube_url: youtubeUrl,
        video_id: videoId,
        title: 'Video de YouTube',
        subject_id: null,
      });

      setShowYoutubeModal(false);
      setYoutubeUrl('');
      await loadYouTubeVideos();
    } catch (e) {
      console.error('Error adding YouTube video:', e);
      alert('Error al agregar el video. Por favor, intenta de nuevo.');
    }
  };

  return (
    <SafeAreaView style={[globalStyles.safeArea, styles.container]}>
      <Stack.Screen options={{ headerShown: false }} />
      
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
        renderSectionHeader={({ section: { title, subtype } }: { section: GroupedSection }) => {
          const isVideo = subtype === 'videos';
          return (
            <View style={{ backgroundColor: theme.colors.background, paddingVertical: 10, paddingHorizontal: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {isVideo ? (
                  <MaterialCommunityIcons name="youtube" size={18} color={theme.colors.text.error} />
                ) : (
                  <Ionicons name="mic" size={18} color={theme.colors.primary} />
                )}
                <Text style={{ color: theme.colors.text.primary, fontWeight: '600', fontSize: 15 }}>{title}</Text>
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
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: theme.colors.text.primary }}>Añadir Video de YouTube</Text>
            <Text style={{ color: theme.colors.text.secondary, marginBottom: 12 }}>Pega el enlace del video para transcribirlo.</Text>
            <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 12, marginBottom: 20 }}>
              <TextInput
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                placeholder="https://www.youtube.com/watch?v=..."
                placeholderTextColor={theme.colors.text.placeholder}
                style={{ height: 44, color: theme.colors.text.primary }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setShowYoutubeModal(false)} style={{ padding: 10 }}>
                <Text style={{ color: theme.colors.text.secondary, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddYoutube} style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Añadir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.recorderContainer}>
        <View style={styles.timerContainer}>
          <Text style={[styles.timerText, isRecording && { color: theme.colors.text.error }]}>
            {formatDuration(recordingDuration)}
          </Text>
          {isRecording && (
            <Text style={[styles.statusText, isPaused && { color: theme.colors.text.secondary }]}>
              {isPaused 
                ? t('dashboard.audioRecorderModal.recordingPaused') 
                : t('dashboard.audioRecorderModal.recordingInProgress')}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
          {isRecording && (
            <TouchableOpacity 
              onPress={isPaused ? resumeRecording : pauseRecording}
              activeOpacity={0.7}
              style={styles.secondaryRecordBtn}
            >
              <Ionicons 
                name={isPaused ? "play" : "pause"} 
                size={24} 
                color={theme.colors.text.secondary} 
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            onPress={isRecording ? stopRecording : startRecording}
            activeOpacity={0.8}
          >
            <Animated.View style={[
              styles.recordButton,
              { transform: [{ scale: pulseAnim }] },
              isRecording && styles.recordingButtonActive
            ]}>
              <View style={[
                styles.recordButtonInner,
                isRecording && styles.recordingButtonInnerActive
              ]} />
            </Animated.View>
          </TouchableOpacity>

          {isRecording && (
            <View style={{ width: 44 }} />
          )}
        </View>
        
        <Text style={styles.hintText}>
          {isRecording 
            ? t('dashboard.audioRecorderModal.stopRecording') 
            : t('dashboard.audioRecorderModal.startRecording')}
        </Text>
      </View>
    </SafeAreaView>
  );
}
