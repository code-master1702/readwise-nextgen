import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Flame,
  Award,
  BookOpen,
  CheckCircle2,
  Calendar,
  Sparkles,
  HelpCircle,
  Languages,
  RotateCw,
  Check,
  X,
  Target,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { DailyLearningSession, ActionItem, UserStats, VocabularyItem, UserPreferences } from '../types';
import { api } from '../services/api';

interface ProgressScreenProps {
  stats: UserStats;
  dailyLearning: DailyLearningSession;
  actionItems: ActionItem[];
  vocabulary: VocabularyItem[];
  preferences: UserPreferences;
  onRefreshData: () => Promise<void>;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  stats,
  dailyLearning,
  actionItems,
  vocabulary,
  preferences,
  onRefreshData,
}) => {
  // Quiz state
  const [selectedQuizIdx, setSelectedQuizIdx] = useState<number | null>(
    dailyLearning.selectedQuizOption ?? null
  );
  const [reflectionInput, setReflectionInput] = useState(dailyLearning.userReflection || '');
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(dailyLearning.completed || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vocabulary flashcard
  const [vocabIndex, setVocabIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Active view tab in Progress screen
  const [activeTab, setActiveTab] = useState<'daily' | 'stats' | 'vocab'>('daily');

  const currentVocab = vocabulary[vocabIndex] || null;

  const handleQuizSubmit = async () => {
    if (selectedQuizIdx === null || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.completeDailyLearning({
        sessionId: dailyLearning.id,
        userReflection: reflectionInput,
        selectedQuizOption: selectedQuizIdx,
      });
      setIsQuizSubmitted(true);
      await onRefreshData();
    } catch (err) {
      console.error('Quiz submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActionStatus = async (actionId: string, status: 'completed' | 'skipped') => {
    try {
      await api.updateActionStatus(actionId, status);
      await onRefreshData();
    } catch (err) {
      console.error('Action status error:', err);
    }
  };

  const handleToggleVocabMastery = async (id: string) => {
    try {
      await api.toggleVocabularyMastered(id);
      await onRefreshData();
    } catch (err) {
      console.error('Toggle vocab mastery error:', err);
    }
  };

  // Generate 30-day activity squares
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split('T')[0];
    const match = stats.readingHistory?.find((h) => h.date === dateStr);
    return {
      date: dateStr,
      pages: match?.pagesRead || 0,
    };
  });

  return (
    <div className="pb-24 pt-3 px-3 sm:px-6 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <span>Progress & Learning</span>
          </h1>
          <p className="text-xs text-stone-500">
            Track intellectual consistency and implement daily wisdom
          </p>
        </div>

        {/* Streak & Points Badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-xs">
            <Flame size={14} className="animate-pulse" />
            <span>{stats.currentStreak} Days</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-xs">
            <Award size={14} />
            <span>{stats.totalPoints} pts</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-stone-100 dark:bg-stone-850 p-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeTab === 'daily'
              ? 'bg-white dark:bg-stone-750 text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Today's Lesson & Quiz
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeTab === 'stats'
              ? 'bg-white dark:bg-stone-750 text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          30-Day Activity
        </button>
        <button
          onClick={() => setActiveTab('vocab')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeTab === 'vocab'
              ? 'bg-white dark:bg-stone-750 text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Vocabulary ({vocabulary.length})
        </button>
      </div>

      {/* TAB 1: DAILY LEARNING & IMPLEMENTATION */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {/* Main Lesson Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                {dailyLearning.bookTitle}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                Daily Focus
              </span>
            </div>

            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {dailyLearning.concept}
            </h2>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
              {dailyLearning.simpleExplanation}
            </div>

            {/* Real Life Example */}
            <div className="text-xs space-y-1">
              <span className="font-semibold text-stone-500 block text-[11px] uppercase tracking-wider">
                Real-Life Scenario:
              </span>
              <p className="text-stone-600 dark:text-stone-300 leading-relaxed italic">
                "{dailyLearning.realLifeExample}"
              </p>
            </div>

            {/* Practical Activity */}
            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 text-xs space-y-1">
              <span className="font-bold text-amber-800 dark:text-amber-300 block text-[11px]">
                Today's Practical Exercise:
              </span>
              <p className="text-stone-700 dark:text-stone-300">
                {dailyLearning.practicalActivity}
              </p>
            </div>

            {/* Reflection question */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                Reflection: {dailyLearning.reflectionQuestion}
              </label>
              <textarea
                value={reflectionInput}
                onChange={(e) => setReflectionInput(e.target.value)}
                placeholder="Write a brief personal reflection on this concept..."
                rows={2}
                disabled={isQuizSubmitted}
                className="w-full p-3 rounded-xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs sm:text-sm font-bold text-stone-950 dark:text-white placeholder:text-stone-500 placeholder:font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            {/* Interactive 4-Option Quiz */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                Comprehension Check: {dailyLearning.quiz.question}
              </span>

              <div className="space-y-2">
                {dailyLearning.quiz.options.map((option, idx) => {
                  const isSelected = selectedQuizIdx === idx;
                  const isCorrect = idx === dailyLearning.quiz.correctIndex;

                  let style =
                    'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300';

                  if (isQuizSubmitted) {
                    if (isCorrect) {
                      style = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-semibold';
                    } else if (isSelected && !isCorrect) {
                      style = 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300';
                    }
                  } else if (isSelected) {
                    style = 'border-amber-600 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-medium';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => !isQuizSubmitted && setSelectedQuizIdx(idx)}
                      disabled={isQuizSubmitted}
                      className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${style}`}
                    >
                      <span>{option}</span>
                      {isQuizSubmitted && isCorrect && <Check size={14} className="text-emerald-600 shrink-0 ml-2" />}
                      {isQuizSubmitted && isSelected && !isCorrect && <X size={14} className="text-red-600 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>

              {isQuizSubmitted ? (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <CheckCircle2 size={14} /> Lesson Completed (+25 Pts awarded)
                  </div>
                  <p>{dailyLearning.quiz.explanation}</p>
                </div>
              ) : (
                <button
                  onClick={handleQuizSubmit}
                  disabled={selectedQuizIdx === null || isSubmitting}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold disabled:opacity-40 shadow-xs transition-colors"
                >
                  {isSubmitting ? 'Verifying...' : 'Submit Answer & Earn 25 Points'}
                </button>
              )}
            </div>
          </div>

          {/* Action Tasks */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
              Practical Implementation Tasks
            </span>
            {actionItems.map((action) => (
              <div
                key={action.id}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                      +{action.points} Pts
                    </span>
                    <span className="text-[10px] text-stone-400">• {action.bookTitle}</span>
                  </div>
                  <h4 className={`text-xs font-semibold ${action.status === 'completed' ? 'line-through text-stone-400' : 'text-stone-900 dark:text-stone-100'}`}>
                    {action.title}
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">
                    {action.description}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {action.status === 'completed' ? (
                    <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1">
                      <Check size={14} /> Done
                    </span>
                  ) : (
                    <button
                      onClick={() => handleActionStatus(action.id, 'completed')}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg shadow-2xs"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: 30-DAY ACTIVITY & STATS */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
              <span className="flex items-center gap-1.5">
                <Calendar size={15} /> 30-Day Reading Heatmap
              </span>
              <span className="text-stone-400 text-[11px]">Last 30 Days</span>
            </div>

            {/* Grid of 30 days */}
            <div className="grid grid-cols-10 gap-1.5 pt-1">
              {days30.map((d, i) => {
                let color = 'bg-stone-100 dark:bg-stone-800';
                if (d.pages > 10) color = 'bg-amber-600';
                else if (d.pages > 5) color = 'bg-amber-400';
                else if (d.pages > 0) color = 'bg-amber-200 dark:bg-amber-900/60';

                return (
                  <div
                    key={i}
                    title={`${d.date}: ${d.pages} pages`}
                    className={`aspect-square rounded-md ${color} transition-colors`}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1">
              <span>Less active</span>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-stone-100 dark:bg-stone-800" />
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-200 dark:bg-amber-900/60" />
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-600" />
              </div>
              <span>More active</span>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 text-center space-y-1">
              <span className="text-2xl font-black text-amber-600">{stats.currentStreak}</span>
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                Current Streak
              </span>
              <span className="text-[10px] text-stone-400">Longest: {stats.longestStreak} days</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 text-center space-y-1">
              <span className="text-2xl font-black text-orange-600">{stats.pagesRead}</span>
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                Pages Mastered
              </span>
              <span className="text-[10px] text-stone-400">Target: {preferences.dailyPageTarget} pages/day</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 text-center space-y-1">
              <span className="text-2xl font-black text-emerald-600">{stats.sessionsCompleted}</span>
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                Lessons Finished
              </span>
              <span className="text-[10px] text-stone-400">{stats.quizzesPassed} quizzes passed</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 text-center space-y-1">
              <span className="text-2xl font-black text-indigo-600">{stats.actionsCompleted}</span>
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                Habit Actions Done
              </span>
              <span className="text-[10px] text-stone-400">{stats.totalPoints} total wisdom points</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VOCABULARY FLASHCARDS */}
      {activeTab === 'vocab' && (
        <div className="space-y-4">
          {vocabulary.length === 0 ? (
            <div className="text-center py-12 text-stone-400 space-y-2">
              <Languages size={36} className="mx-auto opacity-50" />
              <p className="text-xs">No vocabulary saved yet. Select words in the Reader to add them!</p>
            </div>
          ) : currentVocab && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-stone-500">
                <span>Card {vocabIndex + 1} of {vocabulary.length}</span>
                <span className="text-amber-600 font-semibold">
                  {currentVocab.mastered ? '★ Mastered' : 'Learning'}
                </span>
              </div>

              {/* Flashcard with Flip */}
              <div
                onClick={() => setIsCardFlipped(!isCardFlipped)}
                className="w-full min-h-[200px] p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/30 dark:from-stone-900 dark:to-stone-850 border border-amber-200 dark:border-stone-800 flex flex-col justify-between cursor-pointer shadow-sm hover:border-amber-400 transition-all select-none"
              >
                {!isCardFlipped ? (
                  <div className="text-center my-auto space-y-2">
                    <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                      Tap to reveal definition
                    </span>
                    <h3 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                      {currentVocab.word}
                    </h3>
                    {currentVocab.phonetic && (
                      <p className="text-xs font-mono text-stone-400">{currentVocab.phonetic}</p>
                    )}
                    {currentVocab.partOfSpeech && (
                      <span className="text-[11px] text-stone-500 italic block">
                        ({currentVocab.partOfSpeech})
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base text-stone-900 dark:text-stone-100">
                        {currentVocab.word}
                      </span>
                      <span className="text-[10px] text-amber-600">Definition</span>
                    </div>
                    <p className="text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
                      {currentVocab.definition}
                    </p>
                    {currentVocab.contextualMeaning && (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 italic">
                        Context: {currentVocab.contextualMeaning}
                      </p>
                    )}
                    {currentVocab.example && (
                      <p className="text-[11px] text-stone-600 dark:text-stone-300 border-l-2 border-amber-500 pl-2">
                        "{currentVocab.example}"
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-amber-100 dark:border-stone-800 text-[11px] text-stone-400">
                  <span>Source: {currentVocab.bookTitle || 'Reading'}</span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <RotateCw size={12} /> Flip
                  </span>
                </div>
              </div>

              {/* Navigation controls */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => {
                    setIsCardFlipped(false);
                    setVocabIndex((i) => Math.max(0, i - 1));
                  }}
                  disabled={vocabIndex === 0}
                  className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  onClick={() => handleToggleVocabMastery(currentVocab.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 ${
                    currentVocab.mastered
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40'
                      : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  <Check size={14} /> {currentVocab.mastered ? 'Mastered' : 'Mark as Mastered'}
                </button>

                <button
                  onClick={() => {
                    setIsCardFlipped(false);
                    setVocabIndex((i) => Math.min(vocabulary.length - 1, i + 1));
                  }}
                  disabled={vocabIndex === vocabulary.length - 1}
                  className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
