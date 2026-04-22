import React, { useEffect, useRef } from 'react';
import { Animated, SafeAreaView, Text, View, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { welcomeStyles as styles } from '../src/styles/Welcome.styles';

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(12)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.04,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 4000);

    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
    };
  }, [fade, lift, pulse, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.backgroundOrbTop} />
        <View style={styles.backgroundOrbBottom} />

        <Animated.View style={[styles.topMeta, { opacity: fade }]}>
          <Text style={styles.topMetaText}>{t('welcome.tagline')}</Text>
        </Animated.View>

        <Animated.View
          style={{
            opacity: fade,
            transform: [{ translateY: lift }],
          }}
        >
          <View style={styles.heroCard}>
            <Animated.View style={[styles.logoWrap, { transform: [{ scale: pulse }] }]}>
              <Ionicons name="school" size={38} color="#FFFFFF" />
            </Animated.View>
            <Text style={styles.appName}>Threshold</Text>
            <Text style={styles.subtitle}>
              {t('welcome.description')}
            </Text>
            <View style={styles.accentLine} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.bottomWrap, { opacity: fade }]}>
          <Text style={styles.loadingText}>{t('welcome.preparing')}</Text>
          <View style={styles.dotsRow}>
            <View style={[styles.dot, { opacity: 0.5 }]} />
            <View style={[styles.dot, { opacity: 0.75 }]} />
            <View style={styles.dot} />
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
