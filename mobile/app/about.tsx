import React from 'react';
import {
  View, Text, ScrollView, SafeAreaView, TouchableOpacity,
  StyleSheet, Image, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../src/styles/theme';
import { DragonflyIcon } from '../src/components/DragonflyIcon';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── HERO ─────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Botón de cierre flotante en la esquina */}
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>

          {/* Logo Isotipo central */}
          <Image
            source={require('../src/images/logos_mapuvia/isotipo_mapuvia.png')}
            style={styles.heroIsotipo}
            resizeMode="contain"
          />
          <Text style={styles.heroLabel}>un producto de</Text>
          <Image
            source={require('../src/images/logos_mapuvia/logotipo_mapuvia_labs.png')}
            style={styles.heroLogoLabs}
            resizeMode="contain"
          />
        </View>

        {/* ── THRESHOLD CARD ───────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <DragonflyIcon size={30} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Threshold</Text>
          </View>
          <Text style={styles.cardBody}>
            Diseñada íntegramente por MAPUVIA Labs, <Text style={styles.accent}>Threshold</Text> nace
            para eliminar la fragmentación en la vida académica del estudiante. Calificaciones,
            horarios y apuntes en un solo lugar, siempre a la mano.
          </Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}><Text style={styles.pillText}>Gestión académica</Text></View>
            <View style={styles.pill}><Text style={styles.pillText}>v1.0</Text></View>
          </View>
        </View>

        {/* ── DRAGONFLY MEANING ────────────────────────────────── */}
        <View style={[styles.card, styles.cardAccent]}>
          <Text style={styles.cardEyebrow}>El símbolo</Text>
          <Text style={styles.cardTitleLg}>La Libélula</Text>
          <Text style={styles.cardBody}>
            Elegida por MAPUVIA Labs como emblema de Threshold, la{' '}
            <Text style={styles.accent}>libélula</Text> representa agilidad, precisión y visión
            panorámica de 360°. Así como este insecto percibe su entorno completo de un solo vistazo,
            Threshold le otorga al estudiante una perspectiva integral de su progreso académico,
            permitiéndole adaptarse y avanzar sin fricciones.
          </Text>
        </View>

        {/* ── MAPUVIA LABS CARD ─────────────────────────────────── */}
        <View style={styles.card}>
          <Image
            source={require('../src/images/logos_mapuvia/logotipo_mapuvia_labs.png')}
            style={styles.inlineLogoLabs}
            resizeMode="contain"
          />
          <Text style={styles.cardBody}>
            Filial de investigación y desarrollo (I+D) de MAPUVIA, MAPUVIA Labs opera como una
            incubadora ágil de productos digitales. Concentra equipos especializados en la creación
            de soluciones disruptivas que transforman ideas vanguardistas en tecnología tangible.
          </Text>
        </View>

        {/* ── MAPUVIA CARD ─────────────────────────────────────── */}
        <View style={[styles.card, { marginBottom: theme.spacing.xxl }]}>
          <Image
            source={require('../src/images/logos_mapuvia/logotipo_mapuvia.png')}
            style={styles.inlineLogoMapuvia}
            resizeMode="contain"
          />
          <Text style={styles.cardBody}>
            Matriz corporativa de innovación tecnológica. MAPUVIA diseña ecosistemas de software
            y servicios digitales que impulsan el desarrollo integral de personas y organizaciones
            en su cotidianidad.
          </Text>
        </View>

        {/* ── FOOTER FIRMA ─────────────────────────────────────── */}
        <View style={styles.footerFirma}>
          <Image
            source={require('../src/images/logos_mapuvia/isotipo_mapuvia.png')}
            style={styles.footerIsotipo}
            resizeMode="contain"
          />
          <Image
            source={require('../src/images/logos_mapuvia/logotipo_mapuvia_labs.png')}
            style={styles.footerLogoLabs}
            resizeMode="contain"
          />
          <Text style={styles.footerYear}>© 2026</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4F4F1',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ── HERO ──────────────────────────────────────────────────────
  hero: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 36,
    paddingHorizontal: 24,
    marginBottom: 12,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIsotipo: {
    width: 64,
    height: 64,
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#AEAEA8',
    marginBottom: 8,
  },
  heroLogoLabs: {
    width: 140,
    height: 28,
  },

  // ── CARDS ─────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardAccent: {
    backgroundColor: '#1A1A1A',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  cardEyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#8A8A72',
    marginBottom: 6,
  },
  cardTitleLg: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F4F4F1',
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6B6B65',
  },
  accent: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  pill: {
    backgroundColor: '#F2F2EF',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 11,
    color: '#8A8A82',
    fontWeight: '500',
  },
  inlineLogoLabs: {
    width: 110,
    height: 22,
    marginBottom: 16,
  },
  inlineLogoMapuvia: {
    width: 130,
    height: 28,
    marginBottom: 16,
  },

  // ── FOOTER FIRMA ──────────────────────────────────────────────
  footerFirma: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
    paddingBottom: 12,
    opacity: 0.45,
  },
  footerIsotipo: {
    width: 16,
    height: 16,
  },
  footerLogoLabs: {
    width: 80,
    height: 16,
  },
  footerYear: {
    fontSize: 10,
    color: '#AEAEAD',
    marginLeft: 4,
  },
});
