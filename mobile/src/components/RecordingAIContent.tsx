import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { detailStyles as styles } from '../styles/RecordingDetailScreen.styles';
import { useTranslation } from 'react-i18next';
import { AITabType } from './RecordingAITabs';

interface RecordingAIContentProps {
  activeTab: AITabType;
  screenWidth: number;
  // Transcription state
  isDownloading: boolean;
  downloadProgress: number;
  isTranscribing: boolean;
  transcription: string | null;
  // Summary state
  isSummarizing: boolean;
  summary: string | null;
  // Callbacks
  onCopy: (text: string | null) => void;
  onStartTranscriptionFlow: () => void;
  onStartSummaryFlow: () => void;
}

export const RecordingAIContent: React.FC<RecordingAIContentProps> = ({
  activeTab,
  screenWidth,
  isDownloading,
  downloadProgress,
  isTranscribing,
  transcription,
  isSummarizing,
  summary,
  onCopy,
  onStartTranscriptionFlow,
  onStartSummaryFlow,
}) => {
  const { t } = useTranslation();

  return (
    <View style={{ marginTop: 10 }}>
      {activeTab === 'transcription' ? (
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
              <TouchableOpacity onPress={() => onCopy(transcription)} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.copyBtnText}>{t('common.copy') || 'Copiar'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.transcriptionBox} onPress={onStartTranscriptionFlow}>
              <Ionicons name="mic-outline" size={40} color={theme.colors.text.secondary} />
              <Text style={styles.transcriptionHint}>{t('dashboard.audioRecorderModal.ai.generateTranscription')}</Text>
              <Text style={styles.transcriptionHint}>{t('dashboard.audioRecorderModal.ai.transcriptionHint')}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.aiCard}> 
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
              <TouchableOpacity onPress={() => onCopy(summary)} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.copyBtnText}>{t('common.copy') || 'Copiar'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.transcriptionBox, !transcription && { opacity: 0.5 }]} 
              onPress={onStartSummaryFlow}
              disabled={!transcription}
            >
              <MaterialCommunityIcons name="auto-fix" size={40} color={theme.colors.text.secondary} />
              <Text style={styles.transcriptionHint}>{t('dashboard.audioRecorderModal.ai.generateSummary')}</Text>
              <Text style={styles.transcriptionHint}>{t('dashboard.audioRecorderModal.ai.summaryHint')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};
