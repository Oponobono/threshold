import React from 'react';
import { View, Text } from 'react-native';
import { theme } from '../styles/theme';
import { subjectDetailStyles as styles } from '../styles/SubjectDetail.styles';
import { SubjectIcon } from './SubjectIcon';

interface SubjectHeroCardProps {
  color?: string | null;
  iconName?: string | null;
  title: string;
  subtitle: string;
  meta: string;
}

export const SubjectHeroCard: React.FC<SubjectHeroCardProps> = ({
  color,
  iconName,
  title,
  subtitle,
  meta,
}) => {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroInner}>
        <View style={[styles.heroIcon, { backgroundColor: color || '#DDE7FF' }]}>
          <SubjectIcon iconName={iconName} color={theme.colors.white} />
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.heroSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
          <Text style={styles.heroMeta}>{meta}</Text>
        </View>
      </View>
    </View>
  );
};
