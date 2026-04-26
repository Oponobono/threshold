import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, SectionList, Animated, Easing, SafeAreaView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../src/styles/theme';
import { recordingsStyles as styles } from '../src/styles/RecordingsScreen.styles';
import { useAudioRecorder, RecordingItem } from '../src/hooks/useAudioRecorder';
import { AudioPlayerItem } from '../src/components/AudioPlayerItem';
import { globalStyles } from '../src/styles/globalStyles';

export default function RecordingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const {
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
  } = useAudioRecorder();

  useEffect(() => {
    if (isRecording && !isPaused) {
      startPulse();
    } else {
      stopPulse();
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

  const renderRecordingItem = ({ item }: { item: RecordingItem }) => {
    return (
      <AudioPlayerItem
        item={item}
        isPlaying={playingId === (item.id_string || item.id)}
        onPlay={playSound}
        onStop={stopSound}
        onDelete={deleteRecording}
        onPress={() => router.push(`/recordings/${encodeURIComponent(item.id_string || item.id?.toString() || '')}` as any)}
      />
    );
  };

  const groupedRecordings = useMemo(() => {
    const groups: { [key: string]: RecordingItem[] } = {};
    const orphans: RecordingItem[] = [];

    recordings.forEach(rec => {
      if (rec.subject_name) {
        if (!groups[rec.subject_name]) groups[rec.subject_name] = [];
        groups[rec.subject_name].push(rec);
      } else {
        orphans.push(rec);
      }
    });

    const sections = Object.keys(groups).map(title => ({
      title,
      data: groups[title]
    }));

    if (orphans.length > 0) {
      sections.push({ title: 'Sin Materia (Huérfanas)', data: orphans });
    }

    return sections;
  }, [recordings]);

  return (
    <SafeAreaView style={[globalStyles.safeArea, styles.container]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dashboard.audioRecorderModal.recordingsList')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <SectionList
        sections={groupedRecordings}
        keyExtractor={(item) => item.id_string || item.id?.toString() || Math.random().toString()}
        renderItem={renderRecordingItem}
        renderSectionHeader={({ section: { title } }) => (
          <View style={{ backgroundColor: theme.colors.background, paddingVertical: 8, paddingHorizontal: 16 }}>
            <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 16 }}>{title}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="microphone-off" size={64} color={theme.colors.border} />
            <Text style={styles.emptyText}>{t('dashboard.audioRecorderModal.emptyState')}</Text>
          </View>
        }
      />

      <View style={styles.recorderContainer}>
        <View style={styles.timerContainer}>
          <Text style={[styles.timerText, isRecording && { color: theme.colors.text.error }]}>
            {formatDuration(recordingDuration)}
          </Text>
          {isRecording && (
            <Text style={[styles.statusText, isPaused && { color: theme.colors.text.secondary }]}>
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
              style={styles.secondaryRecordBtn}
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
              styles.recordButton,
              { transform: [{ scale: pulseAnim }] },
              isRecording && styles.recordingButtonActive
            ]}>
              <View style={[
                styles.recordButtonInner,
                isRecording && styles.recordingButtonInnerActive
              ]} />
            </Animated.View>
          </TouchableOpacity>

          {isRecording && (
            <View style={{ width: 44 }} />
          )}
        </View>
        
        <Text style={styles.hintText}>
          {isRecording 
            ? t('dashboard.audioRecorderModal.stopRecording') 
            : t('dashboard.audioRecorderModal.startRecording')}
        </Text>
      </View>
    </SafeAreaView>
  );
}
