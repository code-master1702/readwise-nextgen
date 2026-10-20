import React, { useState, useEffect } from 'react';
import {
  Book,
  UserPreferences,
  UserStats,
  DailyLearningSession,
  ActionItem,
  VerifiedBookRecord,
  VocabularyItem,
} from './types';
import { api } from './services/api';
import { BottomNav, NavTab } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { MyBooksScreen } from './components/MyBooksScreen';
import { AIAssistantScreen } from './components/AIAssistantScreen';
import { CreateScreen } from './components/CreateScreen';
import { ProgressScreen } from './components/ProgressScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { ReaderScreen } from './components/ReaderScreen';
import { audioEngine, AudioPlaybackState } from './utils/audioPlayer';
import { CURATED_GENRE_BOOKS } from './data/curatedBooks';
import { Smartphone, Monitor } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [activeBookForReader, setActiveBookForReader] = useState<Book | null>(null);

  // Assistant context passed from Reader if any
  const [assistantContext, setAssistantContext] = useState<{
    bookId?: string;
    pageNumber?: number;
    selectedText?: string;
  }>({});

  // App data state
  const [books, setBooks] = useState<Book[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    voiceId: 'kore',
    speed: 1.0,
    pitch: 1.0,
    autoAdvancePage: false,
    repeatPage: false,
    pauseOnExit: true,
    continuousPlayback: true,
    readerTheme: 'warm',
    fontSize: 18,
    lineSpacing: 1.6,
    fontFamily: 'serif',
    dailyReadingMinutesTarget: 30,
    dailyPageTarget: 10,
    preferredGenres: ['Philosophy', 'Psychology', 'Personal Development'],
    learningGoals: ['Stoic resilience', 'Habit mastery', 'Critical thinking'],
  });

  const [stats, setStats] = useState<UserStats>({
    pagesRead: 14,
    booksCompleted: 0,
    currentStreak: 3,
    longestStreak: 5,
    totalPoints: 120,
    sessionsCompleted: 2,
    quizzesPassed: 2,
    actionsCompleted: 1,
    awardedActionIds: [],
    readingHistory: [],
  });

  const [dailyLearning, setDailyLearning] = useState<DailyLearningSession>({
    id: 'daily-session-1',
    date: new Date().toISOString().split('T')[0],
    bookTitle: 'Meditations by Marcus Aurelius',
    concept: 'The Dichotomy of Control',
    simpleExplanation:
      'Everything in life falls into two categories: things you can control (your thoughts, actions, decisions) and things you cannot control (the weather, other people, external outcomes). True tranquility comes from investing 100% of your energy solely in what is within your control.',
    realLifeExample:
      'When stuck in bad traffic on your way to an interview, you cannot control the traffic, but you have absolute control over your reaction—whether to panic, or calmly practice your interview answers or listen to an insightful book.',
    reflectionQuestion:
      'What is one frustrating situation in your life right now where you are worrying about things outside of your direct control?',
    quiz: {
      question:
        'According to Marcus Aurelius and Stoic philosophy, where does your true power reside?',
      options: [
        'In controlling outside events and predicting the future',
        'In your own mind and how you choose to respond',
        'In accumulating enough wealth to avoid hardship',
        'In convincing other people to agree with you',
      ],
      correctIndex: 1,
      explanation:
        'Marcus Aurelius wrote: "You have power over your mind - not outside events. Realize this, and you will find strength."',
    },
    practicalActivity:
      'Identify one worry on your mind today. Draw two columns on paper: "Within My Control" and "Outside My Control". Move every external factor to the right column and let it go.',
    keyTakeaway:
      'Focus strictly on your inputs; detach your peace of mind from uncontrollable external outputs.',
    completed: false,
    pointsEarned: 25,
  });

  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [curatedBooks, setCuratedBooks] = useState<VerifiedBookRecord[]>(CURATED_GENRE_BOOKS);
  const [isLoadingApp, setIsLoadingApp] = useState(true);

  // Audio playing state for bottom nav indicator
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>({
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentSentenceIndex: 0,
    totalSentences: 0,
    currentSentenceText: '',
    error: null,
    voiceId: 'kore',
    speed: 1.0,
  });

  // Mobile frame simulator toggle for desktop preview
  const [isMobileFrameMode, setIsMobileFrameMode] = useState(false);

  useEffect(() => {
    loadAllAppData();

    const unsubAudio = audioEngine.subscribe((state) => {
      setPlaybackState(state);
    });

    return () => unsubAudio();
  }, []);

  const loadAllAppData = async () => {
    try {
      const [booksList, userPrefs, userStats, learningData, vocabList, recs] =
        await Promise.all([
          api.getBooks(),
          api.getUserPreferences().catch(() => preferences),
          api.getUserStats().catch(() => stats),
          api.getDailyLearning().catch(() => ({ session: dailyLearning, actions: [] })),
          api.getVocabulary().catch(() => []),
          api.getRecommendations().catch(() => ({ books: CURATED_GENRE_BOOKS })),
        ]);

      if (booksList && booksList.length > 0) {
        // Hydrate local saved progress for all books
        const hydrated = booksList.map((b) => {
          try {
            const saved = localStorage.getItem(`bookmind_progress_${b.id}`);
            if (saved) {
              const p = parseInt(saved, 10);
              if (p >= 1 && p <= b.totalPages) return { ...b, currentPage: p };
            }
          } catch {}
          return b;
        });

        // If user recently read a book, prioritize it at the top
        const lastReadId = localStorage.getItem('bookmind_last_read_book_id');
        if (lastReadId) {
          const idx = hydrated.findIndex((b) => b.id === lastReadId);
          if (idx > 0) {
            const [active] = hydrated.splice(idx, 1);
            hydrated.unshift(active);
          }
        }
        setBooks(hydrated);
      }
      if (userPrefs) setPreferences(userPrefs);
      if (userStats) setStats(userStats);
      if (learningData?.session) setDailyLearning(learningData.session);
      if (learningData?.actions) setActionItems(learningData.actions);
      if (vocabList) setVocabulary(vocabList);
      if (recs?.books) setCuratedBooks(recs.books);
    } catch (err) {
      console.error('Error during app boot load:', err);
    } finally {
      setIsLoadingApp(false);
    }
  };

  const handleUpdatePreferences = async (updated: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updated }));
    try {
      await api.updateUserPreferences(updated);
    } catch (err) {
      console.error('Failed to sync preferences:', err);
    }
  };

  const handleOpenBook = async (book: Book) => {
    let bookToOpen = book;
    if (!book.pages || book.pages.length === 0) {
      try {
        const full = await api.getBook(book.id);
        bookToOpen = full;
      } catch (err) {
        console.error('Error fetching full book:', err);
      }
    }

    // Restore last saved page from localStorage if available
    try {
      localStorage.setItem('bookmind_last_read_book_id', bookToOpen.id);
      const savedPage = localStorage.getItem(`bookmind_progress_${bookToOpen.id}`);
      if (savedPage) {
        const p = parseInt(savedPage, 10);
        if (p >= 1 && p <= (bookToOpen.totalPages || 1)) {
          bookToOpen = { ...bookToOpen, currentPage: p };
        }
      }
    } catch {}

    setActiveBookForReader(bookToOpen);
  };

  const handleOpenAssistantFromReader = (
    bookId: string,
    pageNumber: number,
    selectedText?: string
  ) => {
    setAssistantContext({ bookId, pageNumber, selectedText });
    setActiveBookForReader(null);
    setActiveTab('assistant');
  };

  // If Reader is active, show the Reader full screen
  if (activeBookForReader) {
    return (
      <ReaderScreen
        book={activeBookForReader}
        onBack={() => {
          setActiveBookForReader(null);
          // Sync books list so Continue Reading reflects the exact page read
          api.getBooks().then((updatedList) => {
            if (updatedList && updatedList.length > 0) setBooks(updatedList);
          });
          api.getUserStats().then((s) => setStats(s)).catch(() => {});
        }}
        preferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
        onOpenAssistantWithContext={handleOpenAssistantFromReader}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-200">
      {/* Optional Desktop Mobile Frame toggle bar */}
      <div className="hidden md:flex items-center justify-between px-4 py-1.5 bg-stone-900 text-stone-300 text-xs border-b border-stone-800">
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-400">BookMind AI Mobile Preview</span>
          <span className="text-[10px] text-stone-400">
            Native mobile app experience with selectable neural AI voices & PDF reader
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileFrameMode(false)}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md ${
              !isMobileFrameMode ? 'bg-amber-600 text-white font-semibold' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Monitor size={12} /> Responsive Layout
          </button>
          <button
            onClick={() => setIsMobileFrameMode(true)}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md ${
              isMobileFrameMode ? 'bg-amber-600 text-white font-semibold' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Smartphone size={12} /> Mobile Device View (390×844)
          </button>
        </div>
      </div>

      {/* Main Container - either standard responsive mobile-first or framed phone */}
      <div
        className={`flex-1 flex flex-col w-full ${
          isMobileFrameMode
            ? 'max-w-[400px] mx-auto my-4 border-[8px] border-stone-800 rounded-[44px] shadow-2xl overflow-hidden bg-stone-50 dark:bg-stone-900 h-[844px] relative'
            : 'max-w-2xl mx-auto w-full bg-stone-50 dark:bg-stone-900 min-h-screen shadow-sm'
        }`}
      >
        {/* Sub-screens rendered based on active navigation tab */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'home' && (
            <HomeScreen
              books={books}
              stats={stats}
              dailyLearning={dailyLearning}
              actionItems={actionItems}
              curatedBooks={curatedBooks}
              onOpenBook={handleOpenBook}
              onOpenAssistant={() => setActiveTab('assistant')}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onUploadClick={() => setActiveTab('books')}
            />
          )}

          {activeTab === 'books' && (
            <MyBooksScreen
              books={books}
              onOpenBook={handleOpenBook}
              onRefreshBooks={loadAllAppData}
            />
          )}

          {activeTab === 'assistant' && (
            <AIAssistantScreen
              books={books}
              preferences={preferences}
              initialBookId={assistantContext.bookId}
              initialPageNumber={assistantContext.pageNumber}
              initialSelectedText={assistantContext.selectedText}
            />
          )}

          {activeTab === 'create' && <CreateScreen />}

          {activeTab === 'progress' && (
            <ProgressScreen
              stats={stats}
              dailyLearning={dailyLearning}
              actionItems={actionItems}
              vocabulary={vocabulary}
              preferences={preferences}
              onRefreshData={loadAllAppData}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileScreen
              preferences={preferences}
              stats={stats}
              onUpdatePreferences={handleUpdatePreferences}
            />
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <BottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            // Clear temporary context when switching tabs manually
            if (tab !== 'assistant') {
              setAssistantContext({});
            }
            setActiveTab(tab);
          }}
          isAudioPlaying={playbackState.isPlaying}
        />
      </div>
    </div>
  );
}
