import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { getAudioRecordings, createAudioRecording, deleteAudioRecording, AudioRecording } from '../services/api';

export interface RecordingItem extends AudioRecording {
  // Aliases for compatibility
  id_string: string;
  uri: string;
  date: string;
}

export function useAudioRecorder() {
  const { t } = useTranslation();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadRecordings();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      stopTimer();
    };
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      startTimer();
    } else {
      stopTimer();
    }
  }, [isRecording, isPaused]);

  const startTimer = () => {
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
      // 1. Sync orphans (local files not in DB)
      const audioDir = `${FileSystem.documentDirectory}Threshold/audio/`;
      const dirInfo = await FileSystem.getInfoAsync(audioDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
      } else {
        const files = await FileSystem.readDirectoryAsync(audioDir);
        const m4aFiles = files.filter(f => f.endsWith('.m4a'));
        
        // Fetch current DB recordings to check what's missing
        const dbRecordings = await getAudioRecordings();
        const dbUris = new Set(dbRecordings.map(r => r.local_uri));

        // Sync missing
        for (const file of m4aFiles) {
          const fullUri = audioDir + file;
          if (!dbUris.has(fullUri)) {
            const timestamp = parseInt(file.split('_')[1]) || Date.now();
            const dateObj = new Date(timestamp);
            const defaultName = t('dashboard.audioRecorderModal.fileLabel', { date: dateObj.toLocaleDateString() });
            
            try {
              await createAudioRecording({
                local_uri: fullUri,
                duration: 0,
                name: defaultName,
                subject_id: null
              });
            } catch (syncErr) {
              console.warn('Error syncing orphan file:', file, syncErr);
            }
          }
        }
      }

      // 2. Fetch all from DB
      const updatedDbRecordings = await getAudioRecordings();
      const mappedRecordings: RecordingItem[] = updatedDbRecordings.map(rec => ({
        ...rec,
        id_string: rec.id?.toString() || rec.local_uri,
        uri: rec.local_uri,
        date: new Date(rec.created_at || Date.now()).toLocaleString(),
        name: rec.name || t('dashboard.audioRecorderModal.fileLabel', { date: new Date(rec.created_at || Date.now()).toLocaleDateString() }),
      }));

      setRecordings(mappedRecordings);
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

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
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

    const currentDuration = recordingDuration;
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

        const defaultName = t('dashboard.audioRecorderModal.fileLabel', { date: new Date().toLocaleDateString() });
        
        // Save to DB
        await createAudioRecording({
          local_uri: permanentUri,
          duration: currentDuration,
          name: defaultName,
          subject_id: null
        });
        
        loadRecordings();
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  }

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

  async function deleteRecording(id: number | string, uri: string) {
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
              if (typeof id === 'number') {
                await deleteAudioRecording(id);
              }
              const fileInfo = await FileSystem.getInfoAsync(uri);
              if (fileInfo.exists) {
                await FileSystem.deleteAsync(uri);
              }
              loadRecordings();
            } catch (error) {
              console.error('Error deleting recording', error);
            }
          }
        }
      ]
    );
  }

  return {
    recording,
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
  };
}
