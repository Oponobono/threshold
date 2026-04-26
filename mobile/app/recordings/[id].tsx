import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, Modal, Animated, Dimensions } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Audio } from 'expo-av';


import { theme } from '../../src/styles/theme';
import { detailStyles as styles } from '../../src/styles/RecordingDetailScreen.styles';
import { globalStyles } from '../../src/styles/globalStyles';
import { useWhisper, WhisperModelType } from '../../src/hooks/useWhisper';

// Gemini API call helper
async function fetchGeminiSummary(transcription: string): Promise<string> {
  // IMPORTANTE: Reemplaza con tu API key real
  const apiKey = 'AIzaSyBCDyJG69zE-YiP6c6svgBon7mXbjzXO_U'; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  
  const body = {
    contents: [{ 
      parts: [{ 
        text: `Eres un asistente educativo. Resume el siguiente texto de forma clara, estructurada y breve para un estudiante universitario, resaltando los puntos clave:\n\n${transcription}` 
      }] 
    }]
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
    isTranscribing,
    checkModelExists,
    downloadModel,
    transcribeAudio,
  } = useWhisper();

  const audioUri = `${FileSystem.documentDirectory}Threshold/audio/${id}`;
  const timestamp = parseInt(id.split('_')[1] || '0');
  const date = timestamp ? new Date(timestamp).toLocaleString() : '';
  const screenWidth = Dimensions.get('window').width - 48;

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
            newSound.setPositionAsync(0);
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startTranscriptionFlow = async () => {
    try {
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
      Alert.alert(t('common.error'), t('dashboard.audioRecorderModal.ai.error'));
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
      Alert.alert(t('common.error'), t('dashboard.audioRecorderModal.ai.error'));
    }
  };

  const handleDownloadAndProcess = async (modelType: WhisperModelType) => {
    setIsModelModalVisible(false);
    try {
      await downloadModel(modelType);
      processAudio(modelType);
    } catch (e) {
      Alert.alert(t('common.error'), t('dashboard.audioRecorderModal.ai.error'));
    }
  };

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
      handleTabPress('summary');
    } catch (e) {
      Alert.alert(t('common.error'), t('dashboard.audioRecorderModal.ai.error'));
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleTabPress = (tab: 'transcription' | 'summary') => {
    setActiveTab(tab);
    Animated.spring(scrollX, {
      toValue: tab === 'transcription' ? 0 : screenWidth,
      useNativeDriver: true,
      tension: 20,
    }).start();
  };

  const copyToClipboard = async (text: string | null) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    Alert.alert(t('common.success'), t('dashboard.audioRecorderModal.ai.copied'));
  };

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
          <View>
            <Text style={styles.playerTitle}>{t('dashboard.audioRecorderModal.ai.recording') || 'Grabación'}</Text>
            <Text style={styles.playerDate}>{date}</Text>
          </View>
          <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={32} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* AI Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity 
            style={[styles.tabIcon, activeTab === 'transcription' && styles.tabIconActive]}
            onPress={() => handleTabPress('transcription')}
          >
            <Ionicons 
              name="text-outline" 
              size={24} 
              color={activeTab === 'transcription' ? theme.colors.primary : theme.colors.text.secondary} 
            />
            <Text style={styles.tabLabel}>
              {t('dashboard.audioRecorderModal.ai.tabTranscription')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabIcon, activeTab === 'summary' && styles.tabIconActive]}
            onPress={() => {
              if (!summary && transcription) startSummaryFlow();
              else handleTabPress('summary');
            }}
            disabled={!transcription && !summary}
          >
            <MaterialCommunityIcons 
              name="lightbulb-outline" 
              size={24} 
              color={activeTab === 'summary' ? theme.colors.primary : theme.colors.text.secondary} 
            />
            <Text style={styles.tabLabel}>
              {t('dashboard.audioRecorderModal.ai.tabSummary')}
            </Text>
          </TouchableOpacity>
        </View>

        {showTutorial && !transcription && (
          <View style={styles.tutorialBox}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.tutorialText}>{t('dashboard.audioRecorderModal.ai.tutorialTitle')}</Text>
              <Text style={styles.tutorialText}>{t('dashboard.audioRecorderModal.ai.tutorialBody')}</Text>
            </View>
          </View>
        )}

        {/* Sliding AI Content */}
        <View>
          <Animated.View 
            style={{ flexDirection: 'row', width: screenWidth * 2, transform: [{ translateX: scrollX.interpolate({ inputRange: [0, screenWidth], outputRange: [0, -screenWidth] }) }] }}
          >
            {/* Transcription View */}
            <View style={[styles.aiCard, { width: screenWidth }]}> 
              {isDownloading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>{t('dashboard.audioRecorderModal.ai.downloadingModel')}</Text>
                  <Text style={styles.loadingText}>{Math.round(downloadProgress * 100)}%</Text>
                </View>
              ) : isTranscribing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>{t('dashboard.audioRecorderModal.ai.loading')}</Text>
                </View>
              ) : transcription ? (
                <View style={styles.transcriptionBox}>
                  <ScrollView nestedScrollEnabled>
                    <Text style={styles.transcriptionText}>{transcription}</Text>
                  </ScrollView>
                  <TouchableOpacity onPress={() => copyToClipboard(transcription)} style={styles.copyBtn}>
                    <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.copyBtnText}>{t('common.copy') || 'Copiar'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.transcriptionBox} onPress={startTranscriptionFlow}>
                  <Ionicons name="mic-outline" size={40} color={theme.colors.text.secondary} />
                  <Text style={styles.transcriptionHint}>{t('dashboard.audioRecorderModal.ai.generateTranscription')}</Text>
                  <Text style={styles.transcriptionHint}>{t('dashboard.audioRecorderModal.ai.transcriptionHint')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Summary View */}
            <View style={[styles.aiCard, { width: screenWidth }]}> 
              {isSummarizing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>{t('dashboard.audioRecorderModal.ai.loading')}</Text>
                </View>
              ) : summary ? (
                <View style={styles.transcriptionBox}>
                  <ScrollView nestedScrollEnabled>
                    <Text style={styles.transcriptionText}>{summary}</Text>
                  </ScrollView>
                  <TouchableOpacity onPress={() => copyToClipboard(summary)} style={styles.copyBtn}>
                    <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.copyBtnText}>{t('common.copy') || 'Copiar'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.transcriptionBox, !transcription && { opacity: 0.5 }]} 
                  onPress={startSummaryFlow}
                  disabled={!transcription}
                >
                  <MaterialCommunityIcons name="auto-fix" size={40} color={theme.colors.text.secondary} />
                  <Text style={styles.transcriptionHint}>{t('dashboard.audioRecorderModal.ai.generateSummary')}</Text>
                  <Text style={styles.transcriptionHint}>{t('dashboard.audioRecorderModal.ai.summaryHint')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>
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
            
            <TouchableOpacity 
              style={styles.modelOptionBtn} 
              onPress={() => handleDownloadAndProcess('tiny')}
            >
              <Text style={styles.modelOptionTitle}>⚡ Modelo Tiny (~42 MB)</Text>
              <Text style={styles.modelOptionDesc}>Rápido y ligero. Ideal para notas rápidas.</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modelOptionBtn} 
              onPress={() => handleDownloadAndProcess('base')}
            >
              <Text style={styles.modelOptionTitle}>🎯 Modelo Base (~78 MB)</Text>
              <Text style={styles.modelOptionDesc}>Más preciso. Recomendado para clases largas.</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancelBtn} 
              onPress={() => setIsModelModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
