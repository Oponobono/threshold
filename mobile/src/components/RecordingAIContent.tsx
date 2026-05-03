import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Animated, Pressable } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { detailStyles } from '../styles/RecordingDetailScreen.styles';
import { useTranslation } from 'react-i18next';
import { AITabType } from './RecordingAITabs';

interface RecordingAIContentProps {
  activeTab: AITabType;
  onTabPress: (tab: AITabType) => void;
  screenWidth: number;
  isTranscribing: boolean;
  transcription: string | null;
  isSummarizing: boolean;
  summary: string | null;
  onCopy: (text: string | null) => void;
  onStartTranscriptionFlow: () => void;
  onStartSummaryFlow: () => void;
}

const AnimatedRegenerateButton = ({ count, onRegenerate }: { count: number, onRegenerate: () => void }) => {
  const fillAnim = useRef(new Animated.Value(0)).current;
  
  const handlePressIn = () => {
    if (count <= 0) return;
    Animated.timing(fillAnim, {
      toValue: 1,
      duration: 1500, // 1.5 segundos para llenarse y activar
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        onRegenerate();
        Animated.timing(fillAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      }
    });
  };

  const handlePressOut = () => {
    if (count <= 0) return;
    Animated.timing(fillAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const widthInterpolation = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  const isDisabled = count <= 0;

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isDisabled ? theme.colors.border : theme.colors.primary,
        backgroundColor: isDisabled ? theme.colors.background : 'transparent',
        overflow: 'hidden',
        opacity: isDisabled ? 0.6 : 1
      }}
    >
      <Animated.View style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: widthInterpolation,
        backgroundColor: `${theme.colors.primary}40`,
      }} />
      <Ionicons name="refresh-outline" size={16} color={isDisabled ? theme.colors.text.placeholder : theme.colors.primary} />
      <Text style={{ 
        marginLeft: 6, 
        fontSize: 13, 
        fontWeight: '600', 
        color: isDisabled ? theme.colors.text.placeholder : theme.colors.primary 
      }}>
        Regenerar (x{count})
      </Text>
    </Pressable>
  );
};

export const RecordingAIContent: React.FC<RecordingAIContentProps> = ({
  activeTab,
  onTabPress,
  isTranscribing,
  isSummarizing,
  transcription,
  summary,
  onCopy,
  onStartTranscriptionFlow,
  onStartSummaryFlow,
}) => {
  const { t } = useTranslation();
  const [regenerateCount, setRegenerateCount] = useState(1);
  
  const canGenerateSummary = activeTab === 'summary' && !transcription;

  const renderContent = () => {
    if (activeTab === 'transcription') {
      if (transcription) {
        return (
          <View>
            <Markdown style={markdownStyles}>
              {transcription}
            </Markdown>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <AnimatedRegenerateButton 
                 count={regenerateCount} 
                 onRegenerate={() => {
                   setRegenerateCount(0);
                   onStartTranscriptionFlow();
                 }} 
              />
              <TouchableOpacity
                onPress={() => onCopy(transcription)}
                style={[detailStyles.copyBtn, { marginTop: 0, alignSelf: 'auto', paddingVertical: 8 }]}
              >
                <Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
                <Text style={detailStyles.copyBtnText}>
                  {t('common.copy', { defaultValue: 'Copiar' }) === 'common.copy' ? 'Copiar' : t('common.copy', { defaultValue: 'Copiar' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }
      
      if (isTranscribing) {
        return (
          <View style={localStyles.centerContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[detailStyles.loadingText, { marginTop: 12 }]}>
              {t('dashboard.audioRecorderModal.ai.loading') || 'Procesando...'}
            </Text>
          </View>
        );
      }

      return (
        <View style={localStyles.centerContent}>
          <TouchableOpacity 
            onPress={onStartTranscriptionFlow} 
            style={localStyles.actionButton}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="text-recognition" size={24} color="white" />
            <Text style={localStyles.actionButtonText}>{t('recordings.startTranscription', 'Iniciar transcripción')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Summary Tab
    if (summary) {
      return (
        <View>
          <Markdown style={markdownStyles}>
            {summary}
          </Markdown>
          <TouchableOpacity
            onPress={() => onCopy(summary)}
            style={[detailStyles.copyBtn, { marginTop: 16, alignSelf: 'flex-end' }]}
          >
            <Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
            <Text style={detailStyles.copyBtnText}>
              {t('common.copy', { defaultValue: 'Copiar' }) === 'common.copy' ? 'Copiar' : t('common.copy', { defaultValue: 'Copiar' })}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isSummarizing) {
      return (
        <View style={localStyles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[detailStyles.loadingText, { marginTop: 12 }]}>
            {t('dashboard.audioRecorderModal.ai.loading') || 'Procesando...'}
          </Text>
        </View>
      );
    }

    if (canGenerateSummary) {
      return (
        <View style={localStyles.centerContent}>
          <Ionicons name="information-circle-outline" size={36} color={theme.colors.text.placeholder} />
          <Text style={[detailStyles.transcriptionHint, { marginTop: 12, textAlign: 'center' }]}>
            {t('dashboard.audioRecorderModal.ai.summaryHint') || 'Primero genera la transcripción para poder crear un resumen.'}
          </Text>
        </View>
      );
    }

    return (
      <View style={localStyles.centerContent}>
        <TouchableOpacity 
          onPress={onStartSummaryFlow} 
          style={localStyles.actionButton}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="white" />
          <Text style={localStyles.actionButtonText}>{t('recordings.startSummary', 'Iniciar resumen')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ marginTop: 12 }}>
      {/* ── Unified Header Bar ─────────────────────────────── */}
      <View style={localStyles.headerBar}>
        <View style={localStyles.headerTitleContainer}>
          <Text style={localStyles.headerTitle}>
            {activeTab === 'transcription' ? t('dashboard.audioRecorderModal.tabs.transcription', 'Transcripción') : t('dashboard.audioRecorderModal.tabs.summary', 'Resumen IA')}
          </Text>
        </View>

        {/* Tab toggles */}
        <TouchableOpacity
          onPress={() => onTabPress('transcription')}
          style={[
            localStyles.tabToggle,
            activeTab === 'transcription' && localStyles.tabToggleActive
          ]}
        >
          <Ionicons
            name="text-outline"
            size={22}
            color={activeTab === 'transcription' ? theme.colors.primary : theme.colors.text.secondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onTabPress('summary')}
          style={[
            localStyles.tabToggle,
            { borderRightWidth: 0 },
            activeTab === 'summary' && localStyles.tabToggleActive
          ]}
        >
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={22}
            color={activeTab === 'summary' ? theme.colors.primary : theme.colors.text.secondary}
          />
        </TouchableOpacity>
      </View>

      {/* ── Content Card ────────────────────────────────────── */}
      <View style={detailStyles.aiCard}>
        {renderContent()}
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  headerTitleContainer: {
    flex: 1,
    paddingLeft: 16,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  headerTitle: {
    color: theme.colors.text.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  tabToggle: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  tabToggleActive: {
    backgroundColor: `${theme.colors.primary}15`,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    minHeight: 120,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 15,
    color: theme.colors.text.primary,
    lineHeight: 24,
  },
  heading1: { fontSize: 20, fontWeight: '700', color: theme.colors.primary, marginTop: 16, marginBottom: 8 },
  heading2: { fontSize: 18, fontWeight: '700', color: theme.colors.primary, marginTop: 16, marginBottom: 8 },
  heading3: { fontSize: 16, fontWeight: '700', color: theme.colors.primary, marginTop: 16, marginBottom: 8 },
  paragraph: { marginBottom: 12 },
  list_item: { marginBottom: 6 },
  bullet_list: { marginTop: 4, marginBottom: 12 },
  strong: { fontWeight: 'bold', color: theme.colors.text.primary },
});
