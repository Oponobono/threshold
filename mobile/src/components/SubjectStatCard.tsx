import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subjectDetailStyles as styles } from '../styles/SubjectDetail.styles';

interface SubjectStatCardProps {
  icon: string;
  label: string;
  value: string;
  note: string;
  color: string;
}

export const SubjectStatCard: React.FC<SubjectStatCardProps> = ({
  icon,
  label,
  value,
  note,
  color,
}) => {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon as any} size={16} color={color} />
        </View>
        <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statNote} numberOfLines={2}>{note}</Text>
    </View>
  );
};
