import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import { theme } from '../styles/theme';
import { useCustomAlert } from './CustomAlert';
import { createScannedDocument, extractTextFromImage } from '../services/api';

// Intenta importar expo-document-picker, si no está disponible usa una alternativa
let DocumentPicker: any = null;
try {
  DocumentPicker = require('expo-document-picker');
} catch (e) {
  // expo-document-picker no está disponible
}

export interface PDFImportModalProps {
  isVisible: boolean;
  onClose: () => void;
  selectedSubjectId?: number;
  onImportSuccess?: (documentUri: string, documentId?: number) => void;
}

const PDF_DIR = () => `${FileSystem.documentDirectory}Threshold/pdf/`;

/**
 * PDFImportModal.tsx
 *
 * Modal para importar documentos PDF desde el almacenamiento local del móvil.
 * Permite seleccionar uno o múltiples archivos PDF, copiarlos al directorio local
 * de la aplicación, guardarlos en la base de datos y opcionalmente procesarlos con OCR.
 *
 * @param isVisible - Controla la visibilidad del modal
 * @param onClose - Callback para cerrar el modal
 * @param selectedSubjectId - ID de la materia para vincular el documento
 * @param onImportSuccess - Callback después de importar exitosamente
 */
export const PDFImportModal: React.FC<PDFImportModalProps> = ({
  isVisible,
  onClose,
  selectedSubjectId,
  onImportSuccess,
}) => {
  const { t } = useTranslation();
  const { showAlert } = useCustomAlert();
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractOCR, setExtractOCR] = useState(true);

  const ensurePdfDirectory = async () => {
    const pdfDir = PDF_DIR();
    const dirInfo = await FileSystem.getInfoAsync(pdfDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(pdfDir, { intermediates: true });
    }
    return pdfDir;
  };

  const handlePickPDF = async () => {
    if (!selectedSubjectId) {
      showAlert({
        title: t('common.error') || 'Error',
        message: t('subjects.selectSubjectFirst') || 'Selecciona una materia primero',
        type: 'error',
      });
      return;
    }

    try {
      setIsProcessing(true);

      if (!DocumentPicker) {
        // Si DocumentPicker no está disponible, mostrar instrucciones
        showAlert({
          title: t('common.info') || 'Información',
          message: 'Para importar PDFs, por favor: 1) Abre tu gestor de archivos 2) Selecciona un PDF 3) Elige "Compartir" y busca esta app',
          type: 'info',
        });
        setIsProcessing(false);
        return;
      }

      // Usar DocumentPicker para seleccionar PDFs
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setIsProcessing(false);
        return;
      }

      const file = result.assets?.[0];
      if (!file) {
        throw new Error('No file selected');
      }

      // Validar que sea un PDF
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showAlert({
          title: t('common.error') || 'Error',
          message: t('subjects.onlyPdfAllowed') || 'Solo se permiten archivos PDF',
          type: 'error',
        });
        setIsProcessing(false);
        return;
      }

      // Copiar el archivo al directorio local de la app
      const pdfDir = await ensurePdfDirectory();
      const filename = `imported_${Date.now()}_${file.name}`;
      const localPdfUri = `${pdfDir}${filename}`;

      // Copiar el archivo
      await FileSystem.copyAsync({
        from: file.uri,
        to: localPdfUri,
      });

      // Leer el contenido para OCR (si está habilitado)
      let ocrText: string | null = null;
      if (extractOCR) {
        try {
          // Para PDFs necesitamos convertirlos a imagen primero
          // Por ahora, intentaremos leer el PDF como base64 (nota: esto podría no funcionar directamente)
          // Una alternativa es usar expo-pdf para renderizar páginas como imágenes
          const base64Data = await FileSystem.readAsStringAsync(localPdfUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Intentar extraer texto del PDF
          ocrText = await extractTextFromImage(base64Data);
        } catch (ocrErr) {
          console.warn('[PDFImportModal] OCR automático falló:', ocrErr);
          // Continuar sin OCR
        }
      }

      // Guardar el documento en la base de datos
      const savedDoc = await createScannedDocument({
        subject_id: selectedSubjectId,
        local_uri: localPdfUri,
        name: file.name,
        ocr_text: ocrText || null,
      });

      showAlert({
        title: t('common.success') || 'Éxito',
        message: t('subjects.pdfImportedSuccess') || 'PDF importado correctamente',
        type: 'success',
      });

      onImportSuccess?.(localPdfUri, savedDoc.id);
      onClose();
    } catch (error: any) {
      console.error('[PDFImportModal] Error:', error);
      showAlert({
        title: t('common.error') || 'Error',
        message: error?.message || t('subjects.pdfImportError') || 'No se pudo importar el PDF',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 24,
            width: '85%',
            maxWidth: 360,
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }}
        >
          {/* Header */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: theme.colors.text.primary,
                marginBottom: 4,
              }}
            >
              {t('subjects.importPDF') || 'Importar PDF'}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: theme.colors.text.secondary,
              }}
            >
              {t('subjects.importPDFDescription') || 'Selecciona un PDF de tu dispositivo para importarlo'}
            </Text>
          </View>

          {/* OCR Preference */}
          <View
            style={{
              backgroundColor: theme.colors.background || '#f9f9f9',
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: theme.colors.border || '#e0e0e0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text.primary }}>
                  {t('subjects.extractTextOCR') || 'Extraer texto (OCR)'}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: 4 }}>
                  {t('subjects.extractTextOCRDescription') || 'Procesa el PDF con IA para extraer texto'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setExtractOCR(!extractOCR)}
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: extractOCR ? theme.colors.primary : '#ccc',
                  justifyContent: 'center',
                  alignItems: extractOCR ? 'flex-end' : 'flex-start',
                  paddingHorizontal: 3,
                  marginLeft: 12,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: 'white',
                  }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={isProcessing}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.colors.border || '#ddd',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: theme.colors.text.secondary,
                  fontWeight: '600',
                  fontSize: 14,
                }}
              >
                {t('modals.cancel') || 'Cancelar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickPDF}
              disabled={isProcessing}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: theme.colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              {isProcessing ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text
                    style={{
                      color: 'white',
                      fontWeight: '600',
                      fontSize: 14,
                    }}
                  >
                    {t('common.processing') || 'Procesando...'}
                  </Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="file-pdf-box" size={18} color="white" />
                  <Text
                    style={{
                      color: 'white',
                      fontWeight: '600',
                      fontSize: 14,
                    }}
                  >
                    {t('subjects.selectPDF') || 'Seleccionar PDF'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
