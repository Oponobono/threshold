import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, ActivityIndicator, Platform, Share } from 'react-native';
import { useCustomAlert } from './CustomAlert';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../styles/theme';
import { dashboardStyles as styles } from '../styles/Dashboard.styles';
import { documentScannerStyles as localStyles } from '../styles/DocumentScannerModal.styles';
import { Subject, createPhoto, createScannedDocument, extractTextFromImage } from '../services/api';
import { AdvancedImageEnhancer, AdvancedImageEnhancerRef } from './AdvancedImageEnhancer';
import * as Print from 'expo-print';

// Importes condicionales para plataformas nativas
let DocumentScanner: any = null;
let ResponseType: any = null;
let Accelerometer: any = null;

if (Platform.OS !== 'web') {
  try {
    const scanner = require('react-native-document-scanner-plugin');
    DocumentScanner = scanner.default || scanner;
    ResponseType = scanner.ResponseType;
    const sensors = require('expo-sensors');
    Accelerometer = sensors.Accelerometer;
  } catch (e) {
    console.warn('Native modules not available:', e);
  }
}

interface DocumentScannerModalProps {
  isVisible: boolean;
  onClose: () => void;
  subjects: Subject[];
  onSave?: (uri: string, subjectId: number, base64?: string) => void;
}

type ScannerStep = 'guide' | 'saving';

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({ 
  isVisible, 
  onClose, 
  subjects,
  onSave 
}) => {
  const { t } = useTranslation();
  const { showAlert } = useCustomAlert();
  const [step, setStep] = useState<ScannerStep>('guide');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLevel, setIsLevel] = useState(false);
  const [exportFormat, setExportFormat] = useState<'image' | 'pdf'>('image');
  const [activeFilter, setActiveFilter] = useState('original');
  const enhancerRef = useRef<AdvancedImageEnhancerRef>(null);

  useEffect(() => {
    let subscription: any;
    if (isVisible && step === 'guide' && Accelerometer) {
      Accelerometer.setUpdateInterval(200);
      subscription = Accelerometer.addListener(({ x, y, z }: any) => {
        const isFlat = Math.abs(x) < 0.2 && Math.abs(y) < 0.2 && Math.abs(z) > 0.8;
        setIsLevel(isFlat);
      });
    }
    return () => {
      if (subscription) subscription.remove();
    };
  }, [isVisible, step]);

  const launchNativeScanner = async () => {
    if (!DocumentScanner) {
      showAlert({ title: t('common.error'), message: 'Document scanning is not available on this platform', type: 'info' });
      return;
    }

    try {
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
        croppedImageQuality: 90,
        responseType: ResponseType.ImageFilePath
      });

      if (status === 'success' && scannedImages && scannedImages.length > 0) {
        setCapturedImage(scannedImages[0]);
        setStep('saving');
      } else {
        resetAndClose();
      }
    } catch (error) {
      console.error(error);
      showAlert({ title: t('common.error'), message: t('dashboard.documentScannerModal.errorStartScanner'), type: 'error' });
      resetAndClose();
    }
  };

  const handleSave = async () => {
    if (!capturedImage || !selectedSubjectId) {
      showAlert({ title: t('common.error'), message: t('dashboard.documentScannerModal.selectSubjectError'), type: 'warning' });
      return;
    }

    const finalImageUri = capturedImage;

    try {
      setIsProcessing(true);
      
      let finalImageUri = capturedImage;
      if (enhancerRef.current) {
        const processedUri = await enhancerRef.current.exportProcessedImage();
        if (processedUri) {
          finalImageUri = processedUri;
        }
      }
      
      if (exportFormat === 'pdf') {
        const html = `
          <html>
            <body style="margin: 0; padding: 0;">
              <img src="${finalImageUri}" style="width: 100%;" />
            </body>
          </html>
        `;
        const { uri: pdfUri } = await Print.printToFileAsync({ html });
        console.log("PDF generado en:", pdfUri);
        
        await createScannedDocument({
          subject_id: selectedSubjectId,
          local_uri: pdfUri,
          name: `Documento Escaneado ${new Date().toLocaleDateString()}`
        });
        
        finalImageUri = pdfUri;
      } else {
        await createPhoto({
          subject_id: selectedSubjectId,
          local_uri: finalImageUri,
        });
      }
      
      if (onSave) onSave(exportFormat === 'pdf' ? finalImageUri /* should be pdfUri eventually */ : finalImageUri, selectedSubjectId);
      showAlert({ title: t('common.success'), message: t('dashboard.documentScannerModal.success', { subject: subjects.find(s => s.id === selectedSubjectId)?.name }), type: 'success' });
      resetAndClose();
    } catch (error) {
      showAlert({ title: t('common.error'), message: t('dashboard.documentScannerModal.error'), type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!selectedSubjectId || !capturedImage) return;
    try {
      setIsProcessing(true);
      const base64Data = await enhancerRef.current?.exportBase64();
      let finalImageUri = capturedImage;

      if (exportFormat === 'pdf') {
        const processedUri = await enhancerRef.current?.exportProcessedImage();
        if (processedUri) {
          finalImageUri = processedUri;
        }
        const html = `
          <html>
            <body style="margin: 0; padding: 0;">
              <img src="${finalImageUri}" style="width: 100%;" />
            </body>
          </html>
        `;
        const { uri: pdfUri } = await Print.printToFileAsync({ html });
        await createScannedDocument({
          subject_id: selectedSubjectId,
          local_uri: pdfUri,
          name: `Documento Escaneado ${new Date().toLocaleDateString()}`
        });
        finalImageUri = pdfUri;
      } else {
        const processedUri = await enhancerRef.current?.exportProcessedImage();
        if (processedUri) {
          finalImageUri = processedUri;
        }
        await createPhoto({
          subject_id: selectedSubjectId,
          local_uri: finalImageUri,
        });
      }
      
      if (onSave) {
        onSave(exportFormat === 'pdf' ? finalImageUri : finalImageUri, selectedSubjectId, base64Data || undefined);
      }
      resetAndClose();
    } catch (error) {
      showAlert({ title: t('common.error'), message: 'Error generando tarjetas', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOCR = async () => {
    if (!capturedImage) return;
    try {
      setIsProcessing(true);
      const base64Data = await enhancerRef.current?.exportBase64();
      if (!base64Data) throw new Error('No se pudo procesar la imagen para OCR.');
      const text = await extractTextFromImage(base64Data);
      
      if (!text || text.trim() === '') {
        showAlert({ title: 'Aviso', message: 'No se detectó texto en la imagen.', type: 'info' });
        return;
      }

      await Share.share({
        title: 'Texto extraído de Threshold',
        message: text,
      });
    } catch (error: any) {
      showAlert({ title: 'Error OCR', message: error.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAndClose = () => {
    setStep('guide');
    setCapturedImage(null);
    setSelectedSubjectId(null);
    setIsProcessing(false);
    setIsLevel(false);
    onClose();
  };

  const isSaveDisabled = !selectedSubjectId || isProcessing;

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
             <AdvancedImageEnhancer 
               ref={enhancerRef}
               imageUri={capturedImage} 
               onFilterChange={setActiveFilter} 
             />

             {/* Formato de Exportación */}
             <View style={localStyles.modeSelector}>
               <Text style={localStyles.modeLabel}>Formato de Exportación</Text>
               <View style={localStyles.modeBadges}>
                 <TouchableOpacity 
                   style={[localStyles.modeBadge, exportFormat === 'image' && localStyles.modeBadgeActive]}
                   onPress={() => setExportFormat('image')}
                 >
                   <Text style={[localStyles.modeBadgeText, exportFormat === 'image' && localStyles.modeBadgeTextActive]}>
                     <Ionicons name="image-outline" size={14} /> Foto de Galería
                   </Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                   style={[localStyles.modeBadge, exportFormat === 'pdf' && localStyles.modeBadgeActive]}
                   onPress={() => setExportFormat('pdf')}
                 >
                   <Text style={[localStyles.modeBadgeText, exportFormat === 'pdf' && localStyles.modeBadgeTextActive]}>
                     <Ionicons name="document-text-outline" size={14} /> Documento PDF
                   </Text>
                 </TouchableOpacity>
               </View>
             </View>

             <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
               <TouchableOpacity 
                 style={[localStyles.modeBadge, { backgroundColor: '#C5A059' + '20', borderColor: '#C5A059', borderWidth: 1 }]}
                 onPress={handleOCR}
                 disabled={isProcessing}
               >
                 {isProcessing ? <ActivityIndicator size="small" color="#C5A059" /> : (
                   <Text style={[localStyles.modeBadgeText, { color: '#C5A059', fontWeight: 'bold' }]}>
                     <Ionicons name="text" size={14} /> Detectar y Compartir Texto (OCR)
                   </Text>
                 )}
               </TouchableOpacity>
             </View>

             <Text style={localStyles.stepTitle}>{t('dashboard.documentScannerModal.save')}</Text>
             

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
                 onPress={handleGenerateFlashcards} 
                 disabled={isSaveDisabled}
                 style={[localStyles.secondaryBtn, isSaveDisabled && localStyles.primaryBtnDisabled, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary, marginHorizontal: 8 }]}
               >
                 {isProcessing ? <ActivityIndicator color={theme.colors.primary} /> : <Text style={[localStyles.secondaryBtnText, { color: theme.colors.primary, fontSize: 13, fontWeight: 'bold' }]}>Crear Tarjetas</Text>}
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
