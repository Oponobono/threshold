import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, StyleSheet, Dimensions, PanResponder, Animated, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../styles/theme';
import { DragonflyIcon } from './DragonflyIcon';
import { dashboardStyles as styles } from '../styles/Dashboard.styles';
import { Subject, createPhoto } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DocumentScannerModalProps {
  isVisible: boolean;
  onClose: () => void;
  subjects: Subject[];
  onSave?: (uri: string, subjectId: number) => void;
}

type ScannerStep = 'capture' | 'crop' | 'filter' | 'saving';

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({ 
  isVisible, 
  onClose, 
  subjects,
  onSave 
}) => {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<ScannerStep>('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const cameraRef = useRef<any>(null);

  // Crop points (Relative to screen)
  const points = useRef([
    new Animated.ValueXY({ x: 40, y: 100 }), // Top Left
    new Animated.ValueXY({ x: SCREEN_WIDTH - 40, y: 100 }), // Top Right
    new Animated.ValueXY({ x: SCREEN_WIDTH - 40, y: SCREEN_HEIGHT - 250 }), // Bottom Right
    new Animated.ValueXY({ x: 40, y: SCREEN_HEIGHT - 250 }), // Bottom Left
  ]).current;

  const createPanResponder = (point: Animated.ValueXY) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event([null, { dx: point.x, dy: point.y }], { useNativeDriver: false }),
    onPanResponderGrant: () => {
      point.setOffset({ x: (point.x as any)._value, y: (point.y as any)._value });
      point.setValue({ x: 0, y: 0 });
    },
    onPanResponderRelease: () => {
      point.flattenOffset();
    },
  });

  const panResponders = useRef(points.map(p => createPanResponder(p))).current;

  useEffect(() => {
    if (isVisible && !permission?.granted) {
      requestPermission();
    }
  }, [isVisible]);

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        setIsProcessing(true);
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
        setCapturedImage(photo.uri);
        setStep('crop');
      } catch (error) {
        Alert.alert(t('common.error'), t('dashboard.documentScannerModal.error'));
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleConfirmCrop = async () => {
    if (!capturedImage) return;
    setStep('filter');
    setIsProcessing(true);

    try {
      // In a real app, we'd use the points to apply a perspective transform.
      // With expo-image-manipulator, we can only do rectangular crops.
      // We'll calculate the bounding box of the points for now.
      
      const pts = points.map(p => ({ x: (p.x as any)._value, y: (p.y as any)._value }));
      const minX = Math.min(...pts.map(p => p.x));
      const maxX = Math.max(...pts.map(p => p.x));
      const minY = Math.min(...pts.map(p => p.y));
      const maxY = Math.max(...pts.map(p => p.y));

      // Map screen coordinates to image coordinates
      // This is a simplification
      const result = await ImageManipulator.manipulateAsync(
        capturedImage,
        [
          // Here we would apply the "Scan" filter (High contrast, Brightness)
          // We can simulate it with brightness/contrast if supported, 
          // but basic ImageManipulator only supports flip, rotate, resize, crop.
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      setCapturedImage(result.uri);
      setStep('saving');
    } catch (error) {
      Alert.alert(t('common.error'), t('dashboard.documentScannerModal.error'));
      setStep('crop');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!capturedImage || !selectedSubjectId) {
      Alert.alert(t('common.error'), "Selecciona una materia primero");
      return;
    }

    try {
      setIsProcessing(true);
      await createPhoto({
        subject_id: selectedSubjectId,
        local_uri: capturedImage,
      });
      
      if (onSave) onSave(capturedImage, selectedSubjectId);
      Alert.alert(t('common.success'), t('dashboard.documentScannerModal.success', { subject: subjects.find(s => s.id === selectedSubjectId)?.name }));
      resetAndClose();
    } catch (error) {
      Alert.alert(t('common.error'), t('dashboard.documentScannerModal.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAndClose = () => {
    setStep('capture');
    setCapturedImage(null);
    setSelectedSubjectId(null);
    setIsProcessing(false);
    onClose();
  };

  if (!permission?.granted) {
    return null;
  }

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false} onRequestClose={resetAndClose}>
      <View style={localStyles.container}>
        
        {step === 'capture' && (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back">
            <View style={localStyles.overlay}>
              <View style={localStyles.guideContainer}>
                <DragonflyIcon size={120} color="rgba(255,255,255,0.2)" />
                <Text style={localStyles.guideText}>{t('dashboard.documentScannerModal.guide')}</Text>
              </View>
              
              <View style={localStyles.controls}>
                <TouchableOpacity onPress={resetAndClose} style={localStyles.closeBtn}>
                  <Ionicons name="close" size={32} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCapture} disabled={isProcessing} style={localStyles.captureBtn}>
                  {isProcessing ? <ActivityIndicator color="white" /> : <View style={localStyles.captureBtnInner} />}
                </TouchableOpacity>
                <View style={{ width: 40 }} />
              </View>
            </View>
          </CameraView>
        )}

        {step === 'crop' && capturedImage && (
          <View style={StyleSheet.absoluteFill}>
            <Image source={{ uri: capturedImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={localStyles.cropOverlay}>
              <Text style={localStyles.stepTitle}>{t('dashboard.documentScannerModal.adjust')}</Text>
              
              {/* Corner Points */}
              {points.map((p, i) => (
                <Animated.View 
                  key={i}
                  style={[localStyles.corner, { transform: p.getTranslateTransform() }]}
                  {...panResponders[i].panHandlers}
                />
              ))}

              <View style={localStyles.cropControls}>
                <TouchableOpacity onPress={() => setStep('capture')} style={localStyles.secondaryBtn}>
                  <Text style={localStyles.secondaryBtnText}>{t('dashboard.documentScannerModal.retake')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirmCrop} style={localStyles.primaryBtn}>
                  <Text style={localStyles.primaryBtnText}>{t('dashboard.documentScannerModal.confirm')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {step === 'saving' && capturedImage && (
          <View style={localStyles.savingContainer}>
             <View style={localStyles.previewCard}>
               <Image source={{ uri: capturedImage }} style={localStyles.previewImage} resizeMode="contain" />
               <View style={localStyles.scanEffect} />
             </View>

             <Text style={localStyles.stepTitle}>{t('dashboard.documentScannerModal.save')}</Text>
             <View style={localStyles.subjectGrid}>
               {subjects.map(s => (
                 <TouchableOpacity 
                   key={s.id} 
                   style={[localStyles.subjectItem, selectedSubjectId === s.id && { backgroundColor: s.color + '40', borderColor: s.color }]}
                   onPress={() => setSelectedSubjectId(s.id)}
                 >
                   <View style={[styles.subjectBadge, { backgroundColor: s.color || '#CCC', marginBottom: 0, width: 30, height: 30 }]}>
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
                 disabled={!selectedSubjectId || isProcessing}
                 style={[localStyles.primaryBtn, (!selectedSubjectId || isProcessing) && { opacity: 0.5 }]}
               >
                 {isProcessing ? <ActivityIndicator color="white" /> : <Text style={localStyles.primaryBtnText}>{t('common.save')}</Text>}
               </TouchableOpacity>
             </View>
          </View>
        )}

        {(step === 'filter' || isProcessing) && (
          <View style={localStyles.loaderOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={localStyles.loaderText}>
              {step === 'filter' ? t('dashboard.documentScannerModal.scanFilter') : t('dashboard.documentScannerModal.saving')}
            </Text>
          </View>
        )}

      </View>
    </Modal>
  );
};

const globalStyles = {
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  }
};

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 40,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  guideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  cropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 24,
    justifyContent: 'space-between',
  },
  stepTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 40,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 3,
    borderColor: theme.colors.primary,
    zIndex: 10,
  },
  cropControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  savingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
  },
  previewCard: {
    flex: 0.5,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
    ...globalStyles.shadow,
  },
  previewImage: {
    flex: 1,
  },
  scanEffect: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  subjectItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  subjectName: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  saveActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    marginBottom: 20,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 20,
    fontSize: 16,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
});
