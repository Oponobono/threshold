import React, { useRef, useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, Image, FlatList, Dimensions, Share, ActionSheetIOS, Platform, ActivityIndicator } from 'react-native';
import { useCustomAlert } from './CustomAlert';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { deletePhoto, extractTextFromImage } from '../services/api';
import * as FileSystem from 'expo-file-system';
import { styles } from '../styles/ImageViewerModal.styles';

const { width, height } = Dimensions.get('window');

interface PhotoItem {
  id?: number;
  local_uri: string;
}

interface ImageViewerModalProps {
  isVisible: boolean;
  photos: PhotoItem[];
  initialIndex?: number;
  onClose: () => void;
  onPhotoDeleted: (id: number) => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isVisible,
  photos,
  initialIndex = 0,
  onClose,
  onPhotoDeleted
}) => {
  const { t } = useTranslation();
  const { showAlert } = useCustomAlert();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isVisible && photos.length > 0) {
      const index = Math.min(initialIndex, photos.length - 1);
      setCurrentIndex(index);
      
      // Asegurar que la lista se desplace al índice correcto al abrir
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index,
          animated: false,
        });
      }, 100);
    }
  }, [isVisible, initialIndex, photos.length]);

  const handleShare = async (uri: string) => {
    try {
      await Share.share({
        url: uri, // works well on iOS for local files
        message: t('subjects.photoShareMessage') || 'Mira esta foto',
      });
    } catch (error: any) {
      showAlert({ title: t('common.error'), message: error.message, type: 'error' });
    }
  };

  const handleOCR = async () => {
    const currentPhoto = photos[currentIndex];
    if (!currentPhoto) return;
    try {
      setIsProcessing(true);
      const base64Data = await FileSystem.readAsStringAsync(currentPhoto.local_uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
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

  const handleDelete = async (photoId: number) => {
    showAlert({
      title: t('common.delete') || 'Eliminar',
      message: t('subjects.deletePhotoConfirm') || '¿Estás seguro de que quieres eliminar esta foto?',
      type: 'confirm',
      buttons: [
        { text: t('common.cancel') || 'Cancelar', style: 'cancel' },
        { 
          text: t('common.delete') || 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePhoto(photoId);
              onPhotoDeleted(photoId);
              if (photos.length <= 1) {
                onClose(); // Cerrar si no quedan más fotos
              }
            } catch (error) {
              showAlert({ title: t('common.error'), message: t('subjects.deletePhotoError') || 'Error al eliminar', type: 'error' });
            }
          }
        }
      ]
    });
  };

  const showOptions = () => {
    const currentPhoto = photos[currentIndex];
    if (!currentPhoto) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel') || 'Cancelar', t('common.share') || 'Compartir', t('common.delete') || 'Eliminar'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleShare(currentPhoto.local_uri);
          } else if (buttonIndex === 2) {
            if (currentPhoto.id) handleDelete(currentPhoto.id);
          }
        }
      );
    } else {
      showAlert({
        title: t('common.options') || 'Opciones',
        buttons: [
          { text: t('common.share') || 'Compartir', onPress: () => handleShare(currentPhoto.local_uri) },
          { text: t('common.delete') || 'Eliminar', onPress: () => currentPhoto.id && handleDelete(currentPhoto.id), style: 'destructive' },
          { text: t('common.cancel') || 'Cancelar', style: 'cancel' }
        ]
      });
    }
  };

  const renderItem = ({ item }: { item: PhotoItem }) => (
    <View style={styles.imageContainer}>
      <Image source={{ uri: item.local_uri }} style={styles.image} resizeMode="contain" />
    </View>
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={handleOCR} style={styles.iconButton} disabled={isProcessing}>
              {isProcessing ? <ActivityIndicator color="#C5A059" /> : <Ionicons name="text" size={24} color="#C5A059" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={showOptions} style={styles.iconButton}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        <FlatList
          ref={flatListRef}
          data={photos}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={renderItem}
          initialScrollIndex={initialIndex}
          getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
            }, 500);
          }}
        />
      </View>
    </Modal>
  );
};


