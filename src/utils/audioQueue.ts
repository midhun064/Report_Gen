/**
 * Audio Queue Manager
 * Handles sequential playback of TTS audio chunks to prevent overlapping audio streams
 */

export interface AudioChunk {
  id: string;
  audioData: string;
  audioFormat: string;
  text?: string;
  chunkIndex?: number;
  timestamp: number;
  // Synchronization properties
  textStartPosition?: number;
  textEndPosition?: number;
  shouldWaitForText?: boolean;
}

export interface AudioQueueOptions {
  maxQueueSize?: number;
  debugMode?: boolean;
  onPlay?: (chunk: AudioChunk) => void;
  onComplete?: (chunk: AudioChunk) => void;
  onError?: (chunk: AudioChunk, error: Error) => void;
  onQueueEmpty?: () => void;
}

export class AudioQueueManager {
  private queue: AudioChunk[] = [];
  private isPlaying: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;
  private options: AudioQueueOptions;
  private currentTextLength: number = 0;
  private textUpdateCallback?: (length: number) => void;

  constructor(options: AudioQueueOptions = {}) {
    this.options = {
      maxQueueSize: 50,
      debugMode: false,
      ...options
    };
  }

  /**
   * Set callback for text updates to enable synchronization
   */
  setTextUpdateCallback(callback: (length: number) => void): void {
    this.textUpdateCallback = callback;
  }

  /**
   * Set options dynamically (useful for callbacks)
   */
  setOptions(options: Partial<AudioQueueOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Update current text length for synchronization
   */
  updateTextLength(length: number): void {
    this.currentTextLength = length;
    this.textUpdateCallback?.(length);
    this.debugLog(`Text length updated to: ${length}`);
  }

  /**
   * Add an audio chunk to the queue with synchronization
   */
  enqueue(audioData: string, audioFormat: string, text?: string, chunkIndex?: number, textStartPosition?: number, textEndPosition?: number): string {
    const chunk: AudioChunk = {
      id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      audioData,
      audioFormat: audioFormat.toLowerCase(),
      text,
      chunkIndex,
      timestamp: Date.now(),
      textStartPosition,
      textEndPosition,
      shouldWaitForText: textStartPosition !== undefined
    };

    // Check queue size limit
    if (this.queue.length >= (this.options.maxQueueSize || 50)) {
      this.debugLog('Queue is full, removing oldest chunk');
      this.queue.shift();
    }

    this.queue.push(chunk);
    this.debugLog(`Enqueued audio chunk ${chunk.id}. Queue size: ${this.queue.length}`);

    // Start processing if not already playing
    if (!this.isPlaying) {
      this.processQueue();
    }

    return chunk.id;
  }

  /**
   * Process the audio queue with real-time synchronization
   */
  private async processQueue(): Promise<void> {
    if (this.isPlaying || this.queue.length === 0) {
      return;
    }

    this.isPlaying = true;
    this.debugLog('Starting real-time audio queue processing');

    while (this.queue.length > 0) {
      const chunk = this.queue[0]; // Look at first chunk without removing
      
      // For real-time TTS, play chunks immediately as they arrive
      // Only wait for text synchronization if explicitly requested
      if (chunk.shouldWaitForText && chunk.textStartPosition !== undefined) {
        if (this.currentTextLength < chunk.textStartPosition) {
          this.debugLog(`Waiting for text to reach position ${chunk.textStartPosition}, current: ${this.currentTextLength}`);
          // Wait a bit and check again
          await new Promise(resolve => setTimeout(resolve, 50)); // Reduced wait time for real-time
          continue;
        }
      }

      // Remove the chunk from queue
      this.queue.shift();
      if (!chunk) break;

      try {
        await this.playAudioChunk(chunk);
      } catch (error) {
        this.debugLog(`Error playing audio chunk ${chunk.id}: ${error}`);
        this.options.onError?.(chunk, error as Error);
      }
    }

    this.isPlaying = false;
    this.debugLog('Real-time audio queue processing completed');
    this.options.onQueueEmpty?.();
  }

  /**
   * Play a single audio chunk
   */
  private playAudioChunk(chunk: AudioChunk): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.debugLog(`Playing audio chunk ${chunk.id}: "${chunk.text?.substring(0, 30)}..."`);

        // Stop any currently playing audio
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
        }

        // Convert base64 to blob
        const binaryString = atob(chunk.audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const mimeType = this.getMimeType(chunk.audioFormat);
        const audioBlob = new Blob([bytes], { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Create and configure audio element
        this.currentAudio = new Audio(audioUrl);
        
        this.currentAudio.onplay = () => {
          this.debugLog(`Audio chunk ${chunk.id} started playing`);
          this.options.onPlay?.(chunk);
        };

        this.currentAudio.onended = () => {
          this.debugLog(`Audio chunk ${chunk.id} finished playing`);
          URL.revokeObjectURL(audioUrl);
          this.options.onComplete?.(chunk);
          resolve();
        };

        this.currentAudio.onerror = (error) => {
          this.debugLog(`Audio chunk ${chunk.id} playback error: ${error}`);
          URL.revokeObjectURL(audioUrl);
          reject(new Error(`Audio playback failed: ${error}`));
        };

        // Start playback - handle autoplay restrictions
        this.currentAudio.play().catch(error => {
          URL.revokeObjectURL(audioUrl);
          
          // Check if error is due to autoplay policy
          if (error.name === 'NotAllowedError') {
            console.warn(`🔊 [AUDIO QUEUE] Autoplay blocked - user interaction required. Chunk: ${chunk.id}`);
            reject(new Error(`Autoplay blocked: ${error.message}`));
          } else {
            reject(new Error(`Audio play failed: ${error.message}`));
          }
        });

      } catch (error) {
        reject(new Error(`Audio chunk processing failed: ${error}`));
      }
    });
  }

  /**
   * Get MIME type for audio format
   */
  private getMimeType(format: string): string {
    switch (format.toLowerCase()) {
      case 'mp3':
        return 'audio/mpeg';
      case 'ogg_opus':
      case 'ogg':
        return 'audio/ogg';
      case 'wav':
        return 'audio/wav';
      case 'linear16':
        return 'audio/wav';
      default:
        return 'audio/mpeg'; // Default to MP3
    }
  }

  /**
   * Clear the audio queue
   */
  clear(): void {
    this.debugLog('Clearing audio queue');
    this.queue = [];
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    
    this.isPlaying = false;
  }

  /**
   * Stop current playback and clear queue
   */
  stop(): void {
    this.debugLog('Stopping audio playback and clearing queue');
    
    // Stop current audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    
    // Clear queue
    this.clear();
    
    // 🆕 ADD: Revoke any pending audio URLs to prevent memory leaks
    this.queue.forEach(chunk => {
      if (chunk.audioUrl) {
        URL.revokeObjectURL(chunk.audioUrl);
      }
    });
    
    this.isPlaying = false;
    this.debugLog('Audio queue completely stopped and cleaned up');
  }

  /**
   * Get current queue status
   */
  getStatus(): {
    queueSize: number;
    isPlaying: boolean;
    currentChunk: AudioChunk | null;
  } {
    return {
      queueSize: this.queue.length,
      isPlaying: this.isPlaying,
      currentChunk: this.queue[0] || null
    };
  }

  /**
   * Debug logging
   */
  private debugLog(message: string): void {
    if (this.options.debugMode) {
      console.log(`🔊 [AUDIO QUEUE] ${message}`);
    }
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.options.debugMode = enabled;
  }
}

// Global audio queue instance
export const globalAudioQueue = new AudioQueueManager({
  debugMode: true,
  onPlay: (chunk) => {
    console.log(`🎵 [AUDIO QUEUE] Playing: "${chunk.text?.substring(0, 40)}..."`);
  },
  onComplete: (chunk) => {
    console.log(`✅ [AUDIO QUEUE] Completed: "${chunk.text?.substring(0, 40)}..."`);
  },
  onError: (chunk, error) => {
    console.error(`❌ [AUDIO QUEUE] Error playing "${chunk.text?.substring(0, 40)}...":`, error);
  },
  onQueueEmpty: () => {
    console.log(`🏁 [AUDIO QUEUE] All audio chunks completed`);
  }
});




