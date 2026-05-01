import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { globalStyles } from '../../src/styles/globalStyles';
import { theme } from '../../src/styles/theme';
import * as FileSystem from 'expo-file-system/legacy';
import {
  getAssessments,
  getSubjectById,
  getPhotosBySubject,
  getCurrentUserProfile,
  getSchedulesBySubject,
  getAudioRecordings,
  getYouTubeVideos,
  getScannedDocumentsBySubject,
  type Assessment,
  type Subject,
  type UserProfile,
  type YouTubeVideo,
  type ScannedDocument,
} from '../../src/services/api';
import { useAudioRecorder, RecordingItem } from '../../src/hooks/useAudioRecorder';
import { SubjectHeroCard } from '../../src/components/SubjectHeroCard';
import { SubjectRecentRecordings } from '../../src/components/SubjectRecentRecordings';
import { DocumentScannerModal } from '../../src/components/DocumentScannerModal';
import { PhotoCaptureModal } from '../../src/components/PhotoCaptureModal';
import { ImageViewerModal } from '../../src/components/ImageViewerModal';
import { SubjectGalleryGrid } from '../../src/components/SubjectGalleryGrid';
import { SubjectDocumentsList } from '../../src/components/SubjectDocumentsList';
import { FlashcardCreatorModal } from '../../src/components/FlashcardCreatorModal';
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
  const [scannedDocuments, setScannedDocuments] = useState<ScannedDocument[]>([]);
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
  const [recentVideos, setRecentVideos] = useState<YouTubeVideo[]>([]);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const { playSound, stopSound, playingId, deleteRecordingConfirmed } = useAudioRecorder();
  
  const [isFlashcardModalVisible, setIsFlashcardModalVisible] = useState(false);
  const [flashcardBase64, setFlashcardBase64] = useState<string | undefined>();

  useEffect(() => {
    let mounted = true;

    const loadAllData = async () => {
      if (!subjectId) return;

      setIsLoading(true);
      try {
        const [profileRes, subjectRes, photosRes, docsRes, assessmentsRes, schedulesRes, recordingsRes, videosRes] =
          await Promise.allSettled([
            getCurrentUserProfile(),
            getSubjectById(subjectId),
            getPhotosBySubject(subjectId),
            getScannedDocumentsBySubject(subjectId),
            getAssessments(subjectId),
            getSchedulesBySubject(subjectId),
            getAudioRecordings(),
            getYouTubeVideos(),
          ]);

        if (!mounted) return;

        if (profileRes.status === 'fulfilled') setProfile(profileRes.value);
        if (subjectRes.status === 'fulfilled') setSelectedSubject(subjectRes.value as DetailSubject);
        if (photosRes.status === 'fulfilled') setPhotos(photosRes.value || []);
        if (docsRes.status === 'fulfilled') setScannedDocuments(docsRes.value || []);
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
        if (videosRes.status === 'fulfilled') {
          // eslint-disable-next-line eqeqeq
          const filtered = videosRes.value.filter(v => v.subject_id == subjectId).slice(0, 3);
          setRecentVideos(filtered);
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

  const imagePhotos = useMemo(() => photos.filter(p => !p.local_uri?.endsWith('.pdf')), [photos]);
  // Combine old pdfs saved as photos + new scanned_documents
  const pdfDocuments = useMemo(() => {
    const oldPdfs = photos.filter(p => p.local_uri?.endsWith('.pdf'));
    return [...scannedDocuments, ...oldPdfs];
  }, [photos, scannedDocuments]);

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

          <SubjectDocumentsList 
            documents={pdfDocuments} 
            onGenerateFlashcards={async (uris) => {
              if (uris.length === 0) return;
              // Leemos la primera imagen para las flashcards (como MVP)
              // Idealmente las combinariamos o enviariamos todas, pero por ahora tomaremos la primera para este prototipo.
              try {
                const base64Data = await FileSystem.readAsStringAsync(uris[0], {
                  encoding: FileSystem.EncodingType.Base64,
                });
                setFlashcardBase64(base64Data);
                setIsFlashcardModalVisible(true);
              } catch (e) {
                console.error('Error leyendo base64 para flashcards:', e);
              }
            }}
            onExportPdf={async (uris) => {
              if (uris.length === 0) return;
              try {
                // Crear un HTML con todas las imagenes seleccionadas
                const imagesHtml = uris.map(uri => `<img src="${uri}" style="width: 100%; page-break-after: always; margin-bottom: 20px;" />`).join('\n');
                const html = `
                  <html>
                    <body style="margin: 0; padding: 0;">
                      ${imagesHtml}
                    </body>
                  </html>
                `;
                const Print = require('expo-print');
                const { uri: pdfUri } = await Print.printToFileAsync({ html });
                const Sharing = require('expo-sharing');
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(pdfUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
                }
              } catch (e) {
                console.error('Error exportando PDF:', e);
              }
            }}
          />

          <SubjectGalleryGrid
            photos={imagePhotos}
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
            deleteRecording={deleteRecordingConfirmed}
          />

          {recentVideos.length > 0 && (
            <View style={{ marginTop: 24, paddingHorizontal: 16, marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text.primary }}>
                  Videos de YouTube
                </Text>
              </View>
              <View style={{ gap: 12 }}>
                {recentVideos.map(video => (
                  <TouchableOpacity
                    key={video.id}
                    onPress={() => router.push(`/recordings/${video.id}?type=video` as any)}
                    style={{
                      backgroundColor: theme.colors.card,
                      borderRadius: 12,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <MaterialCommunityIcons name="youtube" size={40} color={theme.colors.text.error} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.text.primary, fontWeight: '600', fontSize: 15 }} numberOfLines={2}>
                        {video.title || 'Video de YouTube'}
                      </Text>
                      <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginTop: 2 }}>
                        {video.created_at
                          ? new Date(video.created_at).toLocaleDateString()
                          : 'Fecha desconocida'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

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
        onSave={async (uri, id, base64) => {
          if (subjectId) {
            const updatedPhotos = await getPhotosBySubject(subjectId);
            const updatedDocs = await getScannedDocumentsBySubject(subjectId);
            setPhotos(updatedPhotos || []);
            setScannedDocuments(updatedDocs || []);
            
            if (base64) {
              setFlashcardBase64(base64);
              setIsFlashcardModalVisible(true);
            }
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
            const updatedPhotos = await getPhotosBySubject(subjectId);
            const updatedDocs = await getScannedDocumentsBySubject(subjectId);
            setPhotos(updatedPhotos || []);
            setScannedDocuments(updatedDocs || []);
          }
        }}
      />

      <ImageViewerModal
        isVisible={isViewerVisible}
        photos={imagePhotos}
        initialIndex={initialViewerIndex}
        onClose={() => setIsViewerVisible(false)}
        onPhotoDeleted={(id) => {
          setPhotos(prev => prev.filter(p => p.id !== id));
        }}
      />

      {subjectId && profile?.id && (
        <FlashcardCreatorModal
          visible={isFlashcardModalVisible}
          onClose={() => setIsFlashcardModalVisible(false)}
          onSuccess={() => {
            setIsFlashcardModalVisible(false);
          }}
          imageBase64={flashcardBase64}
          contentType="document"
          title={selectedSubject?.name || 'Documento'}
          subjectId={subjectId}
          userId={profile.id}
        />
      )}
    </>
  );
}
