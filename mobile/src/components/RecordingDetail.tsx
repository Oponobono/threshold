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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../styles/theme';
import { detailStyles as styles } from '../styles/RecordingDetailScreen.styles';
import { RecordingAITabs, AITabType } from './RecordingAITabs';
import { RecordingAIContent } from './RecordingAIContent';
import { PremiumLoading } from './PremiumLoading';
import {
  getSubjects,
  Subject,
  getAudioRecordings,
  AudioRecording,
  upsertAudioTranscript,
  updateAudioRecording,
} from '../services/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GROQ_API_KEY: string = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const AUDIO_DIR = () => `${FileSystem.documentDirectory}Threshold/audio/`;
const TRANSCRIPTS_DIR = () => `${FileSystem.documentDirectory}Threshold/transcripts/`;

// ---------------------------------------------------------------------------
// Groq helpers
// ---------------------------------------------------------------------------
async function transcribeWithWhisper(audioUri: string, apiKey: string): Promise<string> {
  const fileInfo = await FileSystem.getInfoAsync(audioUri);
  if (!fileInfo.exists) throw new Error('El archivo de audio no existe en el dispositivo.');

  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    name: 'audio.m4a',
    type: 'audio/mp4',
  } as any);
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'es');
  formData.append('response_format', 'text');

  const response = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Error de Groq Whisper ${response.status}: ${errBody}`);
  }

  const text = await response.text();
  return text.trim();
}

async function summarizeWithGroq(transcription: string, apiKey: string): Promise<string> {
  const body = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'Eres un asistente educativo experto especializado en crear material de estudio universitario altamente efectivo. A partir de la transcripción proporcionada, genera un resumen estructurado siguiendo estas reglas:\n1. Extrae los conceptos fundamentales y ordénalos por temas usando títulos claros (###).\n2. Usa viñetas breves para desglosar los detalles importantes de cada tema.\n3. Identifica términos clave, definiciones o fechas y resáltalos en **negrita**.\n4. Elimina toda la "paja" (titubeos, saludos, repeticiones) y ve directo al grano.\n5. Finaliza con una sección de "Idea Central" de máximo 2 oraciones.\nTu tono debe ser académico, estructurado y directo. No agregues introducciones conversacionales (como "Aquí tienes el resumen").',
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

function getLocalKey(recordingData: AudioRecording | null, id: string): string {
  if (recordingData?.id) return recordingData.id.toString();
  return id.replace(/\.m4a$/, '');
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
// RecordingDetail Component
// ---------------------------------------------------------------------------
interface RecordingDetailProps {
  recordingId: string;
  onBack: () => void;
}

export const RecordingDetail: React.FC<RecordingDetailProps> = ({ recordingId, onBack }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Playback
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // AI state
  const [transcription, setTranscription] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [activeTab, setActiveTab] = useState<AITabType>('transcription');
  const [showTutorial, setShowTutorial] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Recording metadata
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [recordingData, setRecordingData] = useState<AudioRecording | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  // Derived values
  const audioUri = recordingData?.local_uri
    || `${AUDIO_DIR()}${recordingId.endsWith('.m4a') ? recordingId : `${recordingId}.m4a`}`;

  const recordingTitle = recordingData?.name
    || (() => {
      const ts = parseInt(recordingId.split('_')[1] || '0', 10);
      return ts
        ? t('dashboard.audioRecorderModal.fileLabel', { date: new Date(ts).toLocaleDateString() })
        : t('dashboard.audioRecorderModal.ai.recording') || 'Grabación';
    })();

  const date = recordingData?.created_at
    ? new Date(recordingData.created_at).toLocaleString()
    : (() => {
        const ts = parseInt(recordingId.split('_')[1] || '0', 10);
        return ts ? new Date(ts).toLocaleString() : '';
      })();

  const screenWidth = Dimensions.get('window').width - 48;
  const subjectForId = subjects.find(s => s.id === selectedSubjectId);

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Load data
  // ---------------------------------------------------------------------------
  useEffect(() => { loadInitialData(); }, [recordingId]);

  const loadInitialData = async () => {
    try {
      try { setSubjects(await getSubjects()); } catch (e) { console.warn('subjects:', e); }

      let rec: AudioRecording | null = null;
      try {
        const all = await getAudioRecordings();
        rec = all.find(r =>
          r.id?.toString() === recordingId ||
          r.local_uri.endsWith(recordingId) ||
          r.local_uri.endsWith(`${recordingId}.m4a`)
        ) ?? null;
      } catch (e) { console.warn('recordings:', e); }

      if (rec) { setRecordingData(rec); setSelectedSubjectId(rec.subject_id ?? null); }

      const key = rec?.id?.toString() ?? recordingId.replace(/\.m4a$/, '');
      await loadPersistedTexts(key);
    } catch (e) {
      console.error('loadInitialData:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPersistedTexts = async (key: string) => {
    const dir = TRANSCRIPTS_DIR();
    try {
      const ti = await FileSystem.getInfoAsync(`${dir}transcript_${key}.json`);
      if (ti.exists) {
        const parsed = JSON.parse(await FileSystem.readAsStringAsync(`${dir}transcript_${key}.json`));
        if (parsed.text) { setTranscription(parsed.text); setShowTutorial(false); }
      }
    } catch (e) { console.warn('transcript file:', e); }
    try {
      const si = await FileSystem.getInfoAsync(`${dir}summary_${key}.json`);
      if (si.exists) {
        const parsed = JSON.parse(await FileSystem.readAsStringAsync(`${dir}summary_${key}.json`));
        if (parsed.text) setSummary(parsed.text);
      }
    } catch (e) { console.warn('summary file:', e); }
  };

  // ---------------------------------------------------------------------------
  // Persist text locally + optionally register in DB
  // ---------------------------------------------------------------------------
  const saveTextToFile = async (text: string, type: 'transcript' | 'summary') => {
    const key = getLocalKey(recordingData, recordingId);
    const dir = TRANSCRIPTS_DIR();
    const fileUri = `${dir}${type}_${key}.json`;
    try {
      const di = await FileSystem.getInfoAsync(dir);
      if (!di.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify({ text, date: new Date().toISOString() }));
      if (recordingData?.id) {
        await upsertAudioTranscript({
          recording_id: recordingData.id,
          ...(type === 'transcript' ? { transcript_uri: fileUri } : { summary_uri: fileUri }),
        }).catch(e => console.warn('upsert transcript DB:', e));
      }
    } catch (e) { console.error('saveTextToFile:', e); }
  };

  // ---------------------------------------------------------------------------
  // Subject association
  // ---------------------------------------------------------------------------
  const handleSubjectChange = async (newId: number | null) => {
    setSelectedSubjectId(newId);
    if (recordingData?.id) {
      await updateAudioRecording(recordingData.id, { subject_id: newId }).catch(e => console.warn('updateSubject:', e));
    }
  };

  // ---------------------------------------------------------------------------
  // Playback
  // ---------------------------------------------------------------------------
  const togglePlayback = useCallback(async () => {
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
          } else {
            await soundRef.current.playAsync();
            setIsPlaying(true);
          }
          return;
        }
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true });
      soundRef.current = sound;
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((s: AVPlaybackStatus) => {
        if (s.isLoaded && s.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (e) {
      setIsPlaying(false);
      Alert.alert(t('common.error') || 'Error', 'No se pudo reproducir el audio.');
    }
  }, [audioUri, t]);

  // ---------------------------------------------------------------------------
  // Transcription (Whisper via Groq)
  // ---------------------------------------------------------------------------
  const startTranscriptionFlow = async () => {
    if (!GROQ_API_KEY) {
      Alert.alert('Error', 'Falta la API Key de Groq en el archivo .env.local');
      return;
    }

    setIsTranscribing(true);
    setTranscription(null);
    setSummary(null);

    try {
      const text = await transcribeWithWhisper(audioUri, GROQ_API_KEY);
      
      if (!text) {
        Alert.alert(t('common.error') || 'Error', 'Whisper no detectó voz en el audio.');
        return;
      }

      setTranscription(text);
      setShowTutorial(false);
      await saveTextToFile(text, 'transcript');
    } catch (e) {
      console.error('ERROR EN TRANSCRIPCIÓN:', e);
      Alert.alert(t('common.error') || 'Error', e instanceof Error ? e.message : 'Error al transcribir el audio.');
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
      await saveTextToFile(result, 'summary');
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
  if (isLoading) {
    return <PremiumLoading text={t('subjects.loading') || 'CARGANDO'} />;
  }

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
        <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          {recordingTitle}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Player Card */}
        <View style={[styles.playerCard, { flexDirection: 'row', alignItems: 'center' }]}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={styles.playerTitle} numberOfLines={2}>{recordingTitle}</Text>
            <Text style={[styles.playerDate, { marginBottom: 0 }]}>{date}</Text>
          </View>

          {/* Play button */}
          <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Animated Subject Selector */}
        <AnimatedSubjectSelector 
          subjectForId={subjectForId} 
          onSelect={() => setShowSubjectPicker(true)} 
        />

        {/* AI Control Bar + Content (unified) */}
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
