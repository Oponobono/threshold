import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { globalStyles } from '../../src/styles/globalStyles';
import { theme } from '../../src/styles/theme';
import {
  getAssessments,
  getSubjectById,
  getPhotosBySubject,
  createPhoto,
  getCurrentUserProfile,
  getSchedulesBySubject,
  type Assessment,
  type Subject,
  type UserProfile,
} from '../../src/services/api';
import { useCameraPermissions, CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
const SCREEN_WIDTH = Dimensions.get('window').width;

type GalleryItem = {
  id?: number;
  uri?: string | null;
  subject?: string | null;
  date?: string | null;
  time?: string | null;
  ocr_text?: string | null;
};

type DetailSubject = Subject & {
  avg_score?: number | null;
  completion_percent?: number | null;
};

const SCALE_MAX = 5;
const GALLERY_PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&auto=format&fit=crop',
];
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

const parseDate = (value?: string | null) => {
  if (!value) return 0;
  const parts = value.split(/[-/]/).map(Number);
  if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
    const [first, second, third] = parts;
    const isDdMmYyyy = first > 12 || second > 12;
    const day = isDdMmYyyy ? first : third;
    const month = isDdMmYyyy ? second : first;
    const year = isDdMmYyyy ? third : second;
    const candidate = new Date(year, month - 1, day);
    if (!Number.isNaN(candidate.getTime())) return candidate.getTime();
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? 0 : fallback.getTime();
};

const parseWeight = (assessment: Assessment) => {
  if (typeof assessment.percentage === 'number') return assessment.percentage;
  if (!assessment.weight) return 0;
  const cleaned = assessment.weight.replace('%', '').trim();
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric <= 1) return numeric * 100;
  return numeric;
};

const normalizeGrade = (assessment: Assessment) => {
  if (typeof assessment.grade_value === 'number') return assessment.grade_value;
  if (typeof assessment.score === 'number' && typeof assessment.out_of === 'number' && assessment.out_of > 0) {
    return (assessment.score / assessment.out_of) * SCALE_MAX;
  }
  return null;
};

const getAssessmentProgress = (assessment: Assessment) => {
  if (typeof assessment.score === 'number' && typeof assessment.out_of === 'number' && assessment.out_of > 0) {
    return (assessment.score / assessment.out_of) * 100;
  }
  if (typeof assessment.grade_value === 'number') return (assessment.grade_value / SCALE_MAX) * 100;
  return 0;
};

const formatGrade = (value: number) => value.toFixed(1);

const SubjectIcon = ({ iconName, color }: { iconName?: string | null; color: string }) => {
  const name = iconName || 'book-outline';
  if (IONICON_NAMES.has(name)) {
    return <Ionicons name={name as any} size={26} color={color} />;
  }

  return <MaterialCommunityIcons name={name as any} size={26} color={color} />;
};

const ProgressBar = ({ value, color }: { value: number; color: string }) => (
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} />
  </View>
);

export default function SubjectDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectId?: string }>();

  const subjectId = useMemo(() => {
    const raw = Array.isArray(params.subjectId) ? params.subjectId[0] : params.subjectId;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [params.subjectId]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<DetailSubject | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [subjectSchedules, setSubjectSchedules] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = React.useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    let mounted = true;

    const loadSubjectData = async () => {
      if (!subjectId) return;

      setIsLoading(true);
      try {
        const [profileResult, subjectResult, photosResult] = await Promise.allSettled([
          getCurrentUserProfile(),
          getSubjectById(subjectId),
          getPhotosBySubject(subjectId),
        ]);

        if (!mounted) return;

        if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
        if (subjectResult.status === 'fulfilled') setSelectedSubject(subjectResult.value as DetailSubject);
        setPhotos(photosResult.status === 'fulfilled' ? (photosResult.value || []) : []);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadSubjectData();

    return () => {
      mounted = false;
    };
  }, [subjectId]);

  useEffect(() => {
    let mounted = true;

    const loadSubjectDetail = async () => {
      if (!subjectId) {
        setAssessments([]);
        setSubjectSchedules([]);
        return;
      }

      setIsDetailLoading(true);
      try {
        const [subjectAssessments, schedules] = await Promise.all([
          getAssessments(subjectId),
          getSchedulesBySubject(subjectId),
        ]);

        if (!mounted) return;

        setAssessments((subjectAssessments || []) as Assessment[]);
        setSubjectSchedules(schedules || []);
      } finally {
        if (mounted) setIsDetailLoading(false);
      }
    };

    loadSubjectDetail();

    return () => {
      mounted = false;
    };
  }, [subjectId]);

  const gradedAssessments = useMemo(
    () => assessments.filter((assessment) => assessment.is_completed || normalizeGrade(assessment) !== null),
    [assessments],
  );

  // 1. Porcentaje Evaluado (Pe)
  const evaluatedPercentage = useMemo(
    () => gradedAssessments.reduce((sum, assessment) => sum + parseWeight(assessment), 0),
    [gradedAssessments],
  );

  // 3. Puntos Acumulados (Pts)
  const accumulatedPoints = useMemo(
    () => gradedAssessments.reduce((sum, assessment) => {
      const grade = normalizeGrade(assessment) || 0;
      const weight = parseWeight(assessment) || 0;
      return sum + (grade * (weight / 100));
    }, 0),
    [gradedAssessments],
  );

  // 2. Promedio Actual (A_actual)
  const averageGrade = useMemo(() => {
    if (evaluatedPercentage === 0) return 0;
    return accumulatedPoints / (evaluatedPercentage / 100);
  }, [accumulatedPoints, evaluatedPercentage]);

  // 4. Nota Necesaria (N_necesaria)
  const targetGrade = useMemo(() => {
    const subjectTarget = selectedSubject?.target_grade;
    if (typeof subjectTarget === 'number' && subjectTarget > 0) return subjectTarget;

    const fallbackThreshold = profile?.approval_threshold;
    if (typeof fallbackThreshold === 'number' && fallbackThreshold > 0) {
      return fallbackThreshold > SCALE_MAX ? fallbackThreshold / 20 : fallbackThreshold;
    }

    return 3.0; // Fallback a 3.0
  }, [profile?.approval_threshold, selectedSubject?.target_grade]);

  const remainingPercentage = useMemo(() => Math.max(100 - evaluatedPercentage, 0), [evaluatedPercentage]);

  const requiredGrade = useMemo(() => {
    if (remainingPercentage <= 0) return null;
    const missingPoints = targetGrade - accumulatedPoints;
    return missingPoints / (remainingPercentage / 100);
  }, [targetGrade, accumulatedPoints, remainingPercentage]);

  // Otras métricas
  const projectedGrade = useMemo(() => averageGrade, [averageGrade]); // Simplificado, o usa recentAverage si quieres.

  const securedPercent = useMemo(() => {
    return Math.max(0, Math.min(100, evaluatedPercentage));
  }, [evaluatedPercentage]);

  const deliveredText = `${gradedAssessments.length} / ${Math.max(assessments.length, gradedAssessments.length)}`;
  
  const finalNeededText = useMemo(() => {
    if (requiredGrade === null || remainingPercentage === 0) {
      if (accumulatedPoints >= targetGrade) return t('subjects.thresholdPassed');
      return t('subjects.thresholdNoMoreEvaluations', { grade: formatGrade(accumulatedPoints) });
    }
    
    if (requiredGrade > SCALE_MAX) {
      return t('subjects.thresholdDanger', { max: SCALE_MAX, required: formatGrade(requiredGrade), remaining: remainingPercentage });
    }
    
    if (requiredGrade <= 0) {
      return t('subjects.thresholdSecured');
    }

    return t('subjects.thresholdNeed', { required: formatGrade(requiredGrade), remaining: remainingPercentage, target: targetGrade });
  }, [requiredGrade, remainingPercentage, accumulatedPoints, targetGrade, t]);

  const recentAssessments = useMemo(() => {
    return [...assessments]
      .sort((a, b) => parseDate(b.date) - parseDate(a.date))
      .slice(0, 5);
  }, [assessments]);

  const subjectGallery = useMemo(() => {
    const preview = photos.slice(0, 4).map((item, index) => ({
      ...item,
      uri: item.local_uri || GALLERY_PLACEHOLDERS[index % GALLERY_PLACEHOLDERS.length],
    }));

    while (preview.length < 4) {
      const index = preview.length;
      preview.push({
        id: -(index + 1),
        uri: GALLERY_PLACEHOLDERS[index % GALLERY_PLACEHOLDERS.length],
        subject: selectedSubject?.name || t('subjects.galleryFallbackSubject'),
        date: '',
        time: '',
        ocr_text: '',
      });
    }

    return preview;
  }, [photos, selectedSubject?.name, t]);

  const subjectSubtitle = selectedSubject?.professor || profile?.major || t('subjects.defaultSubtitle');
  const subjectScheduleLabel = subjectSchedules[0]
    ? `${subjectSchedules[0].start_time} - ${subjectSchedules[0].end_time}`
    : t('subjects.noSchedule');

  const handleOpenCamera = async () => {
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        Alert.alert(t('subjects.cameraPermissionTitle'), t('subjects.cameraPermissionMessage'));
        return;
      }
    }
    setIsCameraOpen(true);
  };

  const captureAndSave = async () => {
    if (!cameraRef.current || isCapturing || !subjectId) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      if (!photo?.uri) throw new Error(t('subjects.cameraErrorUri'));

      const subjectDir = `${FileSystem.documentDirectory}Threshold/data/subjects/${subjectId}/`;
      const folderInfo = await FileSystem.getInfoAsync(subjectDir);
      if (!folderInfo.exists) {
        await FileSystem.makeDirectoryAsync(subjectDir, { intermediates: true });
      }
      const permanentUri = `${subjectDir}img_${Date.now()}.jpg`;
      await FileSystem.moveAsync({ from: photo.uri, to: permanentUri });

      await createPhoto({ subject_id: subjectId, local_uri: permanentUri, es_favorita: 0 });

      setIsCameraOpen(false);
      // Refresh photos
      const updated = await getPhotosBySubject(subjectId);
      setPhotos(updated || []);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('subjects.cameraErrorSave'));
    } finally {
      setIsCapturing(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={globalStyles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('subjects.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={globalStyles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerAction} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={styles.headerBadge}>
              <Ionicons name="book-outline" size={18} color={theme.colors.primary} />
            </View>
            <TouchableOpacity style={styles.headerAction} onPress={() => router.push('/gallery')}>
              <Ionicons name="images-outline" size={16} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroInner}>
            <View style={[styles.heroIcon, { backgroundColor: selectedSubject?.color || '#DDE7FF' }]}>
              <SubjectIcon iconName={selectedSubject?.icon} color={theme.colors.white} />
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {selectedSubject?.name || t('subjects.noSubjectSelected')}
              </Text>
              <Text style={styles.heroSubtitle} numberOfLines={1}>
                {subjectSubtitle}
              </Text>
              <Text style={styles.heroMeta}>{subjectScheduleLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>{t('subjects.statsTitle')}</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="calculator-outline"
              label={t('subjects.currentAverage')}
              value={formatGrade(averageGrade)}
              note={t('subjects.gradeScale')}
              color="#2F80ED"
            />
            <StatCard
              icon="trending-up-outline"
              label={t('subjects.projectedGrade')}
              value={formatGrade(projectedGrade)}
              note={t('subjects.trendNote')}
              color="#34C759"
            />
            <StatCard
              icon="checkmark-done-outline"
              label={t('subjects.deliveredTasks')}
              value={deliveredText}
              note={t('subjects.deliveredHint')}
              color="#FF9500"
            />
          </View>
        </View>

        <View style={styles.thresholdCard}>
          <View style={styles.thresholdHeader}>
            <View>
              <Text style={styles.thresholdTitle}>{t('subjects.thresholdTitle')}</Text>
              <Text style={styles.thresholdSubtitle}>{t('subjects.thresholdSubtitle')}</Text>
            </View>
            <View style={[styles.thresholdBadge, { backgroundColor: selectedSubject?.color || '#E7EDF8' }]}> 
              <Text style={styles.thresholdBadgeText}>{Math.round(securedPercent)}%</Text>
            </View>
          </View>

          <Text style={styles.thresholdNeed}>{finalNeededText}</Text>
          <Text style={styles.thresholdHint}>{t('subjects.thresholdHint', { percent: Math.round(securedPercent) })}</Text>

          <View style={styles.thresholdTrackWrap}>
            <View style={styles.thresholdTrack}>
              <View style={[styles.thresholdFill, { width: `${securedPercent}%`, backgroundColor: selectedSubject?.color || theme.colors.primary }]} />
            </View>
            <View style={styles.thresholdMetaRow}>
              <Text style={styles.thresholdMetaLabel}>{t('subjects.secured')}</Text>
              <Text style={styles.thresholdMetaValue}>{Math.round(securedPercent)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>{t('subjects.insightsTitle')}</Text>
              <Text style={styles.sectionHint}>{t('subjects.insightsHint')}</Text>
            </View>
            <Text style={styles.sectionChip}>{recentAssessments.length} {t('subjects.notes')}</Text>
          </View>

          <View style={styles.insightsCard}>
            {recentAssessments.length > 0 ? (
              recentAssessments.map((assessment) => {
                const progress = getAssessmentProgress(assessment);
                const grade = normalizeGrade(assessment);
                const scoreText = typeof assessment.grade_value === 'number'
                  ? `${formatGrade(assessment.grade_value)} / ${SCALE_MAX}`
                  : typeof assessment.score === 'number' && typeof assessment.out_of === 'number' && assessment.out_of > 0
                    ? `${assessment.score} / ${assessment.out_of}`
                    : typeof assessment.percentage === 'number'
                      ? `${Math.round(assessment.percentage)}%`
                      : grade !== null
                        ? `${formatGrade(grade)} / ${SCALE_MAX}`
                        : t('subjects.pending');

                return (
                  <View key={`${assessment.id ?? assessment.name}-${assessment.date ?? 'no-date'}`} style={styles.insightRow}>
                    <View style={styles.insightTopRow}>
                      <View style={styles.insightTextBlock}>
                        <Text style={styles.insightTitle} numberOfLines={1}>{assessment.name}</Text>
                        <Text style={styles.insightMeta} numberOfLines={1}>
                          {assessment.type || t('subjects.note')}{assessment.date ? ` · ${assessment.date}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.insightScore}>{scoreText}</Text>
                    </View>
                    <ProgressBar value={progress} color={progress >= 80 ? '#34C759' : progress >= 60 ? '#FF9500' : '#FF3B30'} />
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyStateCard}>
                <Ionicons name="stats-chart-outline" size={24} color={theme.colors.text.secondary} />
                <Text style={styles.emptyStateTitle}>{t('subjects.emptyInsightsTitle')}</Text>
                <Text style={styles.emptyStateText}>{t('subjects.emptyInsightsText')}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>{t('subjects.galleryTitle')}</Text>
              <Text style={styles.sectionHint}>{t('subjects.galleryHint')}</Text>
            </View>
            <TouchableOpacity style={styles.galleryIconBtn} onPress={() => router.push('/gallery')}>
              <Ionicons name="images-outline" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.galleryCard}>
            {/* Dynamic grid based on real photo count */}
            {photos.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Ionicons name="camera-outline" size={28} color={theme.colors.text.secondary} />
                <Text style={styles.emptyStateTitle}>{t('subjects.galleryEmptyTitle')}</Text>
                <Text style={styles.emptyStateText}>{t('subjects.galleryEmptyText')}</Text>
              </View>
            ) : photos.length === 1 ? (
              <View style={styles.galleryGridSingle}>
                <Image source={{ uri: photos[0].local_uri }} style={styles.galleryImageFull} resizeMode="cover" />
              </View>
            ) : photos.length === 2 ? (
              <View style={styles.galleryGridTwo}>
                {photos.slice(0, 2).map((p, i) => (
                  <Image key={i} source={{ uri: p.local_uri }} style={styles.galleryImageHalf} resizeMode="cover" />
                ))}
              </View>
            ) : photos.length === 3 ? (
              <View style={styles.galleryGridThree}>
                <Image source={{ uri: photos[0].local_uri }} style={styles.galleryImageLeft} resizeMode="cover" />
                <View style={styles.galleryGridThreeRight}>
                  <Image source={{ uri: photos[1].local_uri }} style={styles.galleryImageQuarter} resizeMode="cover" />
                  <Image source={{ uri: photos[2].local_uri }} style={styles.galleryImageQuarter} resizeMode="cover" />
                </View>
              </View>
            ) : (
              <View style={styles.galleryGridFour}>
                <View style={styles.galleryGridFourRow}>
                  <Image source={{ uri: photos[0].local_uri }} style={styles.galleryImageQuad} resizeMode="cover" />
                  <Image source={{ uri: photos[1].local_uri }} style={styles.galleryImageQuad} resizeMode="cover" />
                </View>
                <View style={styles.galleryGridFourRow}>
                  <Image source={{ uri: photos[2].local_uri }} style={styles.galleryImageQuad} resizeMode="cover" />
                  <Image source={{ uri: photos[3].local_uri }} style={styles.galleryImageQuad} resizeMode="cover" />
                </View>
              </View>
            )}

            {/* Footer: subject name + add photo button */}
            <View style={styles.galleryFooter}>
              <View>
                <Text style={styles.galleryFooterTitle}>{selectedSubject?.name || t('subjects.galleryFallbackSubject')}</Text>
                <Text style={styles.galleryFooterText}>
                  {photos.length === 0 
                    ? t('subjects.photoCount_zero') 
                    : photos.length === 1 
                      ? t('subjects.photoCount_one') 
                      : t('subjects.photoCount', { count: photos.length })}
                </Text>
              </View>
              <TouchableOpacity style={styles.galleryFooterAction} onPress={handleOpenCamera}>
                <Ionicons name="add" size={22} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {isDetailLoading && (
          <View style={styles.detailLoadingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.detailLoadingText}>{t('subjects.refreshing')}</Text>
          </View>
        )}
      </ScrollView>
      </SafeAreaView>

      {/* Inline camera overlay */}
      {isCameraOpen && (
        <View style={styles.cameraOverlay}>
          <CameraView ref={cameraRef} style={styles.cameraView} facing="back" />
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.cameraCancelBtn} onPress={() => setIsCameraOpen(false)}>
              <Ionicons name="close" size={24} color={theme.colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraShutterBtn} onPress={captureAndSave} disabled={isCapturing}>
              {isCapturing
                ? <ActivityIndicator color={theme.colors.primary} />
                : <View style={styles.cameraShutterInner} />}
            </TouchableOpacity>
            <View style={{ width: 44 }} />
          </View>
        </View>
      )}
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  note,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  note: string;
  color: string;
}) {
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
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 8,
    paddingBottom: 36,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${theme.colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 30,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    ...globalStyles.shadow,
  },
  heroInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text.primary,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
  },
  heroMeta: {
    marginTop: 10,
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  sectionBlock: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionHint: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  sectionChip: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...globalStyles.shadow,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    minHeight: 36,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.text.secondary,
    fontWeight: '700',
  },
  statValue: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text.primary,
    letterSpacing: -0.4,
  },
  statNote: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.text.secondary,
    lineHeight: 14,
  },
  thresholdCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 30,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    ...globalStyles.shadow,
  },
  thresholdHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  thresholdTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text.primary,
    letterSpacing: -0.3,
  },
  thresholdSubtitle: {
    marginTop: 4,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
  },
  thresholdBadge: {
    minWidth: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  thresholdBadgeText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  thresholdNeed: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text.primary,
    letterSpacing: -0.4,
  },
  thresholdHint: {
    marginTop: 6,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
  },
  thresholdTrackWrap: {
    marginTop: 18,
  },
  thresholdTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.inputBackground,
    overflow: 'hidden',
  },
  thresholdFill: {
    height: '100%',
    borderRadius: 999,
  },
  thresholdMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thresholdMetaLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  thresholdMetaValue: {
    fontSize: 11,
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  insightsCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: 16,
    ...globalStyles.shadow,
  },
  insightRow: {
    gap: 10,
  },
  insightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  insightTextBlock: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  insightMeta: {
    marginTop: 3,
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  insightScore: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.inputBackground,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 10,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  emptyStateText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  galleryIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 30,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...globalStyles.shadow,
  },
  // Single photo: full width
  galleryGridSingle: {
    borderRadius: 18,
    overflow: 'hidden',
    height: 200,
  },
  galleryImageFull: {
    width: '100%',
    height: '100%',
  },
  // Two photos: 50/50 columns
  galleryGridTwo: {
    flexDirection: 'row',
    gap: 6,
    height: 160,
  },
  galleryImageHalf: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  } as any,
  // Three photos: big left, two stacked right
  galleryGridThree: {
    flexDirection: 'row',
    gap: 6,
    height: 200,
  },
  galleryImageLeft: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  } as any,
  galleryGridThreeRight: {
    flex: 1,
    gap: 6,
  },
  galleryImageQuarter: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  } as any,
  // Four photos: 2x2 grid
  galleryGridFour: {
    gap: 6,
    height: 200,
  },
  galleryGridFourRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  galleryImageQuad: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  } as any,
  galleryFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  galleryFooterTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text.primary,
  },
  galleryFooterText: {
    marginTop: 3,
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  galleryFooterAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Camera overlay
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 999,
  },
  cameraView: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  cameraCancelBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraShutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cameraShutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.white,
  },
  detailLoadingRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailLoadingText: {
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
});
