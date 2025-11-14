import { useState, useCallback, useRef, useEffect } from 'react';
import { getApiUrl } from '../config/api';

interface TTSOptions {
  voice?: string;
  audioFormat?: string;
  modelName?: string;
  languageCode?: string;
}

interface TTSResponse {
  success: boolean;
  audio_data?: string;
  voice_used?: string;
  error?: string;
}

export const useTTS = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Generate TTS - exactly like HTML version
  const generateTTS = useCallback(async (text: string, options: TTSOptions = {}): Promise<TTSResponse> => {
    console.log('🔊 [TTS API DEBUG] generateTTS called with:', { 
      text: text, 
      textLength: text.length, 
      textType: typeof text,
      textTrimmed: text.trim(),
      textIsEmpty: !text.trim(),
      options 
    });
    
    if (!text.trim()) {
      console.log('🔊 [TTS API DEBUG] No text provided - returning error');
      return { success: false, error: 'No text provided' };
    }

    setIsGenerating(true);
    console.log('🔊 [TTS API DEBUG] Set isGenerating to true');

    try {
      const voice = options.voice || 'en-US-Chirp3-HD-Charon';
      const audioFormat = options.audioFormat || 'MP3';
      
      const ttsUrl = getApiUrl('/api/tts/synthesize');
      console.log('🔊 [TTS API DEBUG] Making API call to:', ttsUrl);
      console.log('🔊 [TTS API DEBUG] Full text being sent:', text);
      console.log('🔊 [TTS API DEBUG] Text length:', text.length);
      console.log('🔊 [TTS API DEBUG] Text type:', typeof text);
      console.log('🔊 [TTS API DEBUG] Text trimmed:', text.trim());
      console.log('🔊 [TTS API DEBUG] Request body:', {
        text: text,
        voice_name: voice,
        model_name: options.modelName || 'gemini-2.5-flash-tts',
        audio_format: audioFormat,
        language_code: options.languageCode || 'en-US'
      });
      
      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice_name: voice,
          model_name: options.modelName || 'gemini-2.5-flash-tts',
          audio_format: audioFormat,
          language_code: options.languageCode || 'en-US'
        })
      });

      console.log('🔊 [TTS API DEBUG] Response status:', response.status);
      const data = await response.json();
      console.log('🔊 [TTS API DEBUG] Response data:', { success: data.success, hasAudio: !!data.audio_data, error: data.error });

      if (data.success && data.audio_data) {
        return {
          success: true,
          audio_data: data.audio_data,
          voice_used: data.voice_used
        };
      } else {
        return {
          success: false,
          error: data.error || 'TTS generation failed'
        };
      }
    } catch (error) {
      console.error('TTS Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Play audio - exactly like HTML version
  const playAudio = useCallback((audioData: string, format: string = 'MP3') => {
    if (!audioData) {
      return;
    }

    try {
      // Convert base64 to blob
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const mimeType = format === 'MP3' ? 'audio/mpeg' : 
                      format === 'OGG_OPUS' ? 'audio/ogg' : 'audio/wav';
      
      const audioBlob = new Blob([bytes], { type: mimeType });
      setCurrentAudioBlob(audioBlob); // Store blob for replay/download
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and play audio
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.play().catch(error => {
        console.error('Audio play error:', error);
      });
      
      // Clean up URL after playing
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }, []);

  // Play audio without storing blob (for replay button to avoid showing icons)
  const playAudioWithoutBlob = useCallback((audioData: string, format: string = 'MP3') => {
    if (!audioData) {
      return;
    }

    try {
      // Convert base64 to blob
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const mimeType = format === 'MP3' ? 'audio/mpeg' : 
                      format === 'OGG_OPUS' ? 'audio/ogg' : 'audio/wav';
      
      const audioBlob = new Blob([bytes], { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and play audio
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.play().catch(error => {
        console.error('Audio play error:', error);
      });
      
      // Clean up URL after playing
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }, []);

  // Generate and play TTS (combined function)
  const generateAndPlayTTS = useCallback(async (text: string, options: TTSOptions = {}) => {
    console.log('🔊 [TTS HOOK DEBUG] generateAndPlayTTS called with:', { text: text.substring(0, 50) + '...', options });
    
    if (!text.trim()) {
      console.log('🔊 [TTS HOOK DEBUG] No text provided, skipping TTS');
      return;
    }
    
    try {
      console.log('🔊 [TTS HOOK DEBUG] Calling generateTTS...');
      const ttsResult = await generateTTS(text, options);
      console.log('🔊 [TTS HOOK DEBUG] TTS result:', { success: ttsResult.success, hasAudio: !!ttsResult.audio_data });
      
      if (ttsResult.success && ttsResult.audio_data) {
        console.log('🔊 [TTS HOOK DEBUG] Playing audio...');
        playAudio(ttsResult.audio_data, options.audioFormat || 'MP3');
        console.log('🔊 [TTS HOOK DEBUG] Audio play initiated');
      } else {
        console.log('🔊 [TTS HOOK DEBUG] TTS failed or no audio data:', ttsResult.error);
      }
    } catch (error) {
      console.error('🔊 [TTS HOOK DEBUG] TTS generation failed:', error);
    }
  }, [generateTTS, playAudio]);

  // Stop current audio
  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }, []);

  // Play current audio blob
  const playCurrentAudio = useCallback(() => {
    if (currentAudioBlob) {
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      
      const audio = new Audio();
      const audioUrl = URL.createObjectURL(currentAudioBlob);
      audio.src = audioUrl;
      currentAudioRef.current = audio;
      
      audio.play().catch(error => {
        console.error('Audio play error:', error);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      });
      
      // Clean up URL after playing
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
    }
  }, [currentAudioBlob]);

  // Download current audio
  const downloadAudio = useCallback(() => {
    if (currentAudioBlob) {
      const url = URL.createObjectURL(currentAudioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tts_${Date.now()}.${currentAudioBlob.type.split('/')[1]}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [currentAudioBlob]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up any active audio when component unmounts
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  return {
    generateTTS,
    playAudio,
    playAudioWithoutBlob,
    stopAudio,
    isGenerating,
    generateAndPlayTTS,
    playCurrentAudio,
    downloadAudio,
    currentAudioBlob
  };
};



