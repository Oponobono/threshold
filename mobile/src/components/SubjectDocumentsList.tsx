import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { subjectDetailStyles as sectionStyles } from '../styles/SubjectDetail.styles';
import { useCustomAlert } from './CustomAlert';
import { deleteScannedDocument } from '../services/api';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

interface SubjectDocumentsListProps {
  documents: any[];
  onGenerateFlashcards?: (uris: string[]) => void;
  onExportPdf?: (uris: string[]) => void;
  onDocumentDeleted?: (id: number | string) => void;
}

export const SubjectDocumentsList: React.FC<SubjectDocumentsListProps> = ({ 
  documents,
  onGenerateFlashcards,
  onExportPdf,
  onDocumentDeleted 
}) => {
  const { t } = useTranslation();
  const { showAlert } = useCustomAlert();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  if (documents.length === 0) return null;

  const openDocument = async (uri: string) => {
    try {
      if (Platform.OS === 'android') {
        // En Android, necesitamos obtener un content URI y usar IntentLauncher
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: 'application/pdf',
        });
      } else {
        // En iOS, Linking puede abrir archivos locales (o webview)
        await Linking.openURL(uri);
      }
    } catch (error) {
      console.error('Error opening document:', error);
      alert('No se pudo abrir el documento. Asegúrate de tener un visor de PDF instalado.');
    }
  };

  const toggleSelection = (id: string | number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
      if (newSelected.size === 0) setSelectionMode(false);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleLongPress = (id: string | number) => {
    if (!selectionMode) {
      setSelectionMode(true);
      toggleSelection(id);
    }
  };

  const handleGenerate = () => {
    if (!onGenerateFlashcards) return;
    const selectedUris = documents
      .filter(d => selectedIds.has(d.id || documents.indexOf(d)))
      .map(d => d.local_uri);
    onGenerateFlashcards(selectedUris);
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleExport = () => {
    if (!onExportPdf) return;
    const selectedUris = documents
      .filter(d => selectedIds.has(d.id || documents.indexOf(d)))
      .map(d => d.local_uri);
    onExportPdf(selectedUris);
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDelete = (docId: number | string) => {
    showAlert({
      title: 'Eliminar documento',
      message: '¿Estás seguro de que quieres eliminar este documento?',
      type: 'confirm',
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScannedDocument(docId);
              onDocumentDeleted?.(docId);
            } catch (e) {
              showAlert({ title: 'Error', message: 'No se pudo eliminar el documento.', type: 'error' });
            }
          }
        }
      ]
    });
  };

  return (
    <View style={sectionStyles.sectionBlock}>
      <View style={sectionStyles.sectionHeaderRow}>
        <View>
          <Text style={sectionStyles.sectionTitle}>{t('subjects.scannedDocuments')}</Text>
          <Text style={sectionStyles.sectionHint}>{t('subjects.scannedDocumentsHint')}</Text>
        </View>
        {selectionMode ? (
          <TouchableOpacity onPress={() => { setSelectionMode(false); setSelectedIds(new Set()); }}>
            <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 12 }}>{t('modals.cancel')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setSelectionMode(true)}>
            <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 12 }}>{t('modals.select')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.list}>
        {documents.map((doc, index) => {
          const docId = doc.id || index;
          const isSelected = selectedIds.has(docId);
          const isPdf = doc.local_uri?.endsWith('.pdf');

          return (
            <TouchableOpacity 
              key={docId} 
              style={[styles.documentCard, isSelected && styles.documentCardSelected]}
              onPress={() => selectionMode ? toggleSelection(docId) : openDocument(doc.local_uri)}
              onLongPress={() => handleLongPress(docId)}
              activeOpacity={0.7}
            >
              {selectionMode && (
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                </View>
              )}
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons 
                  name={isPdf ? "file-pdf-box" : "image-outline"} 
                  size={32} 
                  color={isPdf ? (theme.colors.text.error || '#FF3B30') : theme.colors.primary} 
                />
              </View>
              <View style={styles.infoContainer}>
                <Text style={styles.docName} numberOfLines={1}>
                  {doc.name || `Documento Escaneado ${index + 1}`}
                </Text>
                <Text style={styles.docDate}>
                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Reciente'}
                </Text>
              </View>
              {!selectionMode && (
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Ionicons name="open-outline" size={20} color={theme.colors.text.secondary} />
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); handleDelete(docId); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {selectionMode && selectedIds.size > 0 && (
        <View style={styles.actionBottomBar}>
          <Text style={styles.actionText}>{selectedIds.size} seleccionados</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleExport}>
              <Ionicons name="document-text-outline" size={20} color="white" />
              <Text style={styles.actionBtnText}>{t('subjects.pdf')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]} onPress={handleGenerate}>
              <Ionicons name="flash-outline" size={20} color="white" />
              <Text style={styles.actionBtnText}>{t('subjects.flashcards')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    marginTop: 8,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  list: {
    gap: 12,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconContainer: {
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  docName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  docDate: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  documentCardSelected: {
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  actionBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  actionText: {
    color: 'white',
    fontWeight: '600',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#555',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  }
});
