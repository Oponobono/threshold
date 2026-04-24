import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { theme } from '../styles/theme';
import { DragonflyIcon } from './DragonflyIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { dashboardStyles as styles } from '../styles/Dashboard.styles';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface StudyTimerCardProps {
  onOpenConfig: () => void;
  onFinish: (duration: number, subjectId: number | null) => void;
  refreshTrigger?: number;
}

const TIMER_STORAGE_KEY = '@threshold_timer_state';

export const StudyTimerCard: React.FC<StudyTimerCardProps> = ({ onOpenConfig, onFinish, refreshTrigger }) => {
  const { t } = useTranslation();
  
  // State
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'pomodoro' | 'threshold'>('pomodoro');
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Animations
  const wingOpacity = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const breathingAnim = useRef<Animated.CompositeAnimation | null>(null);

  const radius = 32;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    loadTimerState();
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [refreshTrigger]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && !isPaused) {
      startBreathing();
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (mode === 'pomodoro') {
            if (prev <= 1) {
              handleTimerComplete();
              return 0;
            }
            return prev - 1;
          } else {
            // Threshold mode is progressive
            if (prev >= 45 * 60 && prev % (45 * 60) === 0) {
              // Notification for break every 45 mins? 
              // Handled by threshold logic
            }
            return prev + 1;
          }
        });
      }, 1000);
    } else {
      stopBreathing();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, mode]);

  useEffect(() => {
    const progress = mode === 'pomodoro' 
      ? 1 - (remainingSeconds / totalSeconds)
      : (remainingSeconds % (45 * 60)) / (45 * 60);
    
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [remainingSeconds, totalSeconds, mode]);

  const loadTimerState = async () => {
    try {
      const stateJson = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
      if (stateJson) {
        const state = JSON.parse(stateJson);
        if (state.isActive && !state.isPaused) {
          const now = Date.now();
          const elapsedSinceSync = Math.floor((now - state.lastSyncTime) / 1000);
          
          if (state.mode === 'pomodoro') {
            const newRemaining = Math.max(0, state.remainingSeconds - elapsedSinceSync);
            setRemainingSeconds(newRemaining);
            if (newRemaining === 0) {
              // Timer finished while app was closed
              handleTimerComplete();
            }
          } else {
            setRemainingSeconds(state.remainingSeconds + elapsedSinceSync);
          }
        } else {
          setRemainingSeconds(state.remainingSeconds);
        }
        setIsActive(state.isActive);
        setMode(state.mode);
        setTotalSeconds(state.totalSeconds);
        setSubjectId(state.subjectId);
        setIsPaused(state.isPaused);
      }
    } catch (e) {
      console.warn('Error loading timer state', e);
    }
  };

  const saveTimerState = async () => {
    const state = {
      isActive,
      isPaused,
      mode,
      totalSeconds,
      remainingSeconds,
      subjectId,
      lastSyncTime: Date.now(),
    };
    await AsyncStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      saveTimerState();
    } else if (nextAppState === 'active') {
      loadTimerState();
    }
  };

  const startBreathing = () => {
    breathingAnim.current = Animated.loop(
      Animated.sequence([
        Animated.timing(wingOpacity, {
          toValue: 0.3,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(wingOpacity, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    breathingAnim.current.start();
  };

  const stopBreathing = () => {
    if (breathingAnim.current) {
      breathingAnim.current.stop();
    }
    wingOpacity.setValue(1);
  };

  const handleTimerComplete = async () => {
    setIsActive(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onFinish(totalSeconds - remainingSeconds, subjectId);
    await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <TouchableOpacity 
      style={localStyles.container} 
      activeOpacity={0.9}
      onPress={isActive ? undefined : onOpenConfig}
    >
      <View style={localStyles.header}>
        <Text style={localStyles.title}>{t('dashboard.studyTimer')}</Text>
        <MaterialCommunityIcons 
          name={mode === 'pomodoro' ? 'timer-sand' : 'trending-up'} 
          size={16} 
          color={theme.colors.text.secondary} 
        />
      </View>

      <View style={localStyles.content}>
        <View style={localStyles.visualContainer}>
          <Svg width="80" height="80" viewBox="0 0 80 80" style={localStyles.svg}>
            <Circle
              cx="40"
              cy="40"
              r={radius}
              stroke={theme.colors.border + '40'}
              strokeWidth="3"
              fill="transparent"
            />
            <AnimatedCircle
              cx="40"
              cy="40"
              r={radius}
              stroke={theme.colors.primary}
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              transform="rotate(-90 40 40)"
            />
          </Svg>
          <View style={localStyles.iconContainer}>
            <DragonflyIcon size={32} color={theme.colors.primary} wingOpacity={wingOpacity} />
          </View>
        </View>

        <View style={localStyles.infoContainer}>
          <Text style={localStyles.timeText}>{formatTime(remainingSeconds)}</Text>
          {isActive ? (
            <TouchableOpacity style={localStyles.controlBtn} onPress={togglePause}>
              <Ionicons name={isPaused ? "play" : "pause"} size={20} color="#D4AF37" />
            </TouchableOpacity>
          ) : (
            <Text style={localStyles.startText}>{t('dashboard.startBtn')}</Text>
          )}
        </View>
      </View>
      
      {isActive && subjectId && (
        <View style={localStyles.footer}>
          <View style={[localStyles.dot, { backgroundColor: '#FFD700' }]} />
          <Text style={localStyles.subjectName} numberOfLines={1}>Sesión activa</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const globalStyles = {
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  }
};

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...globalStyles.shadow,
    minHeight: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visualContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  startText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '500',
    marginTop: 4,
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: theme.colors.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  subjectName: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
});
