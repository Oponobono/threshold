import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { globalStyles } from '../../src/styles/globalStyles';
import { theme } from '../../src/styles/theme';
import {
  getAssessments,
  getSubjectById,
  getPhotosBySubject,
  getCurrentUserProfile,
  getSchedulesBySubject,
  getAudioRecordings,
  type Assessment,
  type Subject,
  type UserProfile,
} from '../../src/services/api';
import { useAudioRecorder, RecordingItem } from '../../src/hooks/useAudioRecorder';
import { SubjectHeroCard } from '../../src/components/SubjectHeroCard';
import { SubjectRecentRecordings } from '../../src/components/SubjectRecentRecordings';
import { DocumentScannerModal } from '../../src/components/DocumentScannerModal';
import { PhotoCaptureModal } from '../../src/components/PhotoCaptureModal';
import { ImageViewerModal } from '../../src/components/ImageViewerModal';
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
  const [recentRecordings, setRecentRecordings] = useState<RecordingItem[]>([]);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const { playSound, stopSound, playingId, deleteRecording } = useAudioRecorder();

  useEffect(() => {
    let mounted = true;

    const loadAllData = async () => {
      if (!subjectId) return;

      setIsLoading(true);
      try {
        const [profileRes, subjectRes, photosRes, assessmentsRes, schedulesRes, recordingsRes] =
          await Promise.allSettled([
            getCurrentUserProfile(),
            getSubjectById(subjectId),
            getPhotosBySubject(subjectId),
            getAssessments(subjectId),
            getSchedulesBySubject(subjectId),
            getAudioRecordings(),
          ]);

        if (!mounted) return;

        if (profileRes.status === 'fulfilled') setProfile(profileRes.value);
        if (subjectRes.status === 'fulfilled') setSelectedSubject(subjectRes.value as DetailSubject);
        if (photosRes.status === 'fulfilled') setPhotos(photosRes.value || []);
        if (assessmentsRes.status === 'fulfilled') setAssessments((assessmentsRes.value || []) as Assessment[]);
        if (schedulesRes.status === 'fulfilled') setSubjectSchedules(schedulesRes.value || []);
        if (recordingsRes.status === 'fulfilled') {
          // eslint-disable-next-line eqeqeq
          const filtered = recordingsRes.value.filter(r => r.subject_id == subjectId).slice(0, 3);
          setRecentRecordings(
            filtered.map(rec => ({
              ...rec,
              id_string: rec.id?.toString() || rec.local_uri,
              uri: rec.local_uri,
              date: new Date(rec.created_at || Date.now()).toLocaleString(),
              name:
                rec.name ||
                t('dashboard.audioRecorderModal.fileLabel', {
                  date: new Date(rec.created_at || Date.now()).toLocaleDateString(),
                }),
            }))
          );
        }
      } catch (err) {
        console.error('Error loading subject data:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadAllData();
    return () => { mounted = false; };
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

  const handleTakePhoto = () => setIsPhotoModalVisible(true);
  const handleOpenScanner = () => setIsScannerVisible(true);

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

          <SubjectHeroCard
            color={selectedSubject?.color}
            iconName={selectedSubject?.icon}
            title={selectedSubject?.name || t('subjects.noSubjectSelected')}
            subtitle={subjectSubtitle}
            meta={subjectScheduleLabel}
          />

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

          <SubjectRecentRecordings
            recentRecordings={recentRecordings}
            playingId={playingId}
            playSound={playSound}
            stopSound={stopSound}
            deleteRecording={deleteRecording}
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
