import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { subjectDetailStyles as styles } from '../styles/SubjectDetail.styles';
import { theme } from '../styles/theme';

interface SubjectThresholdProps {
  securedPercent: number;
  finalNeededText: string;
  subjectColor?: string;
}

export const SubjectThreshold: React.FC<SubjectThresholdProps> = ({
  securedPercent,
  finalNeededText,
  subjectColor,
}) => {
  const { t } = useTranslation();
  const activeColor = subjectColor || theme.colors.primary;

  return (
    <View style={styles.thresholdCard}>
      <View style={styles.thresholdHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.thresholdTitle}>{t('subjects.thresholdTitle')}</Text>
          <Text style={styles.thresholdSubtitle}>{t('subjects.thresholdSubtitle')}</Text>
        </View>
        <View style={[styles.thresholdBadge, { backgroundColor: subjectColor || '#E7EDF8' }]}> 
          <Text style={styles.thresholdBadgeText}>{Math.round(securedPercent)}%</Text>
        </View>
      </View>

      <Text style={styles.thresholdNeed}>{finalNeededText}</Text>
      <Text style={styles.thresholdHint}>{t('subjects.thresholdHint', { percent: Math.round(securedPercent) })}</Text>

      <View style={styles.thresholdTrackWrap}>
        <View style={styles.thresholdTrack}>
          <View style={[styles.thresholdFill, { width: `${securedPercent}%`, backgroundColor: activeColor }]} />
        </View>
        <View style={styles.thresholdMetaRow}>
          <Text style={styles.thresholdMetaLabel}>{t('subjects.secured')}</Text>
          <Text style={styles.thresholdMetaValue}>{Math.round(securedPercent)}%</Text>
        </View>
      </View>
    </View>
  );
};
