import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const IONICON_NAMES = new Set([
  'book-outline',
  'time-outline',
  'calendar-outline',
  'images-outline',
  'school',
  'grid-outline',
  'clipboard-outline',
  'flask-outline',
  'language-outline',
  'chatbubble-outline',
]);

interface SubjectIconProps {
  iconName?: string | null;
  color: string;
  size?: number;
}

export const SubjectIcon: React.FC<SubjectIconProps> = ({ iconName, color, size = 26 }) => {
  const name = iconName || 'book-outline';
  if (IONICON_NAMES.has(name)) {
    return <Ionicons name={name as any} size={size} color={color} />;
  }
  return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
};
