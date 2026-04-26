import React, { useState, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../styles/theme';
import { dashboardStyles } from '../styles/Dashboard.styles';
import { Subject, createPhoto } from '../services/api';
import { styles } from '../styles/PhotoCaptureModal.styles';

interface PhotoCaptureModalProps {
  isVisible: boolean;
  onClose: () => void;
  subjects: Subject[];
  onSave?: (uri: string, subjectId: number) => void;
  initialSubjectId?: number;
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isVisible,
  onClose,
  subjects,
  onSave,
  initialSubjectId
}) => {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(initialSubjectId || null);
  const [isProcessing, setIsProcessing] = useState(false);

  // If permissions are not yet determined
  if (!permission) {
    return <View />;
  }

  // Request permissions if not granted
  if (!permission.granted && isVisible) {
    return (
      <Modal visible={isVisible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>{t('dashboard.quickAddMenu.errors.cameraPermission')}</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>{t('common.grantPermission') || 'Dar Permiso'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        setCapturedImage(photo.uri);
      } catch (err) {
        Alert.alert(t('common.error'), t('subjects.errorTakingPhoto') || 'Error');
      }
    }
  };

  const handleSave = async () => {
    if (!capturedImage || !selectedSubjectId) {
      Alert.alert(t('common.error'), t('dashboard.documentScannerModal.selectSubjectError') || 'Error');
      return;
    }

    try {
      setIsProcessing(true);
      await createPhoto({
        subject_id: selectedSubjectId,
        local_uri: capturedImage,
      });
      if (onSave) onSave(capturedImage, selectedSubjectId);
      Alert.alert(t('common.success'), t('dashboard.quickAddMenu.takePhoto.success') || 'Éxito');
      resetAndClose();
    } catch (error) {
      Alert.alert(t('common.error'), t('dashboard.quickAddMenu.takePhoto.error') || 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAndClose = () => {
    setCapturedImage(null);
    setSelectedSubjectId(initialSubjectId || null);
    setIsProcessing(false);
    onClose();
  };

  const isSaveDisabled = !selectedSubjectId || isProcessing;

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={resetAndClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={resetAndClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={theme.colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{capturedImage ? t('common.preview') || 'Preview' : t('dashboard.quickAddMenu.takePhoto') || 'Tomar Foto'}</Text>
          <View style={{ width: 44 }} />
        </View>

        {!capturedImage ? (
          <CameraView style={styles.camera} facing="back" ref={cameraRef}>
            <View style={styles.cameraOverlay}>
              <View style={styles.captureButtonContainer}>
                <TouchableOpacity style={styles.captureButtonOuter} onPress={takePicture}>
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{ uri: capturedImage }} style={styles.previewImage} resizeMode="contain" />
            
            <View style={styles.actionSheet}>
              <Text style={styles.sheetTitle}>{t('dashboard.documentScannerModal.save') || 'Guardar'}</Text>
              
              <View style={styles.subjectGrid}>
                {subjects.map(s => (
                  <TouchableOpacity 
                    key={s.id} 
                    style={[styles.subjectItem, selectedSubjectId === s.id && { backgroundColor: s.color ? s.color + '40' : undefined, borderColor: s.color || undefined }]}
                    onPress={() => setSelectedSubjectId(s.id)}
                  >
                    <View style={[dashboardStyles.subjectBadge, { backgroundColor: s.color || '#CCC', marginRight: 0, marginBottom: 4 }]}>
                      <MaterialCommunityIcons name={(s.icon as any) || 'book-outline'} size={18} color={theme.colors.text.primary} />
                    </View>
                    <Text style={styles.subjectName} numberOfLines={1}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.saveActions}>
                <TouchableOpacity onPress={() => setCapturedImage(null)} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>{t('common.retake') || 'Reintentar'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleSave} 
                  disabled={isSaveDisabled}
                  style={[styles.primaryBtn, isSaveDisabled && styles.primaryBtnDisabled]}
                >
                  {isProcessing ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>{t('common.save') || 'Guardar'}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};


