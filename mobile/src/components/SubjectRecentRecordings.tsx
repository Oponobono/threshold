import React from 'react';
import { View, Text } from 'react-native';
import { subjectDetailStyles as styles } from '../styles/SubjectDetail.styles';
import { AudioPlayerItem } from './AudioPlayerItem';
import { RecordingItem } from '../hooks/useAudioRecorder';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

interface SubjectRecentRecordingsProps {
  recentRecordings: RecordingItem[];
  playingId: string | null;
  playSound: (uri: string, id: string) => void;
  stopSound: () => void;
  deleteRecording: (id: string | number, uri: string) => void;
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
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>
            {t('dashboard.audioRecorderModal.recordingsList') || 'Grabaciones Recientes'}
          </Text>
          <Text style={styles.sectionHint}>
            {t('dashboard.audioRecorderModal.recordings') || 'Audios recientes de esta materia'}
          </Text>
        </View>
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
