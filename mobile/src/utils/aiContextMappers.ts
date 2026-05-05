/**
 * aiContextMappers.ts
 *
 * Utilidades para mapear entidades del dominio (grabaciones, fotos, documentos, videos)
 * al formato unificado `AIContextItemData`. Este formato es consumido por los componentes
 * visuales (`AIContextCarousel`, `SubjectAIChatModal`) para representar los elementos
 * adjuntos al contexto del chat con la IA.
 */
import { AIContextItemData, AIContextItemType } from '../components/AIContextItem';
import { RecordingItem } from '../hooks/useAudioRecorder';
import { YouTubeVideo } from '../services/api/types';

/** Mapea grabaciones de audio — hasText=false hasta que el usuario las transcriba */
export function mapRecordings(recordings: RecordingItem[]): AIContextItemData[] {
  return recordings.map((r, i) => ({
    id: `rec_${r.id_string || r.id || i}`,
    label: r.name || 'Grabación de voz',
    uri: r.uri || r.local_uri,
    type: 'recording' as AIContextItemType,
    hasText: false, // se actualiza tras transcribir en RecordingDetail
    rawItem: r,
  }));
}

/** Mapea fotos — hasText=true solo si la foto tiene ocr_text en la BD */
export function mapPhotos(photos: any[]): AIContextItemData[] {
  return photos.map((p, i) => ({
    id: `photo_${p.id ?? i}`,
    label: (p.local_uri || '').split('/').pop() || 'Foto',
    uri: p.local_uri,
    type: 'photo' as AIContextItemType,
    hasText: !!(p.ocr_text && p.ocr_text.length > 0),
    rawItem: p,
  }));
}

/** Mapea documentos escaneados — hasText=true si tienen ocr_text (se genera automáticamente al guardar) */
export function mapDocuments(documents: any[]): AIContextItemData[] {
  return documents.map((d, i) => ({
    id: `doc_${d.id ?? i}`,
    label: d.name || (d.local_uri || '').split('/').pop() || 'Documento',
    uri: d.local_uri,
    type: 'document' as AIContextItemType,
    hasText: !!(d.ocr_text && d.ocr_text.length > 0),
    rawItem: d,
  }));
}

/** Mapea videos de YouTube — hasText=false hasta que el usuario obtenga captions */
export function mapVideos(videos: YouTubeVideo[]): AIContextItemData[] {
  return videos.map((v, i) => ({
    id: `vid_${v.id ?? i}`,
    label: v.title || 'Video de YouTube',
    thumbnailUrl: v.thumbnail_url || undefined,
    type: 'video' as AIContextItemType,
    hasText: false, // se actualiza tras obtener captions en VideoDetail
    rawItem: v,
  }));
}
