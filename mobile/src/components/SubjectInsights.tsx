import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Assessment } from '../services/api';
import { theme } from '../styles/theme';
import { subjectDetailStyles as styles } from '../styles/SubjectDetail.styles';
import {
  getAssessmentProgress,
  normalizeGrade,
  parseWeight,
  formatGrade,
  SCALE_MAX,
} from '../utils/grades';

const ProgressBar = ({ value, color }: { value: number; color: string }) => (
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} />
  </View>
);

interface SubjectInsightsProps {
  recentAssessments: Assessment[];
}

export const SubjectInsights: React.FC<SubjectInsightsProps> = ({ recentAssessments }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>{t('subjects.insightsTitle')}</Text>
          <Text style={styles.sectionHint}>{t('subjects.insightsHint')}</Text>
        </View>
        <Text style={styles.sectionChip}>{recentAssessments.length} {t('subjects.notes')}</Text>
      </View>

      <View style={styles.insightsCard}>
        {recentAssessments.length > 0 ? (
          recentAssessments.map((assessment) => {
            const progress = getAssessmentProgress(assessment);
            const grade = normalizeGrade(assessment);
            const typeLabel = assessment.type === 'task' 
              ? t('dashboard.quickAddMenu.newTask') 
              : t('subjects.note');
            const weightValue = parseWeight(assessment);
            const weightText = weightValue > 0 ? ` (${weightValue}%)` : '';

            let scoreText = t('subjects.pending');
            if (grade !== null) {
              scoreText = `${formatGrade(grade)} / ${SCALE_MAX}`;
            } else if (assessment.type === 'task') {
              scoreText = assessment.is_completed ? (t('common.done') || 'Completado') : t('subjects.pending');
            }

            return (
              <View key={`${assessment.id ?? assessment.name}-${assessment.date ?? 'no-date'}`} style={styles.insightRow}>
                <View style={styles.insightTopRow}>
                  <View style={styles.insightTextBlock}>
                    <Text style={styles.insightTitle} numberOfLines={1}>{assessment.name}</Text>
                    <Text style={styles.insightMeta} numberOfLines={1}>
                      {typeLabel}{weightText}{assessment.date ? ` · ${assessment.date}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.insightScore}>{scoreText}</Text>
                </View>
                <ProgressBar value={progress} color={progress >= 80 ? '#34C759' : progress >= 60 ? '#FF9500' : '#FF3B30'} />
              </View>
            );
          })
        ) : (
          <View style={styles.emptyStateCard}>
            <Ionicons name="stats-chart-outline" size={24} color={theme.colors.text.secondary} />
            <Text style={styles.emptyStateTitle}>{t('subjects.emptyInsightsTitle')}</Text>
            <Text style={styles.emptyStateText}>{t('subjects.emptyInsightsText')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};
