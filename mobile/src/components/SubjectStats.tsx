import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { subjectDetailStyles as styles } from '../styles/SubjectDetail.styles';
import { SubjectStatCard } from './SubjectStatCard';
import { formatGrade } from '../utils/grades';

interface SubjectStatsProps {
  averageGrade: number;
  projectedGrade: number;
  deliveredText: string;
}

export const SubjectStats: React.FC<SubjectStatsProps> = ({
  averageGrade,
  projectedGrade,
  deliveredText,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>{t('subjects.statsTitle')}</Text>
      <View style={styles.statsGrid}>
        <SubjectStatCard
          icon="calculator-outline"
          label={t('subjects.currentAverage')}
          value={formatGrade(averageGrade)}
          note={t('subjects.gradeScale')}
          color="#2F80ED"
        />
        <SubjectStatCard
          icon="trending-up-outline"
          label={t('subjects.projectedGrade')}
          value={formatGrade(projectedGrade)}
          note={t('subjects.trendNote')}
          color="#34C759"
        />
        <SubjectStatCard
          icon="checkmark-done-outline"
          label={t('subjects.deliveredTasks')}
          value={deliveredText}
          note={t('subjects.deliveredHint')}
          color="#FF9500"
        />
      </View>
    </View>
  );
};
