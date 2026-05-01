import React, { useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, StatusBar, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DragonflyIcon } from '../src/components/DragonflyIcon';
import { theme } from '../src/styles/theme';

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Hero parallax: isotipo se aleja al hacer scroll
  const heroScale = scrollY.interpolate({ inputRange: [0, 200], outputRange: [1, 0.8], extrapolate: 'clamp' });
  const heroOpacity = scrollY.interpolate({ inputRange: [0, 180], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── BOTÓN CERRAR flotante ─────────────────────────────── */}
      <TouchableOpacity
        style={[styles.closeBtn, { top: insets.top + 12 }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={20} color={theme.colors.text.secondary} />
      </TouchableOpacity>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── HERO: Presentación de MAPUVIA Labs ─────────────── */}
        {/* ══════════════════════════════════════════════════════ */}
        <LinearGradient
          colors={['#FFFFFF', '#FCFCFB', '#F9F9F7']}
          style={[styles.hero, { paddingTop: insets.top + 72 }]}
        >
          <View style={styles.glowRing} />

          <Animated.View style={{ transform: [{ scale: heroScale }], opacity: heroOpacity, alignItems: 'center' }}>
            <Image
              source={require('../src/images/logos_mapuvia/logotipo_mapuvia_labs.png')}
              style={styles.heroLogoLabs}
              resizeMode="contain"
            />
          </Animated.View>

          <Text style={styles.heroEyebrow}>un producto de</Text>

          <LinearGradient
            colors={['transparent', '#F9F9F7']}
            style={styles.fadeBottom}
            pointerEvents="none"
          />
        </LinearGradient>

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── THRESHOLD ──────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════ */}
        <LinearGradient
          colors={['#F9F9F7', '#F4F4F1', '#EFEFEA']}
          style={styles.section}
        >
          <Text style={styles.sectionEyebrow}>La aplicación</Text>
          <Text style={styles.sectionTitle}>Threshold</Text>
          <Text style={styles.sectionBody}>
            Diseñada íntegramente por MAPUVIA Labs,{' '}
            <Text style={styles.accentGold}>Threshold</Text>{' '}
            nace para eliminar la fragmentación en la vida académica del estudiante. Calificaciones,
            horarios y apuntes en un solo lugar, siempre a la mano.
          </Text>
          
          <View style={styles.specRow}>
            <View style={styles.specItem}>
              <Text style={styles.specValue}>2026</Text>
              <Text style={styles.specLabel}>Lanzamiento</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specItem}>
              <Text style={styles.specValue}>v1.0</Text>
              <Text style={styles.specLabel}>Versión</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specItem}>
              <Text style={styles.specValue}>I+D</Text>
              <Text style={styles.specLabel}>Origen</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── LA LIBÉLULA ────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════ */}
        <LinearGradient
          colors={['#EFEFEA', '#EAEADF', '#E2E2D6']}
          style={styles.section}
        >
          <Text style={styles.sectionEyebrow}>El símbolo</Text>

          <View style={styles.dragonflyStage}>
            <View style={styles.glowGold} />
            <DragonflyIcon size={110} color="#C5A059" />
          </View>

          <Text style={styles.sectionTitleLg}>La Libélula</Text>
          <Text style={styles.sectionBody}>
            Elegida por MAPUVIA Labs como emblema de Threshold, la{' '}
            <Text style={styles.accentGold}>libélula</Text>{' '}
            representa agilidad, precisión y visión panorámica de 360°.
            Así como este insecto percibe su entorno completo de un solo vistazo,
            Threshold le otorga al estudiante una perspectiva integral de su progreso académico,
            permitiéndole adaptarse y avanzar sin fricciones.
          </Text>
        </LinearGradient>

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── MAPUVIA LABS ───────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════ */}
        <LinearGradient
          colors={['#E2E2D6', '#DFE4E8', '#D7DEE4']}
          style={styles.section}
        >
          <Text style={styles.sectionEyebrow}>La filial</Text>
          <Image
            source={require('../src/images/logos_mapuvia/logotipo_mapuvia_labs.png')}
            style={styles.inlineLogo}
            resizeMode="contain"
          />
          <Text style={styles.sectionBody}>
            MAPUVIA Labs es la división de investigación y desarrollo (I+D) de MAPUVIA, enfocada
            exclusivamente en la creación de software científico y académico. Opera como una incubadora 
            especializada en transformar la educación y la investigación en{' '}
            <Text style={styles.accentDark}>tecnología tangible</Text>.
          </Text>
        </LinearGradient>

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── MAPUVIA ────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════ */}
        <LinearGradient
          colors={['#D7DEE4', '#E8ECEF', '#F4F6F8']}
          style={[styles.section, styles.lastSection]}
        >
          <Text style={styles.sectionEyebrow}>La casa matriz</Text>
          <View style={styles.mapuviaHeader}>
            <Image
              source={require('../src/images/logos_mapuvia/logotipo_mapuvia_labs.png')}
              style={styles.mapuviaLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.sectionBody}>
            Matriz corporativa de innovación tecnológica. MAPUVIA se dedica al desarrollo de 
            servicios digitales y software general, creando ecosistemas que impulsan el progreso
            de personas y organizaciones en su cotidianidad.
          </Text>

          <View style={styles.footer}>
            <Image
              source={require('../src/images/logos_mapuvia/logotipo_mapuvia_labs.png')}
              style={styles.footerLogoLabs}
              resizeMode="contain"
            />
            <Text style={styles.footerYear}>© 2026</Text>
          </View>
        </LinearGradient>

      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ── CLOSE BUTTON ──────────────────────────────────────────────
  closeBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 100,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── HERO ──────────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    paddingBottom: 80,
    paddingHorizontal: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  glowRing: {
    position: 'absolute',
    top: 80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(197, 160, 89, 0.08)',
  },
  heroIsotipo: {
    width: 90,
    height: 90,
    marginBottom: 20,
  },
  heroEyebrow: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: '#8A8A8E',
    marginBottom: 10,
  },
  heroLogoLabs: {
    width: 160,
    height: 32,
    opacity: 0.9,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },

  // ── SECTIONS ──────────────────────────────────────────────────
  section: {
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 64,
  },
  lastSection: {
    paddingBottom: 80,
  },
  sectionEyebrow: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: '#8A8A8E',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 52,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -2,
    lineHeight: 54,
    marginBottom: 20,
  },
  sectionTitleLg: {
    fontSize: 44,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -1.5,
    lineHeight: 46,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionBody: {
    fontSize: 16,
    lineHeight: 26,
    color: '#555555',
    textAlign: 'justify',
  },

  // ── ACCENT COLORS ─────────────────────────────────────────────
  accentGold: {
    color: '#C5A059',
    fontWeight: '600',
  },
  accentDark: {
    color: '#1A1A1A',
    fontWeight: '600',
  },

  // ── SPEC ROW (Threshold) ──────────────────────────────────────
  specRow: {
    flexDirection: 'row',
    marginTop: 36,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 24,
  },
  specItem: {
    flex: 1,
    alignItems: 'center',
  },
  specValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  specLabel: {
    fontSize: 11,
    color: '#8A8A8E',
    letterSpacing: 1,
  },
  specDivider: {
    width: 0.5,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },

  // ── DRAGONFLY STAGE ───────────────────────────────────────────
  dragonflyStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
    position: 'relative',
  },
  glowGold: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
  },

  // ── MAPUVIA SECTION ───────────────────────────────────────────
  mapuviaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  mapuviaIsotipo: {
    width: 28,
    height: 28,
    opacity: 0.85,
  },
  mapuviaLogo: {
    width: 130,
    height: 26,
    opacity: 0.85,
  },
  inlineLogo: {
    width: 130,
    height: 26,
    marginBottom: 20,
    opacity: 0.85,
  },

  // ── FOOTER ────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 56,
    opacity: 0.8,
  },
  footerIsotipo: {
    width: 14,
    height: 14,
  },
  footerLogoLabs: {
    width: 80,
    height: 14,
  },
  footerYear: {
    fontSize: 10,
    color: '#8A8A8E',
    marginLeft: 4,
  },
});
