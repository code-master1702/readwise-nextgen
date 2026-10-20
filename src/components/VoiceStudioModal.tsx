import React, { useState, useEffect } from 'react';
import { Volume2, Play, Square, Check, X, Sliders, Sparkles, Filter } from 'lucide-react';
import { VoiceOption, UserPreferences } from '../types';
import { AVAILABLE_VOICES } from '../data/voices';
import { audioEngine, AudioPlaybackState } from '../utils/audioPlayer';

interface VoiceStudioModalProps {
  isOpen?: boolean;
  onClose: () => void;
  preferences?: UserPreferences;
  onUpdatePreferences?: (updated: Partial<UserPreferences>) => void;
  currentVoiceId?: string;
  currentSpeed?: number;
  onSelectVoice?: (voiceId: string, speed?: number) => void;
}

export const VoiceStudioModal: React.FC<VoiceStudioModalProps> = ({
  isOpen = true,
  onClose,
  preferences,
  onUpdatePreferences,
  currentVoiceId,
  currentSpeed,
  onSelectVoice,
}) => {
  const activeVoiceId = currentVoiceId || preferences?.voiceId || 'kore';
  const activeSpeed = currentSpeed || preferences?.speed || 1.0;
  const [selectedVoiceId, setSelectedVoiceId] = useState(activeVoiceId);
  const [selectedSpeed, setSelectedSpeed] = useState(activeSpeed);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>({
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentSentenceIndex: 0,
    totalSentences: 0,
    currentSentenceText: '',
    error: null,
    voiceId: activeVoiceId,
    speed: activeSpeed,
  });
  const [auditioningVoiceId, setAuditioningVoiceId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedVoiceId(activeVoiceId);
  }, [activeVoiceId]);

  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((state) => {
      setPlaybackState(state);
      if (!state.isPlaying) {
        setAuditioningVoiceId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Voices' },
    { id: 'expressive', label: 'Warm & Expressive' },
    { id: 'conversational', label: 'Conversational' },
    { id: 'calm', label: 'Calm & Relaxing' },
    { id: 'narration', label: 'Storytelling' },
    { id: 'professional', label: 'Professional' },
  ];

  const filteredVoices = AVAILABLE_VOICES.filter((voice) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'expressive') return voice.style.toLowerCase().includes('warm') || voice.style.toLowerCase().includes('expressive');
    if (activeCategory === 'conversational') return voice.style.toLowerCase().includes('conversational');
    if (activeCategory === 'calm') return voice.style.toLowerCase().includes('calm') || voice.style.toLowerCase().includes('relaxing');
    if (activeCategory === 'narration') return voice.style.toLowerCase().includes('storytelling') || voice.style.toLowerCase().includes('narration');
    if (activeCategory === 'professional') return voice.style.toLowerCase().includes('professional');
    return true;
  });

  const handleAudition = (voice: VoiceOption) => {
    if (auditioningVoiceId === voice.id && playbackState.isPlaying) {
      audioEngine.stop();
      setAuditioningVoiceId(null);
    } else {
      setAuditioningVoiceId(voice.id);
      audioEngine.playVoiceSample(voice.sampleText, voice.id, selectedSpeed);
    }
  };

  const handleSelectVoice = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    if (onSelectVoice) {
      onSelectVoice(voiceId, selectedSpeed);
    }
    if (onUpdatePreferences) {
      onUpdatePreferences({ voiceId, speed: selectedSpeed });
    }
  };

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <Volume2 size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                AI Voice Studio
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Neural TTS
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Choose your narrator for complete page reading
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              audioEngine.stop();
              onClose();
            }}
            aria-label="Close Voice Studio"
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* Categories filter pills */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-stone-500 dark:text-stone-400">
              <Filter size={13} /> Filter Style
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-all ${
                    activeCategory === cat.id
                      ? 'bg-amber-600 text-white font-medium shadow-xs'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice List Cards */}
          <div className="space-y-3">
            {filteredVoices.map((voice) => {
              const isSelected = selectedVoiceId === voice.id;
              const isAuditioning = auditioningVoiceId === voice.id && playbackState.isPlaying;

              return (
                <div
                  key={voice.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs'
                      : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 hover:border-stone-300 dark:hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                          {voice.name}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          {voice.style}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {voice.language} • {voice.accent}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                        {voice.description}
                      </p>
                    </div>

                    {/* Audition Button */}
                    <button
                      onClick={() => handleAudition(voice)}
                      aria-label={`Audition voice ${voice.name}`}
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isAuditioning
                          ? 'bg-amber-600 text-white animate-pulse'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/40'
                      }`}
                    >
                      {isAuditioning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                    </button>
                  </div>

                  {/* Sample text snippet preview */}
                  <div className="mt-2 text-[11px] italic text-stone-500 dark:text-stone-400 border-l-2 border-stone-200 dark:border-stone-700 pl-2 line-clamp-1">
                    "{voice.sampleText}"
                  </div>

                  {/* Select button */}
                  <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <span className="text-[11px] text-stone-400">
                      Provider: Gemini 3.8 Neural
                    </span>
                    <button
                      onClick={() => handleSelectVoice(voice.id)}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check size={13} /> Active Voice
                        </>
                      ) : (
                        'Select Voice'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Voice Playback Settings */}
          <div className="bg-stone-50 dark:bg-stone-850 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
              <Sliders size={14} /> Playback Settings
            </div>

            {/* Speed pills */}
            <div>
              <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 mb-1.5">
                <span>Speaking Speed</span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  {selectedSpeed}x
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {speedOptions.map((spd) => (
                  <button
                    key={spd}
                    onClick={() => {
                      setSelectedSpeed(spd);
                      if (onSelectVoice) onSelectVoice(selectedVoiceId, spd);
                      if (onUpdatePreferences) onUpdatePreferences({ speed: spd });
                    }}
                    className={`flex-1 py-1 text-xs rounded-md transition-all font-medium ${
                      selectedSpeed === spd
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle options if preferences provided */}
            {preferences && onUpdatePreferences && (
              <div className="space-y-2 pt-1">
                <label className="flex items-center justify-between text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
                  <span>Auto-continue to next page</span>
                  <input
                    type="checkbox"
                    checked={preferences.autoAdvancePage}
                    onChange={(e) => onUpdatePreferences({ autoAdvancePage: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
                  <span>Pause automatically when leaving reader</span>
                  <input
                    type="checkbox"
                    checked={preferences.pauseOnExit}
                    onChange={(e) => onUpdatePreferences({ pauseOnExit: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex justify-end">
          <button
            onClick={() => {
              audioEngine.stop();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
