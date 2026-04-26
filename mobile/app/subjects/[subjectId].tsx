import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
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
import { DocumentScannerModal } from '../../src/components/DocumentScannerModal';
import { PhotoCaptureModal } from '../../src/components/PhotoCaptureModal';
import { ImageViewerModal } from '../../src/components/ImageViewerModal';
import { PremiumLoader } from '../../src/components/PremiumLoader';
import { SubjectGalleryGrid } from '../../src/components/SubjectGalleryGrid';
import { SubjectStats } from '../../src/components/SubjectStats';
import { SubjectThreshold } from '../../src/components/SubjectThreshold';
import { SubjectInsights } from '../../src/components/SubjectInsights';
import { useSubjectGrades } from '../../src/hooks/useSubjectGrades';
import { useCameraPermissions, CameraView } from 'expo-camera';
import { subjectDetailStyles as styles } from '../../src/styles/SubjectDetail.styles';

type DetailSubject = Subject & {
  avg_score?: number | null;
  completion_percent?: number | null;
};

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
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [initialViewerIndex, setInitialViewerIndex] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = React.useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  

    useEffect(() => {
    let mounted = true;

    const loadAllData = async () => {
      if (!subjectId) return;

      setIsLoading(true);
      try {
        const [profileRes, subjectRes, photosRes, assessmentsRes, schedulesRes] = await Promise.allSettled([
          getCurrentUserProfile(),
          getSubjectById(subjectId),
          getPhotosBySubject(subjectId),
          getAssessments(subjectId),
          getSchedulesBySubject(subjectId),
        ]);

        if (!mounted) return;

        if (profileRes.status === 'fulfilled') setProfile(profileRes.value);
        if (subjectRes.status === 'fulfilled') setSelectedSubject(subjectRes.value as DetailSubject);
        if (photosRes.status === 'fulfilled') setPhotos(photosRes.value || []);
        if (assessmentsRes.status === 'fulfilled') setAssessments((assessmentsRes.value || []) as Assessment[]);
        if (schedulesRes.status === 'fulfilled') setSubjectSchedules(schedulesRes.value || []);
      } catch (err) {
        console.error('Error loading subject data:', err);
      } finally {
        if (mounted) {
          // PremiumLoader se encargará del fade-out suave
          if (mounted) setIsLoading(false);
        }
      }
    };

    loadAllData();

    return () => {
      mounted = false;
    };
  }, [subjectId]);

  const {
    averageGrade,
    projectedGrade,
    deliveredText,
    securedPercent,
    finalNeededText,
    recentAssessments,
  } = useSubjectGrades(assessments, selectedSubject, profile);

  const subjectSubtitle = selectedSubject?.professor || profile?.major || t('subjects.defaultSubtitle');
  const subjectScheduleLabel = subjectSchedules[0]
    ? `${subjectSchedules[0].start_time} - ${subjectSchedules[0].end_time}`
    : t('subjects.noSchedule');

  const handleTakePhoto = () => {
    setIsPhotoModalVisible(true);
  };

  const handleOpenScanner = () => {
    setIsScannerVisible(true);
  };

    if (isLoading) {
    return (
      <SafeAreaView style={[globalStyles.safeArea, { backgroundColor: '#fff' }]}>
        <View style={styles.premiumLoadingContainer}>
          <View style={styles.loadingLogoContainer}>
            <View style={styles.loadingLogoCircle}>
              <Ionicons name="leaf-outline" size={32} color={theme.colors.primary} />
            </View>
            <View style={styles.loadingPulse} />
          </View>
          <Text style={styles.premiumLoadingText}>{t('subjects.loading').toUpperCase()}</Text>
          <View style={styles.loadingBarTrack}>
            <View style={styles.loadingBarFill} />
          </View>
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

        <SubjectStats
          averageGrade={averageGrade}
          projectedGrade={projectedGrade}
          deliveredText={deliveredText}
        />

        <SubjectThreshold
          securedPercent={securedPercent}
          finalNeededText={finalNeededText}
          subjectColor={selectedSubject?.color ?? undefined}
        />

        <SubjectInsights recentAssessments={recentAssessments} />

        <SubjectGalleryGrid
          photos={photos}
          subjectName={selectedSubject?.name ? selectedSubject.name : undefined}
          onOpenScanner={handleOpenScanner}
          onTakePhoto={handleTakePhoto}
          onOpenViewer={(index) => {
            setInitialViewerIndex(index);
            setIsViewerVisible(true);
          }}
        />

        {isDetailLoading && (
          <View style={styles.detailLoadingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.detailLoadingText}>{t('subjects.refreshing')}</Text>
          </View>
        )}
      </ScrollView>
      </SafeAreaView>

      <DocumentScannerModal
        isVisible={isScannerVisible}
        onClose={() => setIsScannerVisible(false)}
        subjects={selectedSubject ? [selectedSubject as Subject] : []}
        onSave={async () => {
          if (subjectId) {
            const updated = await getPhotosBySubject(subjectId);
            setPhotos(updated || []);
          }
        }}
      />

      <PhotoCaptureModal
        isVisible={isPhotoModalVisible}
        onClose={() => setIsPhotoModalVisible(false)}
        subjects={selectedSubject ? [selectedSubject as Subject] : []}
        initialSubjectId={subjectId || undefined}
        onSave={async () => {
          if (subjectId) {
            const updated = await getPhotosBySubject(subjectId);
            setPhotos(updated || []);
          }
        }}
      />

      <ImageViewerModal
        isVisible={isViewerVisible}
        photos={photos}
        initialIndex={initialViewerIndex}
        onClose={() => setIsViewerVisible(false)}
        onPhotoDeleted={(id) => {
          setPhotos(prev => prev.filter(p => p.id !== id));
        }}
      />
    </>
  );
}


