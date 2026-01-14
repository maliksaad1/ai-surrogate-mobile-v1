import Tts from 'react-native-tts';

interface Voice {
  id: string;
  name: string;
  language: string;
}

class TTSService {
  private isInitialized = false;
  private currentSpeakingId: string | null = null;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Set default TTS configuration
      await Tts.setDefaultLanguage('en-US');
      await Tts.setDefaultRate(0.5); // Speech rate (0.5 = normal)
      await Tts.setDefaultPitch(1.0); // Pitch (1.0 = normal)
      
      // Add event listeners
      Tts.addEventListener('tts-start', this.onStart);
      Tts.addEventListener('tts-finish', this.onFinish);
      Tts.addEventListener('tts-cancel', this.onCancel);
      
      this.isInitialized = true;
      console.log('TTS Service initialized successfully');
    } catch (error) {
      console.error('TTS initialization error:', error);
    }
  }

  private onStart = (event: any) => {
    console.log('TTS started:', event);
  };

  private onFinish = (event: any) => {
    console.log('TTS finished:', event);
    this.currentSpeakingId = null;
  };

  private onCancel = (event: any) => {
    console.log('TTS cancelled:', event);
    this.currentSpeakingId = null;
  };

  async speak(text: string, messageId: string, onFinish?: () => void): Promise<void> {
    try {
      await this.initialize();
      
      // Stop any current speech
      if (this.currentSpeakingId) {
        await this.stop();
      }
      
      this.currentSpeakingId = messageId;
      
      // Start speaking
      await Tts.speak(text);
      
      // Call callback when finished
      if (onFinish) {
        Tts.addEventListener('tts-finish', onFinish);
      }
    } catch (error) {
      console.error('TTS speak error:', error);
      this.currentSpeakingId = null;
    }
  }

  async stop(): Promise<void> {
    try {
      await Tts.stop();
      this.currentSpeakingId = null;
    } catch (error) {
      console.error('TTS stop error:', error);
    }
  }

  async pause(): Promise<void> {
    try {
      // Note: pause/resume not supported on all platforms
      // Fallback to stop if needed
      await Tts.stop();
    } catch (error) {
      console.error('TTS pause error:', error);
    }
  }

  isSpeaking(messageId?: string): boolean {
    if (messageId) {
      return this.currentSpeakingId === messageId;
    }
    return this.currentSpeakingId !== null;
  }

  async getVoices(): Promise<Voice[]> {
    try {
      await this.initialize();
      const voices = await Tts.voices();
      return voices.map((v: any) => ({
        id: v.id,
        name: v.name,
        language: v.language
      }));
    } catch (error) {
      console.error('TTS getVoices error:', error);
      return [];
    }
  }

  async setVoice(voiceId: string): Promise<void> {
    try {
      await this.initialize();
      await Tts.setDefaultVoice(voiceId);
    } catch (error) {
      console.error('TTS setVoice error:', error);
    }
  }

  async setRate(rate: number): Promise<void> {
    try {
      await this.initialize();
      await Tts.setDefaultRate(rate);
    } catch (error) {
      console.error('TTS setRate error:', error);
    }
  }

  cleanup() {
    try {
      Tts.removeAllListeners('tts-start');
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
    } catch (error) {
      console.error('TTS cleanup error:', error);
    }
  }
}

export const ttsService = new TTSService();
