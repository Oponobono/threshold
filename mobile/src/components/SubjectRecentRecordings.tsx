import React from 'react';
import { View, Text } from 'react-native';
import { theme } from '../styles/theme';
import { AudioPlayerItem } from './AudioPlayerItem';
import { RecordingItem } from '../hooks/useAudioRecorder';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

interface SubjectRecentRecordingsProps {
  recentRecordings: RecordingItem[];
  playingId: string | null;
  playSound: (uri: string, id: string) => void;
  stopSound: () => void;
  deleteRecording: (id: string | number, uri: string) => void; // Note: receives deleteRecordingConfirmed, not deleteRecording
}

export const SubjectRecentRecordings: React.FC<SubjectRecentRecordingsProps> = ({
  recentRecordings,
  playingId,
  playSound,
  stopSound,
  deleteRecording,
}) => {
  const router = useRouter();
  const { t } = useTranslation();

  if (recentRecordings.length === 0) return null;

  return (
    <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text.primary }}>
          {t('dashboard.audioRecorderModal.recordingsList') || 'Grabaciones Recientes'}
        </Text>
      </View>
      <View style={{ gap: 12 }}>
        {recentRecordings.map(rec => (
          <AudioPlayerItem
            key={rec.id_string}
            item={rec}
            isPlaying={playingId === rec.id_string}
            onPlay={playSound}
            onStop={stopSound}
            onDelete={deleteRecording}
            onPress={() => router.push(`/recordings/${encodeURIComponent(rec.id_string)}` as any)}
          />
        ))}
      </View>
    </View>
  );
};
