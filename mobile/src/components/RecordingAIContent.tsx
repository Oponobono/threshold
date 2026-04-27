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
  isTranscribing: boolean;
  transcription: string | null;
  isSummarizing: boolean;
  summary: string | null;
  onCopy: (text: string | null) => void;
  onStartTranscriptionFlow: () => void;
  onStartSummaryFlow: () => void;
}

export const RecordingAIContent: React.FC<RecordingAIContentProps> = ({
  activeTab,
  screenWidth,
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
          {isTranscribing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>
                {t('dashboard.audioRecorderModal.ai.loading')}
              </Text>
              <Text style={[styles.loadingText, { fontSize: 13, opacity: 0.7, marginTop: 4 }]}>
                Gemini está analizando tu audio…
              </Text>
            </View>
          ) : transcription ? (
            <View style={styles.transcriptionBox}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <Text style={styles.transcriptionText}>{transcription}</Text>
              </ScrollView>
              <TouchableOpacity onPress={() => onCopy(transcription)} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.copyBtnText}>{t('common.copy') || 'Copiar'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.transcriptionBox} onPress={onStartTranscriptionFlow}>
              <Ionicons name="sparkles-outline" size={40} color={theme.colors.primary} />
              <Text style={[styles.transcriptionHint, { fontWeight: '600', color: theme.colors.text.primary, marginTop: 8 }]}>
                {t('dashboard.audioRecorderModal.ai.generateTranscription')}
              </Text>
              <Text style={styles.transcriptionHint}>
                {t('dashboard.audioRecorderModal.ai.transcriptionHint')}
              </Text>
              <View style={{
                marginTop: 12,
                backgroundColor: `${theme.colors.primary}15`,
                borderRadius: 10,
                paddingVertical: 8,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}>
                <MaterialCommunityIcons name="google" size={16} color={theme.colors.primary} />
                <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '600' }}>
                  Powered by Gemini AI
                </Text>
              </View>
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
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
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
              <MaterialCommunityIcons name="auto-fix" size={40} color={theme.colors.primary} />
              <Text style={[styles.transcriptionHint, { fontWeight: '600', color: theme.colors.text.primary, marginTop: 8 }]}>
                {t('dashboard.audioRecorderModal.ai.generateSummary')}
              </Text>
              <Text style={styles.transcriptionHint}>
                {t('dashboard.audioRecorderModal.ai.summaryHint')}
              </Text>
              {!transcription && (
                <Text style={[styles.transcriptionHint, { fontSize: 12, marginTop: 6 }]}>
                  ℹ️ Genera la transcripción primero
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};
