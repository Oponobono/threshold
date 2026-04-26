import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, Modal } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { Audio } from 'expo-av';

import { theme } from '../../src/styles/theme';
import { detailStyles as styles } from '../../src/styles/RecordingDetailScreen.styles';
import { globalStyles } from '../../src/styles/globalStyles';
import { useWhisper, WhisperModelType } from '../../src/hooks/useWhisper';

export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
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
      // Prioritize checking if Base exists, if not, check Tiny
      const hasBase = await checkModelExists('base');
      const hasTiny = await checkModelExists('tiny');

      if (hasBase) {
        processAudio('base');
      } else if (hasTiny) {
        processAudio('tiny');
      } else {
        // Neither model exists, ask user to download one
        setIsModelModalVisible(true);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo comprobar el estado del motor.');
    }
  };

  const processAudio = async (modelType: WhisperModelType) => {
    try {
      const text = await transcribeAudio(audioUri, modelType);
      setTranscription(text);
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar la transcripción.');
    }
  };

  const handleDownloadAndProcess = async (modelType: WhisperModelType) => {
    setIsModelModalVisible(false);
    try {
      await downloadModel(modelType);
      await processAudio(modelType);
    } catch (e) {
      Alert.alert('Error', 'Fallo al descargar o transcribir. Verifica tu conexión a internet.');
    }
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

        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <MaterialCommunityIcons name="robot-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.aiTitle}>Inteligencia Artificial</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>On-Device</Text>
            </View>
          </View>

          <Text style={styles.aiDesc}>
            Transcribe esta grabación localmente usando el procesador de tu dispositivo. 100% privado y sin enviar datos a la nube.
          </Text>

          {!transcription && !isDownloading && !isTranscribing && (
            <TouchableOpacity style={styles.transcribeBtn} onPress={startTranscriptionFlow}>
              <Ionicons name="text-outline" size={20} color={theme.colors.white} />
              <Text style={styles.transcribeBtnText}>Generar Transcripción</Text>
            </TouchableOpacity>
          )}

          {isDownloading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>
                Descargando motor IA ({Math.round(downloadProgress * 100)}%)
              </Text>
            </View>
          )}

          {isTranscribing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Procesando audio localmente...</Text>
            </View>
          )}

          {transcription && (
            <View style={styles.transcriptionBox}>
              <Text style={styles.transcriptionText}>{transcription}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de Selección de Modelo */}
      <Modal
        visible={isModelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Descargar Motor IA</Text>
            <Text style={styles.modalSubtitle}>
              Para transcribir de forma privada y sin internet, Threshold procesará el audio localmente. Elige el motor que deseas descargar por única vez:
            </Text>

            <TouchableOpacity 
              style={styles.modelOptionBtn} 
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
