import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import DocumentScanner, { ResponseType } from 'react-native-document-scanner-plugin';
import { Accelerometer } from 'expo-sensors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../styles/theme';
import { dashboardStyles as styles } from '../styles/Dashboard.styles';
import { documentScannerStyles as localStyles } from '../styles/DocumentScannerModal.styles';
import { Subject, createPhoto } from '../services/api';
import { ColorMatrix } from 'react-native-image-filter-kit';

interface DocumentScannerModalProps {
  isVisible: boolean;
  onClose: () => void;
  subjects: Subject[];
  onSave?: (uri: string, subjectId: number) => void;
}

type ScannerStep = 'guide' | 'saving';
type FilterMode = 'papel' | 'pizarron';

// Matriz de color para pizarrón: aumenta contraste para destacar el marcador y reducir el brillo de fondo
const WHITEBOARD_MATRIX: [
  number, number, number, number, number,
  number, number, number, number, number,
  number, number, number, number, number,
  number, number, number, number, number
] = [
  1.5, 0, 0, 0, -0.2, // R
  0, 1.5, 0, 0, -0.2, // G
  0, 0, 1.5, 0, -0.2, // B
  0, 0, 0, 1, 0       // A
];

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({ 
  isVisible, 
  onClose, 
  subjects,
  onSave 
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<ScannerStep>('guide');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [filteredImageUri, setFilteredImageUri] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('papel');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLevel, setIsLevel] = useState(false);

  useEffect(() => {
    let subscription: any;
    if (isVisible && step === 'guide') {
      Accelerometer.setUpdateInterval(200);
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const isFlat = Math.abs(x) < 0.2 && Math.abs(y) < 0.2 && Math.abs(z) > 0.8;
        setIsLevel(isFlat);
      });
    }
    return () => {
      if (subscription) subscription.remove();
    };
  }, [isVisible, step]);

  const launchNativeScanner = async () => {
    try {
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
        croppedImageQuality: 90,
        responseType: ResponseType.ImageFilePath
      });

      if (status === 'success' && scannedImages && scannedImages.length > 0) {
        setCapturedImage(scannedImages[0]);
        setFilteredImageUri(null);
        setFilterMode('papel');
        setStep('saving');
      } else {
        resetAndClose();
      }
    } catch (error) {
      console.error(error);
      Alert.alert(t('common.error'), t('dashboard.documentScannerModal.errorStartScanner'));
      resetAndClose();
    }
  };

  const handleSave = async () => {
    if (!capturedImage || !selectedSubjectId) {
      Alert.alert(t('common.error'), t('dashboard.documentScannerModal.selectSubjectError'));
      return;
    }

    // Safety check for filter extraction
    if (filterMode === 'pizarron' && !filteredImageUri) {
       // Si el filtro aún se está aplicando, el usuario presionó guardar muy rápido.
       // Lo ideal es esperar, pero por seguridad, podemos usar la original o evitar guardar.
       setIsProcessing(true);
       // Simularemos un pequeño retraso para permitir que extractImage termine
       await new Promise(resolve => setTimeout(resolve, 500));
       if (!filteredImageUri) {
         Alert.alert(t('common.error'), t('dashboard.documentScannerModal.error'));
         setIsProcessing(false);
         return;
       }
    }

    const finalImageUri = (filterMode === 'pizarron' && filteredImageUri) ? filteredImageUri : capturedImage;

    try {
      setIsProcessing(true);
      await createPhoto({
        subject_id: selectedSubjectId,
        local_uri: finalImageUri,
      });
      
      if (onSave) onSave(finalImageUri, selectedSubjectId);
      Alert.alert(t('common.success'), t('dashboard.documentScannerModal.success', { subject: subjects.find(s => s.id === selectedSubjectId)?.name }));
      resetAndClose();
    } catch (error) {
      Alert.alert(t('common.error'), t('dashboard.documentScannerModal.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAndClose = () => {
    setStep('guide');
    setCapturedImage(null);
    setFilteredImageUri(null);
    setSelectedSubjectId(null);
    setFilterMode('papel');
    setIsProcessing(false);
    setIsLevel(false);
    onClose();
  };

  const isSaveDisabled = !selectedSubjectId || isProcessing || (filterMode === 'pizarron' && !filteredImageUri);

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false} onRequestClose={resetAndClose}>
      <View style={localStyles.container}>
        
        {step === 'guide' && (
          <View style={localStyles.guideScreen}>
            <View style={localStyles.header}>
              <TouchableOpacity onPress={resetAndClose} style={localStyles.closeBtn}>
                <Ionicons name="close" size={28} color={theme.colors.text.secondary} />
              </TouchableOpacity>
              <Text style={localStyles.headerTitle}>{t('dashboard.documentScannerModal.preparationTitle')}</Text>
              <View style={localStyles.headerSpacer} />
            </View>

            <View style={localStyles.guideContent}>
              <View style={[localStyles.levelIndicator, isLevel && localStyles.levelIndicatorActive]}>
                <View style={[localStyles.levelBubble, isLevel && localStyles.levelBubbleActive]} />
              </View>
              
              <Text style={localStyles.guideTitle}>
                {isLevel ? t('dashboard.documentScannerModal.positionPerfect') : t('dashboard.documentScannerModal.positionParallel')}
              </Text>
              <Text style={localStyles.guideSubtitle}>
                {t('dashboard.documentScannerModal.positionSubtitle')}
              </Text>
            </View>

            <View style={localStyles.guideFooter}>
              <TouchableOpacity 
                style={[localStyles.launchBtn, isLevel ? localStyles.launchBtnActive : localStyles.launchBtnInactive]} 
                onPress={launchNativeScanner}
              >
                <Ionicons name="scan" size={24} color={isLevel ? "white" : theme.colors.text.secondary} />
                <Text style={[localStyles.launchBtnText, !isLevel && localStyles.launchBtnTextInactive]}>
                  {isLevel ? t('dashboard.documentScannerModal.scanButtonReady') : t('dashboard.documentScannerModal.scanButtonNotReady')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'saving' && capturedImage && (
          <View style={localStyles.savingContainer}>
             <View style={localStyles.previewCard}>
               {filterMode === 'pizarron' ? (
                 <ColorMatrix
                   matrix={WHITEBOARD_MATRIX}
                   extractImageEnabled={true}
                   onExtractImage={({ nativeEvent }) => {
                     if (nativeEvent && nativeEvent.uri) {
                       setFilteredImageUri(nativeEvent.uri);
                     }
                   }}
                   image={<Image source={{ uri: capturedImage }} style={localStyles.previewImage} resizeMode="contain" />}
                   style={localStyles.previewImage}
                 />
               ) : (
                 <Image source={{ uri: capturedImage }} style={localStyles.previewImage} resizeMode="contain" />
               )}
               <View style={localStyles.scanEffect} />
             </View>

             <Text style={localStyles.stepTitle}>{t('dashboard.documentScannerModal.save')}</Text>
             
             <View style={localStyles.modeSelector}>
               <Text style={localStyles.modeLabel}>{t('dashboard.documentScannerModal.filterModeLabel')}</Text>
               <View style={localStyles.modeBadges}>
                 <TouchableOpacity 
                   style={[localStyles.modeBadge, filterMode === 'papel' && localStyles.modeBadgeActive]}
                   onPress={() => setFilterMode('papel')}
                 >
                   <Text style={[localStyles.modeBadgeText, filterMode === 'papel' && localStyles.modeBadgeTextActive]}>
                     {t('dashboard.documentScannerModal.filterModePaper')}
                   </Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                   style={[localStyles.modeBadge, filterMode === 'pizarron' && localStyles.modeBadgeActive]}
                   onPress={() => {
                     setFilteredImageUri(null); // Reset until the new extract comes
                     setFilterMode('pizarron');
                   }}
                 >
                   <Text style={[localStyles.modeBadgeText, filterMode === 'pizarron' && localStyles.modeBadgeTextActive]}>
                     {t('dashboard.documentScannerModal.filterModeWhiteboard')}
                   </Text>
                 </TouchableOpacity>
               </View>
             </View>

             <View style={localStyles.subjectGrid}>
               {subjects.map(s => (
                 <TouchableOpacity 
                   key={s.id} 
                   style={[localStyles.subjectItem, selectedSubjectId === s.id && { backgroundColor: s.color ? s.color + '40' : undefined, borderColor: s.color || undefined }]}
                   onPress={() => setSelectedSubjectId(s.id)}
                 >
                   <View style={[styles.subjectBadge, localStyles.subjectBadgeOverride, { backgroundColor: s.color || '#CCC' }]}>
                     <MaterialCommunityIcons name={(s.icon as any) || 'book-outline'} size={18} color={theme.colors.text.primary} />
                   </View>
                   <Text style={localStyles.subjectName} numberOfLines={1}>{s.name}</Text>
                 </TouchableOpacity>
               ))}
             </View>

             <View style={localStyles.saveActions}>
               <TouchableOpacity onPress={resetAndClose} style={localStyles.secondaryBtn}>
                 <Text style={localStyles.secondaryBtnText}>{t('common.cancel')}</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 onPress={handleSave} 
                 disabled={isSaveDisabled}
                 style={[localStyles.primaryBtn, isSaveDisabled && localStyles.primaryBtnDisabled]}
               >
                 {isProcessing ? <ActivityIndicator color="white" /> : <Text style={localStyles.primaryBtnText}>{t('common.save')}</Text>}
               </TouchableOpacity>
             </View>
          </View>
        )}

        {isProcessing && (
          <View style={localStyles.loaderOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={localStyles.loaderText}>{t('dashboard.documentScannerModal.saving')}</Text>
          </View>
        )}

      </View>
    </Modal>
  );
};
