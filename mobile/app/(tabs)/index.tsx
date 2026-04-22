import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image, Modal, Pressable, TextInput, Alert, FlatList } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { globalStyles } from '../../src/styles/globalStyles';
import { theme } from '../../src/styles/theme';
import { dashboardStyles as styles } from '../../src/styles/Dashboard.styles';
import { createSubject, getCurrentUserProfile, getSubjects, type Subject, type UserProfile } from '../../src/services/api';

const SUBJECT_COLORS = [
  '#E7EDF8', '#DDE7FF', '#EAF4EE', '#FCEFD9', '#F7E9EE', '#ECE8FF',
  '#E3F2FD', '#F2F5D9', '#F3ECE6', '#DDF3F0', '#EDEDED', '#D7E3FC',
  '#CDEAC0', '#FFD6BA', '#FFC8DD', '#CDE7F0', '#E8F0D8', '#E6E2D3',
];
const SUBJECT_ICONS = [
  'book-outline',
  'book-open-variant',
  'notebook-outline',
  'calculator-variant-outline',
  'atom-variant',
  'flask-outline',
  'code-tags',
  'chart-line',
  'abacus',
  'sigma',
  'brain',
  'earth',
  'palette-outline',
  'music-note-outline',
  'scale-balance',
  'gavel',
  'dna',
  'laptop',
  'compass-outline',
  'lightbulb-on-outline',
] as const;

const SUBJECT_LOOP_THRESHOLD = 4;
const SUBJECT_LOOP_MULTIPLIER = 16;
const SUBJECT_CARD_WIDTH = 208;
const SUBJECT_CARD_GAP = 12;

export default function HybridDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isSubjectModalVisible, setIsSubjectModalVisible] = useState(false);
  const [isSavingSubject, setIsSavingSubject] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectProfessor, setSubjectProfessor] = useState('');
  const [subjectTarget, setSubjectTarget] = useState('');
  const [selectedColor, setSelectedColor] = useState(SUBJECT_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState<(typeof SUBJECT_ICONS)[number]>('book-outline');
  const subjectsCarouselRef = useRef<FlatList<any> | null>(null);
  useEffect(() => {
    const loadData = async () => {
      const [userProfile, userSubjects] = await Promise.all([
        getCurrentUserProfile(),
        getSubjects(),
      ]);

      setProfile(userProfile);
      setSubjects(userSubjects || []);
    };

    loadData();
  }, []);

  const fullName = useMemo(() => {
    const first = profile?.name?.trim() || '';
    const last = profile?.lastname?.trim() || '';
    return `${first} ${last}`.trim();
  }, [profile]);

  const nickname = useMemo(() => {
    return profile?.username?.trim() || fullName || '';
  }, [profile?.username, fullName]);

  const greetingByTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greetings.morning');
    if (hour < 18) return t('dashboard.greetings.afternoon');
    return t('dashboard.greetings.evening');
  }, [t]);

  const profileSubtitle = useMemo(() => {
    const nameTag = nickname || t('dashboard.you');
    return t('dashboard.gpaSummary', { gpa: '3.78', name: nameTag });
  }, [nickname, t]);

  const profileAvatarUri = useMemo(() => {
    const displayName = nickname || t('dashboard.defaultUser');
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=EDEEF2&color=111111&bold=true`;
  }, [nickname, t]);

  const shouldUseInfiniteCarousel = subjects.length > SUBJECT_LOOP_THRESHOLD;

  const carouselSubjects = useMemo(() => {
    if (!subjects.length) return [] as Array<Subject & { __key: string }>;

    if (!shouldUseInfiniteCarousel) {
      return subjects.map((subject) => ({
        ...subject,
        __key: `${subject.id}`,
      }));
    }

    const result: Array<Subject & { __key: string }> = [];
    for (let loop = 0; loop < SUBJECT_LOOP_MULTIPLIER; loop += 1) {
      for (const subject of subjects) {
        result.push({
          ...subject,
          __key: `${subject.id}-${loop}`,
        });
      }
    }
    return result;
  }, [subjects, shouldUseInfiniteCarousel]);

  const initialScrollIndex = useMemo(() => {
    if (!shouldUseInfiniteCarousel || !subjects.length) return 0;
    return Math.floor(SUBJECT_LOOP_MULTIPLIER / 2) * subjects.length;
  }, [subjects.length, shouldUseInfiniteCarousel]);

  const normalizeCarouselPosition = (xOffset: number) => {
    if (!shouldUseInfiniteCarousel || !subjectsCarouselRef.current || !subjects.length) return;

    const itemSpan = SUBJECT_CARD_WIDTH + SUBJECT_CARD_GAP;
    const rawIndex = Math.round(xOffset / itemSpan);
    const lowerBoundary = subjects.length * 2;
    const upperBoundary = subjects.length * (SUBJECT_LOOP_MULTIPLIER - 2);

    if (rawIndex <= lowerBoundary || rawIndex >= upperBoundary) {
      const normalizedIndex = ((rawIndex % subjects.length) + subjects.length) % subjects.length;
      const targetIndex = initialScrollIndex + normalizedIndex;
      requestAnimationFrame(() => {
        subjectsCarouselRef.current?.scrollToIndex({ index: targetIndex, animated: false });
      });
    }
  };

  const resetSubjectForm = () => {
    setSubjectName('');
    setSubjectProfessor('');
    setSubjectTarget('');
    setSelectedColor(SUBJECT_COLORS[0]);
    setSelectedIcon('book-outline');
  };

  const handleSaveSubject = async () => {
    if (!subjectName.trim()) {
      Alert.alert(t('common.error'), t('dashboard.newSubject.errors.nameRequired'));
      return;
    }

    try {
      setIsSavingSubject(true);
      const created = await createSubject({
        name: subjectName.trim(),
        professor: subjectProfessor.trim() || undefined,
        color: selectedColor,
        icon: selectedIcon,
        target_grade: subjectTarget ? Number(subjectTarget) : undefined,
      });

      setSubjects((prev) => [...prev, { ...created, avg_score: 0, completion_percent: 0 }]);
      setIsSubjectModalVisible(false);
      resetSubjectForm();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('dashboard.newSubject.errors.createFailed'));
    } finally {
      setIsSavingSubject(false);
    }
  };

  // ----- SUB-COMPONENTS -----
  const SubjectTile = ({ subject }: { subject: Subject }) => {
    const avg = typeof subject.avg_score === 'number' ? subject.avg_score : 0;
    const completion = typeof subject.completion_percent === 'number' ? subject.completion_percent : 0;

    return (
      <View style={styles.subjectTile}>
        <View style={[styles.subjectBadge, { backgroundColor: subject.color || '#CCCCCC' }]}>
          <MaterialCommunityIcons name={(subject.icon as any) || 'book-outline'} size={20} color={theme.colors.text.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.subjectTileName} numberOfLines={1}>{subject.name}</Text>
          <Text style={styles.subjectTileMeta} numberOfLines={1}>
            {subject.professor || t('dashboard.newSubject.noProfessor')}
          </Text>
          <Text style={styles.subjectTileStats}>{t('dashboard.subjectCardAvg', { avg: avg.toFixed(1) })}</Text>
          <Text style={styles.subjectTileStats}>{t('dashboard.subjectCardCompletion', { completion: completion.toFixed(0) })}</Text>
        </View>
      </View>
    );
  };

  const MetricCard = ({ title, value, subtext, icon, color }: any) => (
    <View style={styles.metricCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
      </View>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardSubtext}>{subtext}</Text>
    </View>
  );

  const ActionCircle = ({ title, icon, color }: any) => (
    <TouchableOpacity style={styles.actionItem}>
      <View style={[styles.actionCircle, { backgroundColor: theme.colors.inputBackground }]}>
        <MaterialCommunityIcons name={icon} size={32} color={color} />
      </View>
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );

  const PerformanceRow = ({ rank, name, gpa, icon, iconColor, isYou }: any) => (
    <View style={[styles.perfRow, isYou && styles.perfRowYou]}>
      <Text style={styles.perfRank}>#{rank}</Text>
      <View style={styles.perfUser}>
        <Ionicons name={icon} size={20} color={iconColor} style={{ marginRight: 8 }} />
        <Text style={[styles.perfName, isYou && { fontWeight: 'bold' }]}>{name}</Text>
      </View>
      <Text style={styles.perfGpa}>{t('dashboard.gpa')} {gpa}</Text>
    </View>
  );

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 1. HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>
              {greetingByTime}
              {nickname ? `, ${nickname}` : ''} 👋
            </Text>
            <Text style={styles.greetingSubtext}>{profileSubtitle}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/settings')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.openSettings')}
          >
            <Image 
              source={{ uri: profileAvatarUri }} 
              style={styles.avatar} 
            />
          </TouchableOpacity>
        </View>

        {/* 2. YOUR SUBJECTS */}
        <View style={styles.section}>
          <View style={styles.subjectsHeaderRow}>
            <Text style={styles.sectionTitle}>{t('dashboard.yourSubjects')}</Text>
            <TouchableOpacity style={styles.subjectsAddBtn} onPress={() => setIsSubjectModalVisible(true)}>
              <Ionicons name="add" size={18} color={theme.colors.white} />
            </TouchableOpacity>
          </View>

          {subjects.length === 0 ? (
            <View style={styles.emptySubjectsCard}>
              <Feather name="layout" size={22} color={theme.colors.text.placeholder} />
              <Text style={styles.emptySubjectsText}>{t('dashboard.newSubject.emptyState')}</Text>
            </View>
          ) : (
            <FlatList
              ref={subjectsCarouselRef}
              horizontal
              data={carouselSubjects}
              keyExtractor={(item) => item.__key}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subjectsCarousel}
              renderItem={({ item }) => <SubjectTile subject={item} />}
              ItemSeparatorComponent={() => <View style={{ width: SUBJECT_CARD_GAP }} />}
              initialScrollIndex={initialScrollIndex}
              getItemLayout={(_, index) => ({
                length: SUBJECT_CARD_WIDTH + SUBJECT_CARD_GAP,
                offset: (SUBJECT_CARD_WIDTH + SUBJECT_CARD_GAP) * index,
                index,
              })}
              onMomentumScrollEnd={(event) => normalizeCarouselPosition(event.nativeEvent.contentOffset.x)}
              onScrollToIndexFailed={({ index }) => {
                setTimeout(() => {
                  subjectsCarouselRef.current?.scrollToIndex({ index, animated: false });
                }, 50);
              }}
            />
          )}
        </View>

        {/* 3. QUICK ADD & NEXT CLASS */}
        <View style={styles.section}>
          <View style={styles.quickAddCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.text.primary} style={{ marginRight: 8 }} />
              <Text style={styles.quickAddTitle}>{t('dashboard.quickAdd')}</Text>
            </View>
            <Text style={styles.quickAddDesc}>{t('dashboard.quickAddDesc')}</Text>
            <TouchableOpacity style={styles.quickAddBtn}>
              <Text style={styles.quickAddBtnText}>{t('dashboard.addBtn')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>{t('dashboard.nextClass')}</Text>
          <View style={styles.nextClassCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '20', marginRight: 12 }]}>
                <Ionicons name="calculator-outline" size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.nextClassTitle}>{t('dashboard.calculus')}</Text>
                <Text style={styles.nextClassRoom}>{t('dashboard.room')} 204 • {t('dashboard.classTime')}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.openBtn}>
              <Text style={styles.openBtnText}>{t('dashboard.openBtn')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. ORIGINAL METRICS (2x2) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.overview')}</Text>
          <View style={styles.grid}>
            <MetricCard title={t('dashboard.todaysSchedule')} value="2" subtext={t('dashboard.classes')} icon="calendar-outline" color="#FF9500" />
            <MetricCard title={t('dashboard.nextAssignment')} value={t('dashboard.nextAssignmentMock')} subtext={t('dashboard.tomorrow')} icon="document-text-outline" color="#5856D6" />
          </View>
        </View>

        {/* 5. QUICK ACTIONS (Circular 2x2) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
          <View style={styles.actionsGrid}>
            <ActionCircle title={t('dashboard.studyTimer')} icon="timer-outline" color="#FF9500" />
            <ActionCircle title={t('dashboard.flashcards')} icon="cards-outline" color="#AF52DE" />
            <ActionCircle title={t('dashboard.assignments')} icon="clipboard-text-outline" color="#34C759" />
            <ActionCircle title={t('dashboard.grades')} icon="calculator" color="#5856D6" />
          </View>
        </View>

        {/* 6. PERFORMANCE LEADERBOARD */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>{t('dashboard.performance')}</Text>
            <View style={styles.allChip}><Text style={styles.allChipText}>{t('dashboard.filterAll')}</Text></View>
          </View>
          
          <View style={styles.perfContainer}>
            <PerformanceRow rank="1" name={t('dashboard.top')} gpa="3.92" icon="trophy" iconColor="#FFD700" />
            <PerformanceRow rank="2" name={t('dashboard.peerB')} gpa="3.70" icon="medal" iconColor="#C0C0C0" />
            <PerformanceRow rank="3" name={t('dashboard.peerC')} gpa="3.45" icon="medal" iconColor="#CD7F32" />
            <PerformanceRow rank="7" name={t('dashboard.you')} gpa="2.90" icon="person-circle" iconColor={theme.colors.primary} isYou />
          </View>
        </View>

        <Modal
          visible={isSubjectModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsSubjectModalVisible(false)}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setIsSubjectModalVisible(false)}>
            <Pressable style={styles.sheetContent} onPress={() => null}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{t('dashboard.newSubject.title')}</Text>
              <Text style={styles.sheetSubtitle}>{t('dashboard.newSubject.subtitle')}</Text>

              <Text style={styles.sheetLabel}>{t('dashboard.newSubject.name')}</Text>
              <TextInput
                value={subjectName}
                onChangeText={setSubjectName}
                style={styles.sheetInput}
                placeholder={t('dashboard.newSubject.namePlaceholder')}
                placeholderTextColor={theme.colors.text.placeholder}
              />

              <Text style={styles.sheetLabel}>{t('dashboard.newSubject.professor')}</Text>
              <TextInput
                value={subjectProfessor}
                onChangeText={setSubjectProfessor}
                style={styles.sheetInput}
                placeholder={t('dashboard.newSubject.professorPlaceholder')}
                placeholderTextColor={theme.colors.text.placeholder}
              />

              <Text style={styles.sheetLabel}>{t('dashboard.newSubject.targetGrade')}</Text>
              <TextInput
                value={subjectTarget}
                onChangeText={setSubjectTarget}
                style={styles.sheetInput}
                keyboardType="numeric"
                placeholder={t('dashboard.newSubject.targetGradePlaceholder')}
                placeholderTextColor={theme.colors.text.placeholder}
              />

              <Text style={styles.sheetLabel}>{t('dashboard.newSubject.color')}</Text>
              <View style={styles.optionsRow}>
                {SUBJECT_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>

              <Text style={styles.sheetLabel}>{t('dashboard.newSubject.icon')}</Text>
              <View style={styles.optionsRow}>
                {SUBJECT_ICONS.map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[styles.iconOption, selectedIcon === iconName && styles.iconOptionSelected]}
                    onPress={() => setSelectedIcon(iconName)}
                  >
                    <MaterialCommunityIcons name={iconName} size={18} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setIsSubjectModalVisible(false)}>
                  <Text style={styles.sheetCancelText}>{t('dashboard.newSubject.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sheetSaveBtn, isSavingSubject && { opacity: 0.6 }]}
                  onPress={handleSaveSubject}
                  disabled={isSavingSubject}
                >
                  <Text style={styles.sheetSaveText}>
                    {isSavingSubject ? t('dashboard.newSubject.saving') : t('dashboard.newSubject.save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
}


