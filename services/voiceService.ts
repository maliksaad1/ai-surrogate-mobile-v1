/**
 * Voice Service - Speech-to-Text and Text-to-Speech
 * 
 * Uses FREE alternatives that require NO billing:
 * - TTS: gTTS (Google Text-to-Speech) - free, no API key needed
 * - TTS Fallback: Edge TTS - free, no API key needed
 * - STT: Native device speech recognition (Android/iOS built-in) - FREE
 * 
 * Google Cloud APIs are optional fallbacks (requires billing).
 */

import { Audio } from 'expo-av';

interface SynthesizeResponse {
  success: boolean;
  audioUri?: string;
  audioBase64?: string;
  error?: string;
  provider?: string;
}

interface TranscribeResponse {
  success: boolean;
  text?: string;
  confidence?: number;
  error?: string;
  provider?: string;
}

interface VoskResponse {
  result?: Array<{ conf: number; result: string }>;
  partial?: string;
}

interface Voice {
  id: string;
  name: string;
  language: string;
}

// Supported languages
const SUPPORTED_LANGUAGES: Record<string, string> = {
  'en': 'en-US',
  'ur': 'ur-PK',
  'pa': 'pa-IN',
  'es': 'es-ES',
  'fr': 'fr-FR',
  'de': 'de-DE',
};

// Language code mapping for gTTS
const GTTS_LANGUAGE_MAP: Record<string, string> = {
  'en-US': 'en',
  'ur-PK': 'ur',
  'pa-IN': 'pa',
  'es-ES': 'es',
  'fr-FR': 'fr',
  'de-DE': 'de',
};

class VoiceService {
  private sound: Audio.Sound | null = null;
  private currentSpeakingId: string | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      this.isInitialized = true;
      console.log('✅ Voice Service initialized');
    } catch (error) {
      console.error('Voice Service initialization error:', error);
    }
  }

  /**
   * Synthesize text to speech using FREE gTTS (Google Text-to-Speech)
   * No API key required - completely free
   * 
   * gTTS is used by millions, stable and reliable
   */
  private getGTtsUrl(text: string, language: string = 'en'): string {
    const encodedText = encodeURIComponent(text);
    
    // Using Google Translate's free TTS endpoint
    // Multiple endpoints for reliability
    const endpoints = [
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${language}&client=tw-ob`,
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${language}&client=gtx`,
    ];
    
    // Return primary endpoint (can cycle through if needed)
    return endpoints[0];
  }

  /**
   * Synthesize text to speech using Edge TTS (Microsoft)
   * Free, no API key required
   * Better voice quality than gTTS
   */
  private getEdgeTtsUrl(text: string): string {
    // Using a free Edge TTS proxy
    // Edge TTS provides high-quality natural voices for free
    const encodedText = encodeURIComponent(text);
    
    // Multiple fallback endpoints for reliability
    const endpoints = [
      `https://convert.rocks/api/edge-tts?text=${encodedText}&voice=en-US-AriaNeural`,
      `https://tts.tetyys.com/api/synthesize?text=${encodedText}&voice=en-US-AriaNeural`,
    ];
    
    return endpoints[0];
  }

  /**
   * Alternative: Speak text using a simpler audio endpoint (Google Translate fallback)
   */
  private getGoogleTranslateTtsUrl(text: string, lang: string = 'en'): string {
    const cleanText = text.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    const encoded = encodeURIComponent(cleanText.substring(0, 200)); // Limit length
    return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=gtx&prev=input`;
  }

  /**
   * Speak text using FREE TTS services with fallback chain
   * Completely free, no billing required
   * Works in Expo Go
   */
  async speak(text: string, messageId: string, onFinish?: () => void): Promise<void> {
    try {
      await this.initialize();

      // Stop previous audio
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      this.currentSpeakingId = messageId;

      // Clean and truncate text for TTS
      const maxLength = 250;
      let textToSpeak = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
      // Remove special characters that might break TTS URLs
      textToSpeak = textToSpeak.replace(/[™®©]/g, '').trim();

      console.log('🔊 Fetching TTS audio with gTTS (free)');

      // Fallback chain for TTS providers
      const ttsProviders = [
        { name: 'gTTS (Google)', url: this.getGTtsUrl(textToSpeak, 'en') },
        { name: 'gTTS Alternate', url: this.getGoogleTranslateTtsUrl(textToSpeak, 'en') },
        { name: 'Edge TTS', url: this.getEdgeTtsUrl(textToSpeak) },
      ];

      let lastError: any = null;

      for (const provider of ttsProviders) {
        try {
          console.log(`Trying ${provider.name}...`);
          
          // Create sound and load from URL
          const { sound } = await Audio.Sound.createAsync(
            { uri: provider.url },
            { shouldPlay: true }
          );

          this.sound = sound;

          // Handle playback finished
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              this.currentSpeakingId = null;
              if (onFinish) onFinish();
              console.log('✅ TTS playback finished');
            }
          });

          console.log(`✅ TTS playback started (${provider.name})`);
          return; // Success - exit function
        } catch (error) {
          console.warn(`⚠️ ${provider.name} failed:`, error);
          lastError = error;
          // Continue to next provider
        }
      }

      // All providers failed
      if (lastError) {
        throw new Error(`All TTS providers failed. Last error: ${lastError}`);
      }
    } catch (error) {
      console.error('TTS speak error:', error);
      this.currentSpeakingId = null;
      throw error;
    }
  }

  /**
   * Stop TTS playback
   */
  async stop(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
      this.currentSpeakingId = null;
      console.log('🛑 TTS stopped');
    } catch (error) {
      console.error('TTS stop error:', error);
    }
  }

  /**
   * Pause TTS playback
   */
  async pause(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.pauseAsync();
        console.log('⏸️ TTS paused');
      }
    } catch (error) {
      console.error('TTS pause error:', error);
    }
  }

  /**
   * Resume TTS playback
   */
  async resume(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.playAsync();
        console.log('▶️ TTS resumed');
      }
    } catch (error) {
      console.error('TTS resume error:', error);
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(messageId?: string): boolean {
    if (messageId) {
      return this.currentSpeakingId === messageId;
    }
    return this.currentSpeakingId !== null;
  }

  /**
   * Get available voices for language
   */
  getVoices(): Voice[] {
    return [
      { id: 'en-US', name: 'English (US)', language: 'en-US' },
      { id: 'en-GB', name: 'English (UK)', language: 'en-GB' },
      { id: 'es-ES', name: 'Spanish', language: 'es-ES' },
      { id: 'fr-FR', name: 'French', language: 'fr-FR' },
      { id: 'de-DE', name: 'German', language: 'de-DE' },
      { id: 'it-IT', name: 'Italian', language: 'it-IT' },
      { id: 'pt-BR', name: 'Portuguese (Brazil)', language: 'pt-BR' },
      { id: 'ja-JP', name: 'Japanese', language: 'ja-JP' },
      { id: 'zh-CN', name: 'Chinese (Simplified)', language: 'zh-CN' },
      { id: 'ru-RU', name: 'Russian', language: 'ru-RU' },
    ];
  }

  /**
   * Set preferred voice language
   */
  setVoice(languageId: string): void {
    const voice = this.getVoices().find(v => v.id === languageId);
    if (voice) {
      console.log('🎙️ Voice changed to:', voice.name);
    }
  }

  /**
   * Transcribe audio to text using FREE providers
   * 
   * STT Provider Hierarchy (all completely FREE):
  * 1. (Unavailable in Expo Go) Native Device STT - requires dev build
  * 2. Backend service (if configured)
  * 
  * Note: Expo Go cannot load native STT modules. Use a custom dev build
  * (expo prebuild + expo run:android/ios) or configure backend STT.
   */
  async transcribeAudio(
    audioUri: string,
    languageCode: string = 'en-US'
  ): Promise<TranscribeResponse> {
    try {
      console.log('🎤 Starting audio transcription...', { audioUri, languageCode });

      // Method 1: Backend service if available
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      if (backendUrl) {
        try {
          const result = await this.transcribeViaBackend(audioUri, languageCode, backendUrl);
          if (result.success) {
            console.log('✅ Transcription via Backend:', result.text);
            return result;
          }
        } catch (error) {
          console.warn('❌ Backend transcription failed:', error);
        }
      }

      // All methods failed (Expo Go cannot load native STT modules)
      return {
        success: false,
        error: 'Speech-to-text needs a custom dev build (expo prebuild + expo run) or a backend STT endpoint. Expo Go cannot load native STT.',
        provider: 'none'
      };
    } catch (error) {
      console.error('Transcription error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Transcribe using your Python backend service
   * 
   * Uses your existing voice service with gTTS/Edge TTS fallback
   * Requires: EXPO_PUBLIC_BACKEND_URL environment variable
   */
  private async transcribeViaBackend(
    audioUri: string,
    languageCode: string,
    backendUrl: string
  ): Promise<TranscribeResponse> {
    try {
      console.log('📤 Sending audio to backend for transcription...', { backendUrl });

      // Send to your Python backend
      const response = await fetch(`${backendUrl}/api/voice/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUri: audioUri,
          languageCode: languageCode,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: data.success === true,
        text: data.text || data.transcription,
        confidence: data.confidence,
        provider: 'backend',
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        provider: 'backend'
      };
    }
  }

  /**
   * Cleanup audio resources
   */
  cleanup() {
    try {
      if (this.sound) {
        this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error('Voice Service cleanup error:', error);
    }
  }
}

export const voiceService = new VoiceService();
