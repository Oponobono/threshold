import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { subjectDetailStyles as styles } from '../styles/SubjectDetail.styles';
import { SubjectAIContextModal } from './SubjectAIContextModal';
import { RecordingItem } from '../hooks/useAudioRecorder';
import { YouTubeVideo } from '../services/api/types';
import { AIContextItemData } from './AIContextItem';

export interface SubjectAIFabProps {
  subjectName: string;
  recordings?: RecordingItem[];
  photos?: any[];
  documents?: any[];
  videos?: YouTubeVideo[];
  onGenerateFlashcards?: (selectedItems: AIContextItemData[]) => void;
  onAskQuestions?: (selectedItems: AIContextItemData[]) => void;
}

export const SubjectAIFab: React.FC<SubjectAIFabProps> = ({
  subjectName,
  recordings,
  photos = [],
  documents = [],
  videos = [],
  onGenerateFlashcards,
  onAskQuestions,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <>
      <View style={[styles.fabContainer, { bottom: Math.max(24, 24 + insets.bottom - 10) }]}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => setIsModalVisible(true)}>
          <Animated.View style={[styles.fabButton, { transform: [{ scale: pulseAnim }] }]}>
            <MaterialCommunityIcons name="auto-fix" size={28} color={theme.colors.white} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <SubjectAIContextModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        subjectName={subjectName}
        recordings={recordings}
        photos={photos}
        documents={documents}
        videos={videos}
        onGenerateFlashcards={(items) => {
          setIsModalVisible(false);
          onGenerateFlashcards?.(items);
        }}
        onAskQuestions={(items) => {
          setIsModalVisible(false);
          onAskQuestions?.(items);
        }}
      />
    </>
  );
};
