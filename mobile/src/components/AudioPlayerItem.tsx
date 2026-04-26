import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { audioRecorderStyles as styles } from '../styles/AudioRecorderModal.styles';
import { RecordingItem } from '../hooks/useAudioRecorder';

interface AudioPlayerItemProps {
  item: RecordingItem;
  isPlaying: boolean;
  onPlay: (uri: string, id: string) => void;
  onStop: () => void;
  onDelete: (id: string | number, uri: string) => void;
  onPress?: () => void;
}

export const AudioPlayerItem: React.FC<AudioPlayerItemProps> = ({
  item,
  isPlaying,
  onPlay,
  onStop,
  onDelete,
  onPress,
}) => {
  return (
    <TouchableOpacity 
      style={styles.recordingItem} 
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
    >
      <View style={styles.recordingInfo}>
        <Text style={styles.recordingName}>{item.name}</Text>
        <Text style={styles.recordingDate}>{item.date}</Text>
        {item.subject_name && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <View style={{ 
              width: 8, 
              height: 8, 
              borderRadius: 4, 
              backgroundColor: item.subject_color || theme.colors.primary, 
              marginRight: 6 
            }} />
            <Text style={{ fontSize: 12, color: theme.colors.text.secondary }}>{item.subject_name}</Text>
          </View>
        )}
      </View>
      <View style={styles.recordingActions}>
        <TouchableOpacity 
          onPress={() => isPlaying ? onStop() : onPlay(item.uri, item.id_string || item.id?.toString() || '')}
          style={styles.actionButton}
        >
          <Ionicons 
            name={isPlaying ? "pause-circle" : "play-circle"} 
            size={32} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => onDelete(item.id_string || item.id || 0, item.uri)}
          style={styles.actionButton}
        >
          <Ionicons name="trash-outline" size={24} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};
