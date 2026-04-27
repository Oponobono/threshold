import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
  StatusBar,
  Animated,
  Pressable,
  Linking,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';

import { theme } from '../styles/theme';
import { detailStyles as styles } from '../styles/RecordingDetailScreen.styles';
import { RecordingAITabs, AITabType } from './RecordingAITabs';
import { RecordingAIContent } from './RecordingAIContent';
import {
  getSubjects,
  Subject,
  getYouTubeVideos,
  YouTubeVideo,
  upsertYouTubeTranscript,
  updateYouTubeVideo,
  getYouTubeSubtitles,
} from '../services/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GROQ_API_KEY: string = process.env.EXPO_PUBLIC_GROK_API_KEY ?? process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const YOUTUBE_API_KEY: string = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '';

// ---------------------------------------------------------------------------
// Groq helpers
// ---------------------------------------------------------------------------
// Groq helpers
// ---------------------------------------------------------------------------
async function transcribeYouTubeWithWhisper(videoId: string, apiKey: string): Promise<string> {
  // Obtener subtítulos del backend mediante api.ts (usa fetchWithFallback)
  // Esto devuelve TEXT de subtítulos, no audio
  try {
    const result = await getYouTubeSubtitles(videoId, 'es');
    console.log('✓ YouTube captions fetched in', result.language);
    return result.captions || '';
  } catch (error) {
    console.error('✗ Error fetching YouTube captions:', error);
    throw new Error(`Error obteniendo subtítulos: ${error instanceof Error ? error.message : error}`);
  }
}

async function summarizeWithGroq(transcription: string, apiKey: string): Promise<string> {
  const body = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'Eres un asistente educativo experto. Tu tarea es resumir transcripciones de videos educativos de forma clara, estructurada y concisa para estudiantes universitarios, resaltando los puntos clave con viñetas o secciones.',
      },
      {
        role: 'user',
        content: `Resume el siguiente texto:\n\n${transcription}`,
      },
    ],
    temperature: 0.3,
  };

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Error de Groq ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? 'No se pudo generar el resumen.';
}

// ---------------------------------------------------------------------------
// Subject Picker Modal
// ---------------------------------------------------------------------------
interface SubjectPickerModalProps {
  visible: boolean;
  subjects: Subject[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onClose: () => void;
}

const SubjectPickerModal: React.FC<SubjectPickerModalProps> = ({
  visible, subjects, selectedId, onSelect, onClose,
}) => {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={{
          backgroundColor: theme.colors.card,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 12,
          paddingBottom: 32,
          paddingHorizontal: 20,
          maxHeight: '60%',
        }}>
          <View style={{ width: 40, height: 4, backgroundColor: theme.colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: theme.colors.text.primary, marginBottom: 16 }}>
            {t('subjects.selectSubject') || 'Asignar materia'}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 6,
                backgroundColor: selectedId === null ? `${theme.colors.primary}15` : theme.colors.background,
                borderWidth: 1, borderColor: selectedId === null ? theme.colors.primary : theme.colors.border,
              }}
              onPress={() => { onSelect(null); onClose(); }}
            >
              <Ionicons name="albums-outline" size={20} color={theme.colors.text.secondary} style={{ marginRight: 12 }} />
              <Text style={{ color: theme.colors.text.secondary, fontSize: 15, fontStyle: 'italic' }}>
                {t('subjects.noSubjectSelected') || '— Sin Materia —'}
              </Text>
              {selectedId === null && (
                <Ionicons name="checkmark" size={18} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
            {subjects.map(sub => (
              <TouchableOpacity
                key={sub.id}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 6,
                  backgroundColor: selectedId === sub.id ? `${sub.color || theme.colors.primary}20` : theme.colors.background,
                  borderWidth: 1, borderColor: selectedId === sub.id ? (sub.color || theme.colors.primary) : theme.colors.border,
                }}
                onPress={() => { onSelect(sub.id!); onClose(); }}
              >
                <View style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: sub.color || theme.colors.primary,
                  justifyContent: 'center', alignItems: 'center', marginRight: 12,
                }}>
                  <MaterialCommunityIcons name={(sub.icon as any) || 'book-outline'} size={16} color="#fff" />
                </View>
                <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '500', flex: 1 }}>
                  {sub.name}
                </Text>
                {selectedId === sub.id && (
                  <Ionicons name="checkmark" size={18} color={sub.color || theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Animated Subject Selector
// ---------------------------------------------------------------------------
interface AnimatedSubjectSelectorProps {
  subjectForId?: Subject;
  onSelect: () => void;
}

const AnimatedSubjectSelector: React.FC<AnimatedSubjectSelectorProps> = ({
  subjectForId, onSelect
}) => {
  const { t } = useTranslation();
  const fillAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (!subjectForId) return;
    Animated.timing(fillAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        onSelect();
        Animated.timing(fillAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      }
    });
  };

  const handlePressOut = () => {
    if (!subjectForId) return;
    Animated.timing(fillAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const widthInterpolation = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <Pressable
      onPress={() => { if (!subjectForId) onSelect(); }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{
        width: '100%',
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: subjectForId?.color || theme.colors.border,
        overflow: 'hidden',
        marginBottom: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
      }}
    >
      <Animated.View style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: widthInterpolation,
        backgroundColor: subjectForId ? `${subjectForId.color}30` : 'transparent',
      }} />
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 14, paddingHorizontal: 16,
      }}>
        {subjectForId ? (
          <View style={{
            width: 24, height: 24, borderRadius: 6,
            backgroundColor: subjectForId.color || theme.colors.primary,
            justifyContent: 'center', alignItems: 'center', position: 'absolute', left: 16,
          }}>
            <MaterialCommunityIcons name={(subjectForId.icon as any) || 'book-outline'} size={14} color="#fff" />
          </View>
        ) : (
          <Ionicons name="albums-outline" size={20} color={theme.colors.text.placeholder} style={{ position: 'absolute', left: 16 }} />
        )}
        <Text style={{
          color: subjectForId ? theme.colors.text.primary : theme.colors.text.placeholder,
          fontSize: 15, fontWeight: '600', textAlign: 'center',
        }}>
          {subjectForId?.name || (t('subjects.noSubjectSelected') || 'Sin materia asignada')}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.text.placeholder} style={{ position: 'absolute', right: 16 }} />
      </View>
    </Pressable>
  );
};

// ---------------------------------------------------------------------------
// VideoDetail Component
// ---------------------------------------------------------------------------
interface VideoDetailProps {
  videoId: string;
  onBack: () => void;
}

export const VideoDetail: React.FC<VideoDetailProps> = ({ videoId, onBack }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // AI state
  const [transcription, setTranscription] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [activeTab, setActiveTab] = useState<AITabType>('transcription');
  const [showTutorial, setShowTutorial] = useState(true);

  // Video metadata
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [videoData, setVideoData] = useState<YouTubeVideo | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  // Derived values
  const videoTitle = videoData?.title || 'Video de YouTube';
  const date = videoData?.created_at
    ? new Date(videoData.created_at).toLocaleString()
    : '';

  const screenWidth = Dimensions.get('window').width - 48;
  const subjectForId = subjects.find(s => s.id === selectedSubjectId);

  // ---------------------------------------------------------------------------
  // Load data
  // ---------------------------------------------------------------------------
  useEffect(() => { loadInitialData(); }, [videoId]);

  const loadInitialData = async () => {
    try {
      try { setSubjects(await getSubjects()); } catch (e) { console.warn('subjects:', e); }

      let video: YouTubeVideo | null = null;
      try {
        const all = await getYouTubeVideos();
        video = all.find(v => v.id?.toString() === videoId) ?? null;
      } catch (e) { console.warn('videos:', e); }

      if (video) {
        // If title is empty, try to fetch from noembed
        if (!video.title && video.video_id) {
          try {
            const metadataRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${video.video_id}`);
            if (metadataRes.ok) {
              const metadata = await metadataRes.json();
              if (metadata.title) {
                video.title = metadata.title;
                // Update in backend
                await updateYouTubeVideo(video.id, { title: metadata.title }).catch(e => console.warn('updateTitle:', e));
              }
            }
          } catch (err) {
            console.warn('Error fetching video title from noembed:', err);
          }
        }
        setVideoData(video);
        setSelectedSubjectId(video.subject_id ?? null);
      }
    } catch (e) { console.error('loadInitialData:', e); }
  };

  // ---------------------------------------------------------------------------
  // Subject association
  // ---------------------------------------------------------------------------
  const handleSubjectChange = async (newId: number | null) => {
    setSelectedSubjectId(newId);
    if (videoData?.id) {
      await updateYouTubeVideo(videoData.id, { subject_id: newId }).catch(e => console.warn('updateSubject:', e));
    }
  };

  // ---------------------------------------------------------------------------
  // Transcription (Whisper via Groq)
  // ---------------------------------------------------------------------------
  const startTranscriptionFlow = async () => {
    if (!GROQ_API_KEY) {
      Alert.alert('Error', 'Falta la API Key de Groq en el archivo .env.local');
      return;
    }

    if (!videoData?.video_id) {
      Alert.alert('Error', 'No se encontró el ID del video. Por favor intenta recargar.');
      return;
    }

    setIsTranscribing(true);
    setTranscription(null);
    setSummary(null);

    try {
      const text = await transcribeYouTubeWithWhisper(videoData.video_id, GROQ_API_KEY);
      
      if (!text) {
        Alert.alert(t('common.error') || 'Error', 'No se pudieron obtener los subtítulos del video. Es posible que:\n• El video no tenga subtítulos disponibles\n• El video sea privado o no exista\n• Hay problemas de conectividad');
        return;
      }

      setTranscription(text);
      setShowTutorial(false);

      if (videoData?.id) {
        await upsertYouTubeTranscript({
          video_id: videoData.id,
          transcript_uri: videoData.youtube_url,
        }).catch(e => console.warn('upsert transcript DB:', e));
      }
    } catch (e) {
      console.error('ERROR EN TRANSCRIPCIÓN:', e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      
      // Better error messages
      let userMessage = '⚠️ Error al obtener subtítulos:\n\n';
      if (errorMsg.includes('Network')) {
        userMessage += 'Problema de conexión. Verifica que:\n• Tu backend esté corriendo en puerto 3000\n• Tengas conexión a internet\n• El servidor Render sea accesible';
      } else if (errorMsg.includes('No se encontraron subtítulos')) {
        userMessage += 'Este video no tiene subtítulos disponibles en YouTube';
      } else {
        userMessage += errorMsg;
      }
      
      Alert.alert(t('common.error') || 'Error', userMessage);
    } finally {
      setIsTranscribing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Summary (Llama3 via Groq)
  // ---------------------------------------------------------------------------
  const startSummaryFlow = async () => {
    if (!GROQ_API_KEY) {
      Alert.alert('Error', 'Falta la API Key de Groq en el archivo .env.local');
      return;
    }
    if (!transcription) {
      Alert.alert(t('common.error') || 'Error', t('dashboard.audioRecorderModal.ai.emptyTranscription') || 'Primero genera la transcripción.');
      return;
    }
    setIsSummarizing(true);
    setSummary(null);
    try {
      const result = await summarizeWithGroq(transcription, GROQ_API_KEY);
      setSummary(result);
      setShowTutorial(false);
      setActiveTab('summary');
    } catch (e) {
      Alert.alert(t('common.error') || 'Error', e instanceof Error ? e.message : 'Error al generar el resumen.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Clipboard
  // ---------------------------------------------------------------------------
  const copyToClipboard = async (text: string | null) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    Alert.alert(t('common.success') || '¡Listo!', t('dashboard.audioRecorderModal.ai.copied') || '¡Texto copiado!');
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.card} translucent={false} />

      {/* Top safe area */}
      <View style={{ height: insets.top, backgroundColor: theme.colors.card }} />

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text 
          style={[styles.headerTitle, { flex: 1, textAlign: 'center', fontSize: 16 }]} 
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {videoTitle}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* YouTube Video Player */}
        {videoData?.video_id && (
          <View style={{ marginBottom: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' }}>
            <YoutubePlayer
              height={Dimensions.get('window').width * 9 / 16}
              play={false}
              videoId={videoData.video_id}
              onChangeState={(event) => {
                console.log('YouTube player state:', event);
              }}
              onError={(error) => {
                console.error('YouTube player error:', error);
                Alert.alert('Error', 'No se pudo cargar el video. Intenta abrirlo directamente en YouTube.');
              }}
              webViewProps={{
                javaScriptEnabled: true,
                domStorageEnabled: true,
                mediaPlaybackRequiresUserAction: false,
                allowsFullscreenVideo: true,
              }}
            />
          </View>
        )}

        {/* Video Meta (Date) - Compact */}
        {date && (
          <Text style={{ fontSize: 12, color: theme.colors.text.secondary, textAlign: 'center', marginBottom: 12 }}>
            {date}
          </Text>
        )}

        {/* Full title info box (si es muy largo) */}
        {videoTitle.length > 50 && (
          <View style={{ paddingHorizontal: 12, marginBottom: 12, paddingVertical: 8, backgroundColor: `${theme.colors.primary}08`, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: theme.colors.primary }}>
            <Text style={{ fontSize: 11, color: theme.colors.text.secondary, fontStyle: 'italic' }}>
              Título: {videoTitle}
            </Text>
          </View>
        )}

        {/* Animated Subject Selector */}
        <AnimatedSubjectSelector 
          subjectForId={subjectForId} 
          onSelect={() => setShowSubjectPicker(true)} 
        />

        {/* AI Control Bar + Content (unified) */}
        <View style={{ marginTop: 8 }}>
          <RecordingAIContent
            activeTab={activeTab}
            onTabPress={setActiveTab}
            screenWidth={screenWidth}
            isTranscribing={isTranscribing}
            transcription={transcription}
            isSummarizing={isSummarizing}
            summary={summary}
            onCopy={copyToClipboard}
            onStartTranscriptionFlow={startTranscriptionFlow}
            onStartSummaryFlow={startSummaryFlow}
          />
        </View>
      </ScrollView>

      {/* Subject picker */}
      <SubjectPickerModal
        visible={showSubjectPicker}
        subjects={subjects}
        selectedId={selectedSubjectId}
        onSelect={handleSubjectChange}
        onClose={() => setShowSubjectPicker(false)}
      />
    </View>
  );
};
