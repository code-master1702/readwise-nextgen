import { splitTextIntoSentences } from './rules';
import { api } from '../services/api';

export interface AudioPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentSentenceIndex: number;
  totalSentences: number;
  currentSentenceText: string;
  error: string | null;
  voiceId: string;
  speed: number;
}

export type PlaybackListener = (state: AudioPlaybackState) => void;

class BookMindAudioEngine {
  private audioEl: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isUsingSpeechSynthesis = false;
  private sentences: string[] = [];
  private currentSentenceIdx = 0;
  private listeners: PlaybackListener[] = [];
  private state: AudioPlaybackState = {
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentSentenceIndex: 0,
    totalSentences: 0,
    currentSentenceText: '',
    error: null,
    voiceId: 'kore',
    speed: 1.0,
  };

  private currentFullText = '';
  private onPageCompleteCallback?: () => void;
  private sentenceTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioEl = new Audio();
      this.audioEl.addEventListener('ended', this.handleAudioEnded.bind(this));
      this.audioEl.addEventListener('error', (e) => {
        console.warn('Audio element error:', e);
        this.fallbackToWebSpeech(this.state.voiceId, this.state.speed);
      });
    }
  }

  public subscribe(listener: PlaybackListener): () => void {
    this.listeners.push(listener);
    listener({ ...this.state });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const cloned = { ...this.state };
    this.listeners.forEach((l) => l(cloned));
  }

  public async playPageText(
    text: string,
    voiceId: string,
    speed: number = 1.0,
    onComplete?: () => void
  ) {
    this.stop();

    const cleanText = text.replace(/[\r\n]+/g, ' ').trim();
    if (!cleanText || cleanText.length < 3) {
      this.state = {
        ...this.state,
        isPlaying: false,
        isLoading: false,
        error: 'This page has no readable text. Jump to another page.',
      };
      this.notify();
      return;
    }

    this.currentFullText = cleanText;
    this.onPageCompleteCallback = onComplete;
    this.sentences = splitTextIntoSentences(cleanText);
    if (this.sentences.length === 0) {
      this.sentences = [cleanText];
    }
    this.currentSentenceIdx = 0;

    // Immediately update state to reflect playback intent
    this.state = {
      ...this.state,
      isPlaying: true,
      isPaused: false,
      isLoading: true,
      currentSentenceIndex: 0,
      totalSentences: this.sentences.length,
      currentSentenceText: this.sentences[0] || '',
      error: null,
      voiceId,
      speed,
    };
    this.notify();

    // Browser audio unlock: user gesture must prime audio element synchronously
    if (this.audioEl) {
      try {
        // Minimal silent data URI to unlock audio on modern iOS/Android/Chrome
        this.audioEl.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        this.audioEl.play().catch(() => {});
      } catch {}
    }

    // Try server-side Gemini Neural TTS first with timeout fallback
    let synthesisFailed = false;
    const fetchController = new AbortController();
    const timeoutId = setTimeout(() => {
      fetchController.abort();
    }, 4500); // 4.5s max wait before fallback to immediate Web Speech

    try {
      const ttsResult = await api.synthesizeAudio(cleanText.slice(0, 1500), voiceId, speed);
      clearTimeout(timeoutId);

      if (ttsResult.audioBase64 && !ttsResult.useDeviceFallback && this.audioEl) {
        this.isUsingSpeechSynthesis = false;
        this.audioEl.src = `data:audio/wav;base64,${ttsResult.audioBase64}`;
        this.audioEl.playbackRate = speed;
        await this.audioEl.play();
        this.state = {
          ...this.state,
          isLoading: false,
          isPlaying: true,
          isPaused: false,
        };
        this.notify();
        this.startSentenceHighlightTimer();
        return;
      } else {
        synthesisFailed = true;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('Neural TTS synthesis failed or timed out; falling back to device speech:', err?.message || err);
      synthesisFailed = true;
    }

    if (synthesisFailed) {
      this.fallbackToWebSpeech(voiceId, speed);
    }
  }

  private startSentenceHighlightTimer() {
    this.clearSentenceTimer();
    if (this.sentences.length <= 1) return;

    const wordsPerMinute = 150 * (this.state.speed || 1.0);
    const wordsPerSecond = wordsPerMinute / 60;

    let idx = 0;
    const advance = () => {
      if (!this.state.isPlaying || this.state.isPaused) return;
      if (idx >= this.sentences.length - 1) return;

      const sentence = this.sentences[idx];
      const wordCount = Math.max(3, sentence.split(/\s+/).length);
      const durationMs = (wordCount / wordsPerSecond) * 1000;

      this.sentenceTimer = setTimeout(() => {
        idx++;
        this.currentSentenceIdx = idx;
        this.state = {
          ...this.state,
          currentSentenceIndex: idx,
          currentSentenceText: this.sentences[idx] || '',
        };
        this.notify();
        advance();
      }, durationMs);
    };

    advance();
  }

  private clearSentenceTimer() {
    if (this.sentenceTimer) {
      clearTimeout(this.sentenceTimer);
      this.sentenceTimer = null;
    }
  }

  private fallbackToWebSpeech(voiceId: string, speed: number) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.state = {
        ...this.state,
        isPlaying: false,
        isLoading: false,
        error: 'Audio playback is not supported on this browser.',
      };
      this.notify();
      return;
    }

    this.isUsingSpeechSynthesis = true;
    window.speechSynthesis.cancel();

    // Start reading sentence by sentence with zero latency
    this.playNextSentenceWebSpeech(0, voiceId, speed);
  }

  private playNextSentenceWebSpeech(index: number, voiceId: string, speed: number) {
    if (index >= this.sentences.length) {
      this.handleAudioEnded();
      return;
    }

    this.currentSentenceIdx = index;
    const sentenceText = this.sentences[index];
    this.state = {
      ...this.state,
      isPlaying: true,
      isPaused: false,
      isLoading: false,
      currentSentenceIndex: index,
      totalSentences: this.sentences.length,
      currentSentenceText: sentenceText,
    };
    this.notify();

    const utterance = new SpeechSynthesisUtterance(sentenceText);
    utterance.rate = Math.min(2.0, Math.max(0.5, speed));

    const availableVoices = window.speechSynthesis.getVoices();
    const isFemale = voiceId === 'kore' || voiceId === 'zephyr' || voiceId === 'aoede';

    const preferredVoice = availableVoices.find((v) => {
      const name = v.name.toLowerCase();
      if (
        isFemale &&
        (name.includes('female') ||
          name.includes('samantha') ||
          name.includes('karen') ||
          name.includes('victoria') ||
          name.includes('zira') ||
          name.includes('google us english'))
      ) {
        return true;
      }
      if (
        !isFemale &&
        (name.includes('male') ||
          name.includes('daniel') ||
          name.includes('george') ||
          name.includes('alex') ||
          name.includes('david'))
      ) {
        return true;
      }
      return false;
    });

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      if (this.state.isPlaying && !this.state.isPaused) {
        this.playNextSentenceWebSpeech(index + 1, voiceId, speed);
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      if (this.state.isPlaying && !this.state.isPaused) {
        this.playNextSentenceWebSpeech(index + 1, voiceId, speed);
      }
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public playVoiceSample(sampleText: string, voiceId: string, speed: number = 1.0) {
    this.stop();
    this.sentences = [sampleText];
    this.currentSentenceIdx = 0;
    this.state = {
      ...this.state,
      isPlaying: true,
      isPaused: false,
      isLoading: true,
      currentSentenceIndex: 0,
      totalSentences: 1,
      currentSentenceText: sampleText,
      voiceId,
      speed,
    };
    this.notify();

    api
      .synthesizeAudio(sampleText, voiceId, speed)
      .then((res) => {
        if (res.audioBase64 && !res.useDeviceFallback && this.audioEl) {
          this.isUsingSpeechSynthesis = false;
          this.audioEl.src = `data:audio/wav;base64,${res.audioBase64}`;
          this.audioEl.playbackRate = speed;
          this.audioEl.play().catch(() => {
            this.fallbackToWebSpeech(voiceId, speed);
          });
          this.state = { ...this.state, isLoading: false };
          this.notify();
        } else {
          this.fallbackToWebSpeech(voiceId, speed);
        }
      })
      .catch(() => {
        this.fallbackToWebSpeech(voiceId, speed);
      });
  }

  public pause() {
    if (this.isUsingSpeechSynthesis && typeof window !== 'undefined') {
      window.speechSynthesis.pause();
    } else if (this.audioEl) {
      this.audioEl.pause();
    }
    this.clearSentenceTimer();
    this.state = { ...this.state, isPlaying: false, isPaused: true };
    this.notify();
  }

  public resume() {
    if (this.isUsingSpeechSynthesis && typeof window !== 'undefined') {
      window.speechSynthesis.resume();
    } else if (this.audioEl) {
      this.audioEl.play().catch(() => {});
      this.startSentenceHighlightTimer();
    }
    this.state = { ...this.state, isPlaying: true, isPaused: false };
    this.notify();
  }

  public stop() {
    this.clearSentenceTimer();
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
      this.audioEl.removeAttribute('src');
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.state = {
      ...this.state,
      isPlaying: false,
      isPaused: false,
      isLoading: false,
      currentSentenceIndex: 0,
      currentSentenceText: '',
      error: null,
    };
    this.notify();
  }

  private handleAudioEnded() {
    this.clearSentenceTimer();
    this.state = {
      ...this.state,
      isPlaying: false,
      isPaused: false,
      isLoading: false,
      currentSentenceIndex: 0,
      currentSentenceText: '',
    };
    this.notify();

    if (this.onPageCompleteCallback) {
      this.onPageCompleteCallback();
    }
  }

  private handleAudioError(e: Event) {
    console.warn('Audio playback error:', e);
    this.clearSentenceTimer();
    this.fallbackToWebSpeech(this.state.voiceId, this.state.speed);
  }
}

export const audioEngine = new BookMindAudioEngine();
