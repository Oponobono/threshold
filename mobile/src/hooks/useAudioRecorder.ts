import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import {
  getAudioRecordings,
  createAudioRecording,
  deleteAudioRecording,
  AudioRecording,
} from '../services/api';

export interface RecordingItem extends AudioRecording {
  // Aliases for compatibility
  id_string: string;
  uri: string;
  date: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const AUDIO_DIR = () => `${FileSystem.documentDirectory}Threshold/audio/`;

/**
 * Reads all local .m4a files from the audio directory and returns them as
 * lightweight RecordingItems. This works even when the backend is offline.
 */
async function readLocalFiles(t: (key: string, opts?: any) => string): Promise<RecordingItem[]> {
  const audioDir = AUDIO_DIR();
  const dirInfo = await FileSystem.getInfoAsync(audioDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
    return [];
  }

  const files = await FileSystem.readDirectoryAsync(audioDir);
  const m4aFiles = files.filter((f) => f.endsWith('.m4a'));

  return m4aFiles
    .map((file) => {
      const fullUri = audioDir + file;
      const timestamp = parseInt(file.split('_')[1] || '0', 10) || Date.now();
      const dateObj = new Date(timestamp);
      return {
        local_uri: fullUri,
        user_id: 0,
        id_string: file,            // fallback id before DB sync
        uri: fullUri,
        date: dateObj.toLocaleString(),
        name: t('dashboard.audioRecorderModal.fileLabel', {
          date: dateObj.toLocaleDateString(),
        }),
        created_at: dateObj.toISOString(),
      } as RecordingItem;
    })
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
}

/**
 * Merges local files with DB records. DB entries are authoritative (they carry
 * name, subject_id, etc.). Orphan local files are shown as fallback.
 */
function mergeLocalAndDb(
  localFiles: RecordingItem[],
  dbRecordings: AudioRecording[],
  t: (key: string, opts?: any) => string
): RecordingItem[] {
  const dbByUri = new Map<string, AudioRecording>(dbRecordings.map((r) => [r.local_uri, r]));

  const merged: RecordingItem[] = localFiles.map((local) => {
    const db = dbByUri.get(local.uri);
    if (db) {
      return {
        ...db,
        id_string: db.id?.toString() || db.local_uri,
        uri: db.local_uri,
        date: new Date(db.created_at || Date.now()).toLocaleString(),
        name:
          db.name ||
          t('dashboard.audioRecorderModal.fileLabel', {
            date: new Date(db.created_at || Date.now()).toLocaleDateString(),
          }),
      } as RecordingItem;
    }
    return local; // file exists locally but not in DB yet
  });

  // Also include DB entries whose local file no longer exists (e.g. transferred device)
  // We skip them — they would crash the audio player.

  return merged.sort(
    (a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
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

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadRecordings();
    return () => {
      if (sound) sound.unloadAsync();
      stopTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      startTimer();
    } else {
      stopTimer();
    }
  }, [isRecording, isPaused]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setRecordingDuration((prev) => prev + 1), 1000);
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

  // ── Load recordings ────────────────────────────────────────────────────────
  /**
   * Strategy:
   * 1. IMMEDIATELY show local files so the list is never empty due to network.
   * 2. In the background try to fetch DB records and merge them in (richer metadata).
   * 3. Orphan local files get synced to the DB silently.
   */
  const loadRecordings = useCallback(async () => {
    try {
      // Step 1: Show local files right away
      const localFiles = await readLocalFiles(t);
      if (localFiles.length > 0) {
        setRecordings(localFiles);
      }

      // Step 2: Try to enrich with DB data
      let dbRecordings: AudioRecording[] = [];
      try {
        dbRecordings = await getAudioRecordings();
      } catch (networkErr) {
        console.warn('[useAudioRecorder] Backend unreachable, showing local files only.', networkErr);
        // Local files already shown — nothing more to do
        return;
      }

      // Step 3: Sync orphans to DB (fire-and-forget, don't block UI)
      const dbUris = new Set(dbRecordings.map((r) => r.local_uri));
      for (const local of localFiles) {
        if (!dbUris.has(local.uri)) {
          try {
            const newRecord = await createAudioRecording({
              local_uri: local.uri,
              duration: 0,
              name: local.name || undefined,
              subject_id: null,
            });
            dbRecordings.push(newRecord);
          } catch (syncErr) {
            console.warn('[useAudioRecorder] Failed to sync orphan:', local.uri, syncErr);
          }
        }
      }

      // Step 4: Merge and update UI
      const merged = mergeLocalAndDb(localFiles, dbRecordings, t);
      setRecordings(merged);
    } catch (err) {
      console.error('[useAudioRecorder] loadRecordings error:', err);
    }
  }, [t]);

  // ── Recording controls ────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(t('common.error'), t('dashboard.audioRecorderModal.permissionError'));
        return;
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

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
      const tempUri = recording.getURI();

      if (tempUri) {
        const audioDir = AUDIO_DIR();
        const fileName = `rec_${Date.now()}.m4a`;
        const permanentUri = audioDir + fileName;

        // Make sure directory exists
        const dirInfo = await FileSystem.getInfoAsync(audioDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
        }

        await FileSystem.moveAsync({ from: tempUri, to: permanentUri });

        // Show immediately in the list (optimistic update)
        const now = new Date();
        const defaultName = t('dashboard.audioRecorderModal.fileLabel', {
          date: now.toLocaleDateString(),
        });
        const optimisticItem: RecordingItem = {
          local_uri: permanentUri,
          user_id: 0,
          id_string: fileName,
          uri: permanentUri,
          date: now.toLocaleString(),
          name: defaultName,
          created_at: now.toISOString(),
          duration: currentDuration,
        };
        setRecordings((prev) => [optimisticItem, ...prev]);

        // Persist to DB in background
        try {
          await createAudioRecording({
            local_uri: permanentUri,
            duration: currentDuration,
            name: defaultName,
            subject_id: null,
          });
          // Refresh to get the DB id and any extra metadata
          await loadRecordings();
        } catch (dbErr) {
          console.warn('[useAudioRecorder] Could not save to DB, file kept locally.', dbErr);
        }
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  }

  // ── Playback ───────────────────────────────────────────────────────────────
  async function playSound(uri: string, id: string) {
    try {
      if (sound) await sound.unloadAsync();

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

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function deleteRecording(id: number | string, uri: string) {
    Alert.alert(
      t('dashboard.audioRecorderModal.delete'),
      t('dashboard.audioRecorderModal.deleteConfirm') || '¿Estás seguro?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete') || t('dashboard.audioRecorderModal.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from DB if we have a numeric id
              if (typeof id === 'number') {
                await deleteAudioRecording(id).catch((e) =>
                  console.warn('Could not delete from DB:', e)
                );
              }
              // Remove local file
              const fileInfo = await FileSystem.getInfoAsync(uri);
              if (fileInfo.exists) await FileSystem.deleteAsync(uri);

              // Optimistic removal from list
              setRecordings((prev) =>
                prev.filter((r) => r.uri !== uri && r.id_string !== String(id))
              );
            } catch (error) {
              console.error('Error deleting recording', error);
            }
          },
        },
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
