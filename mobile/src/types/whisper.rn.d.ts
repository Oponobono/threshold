declare module 'whisper.rn' {
  export interface WhisperOptions {
    filePath: string;
  }
  
  export interface TranscribeOptions {
    language?: string;
    maxLen?: number;
    tokenTimestamps?: boolean;
    // ... other options
  }
  
  export interface WhisperContext {
    transcribe: (audioUri: string, options?: TranscribeOptions) => {
      promise: Promise<{ result: string }>;
      stop: () => void;
    };
  }
  
  export function initWhisper(options: WhisperOptions): Promise<WhisperContext>;
}
