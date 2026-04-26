import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, Modal, Animated, Dimensions } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { Audio } from 'expo-av';

import { theme } from '../../src/styles/theme';
import { detailStyles as styles } from '../../src/styles/RecordingDetailScreen.styles';
import { globalStyles } from '../../src/styles/globalStyles';

// Gemini API call helper (simple fetch, replace with your own endpoint/API key)
async function fetchGeminiSummary(transcription: string): Promise<string> {
  // TODO: Reemplaza con tu endpoint real y API key
  const apiKey = 'TU_API_KEY_GEMINI';
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey;
  const body = {
    contents: [{ parts: [{ text: `Resume el siguiente texto en español, de forma clara y breve para un estudiante universitario:\n${transcription}` }] }]
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar el resumen.';
}

export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcription' | 'summary'>('transcription');
  const [showTutorial, setShowTutorial] = useState(true);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [isModelModalVisible, setIsModelModalVisible] = useState(false);
  
  const {
    isDownloading,
    downloadProgress,
    const { t } = useTranslation();
    isTranscribing,
    checkModelExists,
    downloadModel,
    transcribeAudio,
  } = useWhisper();

  const audioUri = `${FileSystem.documentDirectory}Threshold/audio/${id}`;
  const timestamp = parseInt(id.split('_')[1] || '0');
  const date = timestamp ? new Date(timestamp).toLocaleString() : '';

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
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
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            sound?.setPositionAsync(0);
          }
        });
      }
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), 'No se pudo reproducir el audio.');
    }
  };

  const startTranscriptionFlow = async () => {
    try {
      setActiveTab('transcription');
      // Prioritize checking if Base exists, if not, check Tiny
      const hasBase = await checkModelExists('base');
      const hasTiny = await checkModelExists('tiny');

      if (hasBase) {
        processAudio('base');
      } else if (hasTiny) {
        processAudio('tiny');
      } else {
        setIsModelModalVisible(true);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo comprobar el estado del motor.');
    }
  };

  const processAudio = async (modelType: WhisperModelType) => {
    try {
      setTranscription(null);
      setSummary(null);
      const text = await transcribeAudio(audioUri, modelType);
      setTranscription(text);
      setShowTutorial(false);
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar la transcripción.');
    }
  };

  const startSummaryFlow = async () => {
    if (!transcription) {
      Alert.alert('Primero genera la transcripción.');
      return;
    }
    setActiveTab('summary');
    setIsSummarizing(true);
    setSummary(null);
    try {
      const result = await fetchGeminiSummary(transcription);
      setSummary(result);
      setShowTutorial(false);
    } catch (e) {
      setSummary('No se pudo generar el resumen.');
    } finally {
      setIsSummarizing(false);
        Alert.alert(t('dashboard.audioRecorderModal.ai.firstTranscribe'));
  };

  const handleDownloadAndProcess = async (modelType: WhisperModelType) => {
    // Card slider logic
    const width = Dimensions.get('window').width - 48;

    const handleTabPress = (tab: 'transcription' | 'summary') => {
      setActiveTab(tab);
      Animated.spring(scrollX, {
        toValue: tab === 'transcription' ? 0 : width,
        setSummary(t('dashboard.audioRecorderModal.ai.summaryError'));
      }).start();
    };

    return (
      <SafeAreaView style={[globalStyles.safeArea, styles.container]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle de Audio</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.playerCard}>
            <Text style={styles.playerTitle}>Grabación</Text>
            <Text style={styles.playerDate}>{date}</Text>
            <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={32} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          {/* Iconos de tabs y tutorial */}
          <View style={styles.tabRow}>
            <TouchableOpacity
            <Text style={styles.headerTitle}>{t('dashboard.audioRecorderModal.ai.detailTitle')}</Text>
              onPress={() => { if (!transcription) startTranscriptionFlow(); else handleTabPress('transcription'); }}
            >
              <Ionicons name="text-outline" size={24} color={activeTab === 'transcription' ? theme.colors.primary : theme.colors.text.secondary} />
              <Text style={styles.tabLabel}>Transcripción</Text>
              <Text style={styles.playerTitle}>{t('dashboard.audioRecorderModal.ai.recording')}</Text>
            <TouchableOpacity
              style={[styles.tabIcon, activeTab === 'summary' && styles.tabIconActive]}
              onPress={() => { if (!summary) startSummaryFlow(); else handleTabPress('summary'); }}
              disabled={!transcription}
            >
              <MaterialCommunityIcons name="lightbulb-outline" size={24} color={activeTab === 'summary' ? theme.colors.primary : theme.colors.text.secondary} />
              <Text style={styles.tabLabel}>Resumen</Text>
            </TouchableOpacity>
          </View>
          {showTutorial && (
            <View style={styles.tutorialBox}>
              <Text style={styles.tutorialText}>
                <Text style={styles.tabLabel}>{t('dashboard.audioRecorderModal.ai.transcriptionTab')}</Text>
              </Text>
            </View>
          )}
          {/* Card deslizable */}
          <View style={{ width: width, alignSelf: 'center', marginTop: 16, overflow: 'hidden' }}>
            <Animated.View style={{ flexDirection: 'row', width: width * 2, transform: [{ translateX: scrollX.interpolate({ inputRange: [0, width], outputRange: [0, -width] }) }] }}>
              {/* Transcripción */}
                <Text style={styles.tabLabel}>{t('dashboard.audioRecorderModal.ai.summaryTab')}</Text>
                {isDownloading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>
                <Text style={styles.tutorialText}>{t('dashboard.audioRecorderModal.ai.tutorial')}</Text>
                )}
                {isTranscribing && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Procesando audio localmente...</Text>
                  </View>
                )}
                {transcription && !isTranscribing && (
                  <View style={styles.transcriptionBox}>
                    <Text style={styles.transcriptionText}>{transcription}</Text>
                  </View>
                )}
                {!transcription && !isDownloading && !isTranscribing && (
                  <View style={styles.transcriptionBox}>
                    <Text style={styles.transcriptionHint}>Pulsa el icono para transcribir el audio.</Text>
                  </View>
                )}
              </View>
                      <Text style={styles.loadingText}>{t('dashboard.audioRecorderModal.ai.processing')}</Text>
              <View style={[styles.aiCard, { width }]}> 
                {isSummarizing && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Generando resumen...</Text>
                  </View>
                )}
                {summary && !isSummarizing && (
                  <View style={styles.transcriptionBox}>
                      <Text style={styles.transcriptionHint}>{t('dashboard.audioRecorderModal.ai.transcriptionHint')}</Text>
                  </View>
                )}
                {!summary && !isSummarizing && (
                  <View style={styles.transcriptionBox}>
                    <Text style={styles.transcriptionHint}>Pulsa el icono para generar el resumen.</Text>
                  </View>
                )}
              </View>
                      <Text style={styles.loadingText}>{t('dashboard.audioRecorderModal.ai.generatingSummary')}</Text>
          </View>
        </ScrollView>
        {/* Modal de Selección de Modelo */}
        <Modal
          visible={isModelModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsModelModalVisible(false)}
        >
                      <Text style={styles.transcriptionHint}>{t('dashboard.audioRecorderModal.ai.summaryHint')}</Text>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Descargar motor IA</Text>
              <Text style={styles.modalDesc}>Elige un modelo para descargar y poder transcribir audios localmente.</Text>
              <TouchableOpacity style={styles.modalBtn} onPress={() => handleDownloadAndProcess('tiny')}>
                <Text style={styles.modalBtnText}>Descargar Modelo Tiny (rápido, menos preciso)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={() => handleDownloadAndProcess('base')}>
                <Text style={styles.modalBtnText}>Descargar Modelo Base (más preciso, más lento)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsModelModalVisible(false)}>
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
                <Text style={styles.modalTitle}>{t('dashboard.audioRecorderModal.ai.downloadTitle')}</Text>
                <Text style={styles.modalDesc}>{t('dashboard.audioRecorderModal.ai.downloadDesc')}</Text>
                <TouchableOpacity style={styles.modalBtn} onPress={() => handleDownloadAndProcess('tiny')}>
                  <Text style={styles.modalBtnText}>{t('dashboard.audioRecorderModal.ai.downloadTiny')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtn} onPress={() => handleDownloadAndProcess('base')}>
                  <Text style={styles.modalBtnText}>{t('dashboard.audioRecorderModal.ai.downloadBase')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsModelModalVisible(false)}>
                  <Text style={styles.modalCancelBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              onPress={() => handleDownloadAndProcess('tiny')}
            >
              <Text style={styles.modelOptionTitle}>⚡ Modelo Tiny (~42 MB)</Text>
              <Text style={styles.modelOptionDesc}>
                Muy rápido y liviano. Ideal para grabaciones cortas, dictados o notas de voz personales con buena acústica.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modelOptionBtn} 
              onPress={() => handleDownloadAndProcess('base')}
            >
              <Text style={styles.modelOptionTitle}>🎯 Modelo Base (~78 MB)</Text>
              <Text style={styles.modelOptionDesc}>
                Más preciso pero un poco más pesado. Recomendado para clases magistrales largas, auditorios o charlas grupales.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancelBtn} 
              onPress={() => setIsModelModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
