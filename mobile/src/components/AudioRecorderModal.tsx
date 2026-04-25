import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, Alert, FlatList, Easing, Platform, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { theme } from '../styles/theme';
import { dashboardStyles as styles } from '../styles/Dashboard.styles';
import { audioRecorderStyles as localStyles } from '../styles/AudioRecorderModal.styles';

interface AudioRecorderModalProps {
  isVisible: boolean;
  onClose: () => void;
}

interface RecordingItem {
  id: string;
  uri: string;
  duration: string;
  date: string;
  name: string;
}

export const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({ isVisible, onClose }) => {
  const { t } = useTranslation();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadRecordings();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      startPulse();
      startTimer();
    } else {
      stopPulse();
      stopTimer();
    }
  }, [isRecording, isPaused]);

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

  const startTimer = () => {
    // Don't reset duration if we are resuming from pause
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadRecordings = async () => {
    try {
      const audioDir = `${FileSystem.documentDirectory}Threshold/audio/`;
      const dirInfo = await FileSystem.getInfoAsync(audioDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
        return;
      }

      const files = await FileSystem.readDirectoryAsync(audioDir);
      const loadedRecordings: RecordingItem[] = files
        .filter(file => file.endsWith('.m4a'))
        .map(file => {
          const timestamp = parseInt(file.split('_')[1]);
          const date = new Date(timestamp);
          return {
            id: file,
            uri: audioDir + file,
            name: t('dashboard.audioRecorderModal.fileLabel', { date: date.toLocaleDateString() }),
            date: date.toLocaleString(),
            duration: '--:--', // Duration is tricky to get without loading the sound
          };
        })
        .sort((a, b) => b.id.localeCompare(a.id));

      setRecordings(loadedRecordings);
    } catch (error) {
      console.error('Error loading recordings:', error);
    }
  };

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(t('common.error'), t('dashboard.audioRecorderModal.permissionError'));
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert(t('common.error'), t('dashboard.audioRecorderModal.recordingError'));
    }
  }

  async function pauseRecording() {
    if (!recording) return;
    try {
      await recording.pauseAsync();
      setIsPaused(true);
    } catch (error) {
      console.error('Failed to pause recording', error);
    }
  }

  async function resumeRecording() {
    if (!recording) return;
    try {
      await recording.startAsync();
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to resume recording', error);
    }
  }

  async function stopRecording() {
    if (!recording) return;

    setIsRecording(false);
    setIsPaused(false);
    setRecording(null);
    setRecordingDuration(0);
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        const audioDir = `${FileSystem.documentDirectory}Threshold/audio/`;
        const fileName = `rec_${Date.now()}.m4a`;
        const permanentUri = audioDir + fileName;
        
        await FileSystem.moveAsync({
          from: uri,
          to: permanentUri,
        });
        
        loadRecordings();
        showSuccessToast();
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  }

  const showSuccessToast = () => {
    // We can't access parent toast directly easily, so we just use an Alert or local toast if implemented
    // For now, let's just assume it's saved.
  };

  async function playSound(uri: string, id: string) {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setPlayingId(id);
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
        }
      });
    } catch (error) {
      console.error('Error playing sound', error);
    }
  }

  async function stopSound() {
    if (sound) {
      await sound.stopAsync();
      setPlayingId(null);
    }
  }

  async function deleteRecording(uri: string) {
    Alert.alert(
      t('dashboard.audioRecorderModal.delete'),
      '¿Estás seguro de que quieres eliminar esta grabación?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('dashboard.audioRecorderModal.delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(uri);
              loadRecordings();
            } catch (error) {
              console.error('Error deleting recording', error);
            }
          }
        }
      ]
    );
  }

  const renderRecordingItem = ({ item }: { item: RecordingItem }) => {
    const isPlaying = playingId === item.id;
    
    return (
      <View style={localStyles.recordingItem}>
        <View style={localStyles.recordingInfo}>
          <Text style={localStyles.recordingName}>{item.name}</Text>
          <Text style={localStyles.recordingDate}>{item.date}</Text>
        </View>
        <View style={localStyles.recordingActions}>
          <TouchableOpacity 
            onPress={() => isPlaying ? stopSound() : playSound(item.uri, item.id)}
            style={localStyles.actionButton}
          >
            <Ionicons 
              name={isPlaying ? "pause-circle" : "play-circle"} 
              size={32} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => deleteRecording(item.uri)}
            style={localStyles.actionButton}
          >
            <Ionicons name="trash-outline" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.sheetBackdrop}>
        <View style={[styles.sheetContent, { height: '80%' }]}>
          <View style={styles.sheetHandle} />
          
          <View style={localStyles.header}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.sheetTitle}>{t('dashboard.audioRecorderModal.title')}</Text>
              <Text style={styles.sheetSubtitle}>{t('dashboard.audioRecorderModal.subtitle')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={localStyles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={localStyles.recorderContainer}>
            <View style={localStyles.timerContainer}>
              <Text style={[localStyles.timerText, isRecording && { color: theme.colors.text.error }]}>
                {formatDuration(recordingDuration)}
              </Text>
              {isRecording && (
                <Text style={[localStyles.statusText, isPaused && { color: theme.colors.text.secondary }]}>
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
                  style={localStyles.secondaryRecordBtn}
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
                  localStyles.recordButton,
                  { transform: [{ scale: pulseAnim }] },
                  isRecording && localStyles.recordingButtonActive
                ]}>
                  <View style={[
                    localStyles.recordButtonInner,
                    isRecording && localStyles.recordingButtonInnerActive
                  ]} />
                </Animated.View>
              </TouchableOpacity>

              {isRecording && (
                <View style={{ width: 44 }} /> /* Spacer to balance the layout */
              )}
            </View>
            
            <Text style={localStyles.hintText}>
              {isRecording 
                ? t('dashboard.audioRecorderModal.stopRecording') 
                : t('dashboard.audioRecorderModal.startRecording')}
            </Text>
          </View>

          <View style={localStyles.listHeader}>
            <Text style={localStyles.listTitle}>{t('dashboard.audioRecorderModal.recordingsList')}</Text>
            <Text style={localStyles.countText}>{recordings.length}</Text>
          </View>

          <FlatList
            data={recordings}
            keyExtractor={(item) => item.id}
            renderItem={renderRecordingItem}
            contentContainerStyle={localStyles.listContent}
            ListEmptyComponent={
              <View style={localStyles.emptyState}>
                <MaterialCommunityIcons name="microphone-off" size={48} color={theme.colors.border} />
                <Text style={localStyles.emptyText}>{t('dashboard.audioRecorderModal.emptyState')}</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};
