import React, { useState } from 'react';
import {
  User,
  Volume2,
  Sliders,
  Target,
  Sparkles,
  Download,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  Check,
  Award,
  Flame,
} from 'lucide-react';
import { UserPreferences, UserStats, GENRES_LIST } from '../types';
import { VoiceStudioModal } from './VoiceStudioModal';
import { AVAILABLE_VOICES } from '../data/voices';

interface ProfileScreenProps {
  preferences: UserPreferences;
  stats: UserStats;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  preferences,
  stats,
  onUpdatePreferences,
}) => {
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const [dailyMinutes, setDailyMinutes] = useState(preferences.dailyReadingMinutesTarget || 30);
  const [dailyPages, setDailyPages] = useState(preferences.dailyPageTarget || 10);
  const [isSaved, setIsSaved] = useState(false);

  const selectedVoice =
    AVAILABLE_VOICES.find((v) => v.id === preferences.voiceId) || AVAILABLE_VOICES[0];

  const handleSaveGoals = () => {
    onUpdatePreferences({
      dailyReadingMinutesTarget: Number(dailyMinutes),
      dailyPageTarget: Number(dailyPages),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const toggleGenrePreference = (genre: string) => {
    const current = preferences.preferredGenres || [];
    const updated = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : [...current, genre];
    onUpdatePreferences({ preferredGenres: updated });
  };

  const handleExportData = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ preferences, stats }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'bookmind_ai_backup.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="pb-24 pt-3 px-3 sm:px-6 max-w-2xl mx-auto space-y-4">
      {/* Profile Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-stone-50 to-orange-50/20 dark:from-stone-900 dark:via-stone-850 dark:to-stone-900 border border-amber-200/50 dark:border-stone-800 flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-md font-bold text-xl">
          BM
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-bold text-stone-900 dark:text-stone-100">
              BookMind Scholar
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
              Pro Reader
            </span>
          </div>
          <p className="text-xs text-stone-500">
            {stats.pagesRead} pages read • {stats.currentStreak} day reading streak
          </p>
        </div>
      </div>

      {/* Voice Studio Section (CRITICAL FEATURE) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Volume2 size={16} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                AI Voice Studio
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-sm bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold">
                  Selectable
                </span>
              </h2>
              <p className="text-[11px] text-stone-500">
                Active narrator: {selectedVoice.name} ({selectedVoice.style})
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowVoiceStudio(true)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
          >
            <span>Open Studio</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Selected voice details card */}
        <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-stone-800 dark:text-stone-200">
              {selectedVoice.name} — {selectedVoice.style}
            </span>
            <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
              {selectedVoice.description}
            </p>
          </div>
          <span className="text-amber-700 dark:text-amber-400 font-bold ml-2 shrink-0">
            {preferences.speed}x speed
          </span>
        </div>
      </div>

      {/* Reading & Goal Settings */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100">
          <Target size={16} className="text-amber-600" />
          <span>Daily Reading Goals</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-stone-800 dark:text-stone-200 font-bold block mb-1">Daily Reading (Minutes)</label>
            <input
              type="number"
              min="5"
              max="180"
              value={dailyMinutes}
              onChange={(e) => setDailyMinutes(Number(e.target.value))}
              className="w-full p-3 rounded-xl border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-850 text-stone-950 dark:text-white font-extrabold text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-stone-800 dark:text-stone-200 font-bold block mb-1">Daily Target (Pages)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={dailyPages}
              onChange={(e) => setDailyPages(Number(e.target.value))}
              className="w-full p-3 rounded-xl border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-850 text-stone-950 dark:text-white font-extrabold text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleSaveGoals}
            className="px-4 py-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold rounded-xl text-xs flex items-center gap-1"
          >
            {isSaved ? <Check size={13} /> : null}
            {isSaved ? 'Saved' : 'Save Goals'}
          </button>
        </div>
      </div>

      {/* Preferred Genres Selection */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 shadow-xs space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-stone-900 dark:text-stone-100">
            Preferred Genres ({preferences.preferredGenres?.length || 0})
          </span>
          <span className="text-[10px] text-stone-400">Customizes recommendations</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {GENRES_LIST.map((genre) => {
            const isSelected = preferences.preferredGenres?.includes(genre);
            return (
              <button
                key={genre}
                onClick={() => toggleGenrePreference(genre)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      {/* Backup & System Info */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3 text-xs">
        <span className="font-bold text-stone-900 dark:text-stone-100 block">
          Application Data & Backup
        </span>
        <p className="text-stone-500 leading-relaxed">
          All your uploaded PDF books, reading progress, highlights, vocabulary, and AI drafts are
          stored persistently in the workspace database.
        </p>

        <button
          onClick={handleExportData}
          className="w-full py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 hover:bg-stone-100 text-stone-700 dark:text-stone-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Download size={14} /> Export Backup Archive (.json)
        </button>
      </div>

      {/* Voice Studio Modal */}
      <VoiceStudioModal
        isOpen={showVoiceStudio}
        onClose={() => setShowVoiceStudio(false)}
        preferences={preferences}
        onUpdatePreferences={onUpdatePreferences}
      />
    </div>
  );
};
