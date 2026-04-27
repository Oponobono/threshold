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
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../../src/styles/theme';
import { detailStyles as styles } from '../../src/styles/RecordingDetailScreen.styles';
import { RecordingAITabs, AITabType } from '../../src/components/RecordingAITabs';
import { RecordingAIContent } from '../../src/components/RecordingAIContent';
import {
  getSubjects,
  Subject,
  getAudioRecordings,
  AudioRecording,
  upsertAudioTranscript,
  updateAudioRecording,
} from '../../src/services/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GEMINI_API_KEY = 'AIzaSyChCzPRtkeAcmQLN2_4mRx7kFCBfyz5pxI';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB — safe inline limit

// ---------------------------------------------------------------------------
// Gemini helpers
// ---------------------------------------------------------------------------
async function transcribeWithGemini(audioUri: string): Promise<string> {
  const fileInfo = await FileSystem.getInfoAsync(audioUri);
  if (!fileInfo.exists) throw new Error('El archivo de audio no existe en el dispositivo.');

  const sizeBytes = (fileInfo as any).size ?? 0;
  if (sizeBytes > MAX_AUDIO_BYTES) {
    const mb = Math.round(sizeBytes / 1024 / 1024);
    throw new Error(
      `El audio pesa ${mb} MB y supera el límite de 15 MB para transcripción en línea.\n\n` +
      'Para audios largos, divide la grabación en fragmentos de menos de 15 minutos.'
    );
  }

  const base64 = await FileSystem.readAsStringAsync(audioUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const body = {
    contents: [{
      parts: [
        {
          inlineData: {
            mimeType: 'audio/mp4',
            data: base64,
          },
        },
        {
          text: 'Transcribe exactamente todo el contenido de este audio en español. Devuelve ÚNICAMENTE la transcripción del habla, sin añadir comentarios, etiquetas, encabezados ni formato especial.',
        },
      ],
    }],
  };

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Error de Gemini ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return text.trim();
}

async function summarizeWithGemini(transcription: string): Promise<string> {
  const body = {
    contents: [{
      parts: [{
        text: `Eres un asistente educativo. Resume el siguiente texto de forma clara, estructurada y breve para un estudiante universitario, resaltando los puntos clave:\n\n${transcription}`,
      }],
    }],
  };

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Error de Gemini ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No se pudo generar el resumen.';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const AUDIO_DIR = () => `${FileSystem.documentDirectory}Threshold/audio/`;
const TRANSCRIPTS_DIR = () => `${FileSystem.documentDirectory}Threshold/transcripts/`;

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
// Screen
// ---------------------------------------------------------------------------
export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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

  // Recording metadata
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [recordingData, setRecordingData] = useState<AudioRecording | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  // Derived values
  const audioUri = recordingData?.local_uri
    || `${AUDIO_DIR()}${id.endsWith('.m4a') ? id : `${id}.m4a`}`;

  const recordingTitle = recordingData?.name
    || (() => {
      const ts = parseInt(id.split('_')[1] || '0', 10);
      return ts
        ? t('dashboard.audioRecorderModal.fileLabel', { date: new Date(ts).toLocaleDateString() })
        : t('dashboard.audioRecorderModal.ai.recording') || 'Grabación';
    })();

  const date = recordingData?.created_at
    ? new Date(recordingData.created_at).toLocaleString()
    : (() => {
        const ts = parseInt(id.split('_')[1] || '0', 10);
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
  useEffect(() => { loadInitialData(); }, [id]);

  const loadInitialData = async () => {
    try {
      try { setSubjects(await getSubjects()); } catch (e) { console.warn('subjects:', e); }

      let rec: AudioRecording | null = null;
      try {
        const all = await getAudioRecordings();
        rec = all.find(r =>
          r.id?.toString() === id ||
          r.local_uri.endsWith(id) ||
          r.local_uri.endsWith(`${id}.m4a`)
        ) ?? null;
      } catch (e) { console.warn('recordings:', e); }

      if (rec) { setRecordingData(rec); setSelectedSubjectId(rec.subject_id ?? null); }

      const key = rec?.id?.toString() ?? id.replace(/\.m4a$/, '');
      await loadPersistedTexts(key);
    } catch (e) { console.error('loadInitialData:', e); }
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
    const key = getLocalKey(recordingData, id);
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
  // Playback (ref-based to avoid stale-closure double-tap bug)
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
          sound.setPositionAsync(0).catch(() => {});
        }
      });
    } catch (e) {
      setIsPlaying(false);
      Alert.alert(t('common.error') || 'Error', 'No se pudo reproducir el audio.');
    }
  }, [audioUri, t]);

  // ---------------------------------------------------------------------------
  // Transcription (Gemini)
  // ---------------------------------------------------------------------------
  const startTranscriptionFlow = async () => {
    setIsTranscribing(true);
    setTranscription(null);
    setSummary(null);
    try {
      const text = await transcribeWithGemini(audioUri);
      if (!text) {
        Alert.alert(t('common.error') || 'Error', 'Gemini no detectó voz en el audio. Asegúrate de que el archivo tenga contenido de voz claro.');
        return;
      }
      setTranscription(text);
      setShowTutorial(false);
      await saveTextToFile(text, 'transcript');
    } catch (e) {
      Alert.alert(t('common.error') || 'Error', e instanceof Error ? e.message : 'Error al transcribir el audio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Summary (Gemini)
  // ---------------------------------------------------------------------------
  const startSummaryFlow = async () => {
    if (!transcription) {
      Alert.alert(t('common.error') || 'Error', t('dashboard.audioRecorderModal.ai.emptyTranscription') || 'Primero genera la transcripción.');
      return;
    }
    setIsSummarizing(true);
    setSummary(null);
    try {
      const result = await summarizeWithGemini(transcription);
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
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.card} translucent={false} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top safe area */}
      <View style={{ height: insets.top, backgroundColor: theme.colors.card }} />

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          {recordingTitle}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Player Card */}
        <View style={styles.playerCard}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={styles.playerTitle} numberOfLines={2}>{recordingTitle}</Text>
            <Text style={styles.playerDate}>{date}</Text>

            {/* Subject selector pill */}
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
                backgroundColor: theme.colors.background,
                borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12,
                borderWidth: 1, borderColor: subjectForId?.color || theme.colors.border,
                gap: 8, marginTop: 4,
              }}
              onPress={() => setShowSubjectPicker(true)}
            >
              {subjectForId ? (
                <View style={{
                  width: 20, height: 20, borderRadius: 6,
                  backgroundColor: subjectForId.color || theme.colors.primary,
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <MaterialCommunityIcons name={(subjectForId.icon as any) || 'book-outline'} size={12} color="#fff" />
                </View>
              ) : (
                <Ionicons name="albums-outline" size={16} color={theme.colors.text.placeholder} />
              )}
              <Text style={{
                color: subjectForId ? theme.colors.text.primary : theme.colors.text.placeholder,
                fontSize: 13, fontWeight: '500',
              }}>
                {subjectForId?.name || (t('subjects.noSubjectSelected') || 'Sin materia')}
              </Text>
              <Ionicons name="chevron-down" size={14} color={theme.colors.text.placeholder} />
            </TouchableOpacity>
          </View>

          {/* Play button */}
          <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* AI Tabs */}
        <RecordingAITabs
          activeTab={activeTab}
          onTabPress={setActiveTab}
          onSummaryPress={startSummaryFlow}
          hasTranscription={!!transcription}
          hasSummary={!!summary}
        />

        {/* Tutorial hint */}
        {showTutorial && !transcription && (
          <View style={styles.tutorialBox}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.tutorialText}>{t('dashboard.audioRecorderModal.ai.tutorialTitle')}</Text>
              <Text style={styles.tutorialText}>{t('dashboard.audioRecorderModal.ai.tutorialBody')}</Text>
            </View>
          </View>
        )}

        {/* AI Content */}
        <RecordingAIContent
          activeTab={activeTab}
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
}
