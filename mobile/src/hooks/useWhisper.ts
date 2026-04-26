import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { initWhisper, WhisperContext } from 'whisper.rn';
import { useTranslation } from 'react-i18next';

export type WhisperModelType = 'tiny' | 'base';

const MODEL_URLS = {
  tiny: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
  base: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
};

export function useWhisper() {
  const { t } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [whisperContext, setWhisperContext] = useState<WhisperContext | null>(null);

  const getModelPath = (type: WhisperModelType) => {
    return `${FileSystem.documentDirectory}whisper-${type}.bin`;
  };

  const checkModelExists = async (type: WhisperModelType) => {
    const path = getModelPath(type);
    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
  };

  const downloadModel = async (type: WhisperModelType) => {
    setIsDownloading(true);
    setDownloadProgress(0);
    const path = getModelPath(type);

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        MODEL_URLS[type],
        path,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        }
      );

      await downloadResumable.downloadAsync();
      
      // Initialize context right after downloading
      const context = await initWhisper({ filePath: path });
      setWhisperContext(context);
      
    } catch (error) {
      console.error('Failed to download model:', error);
      throw error;
    } finally {
      setIsDownloading(false);
    }
  };

  const initContextIfNeeded = async (type: WhisperModelType) => {
    if (whisperContext) return;
    
    const exists = await checkModelExists(type);
    if (exists) {
      const path = getModelPath(type);
      const context = await initWhisper({ filePath: path });
      setWhisperContext(context);
    }
  };

  const transcribeAudio = async (audioUri: string, type: WhisperModelType = 'tiny', language: string = 'es') => {
    setIsTranscribing(true);
    try {
      let context = whisperContext;
      
      // If context is not initialized, we try to initialize it.
      if (!context) {
        const path = getModelPath(type);
        context = await initWhisper({ filePath: path });
        setWhisperContext(context);
      }

      const { promise } = context.transcribe(audioUri, {
        language,
        maxLen: 1,
        tokenTimestamps: true,
      });

      const result = await promise;
      return result.result;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    } finally {
      setIsTranscribing(false);
    }
  };

  return {
    isDownloading,
    downloadProgress,
    isTranscribing,
    checkModelExists,
    downloadModel,
    transcribeAudio,
    initContextIfNeeded,
  };
}
