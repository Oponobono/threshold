import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Image, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { globalStyles } from '../../src/styles/globalStyles';
import { theme } from '../../src/styles/theme';
import { galleryStyles as styles } from '../../src/styles/Gallery.styles';

// ─── Main Screen ───────────────────────────────────────────────
export default function GalleryScreen() {
  const { t } = useTranslation();
  const STARRED = [
    { id: 's1', subject: t('gallery.sample.star1Subject'), date: t('gallery.sample.star1Date'), uri: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=300&auto=format&fit=crop' },
    { id: 's2', subject: t('gallery.sample.star2Subject'), date: t('gallery.sample.star2Date'), uri: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=300&auto=format&fit=crop' },
    { id: 's3', subject: t('gallery.sample.star3Subject'), date: t('gallery.sample.star3Date'), uri: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=300&auto=format&fit=crop' },
  ];

  const GALLERY_ITEMS = [
    {
      id: 'g1',
      uri: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&auto=format&fit=crop',
      subject: t('gallery.sample.g1Subject'), date: t('gallery.sample.g1Date'), time: t('gallery.sample.g1Time'),
      ocr: t('gallery.sample.g1Ocr'),
    },
    {
      id: 'g2',
      uri: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&auto=format&fit=crop',
      subject: t('gallery.sample.g2Subject'), date: t('gallery.sample.g2Date'), time: t('gallery.sample.g2Time'),
      ocr: t('gallery.sample.g2Ocr'),
    },
    {
      id: 'g3',
      uri: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&auto=format&fit=crop',
      subject: t('gallery.sample.g3Subject'), date: t('gallery.sample.g3Date'), time: t('gallery.sample.g3Time'),
      ocr: t('gallery.sample.g3Ocr'),
    },
    {
      id: 'g4',
      uri: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&auto=format&fit=crop',
      subject: t('gallery.sample.g4Subject'), date: t('gallery.sample.g4Date'), time: t('gallery.sample.g4Time'),
      ocr: t('gallery.sample.g4Ocr'),
    },
  ];
  const [filterTab, setFilterTab] = useState<'subject' | 'date'>('subject');
  const [autoCrop, setAutoCrop] = useState(true);
  const [starred, setStarred] = useState<string[]>(['s1', 's2', 's3']);

  const toggleStar = (id: string) => {
    setStarred(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={globalStyles.safeArea}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={globalStyles.row}>
          <Ionicons name="school" size={20} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.logoText}>Threshold</Text>
        </View>
        <View style={globalStyles.row}>
          <TouchableOpacity style={styles.scanBtn}>
            <Ionicons name="scan-outline" size={16} color={theme.colors.text.primary} style={{ marginRight: 4 }} />
            <Text style={styles.scanText}>{t('gallery.scan')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginLeft: 10 }}>
            <Feather name="more-vertical" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── FILTER TABS ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, filterTab === 'subject' && styles.tabActive]}
          onPress={() => setFilterTab('subject')}
        >
          <Text style={[styles.tabText, filterTab === 'subject' && styles.tabTextActive]}>
            {t('gallery.bySubject')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filterTab === 'date' && styles.tabActive]}
          onPress={() => setFilterTab('date')}
        >
          <Text style={[styles.tabText, filterTab === 'date' && styles.tabTextActive]}>
            {t('gallery.byDate')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.itemCount}>{GALLERY_ITEMS.length} {t('gallery.items')}</Text>
      </View>

      {/* ── AUTO-CROP SETTINGS BAR ── */}
      <View style={styles.settingsBar}>
        <View style={styles.settingsLeft}>
          <View style={styles.settingsThumb} />
          <View>
            <Text style={styles.settingsTitle}>{t('gallery.autoCrop')}</Text>
            <Text style={styles.settingsSubtitle}>{t('gallery.contrast')}</Text>
          </View>
        </View>
        <View style={globalStyles.row}>
          <Switch
            value={autoCrop}
            onValueChange={setAutoCrop}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.white}
            style={{ transform: [{ scale: 0.8 }] }}
          />
          <TouchableOpacity style={styles.ocrBtn}>
            <Text style={styles.ocrBtnText}>{t('gallery.ocr')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── STARRED ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('gallery.starred')}</Text>
            <Text style={styles.sectionMeta}>{starred.length} {t('gallery.favorites')}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.starredRow}>
            {STARRED.map(item => (
              <View key={item.id} style={styles.starredCard}>
                <Image source={{ uri: item.uri }} style={styles.starredImage} />
                <Text style={styles.starredSubject}>{item.subject}</Text>
                <Text style={styles.starredDate}>{item.date}</Text>
                <TouchableOpacity style={styles.starBtn} onPress={() => toggleStar(item.id)}>
                  <Ionicons
                    name={starred.includes(item.id) ? 'star' : 'star-outline'}
                    size={16}
                    color={starred.includes(item.id) ? '#FFD700' : theme.colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── GALLERY GRID ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('gallery.gallerySection')}</Text>
            <Text style={styles.sectionMeta}>{t('gallery.grouped')}</Text>
          </View>

          <View style={styles.gridContainer}>
            {GALLERY_ITEMS.map(item => (
              <TouchableOpacity key={item.id} activeOpacity={0.9} style={styles.gridCard}>
                <Image source={{ uri: item.uri }} style={styles.gridImage} />
                {/* OCR overlay chip */}
                <View style={styles.ocrOverlay}>
                  <MaterialCommunityIcons name="text-recognition" size={10} color={theme.colors.primary} />
                  <Text style={styles.ocrOverlayText}>OCR</Text>
                </View>
                <View style={styles.gridInfo}>
                  <Text style={styles.gridSubject}>{t('gallery.subject')} {item.subject}</Text>
                  <Text style={styles.gridDate}>{item.date} • {item.time}</Text>
                  <Text style={styles.gridOcr} numberOfLines={2}>
                    {t('gallery.ocrSnippet')} {item.ocr}
                  </Text>
                  <TouchableOpacity style={styles.attachBtn}>
                    <Text style={styles.attachBtnText}>{t('gallery.attach')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── SWIPE HINT ── */}
        <View style={styles.hintRow}>
          <Ionicons name="swap-horizontal-outline" size={14} color={theme.colors.text.secondary} />
          <Text style={styles.hintText}>{t('gallery.swipeHint')}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}


