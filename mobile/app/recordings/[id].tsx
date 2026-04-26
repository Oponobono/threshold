import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Audio } from 'expo-av';
import { Picker } from '@react-native-picker/picker';

import { theme } from '../../src/styles/theme';
import { detailStyles as styles } from '../../src/styles/RecordingDetailScreen.styles';
import { globalStyles } from '../../src/styles/globalStyles';
import { useWhisper, WhisperModelType } from '../../src/hooks/useWhisper';
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
// Gemini API helper
// ---------------------------------------------------------------------------
async function fetchGeminiSummary(transcription: string): Promise<string> {
  const apiKey = 'AIzaSyBCDyJG69zE-YiP6c6svgBon7mXbjzXO_U';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  const body = {
    contents: [{
      parts: [{
        text: `Eres un asistente educativo. Resume el siguiente texto de forma clara, estructurada y breve para un estudiante universitario, resaltando los puntos clave:\n\n${transcription}`,
      }],
    }],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error('Gemini API Error');
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar el resumen.';
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  // Playback
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // AI state
  const [transcription, setTranscription] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [activeTab, setActiveTab] = useState<AITabType>('transcription');
  const [showTutorial, setShowTutorial] = useState(true);
  const [isModelModalVisible, setIsModelModalVisible] = useState(false);

  // Recording metadata
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [recordingData, setRecordingData] = useState<AudioRecording | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  const {
    isDownloading,
    downloadProgress,
    isTranscribing,
    checkModelExists,
    downloadModel,
    transcribeAudio,
  } = useWhisper();

  const audioUri = recordingData?.local_uri || `${FileSystem.documentDirectory}Threshold/audio/${id}`;
  const timestamp = parseInt(id.split('_')[1] || '0');
  const date = recordingData?.created_at
    ? new Date(recordingData.created_at).toLocaleString()
    : timestamp ? new Date(timestamp).toLocaleString() : '';
  const screenWidth = Dimensions.get('window').width - 48;

  // ---------------------------------------------------------------------------
  // Load data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    try {
      const subs = await getSubjects();
      setSubjects(subs);

      const allRecs = await getAudioRecordings();
      const rec = allRecs.find(r => r.id?.toString() === id || r.local_uri.endsWith(id));
      if (rec) {
        setRecordingData(rec);
        setSelectedSubjectId(rec.subject_id || null);

        if (rec.transcript_uri) {
          try {
            const tStr = await FileSystem.readAsStringAsync(rec.transcript_uri);
            setTranscription(JSON.parse(tStr).text);
          } catch (e) { console.warn('Error reading transcript', e); }
        }
        if (rec.summary_uri) {
          try {
            const sStr = await FileSystem.readAsStringAsync(rec.summary_uri);
            setSummary(JSON.parse(sStr).text);
          } catch (e) { console.warn('Error reading summary', e); }
        }
      }
    } catch (e) {
      console.error('Error loading initial data:', e);
    }
  };

  // ---------------------------------------------------------------------------
  // Subject association
  // ---------------------------------------------------------------------------
  const handleSubjectChange = async (newSubjectId: number | null) => {
    setSelectedSubjectId(newSubjectId);
    if (recordingData?.id) {
      try {
        await updateAudioRecording(recordingData.id, { subject_id: newSubjectId });
      } catch (e) {
        console.error('Failed to update subject', e);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Local JSON persistence
  // ---------------------------------------------------------------------------
  const saveTextToFile = async (text: string, type: 'transcript' | 'summary') => {
    if (!recordingData?.id) return;
    const folderUri = `${FileSystem.documentDirectory}Threshold/transcripts/`;
    const fileUri = `${folderUri}${type}_${recordingData.id}.json`;

    try {
      const dirInfo = await FileSystem.getInfoAsync(folderUri);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });

      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify({ text, date: new Date().toISOString() }));

      await upsertAudioTranscript({
        recording_id: recordingData.id,
        ...(type === 'transcript' ? { transcript_uri: fileUri } : { summary_uri: fileUri }),
      });
    } catch (error) {
      console.error('Failed to save to local file:', error);
    }
  };

  // ---------------------------------------------------------------------------
  // Playback
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => { if (sound) sound.unloadAsync(); };
  }, [sound]);

  const togglePlayback = async () => {
    try {
      if (isPlaying && sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else if (!isPlaying && sound) {
        await sound.playAsync();
        setIsPlaying(true);
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true });
        setSound(newSound);
        setIsPlaying(true);
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            newSound.setPositionAsync(0);
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ---------------------------------------------------------------------------
  // Transcription flow
  // ---------------------------------------------------------------------------
  const startTranscriptionFlow = async () => {
    try {
      const hasBase = await checkModelExists('base');
      const hasTiny = await checkModelExists('tiny');
      if (hasBase) processAudio('base');
      else if (hasTiny) processAudio('tiny');
      else setIsModelModalVisible(true);
    } catch (e) {
      Alert.alert(t('common.error') || 'Error', e instanceof Error ? e.message : 'Error al iniciar la transcripción');
    }
  };

  const processAudio = async (modelType: WhisperModelType) => {
    try {
      setTranscription(null);
      setSummary(null);
      const text = await transcribeAudio(audioUri, modelType);
      setTranscription(text);
      setShowTutorial(false);
      await saveTextToFile(text, 'transcript');
    } catch (e) {
      Alert.alert(t('common.error') || 'Error', e instanceof Error ? e.message : 'Error en transcripción');
    }
  };

  const handleDownloadAndProcess = async (modelType: WhisperModelType) => {
    setIsModelModalVisible(false);
    try {
      await downloadModel(modelType);
      processAudio(modelType);
    } catch (e) {
      Alert.alert(t('common.error') || 'Error', e instanceof Error ? e.message : 'Error descargando el modelo');
    }
  };

  // ---------------------------------------------------------------------------
  // Summary flow
  // ---------------------------------------------------------------------------
  const startSummaryFlow = async () => {
    if (!transcription) {
      Alert.alert(t('dashboard.audioRecorderModal.ai.emptyTranscription'));
      return;
    }
    setIsSummarizing(true);
    setSummary(null);
    try {
      const result = await fetchGeminiSummary(transcription);
      setSummary(result);
      setShowTutorial(false);
      setActiveTab('summary');
      await saveTextToFile(result, 'summary');
    } catch (e) {
      Alert.alert(t('common.error') || 'Error', e instanceof Error ? e.message : 'Error al generar el resumen');
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
    Alert.alert(t('common.success'), t('dashboard.audioRecorderModal.ai.copied'));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={[globalStyles.safeArea, styles.container]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dashboard.audioRecorderModal.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Player Card */}
        <View style={styles.playerCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.playerTitle}>
              {recordingData?.name || t('dashboard.audioRecorderModal.ai.recording') || 'Grabación'}
            </Text>
            <Text style={styles.playerDate}>{date}</Text>

            {/* Subject Selector */}
            <View style={{ marginTop: 12, backgroundColor: theme.colors.background, borderRadius: 8, overflow: 'hidden' }}>
              <Picker
                selectedValue={selectedSubjectId}
                onValueChange={handleSubjectChange}
                style={{ height: 40, width: '100%', color: theme.colors.text.primary }}
                dropdownIconColor={theme.colors.primary}
              >
                <Picker.Item label="-- Sin Materia (Huérfana) --" value={null} />
                {subjects.map(sub => (
                  <Picker.Item key={sub.id} label={sub.name} value={sub.id} />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity style={[styles.playButton, { marginLeft: 16 }]} onPress={togglePlayback}>
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
          isDownloading={isDownloading}
          downloadProgress={downloadProgress}
          isTranscribing={isTranscribing}
          transcription={transcription}
          isSummarizing={isSummarizing}
          summary={summary}
          onCopy={copyToClipboard}
          onStartTranscriptionFlow={startTranscriptionFlow}
          onStartSummaryFlow={startSummaryFlow}
        />

      </ScrollView>

      {/* Model Selection Modal */}
      <Modal
        visible={isModelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('dashboard.audioRecorderModal.ai.downloadingModel')}</Text>
            <Text style={styles.modalSubtitle}>{t('dashboard.audioRecorderModal.ai.downloadingModelDesc')}</Text>

            <TouchableOpacity style={styles.modelOptionBtn} onPress={() => handleDownloadAndProcess('tiny')}>
              <Text style={styles.modelOptionTitle}>⚡ Modelo Tiny (~42 MB)</Text>
              <Text style={styles.modelOptionDesc}>Rápido y ligero. Ideal para notas rápidas.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modelOptionBtn} onPress={() => handleDownloadAndProcess('base')}>
              <Text style={styles.modelOptionTitle}>🎯 Modelo Base (~78 MB)</Text>
              <Text style={styles.modelOptionDesc}>Más preciso. Recomendado para clases largas.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsModelModalVisible(false)}>
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
