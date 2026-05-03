import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { AIContextCarousel } from './AIContextCarousel';
import { AIContextItemData, AIContextItemType } from './AIContextItem';
import { RecordingItem } from '../hooks/useAudioRecorder';
import { YouTubeVideo } from '../services/api/types';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface SubjectAIContextModalProps {
  isVisible: boolean;
  onClose: () => void;
  subjectName: string;
  recordings?: RecordingItem[];
  photos?: any[];
  documents?: any[];
  videos?: YouTubeVideo[];
  onGenerateFlashcards?: (selectedItems: AIContextItemData[]) => void;
  onAskQuestions?: (selectedItems: AIContextItemData[]) => void;
}

// ─── Helpers: mappers to AIContextItemData ───────────────────────────────────

function mapRecordings(recordings: RecordingItem[]): AIContextItemData[] {
  return recordings.map((r, i) => ({
    id: `rec_${r.id_string || r.id || i}`,
    label: r.name || 'Grabación de voz',
    uri: r.uri || r.local_uri,
    type: 'recording' as AIContextItemType,
    rawItem: r,
  }));
}

function mapPhotos(photos: any[]): AIContextItemData[] {
  return photos.map((p, i) => ({
    id: `photo_${p.id ?? i}`,
    label: (p.local_uri || '').split('/').pop() || 'Foto',
    uri: p.local_uri,
    type: 'photo' as AIContextItemType,
    rawItem: p,
  }));
}

function mapDocuments(documents: any[]): AIContextItemData[] {
  return documents.map((d, i) => ({
    id: `doc_${d.id ?? i}`,
    label: d.name || (d.local_uri || '').split('/').pop() || 'Documento',
    uri: d.local_uri,
    type: 'document' as AIContextItemType,
    rawItem: d,
  }));
}

function mapVideos(videos: YouTubeVideo[]): AIContextItemData[] {
  return videos.map((v, i) => ({
    id: `vid_${v.id ?? i}`,
    label: v.title || 'Video de YouTube',
    thumbnailUrl: v.thumbnail_url || undefined,
    type: 'video' as AIContextItemType,
    rawItem: v,
  }));
}

// ─── Component ───────────────────────────────────────────────────────────────

export const SubjectAIContextModal: React.FC<SubjectAIContextModalProps> = ({
  isVisible,
  onClose,
  subjectName,
  recordings = [],
  photos = [],
  documents = [],
  videos = [],
  onGenerateFlashcards,
  onAskQuestions,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Map raw data once per render
  const allSections: { type: AIContextItemType; items: AIContextItemData[] }[] = useMemo(() => [
    { type: 'document',  items: mapDocuments(documents)   },
    { type: 'photo',     items: mapPhotos(photos)         },
    { type: 'recording', items: mapRecordings(recordings) },
    { type: 'video',     items: mapVideos(videos)         },
  ], [documents, photos, recordings, videos]);

  const allItems = useMemo(() => allSections.flatMap(s => s.items), [allSections]);

  const totalSelected = selectedIds.size;
  const hasContent = allItems.length > 0;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleToggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((items: AIContextItemData[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected = items.every(i => next.has(i.id));
      if (allSelected) {
        items.forEach(i => next.delete(i.id));
      } else {
        items.forEach(i => next.add(i.id));
      }
      return next;
    });
  }, []);

  const handleGenerate = useCallback(() => {
    const selected = allItems.filter(i => selectedIds.has(i.id));
    onGenerateFlashcards?.(selected);
  }, [allItems, selectedIds, onGenerateFlashcards]);

  const handleAsk = useCallback(() => {
    const selected = allItems.filter(i => selectedIds.has(i.id));
    onAskQuestions?.(selected);
  }, [allItems, selectedIds, onAskQuestions]);

  const handleClose = () => {
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="auto-fix" size={22} color={theme.colors.primary} />
                <Text style={styles.title}>Asistente de IA</Text>
              </View>
              <Text style={styles.subtitle}>
                Selecciona archivos de <Text style={{ fontWeight: '700', color: theme.colors.text.primary }}>{subjectName}</Text> para dar contexto a la IA
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Badge de selección */}
          {totalSelected > 0 && (
            <View style={styles.selectionBadge}>
              <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />
              <Text style={styles.selectionBadgeText}>
                {totalSelected} {totalSelected === 1 ? 'archivo seleccionado' : 'archivos seleccionados'}
              </Text>
            </View>
          )}

          {/* Carruseles */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {!hasContent ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="folder-open-outline" size={48} color={theme.colors.border} />
                <Text style={styles.emptyTitle}>Sin recursos disponibles</Text>
                <Text style={styles.emptyText}>
                  Agrega grabaciones, fotos, documentos o videos a esta materia para usarlos con la IA.
                </Text>
              </View>
            ) : (
              allSections.map(section => (
                <AIContextCarousel
                  key={section.type}
                  type={section.type}
                  items={section.items}
                  selectedIds={selectedIds}
                  onToggle={handleToggle}
                  onSelectAll={() => handleSelectAll(section.items)}
                />
              ))
            )}
          </ScrollView>

          {/* Botones de acción */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <TouchableOpacity
              onPress={handleAsk}
              disabled={totalSelected === 0}
              style={[styles.actionBtn, styles.askBtn, totalSelected === 0 && styles.actionBtnDisabled]}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="chat-processing-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Preguntar a IA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleGenerate}
              disabled={totalSelected === 0}
              style={[styles.actionBtn, styles.generateBtn, totalSelected === 0 && styles.actionBtnDisabled]}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="cards-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Crear Flashcards</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '88%',
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 12, marginBottom: 12,
  },
  title: {
    fontSize: 18, fontWeight: '800',
    color: theme.colors.text.primary, letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13, marginTop: 4,
    color: theme.colors.text.secondary, lineHeight: 18,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  selectionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${theme.colors.primary}15`,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', marginBottom: 14,
  },
  selectionBadgeText: {
    fontSize: 12, fontWeight: '700', color: theme.colors.primary,
  },
  scrollContent: {
    paddingTop: 8, paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 40, gap: 10,
  },
  emptyTitle: {
    fontSize: 15, fontWeight: '700', color: theme.colors.text.primary,
  },
  emptyText: {
    fontSize: 13, color: theme.colors.text.secondary,
    textAlign: 'center', lineHeight: 19,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 16,
  },
  askBtn: {
    backgroundColor: theme.colors.secondary || '#10B981',
  },
  generateBtn: {
    backgroundColor: theme.colors.primary,
  },
  actionBtnDisabled: {
    backgroundColor: theme.colors.border,
  },
  actionBtnText: {
    color: '#fff', fontWeight: '700', fontSize: 13,
  },
});
