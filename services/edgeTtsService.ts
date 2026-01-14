import { Audio } from 'expo-av';

interface Voice {
  id: string;
  name: string;
  language: string;
}

// VoiceRSS supported languages (free tier)
const VOICE_RSS_VOICES = [
  { id: 'en-us', name: 'English (US)', language: 'en-US' },
  { id: 'en-gb', name: 'English (UK)', language: 'en-GB' },
  { id: 'es-es', name: 'Spanish', language: 'es-ES' },
  { id: 'fr-fr', name: 'French', language: 'fr-FR' },
  { id: 'de-de', name: 'German', language: 'de-DE' },
  { id: 'it-it', name: 'Italian', language: 'it-IT' },
  { id: 'pt-br', name: 'Portuguese (Brazil)', language: 'pt-BR' },
  { id: 'ja-jp', name: 'Japanese', language: 'ja-JP' },
  { id: 'zh-cn', name: 'Chinese (Simplified)', language: 'zh-CN' },
  { id: 'ru-ru', name: 'Russian', language: 'ru-RU' },
];

class EdgeTtsService {
  private sound: Audio.Sound | null = null;
  private currentSpeakingId: string | null = null;
  private selectedVoice = 'en-us'; // VoiceRSS uses language codes, not voice IDs
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
      console.log('Edge TTS Service initialized');
    } catch (error) {
      console.error('Edge TTS initialization error:', error);
    }
  }

  /**
   * Generate TTS audio URL from VoiceRSS API
   * Free service - no API key required for basic usage
   * More reliable than ttsapi.io
   */
  private getVoiceRssUrl(text: string): string {
    // VoiceRSS is a reliable free TTS service
    // API endpoint works without authentication
    const encodedText = encodeURIComponent(text);
    const lang = 'en-us';
    const rate = '0'; // -10 to 10 range
    
    // Using VoiceRSS public API
    return `https://api.voicerss.org/?key=free&hl=${lang}&r=${rate}&c=mp3&f=48khz_16bit_mono&src=${encodedText}`;
  }

  async speak(text: string, messageId: string, onFinish?: () => void): Promise<void> {
    try {
      await this.initialize();

      // Stop previous audio
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      this.currentSpeakingId = messageId;

      // Truncate long texts (Edge TTS has limits)
      const maxLength = 500;
      const textToSpeak = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

      console.log('Fetching TTS audio for:', textToSpeak.substring(0, 50) + '...');

      // Get TTS audio URL
      const ttsUrl = this.getVoiceRssUrl(textToSpeak);

      // Create sound and load from URL
      const { sound } = await Audio.Sound.createAsync(
        { uri: ttsUrl },
        { shouldPlay: true }
      );

      this.sound = sound;

      // Handle playback finished
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.currentSpeakingId = null;
          if (onFinish) onFinish();
          console.log('TTS playback finished');
        }
      });

      console.log('TTS playback started');
    } catch (error) {
      console.error('TTS speak error:', error);
      this.currentSpeakingId = null;
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
      this.currentSpeakingId = null;
      console.log('TTS stopped');
    } catch (error) {
      console.error('TTS stop error:', error);
    }
  }

  async pause(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.pauseAsync();
        console.log('TTS paused');
      }
    } catch (error) {
      console.error('TTS pause error:', error);
    }
  }

  async resume(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.playAsync();
        console.log('TTS resumed');
      }
    } catch (error) {
      console.error('TTS resume error:', error);
    }
  }

  isSpeaking(messageId?: string): boolean {
    if (messageId) {
      return this.currentSpeakingId === messageId;
    }
    return this.currentSpeakingId !== null;
  }

  getVoices(): Voice[] {
    return VOICE_RSS_VOICES;
  }

  setVoice(voiceId: string): void {
    const voice = VOICE_RSS_VOICES.find(v => v.id === voiceId);
    if (voice) {
      this.selectedVoice = voiceId;
      console.log('Voice changed to:', voice.name);
    }
  }

  getCurrentVoice(): string {
    return this.selectedVoice;
  }

  cleanup() {
    try {
      if (this.sound) {
        this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error('TTS cleanup error:', error);
    }
  }
}

export const edgeTtsService = new EdgeTtsService();
