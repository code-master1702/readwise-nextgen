import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Volume2,
  Play,
  Pause,
  Square,
  Bookmark as BookmarkIcon,
  MessageSquare,
  Sliders,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  Plus,
  Trash2,
  Check,
  X,
  Search,
  ListOrdered,
  Send,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { Book, Bookmark, Highlight, Note, UserPreferences } from '../types';
import { api } from '../services/api';
import { audioEngine, AudioPlaybackState } from '../utils/audioPlayer';
import { splitTextIntoSentences } from '../utils/rules';
import { VoiceStudioModal } from './VoiceStudioModal';

interface ReaderScreenProps {
  book: Book;
  onBack: () => void;
  preferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onOpenAssistantWithContext?: (bookId: string, pageNumber: number, selectedText?: string) => void;
}

export const ReaderScreen: React.FC<ReaderScreenProps> = ({
  book,
  onBack,
  preferences,
  onUpdatePreferences,
  onOpenAssistantWithContext,
}) => {
  // Restore saved progress from localStorage or book
  const initialPage = useMemo(() => {
    try {
      const saved = localStorage.getItem(`bookmind_progress_${book.id}`);
      if (saved) {
        const p = parseInt(saved, 10);
        if (p >= 1 && p <= (book.totalPages || 1)) return p;
      }
    } catch {}
    return book.currentPage || 1;
  }, [book.id, book.currentPage, book.totalPages]);

  const [currentPageNum, setCurrentPageNum] = useState<number>(initialPage);
  const [theme, setTheme] = useState<'light' | 'dark' | 'warm'>(preferences.readerTheme || 'warm');
  const [fontSize, setFontSize] = useState<number>(preferences.fontSize || 18);
  const [lineSpacing, setLineSpacing] = useState<number>(preferences.lineSpacing || 1.6);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>(preferences.fontFamily || 'serif');

  // Book reading data
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Audio Playback
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>({
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentSentenceIndex: 0,
    totalSentences: 0,
    currentSentenceText: '',
    error: null,
    voiceId: preferences.voiceId || 'kore',
    speed: preferences.speed || 1.0,
  });

  // UI Drawers & Sheets
  const [showTypographyDrawer, setShowTypographyDrawer] = useState(false);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const [showPageSelectorModal, setShowPageSelectorModal] = useState(false);
  const [pageInputVal, setPageInputVal] = useState<string>(String(initialPage));
  const [quickJumpInputVal, setQuickJumpInputVal] = useState<string>(String(initialPage));
  const [newNoteContent, setNewNoteContent] = useState('');

  // Paginated Page Selector state (to prevent lagging on 500+ page books)
  const [pageGridPage, setPageGridPage] = useState<number>(0);
  const PAGES_PER_GRID = 30;

  // Inline AI Assistant Drawer in Reader
  const [showInlineAssistant, setShowInlineAssistant] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [assistantResponse, setAssistantResponse] = useState<string | null>(null);
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);

  // Text selection popup
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [showSelectionPopup, setShowSelectionPopup] = useState(false);
  const [explainResult, setExplainResult] = useState<any | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [addedVocabWord, setAddedVocabWord] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load bookmarks, highlights, notes
  useEffect(() => {
    loadBookData();
  }, [book.id]);

  useEffect(() => {
    setIsBookmarked(bookmarks.some((b) => b.pageNumber === currentPageNum));
    setPageInputVal(String(currentPageNum));
    setQuickJumpInputVal(String(currentPageNum));
    setPageGridPage(Math.floor((currentPageNum - 1) / PAGES_PER_GRID));
  }, [bookmarks, currentPageNum]);

  // Audio state listener
  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setPlaybackState(state);
    });
    return () => unsub();
  }, []);

  const loadBookData = async () => {
    try {
      const [bm, hl, nt] = await Promise.all([
        api.getBookmarks(book.id),
        api.getHighlights(book.id),
        api.getNotes(book.id),
      ]);
      setBookmarks(bm);
      setHighlights(hl);
      setNotes(nt);
    } catch (err) {
      console.error('Error loading book reading data:', err);
    }
  };

  const currentPage = useMemo(() => {
    const p = book.pages?.find((pg) => pg.pageNumber === currentPageNum);
    return (
      p || {
        pageNumber: currentPageNum,
        text: 'Page text not available.',
      }
    );
  }, [book.pages, currentPageNum]);

  // Fast memoized sentence splitting
  const sentences = useMemo(() => {
    return splitTextIntoSentences(currentPage.text);
  }, [currentPage.text]);

  const isCoverOrBlankPage = useMemo(() => {
    const clean = currentPage.text.replace(/[\r\n\s]+/g, ' ').trim();
    return (
      clean.length < 30 ||
      clean.includes('Blank page') ||
      clean.includes('illustration') ||
      clean.includes('Title Page')
    );
  }, [currentPage.text]);

  // Page changing with immediate progress persistence
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > book.totalPages) return;
    if (playbackState.isPlaying) {
      audioEngine.stop();
    }
    setCurrentPageNum(newPage);
    setPageInputVal(String(newPage));
    setQuickJumpInputVal(String(newPage));
    setSelectedText('');
    setShowSelectionPopup(false);
    setExplainResult(null);
    setShowPageSelectorModal(false);

    // Persist immediately in localStorage
    try {
      localStorage.setItem(`bookmind_progress_${book.id}`, String(newPage));
      localStorage.setItem('bookmind_last_read_book_id', book.id);
    } catch {}

    // Persist to backend
    api.updateProgress(book.id, newPage, 1).catch((err) => {
      console.error('Failed to update page progress on server:', err);
    });
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInputVal, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= book.totalPages) {
      handlePageChange(parsed);
    }
  };

  const handleQuickJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(quickJumpInputVal, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= book.totalPages) {
      handlePageChange(parsed);
    }
  };

  const handleToggleBookmark = async () => {
    try {
      const res = await api.toggleBookmark(book.id, currentPageNum);
      setIsBookmarked(res.bookmarked);
      const bm = await api.getBookmarks(book.id);
      setBookmarks(bm);
    } catch (err) {
      console.error('Bookmark toggle error:', err);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    try {
      const note = await api.addNote(book.id, currentPageNum, newNoteContent.trim());
      setNotes((prev) => [note, ...prev]);
      setNewNoteContent('');
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.deleteNote(book.id, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // Audio Reading Controls
  const handleReadAloud = () => {
    if (playbackState.isPlaying) {
      audioEngine.pause();
    } else if (playbackState.isPaused) {
      audioEngine.resume();
    } else {
      audioEngine.playPageText(
        currentPage.text,
        preferences.voiceId || 'kore',
        preferences.speed || 1.0,
        () => {
          if (preferences.autoAdvancePage && currentPageNum < book.totalPages) {
            handlePageChange(currentPageNum + 1);
          }
        }
      );
    }
  };

  const handleStopAudio = () => {
    audioEngine.stop();
  };

  // Ask AI about current page (inline assistant)
  const handleAskInlineAssistant = async (promptToSend?: string) => {
    const q = (promptToSend || assistantPrompt).trim();
    if (!q || isAssistantLoading) return;

    setIsAssistantLoading(true);
    setAssistantResponse(null);

    try {
      const res = await api.sendChatMessage({
        mode: 'book_expert',
        userMessage: q,
        bookId: book.id,
        pageNumber: currentPageNum,
        selectedText: currentPage.text.slice(0, 800),
      });

      if (res.assistantMessage) {
        setAssistantResponse(res.assistantMessage.content);
      }
    } catch (err) {
      console.error('Inline assistant error:', err);
      setAssistantResponse('Could not connect to BookMind AI assistant. Please try again.');
    } finally {
      setIsAssistantLoading(false);
      setAssistantPrompt('');
    }
  };

  // Text selection handler
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }
    const text = selection.toString().trim();
    if (text.length > 0) {
      setSelectedText(text);
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionPosition({
        x: Math.min(window.innerWidth - 180, Math.max(10, rect.left + rect.width / 2 - 80)),
        y: Math.max(70, rect.top - 48),
      });
      setShowSelectionPopup(true);
      setExplainResult(null);
    }
  };

  const handleHighlightSelection = async (color: Highlight['color']) => {
    if (!selectedText) return;
    try {
      const hl = await api.addHighlight(book.id, currentPageNum, selectedText, color);
      setHighlights((prev) => [...prev, hl]);
      setShowSelectionPopup(false);
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      console.error('Highlight error:', err);
    }
  };

  const handleExplainText = async (type: 'word' | 'sentence') => {
    if (!selectedText) return;
    setIsExplaining(true);
    setExplainResult(null);
    try {
      const res = await api.explainText({
        type,
        text: selectedText,
        bookTitle: book.title,
        pageNumber: currentPageNum,
      });
      setExplainResult({ type, data: res.explanation });
    } catch (err) {
      console.error('Explain error:', err);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleAddToVocabulary = async () => {
    if (!explainResult || explainResult.type !== 'word') return;
    try {
      const item = explainResult.data;
      await api.addVocabulary({
        word: selectedText,
        phonetic: item.phonetic,
        partOfSpeech: item.partOfSpeech,
        definition: item.definition,
        contextualMeaning: item.contextualMeaning,
        synonyms: item.synonyms,
        example: item.example,
        bookTitle: book.title,
        pageNumber: currentPageNum,
      });
      setAddedVocabWord(selectedText);
      setTimeout(() => setAddedVocabWord(null), 3000);
    } catch (err) {
      console.error('Failed to add vocabulary:', err);
    }
  };

  // Color schemes for reader themes
  const themeStyles = {
    warm: 'bg-[#faf6ee] text-[#1f1b18] dark:bg-[#1a1815] dark:text-[#ede4d8]',
    light: 'bg-white text-stone-950',
    dark: 'bg-stone-950 text-stone-100',
  };

  const pageHighlights = highlights.filter((h) => h.pageNumber === currentPageNum);
  const pageNotes = notes.filter((n) => n.pageNumber === currentPageNum);

  // Grid pagination slice
  const gridStart = pageGridPage * PAGES_PER_GRID + 1;
  const gridEnd = Math.min(book.totalPages, (pageGridPage + 1) * PAGES_PER_GRID);
  const gridPages = Array.from({ length: gridEnd - gridStart + 1 }, (_, i) => gridStart + i);

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className={`min-h-screen flex flex-col transition-colors duration-150 select-text ${themeStyles[theme]}`}
    >
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-3 py-2.5 backdrop-blur-md border-b-2 border-stone-300 dark:border-stone-800 bg-inherit/95 shadow-sm">
        <button
          onClick={() => {
            if (preferences.pauseOnExit) audioEngine.stop();
            onBack();
          }}
          aria-label="Back to Library"
          className="p-1.5 px-2 rounded-xl bg-stone-200/70 dark:bg-stone-800 hover:bg-stone-300 transition-colors flex items-center gap-1 text-xs font-black text-stone-900 dark:text-stone-100 shrink-0"
        >
          <ArrowLeft size={16} />
          <span>Library</span>
        </button>

        {/* PROMINENT PAGE NUMBER SELECTOR BUTTON IN HEADER */}
        <button
          onClick={() => setShowPageSelectorModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/40 hover:border-amber-600 text-amber-950 dark:text-amber-100 group cursor-pointer transition-all mx-1.5 max-w-[210px] sm:max-w-xs shadow-2xs"
          title="Click to select or jump to any page number"
        >
          <ListOrdered size={15} className="text-amber-600 shrink-0 font-bold" />
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-stone-950 dark:text-white">
                Page {currentPageNum}
              </span>
              <span className="text-[10px] font-bold text-stone-600 dark:text-stone-400">
                / {book.totalPages}
              </span>
              <span className="text-[9px] bg-amber-600 text-white px-1.5 py-0.2 rounded-md font-black ml-1">
                Select ▾
              </span>
            </div>
            <p className="text-[10px] font-semibold text-stone-600 dark:text-stone-400 truncate hidden sm:block">
              {book.title}
            </p>
          </div>
        </button>

        {/* Right Action Icons: Ask AI, Bookmark, Notes, Typography */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowInlineAssistant(!showInlineAssistant)}
            aria-label="Ask AI Assistant about this page"
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs flex items-center gap-1 shadow-sm hover:opacity-95 active:scale-95 transition-all"
          >
            <Sparkles size={14} />
            <span>AI Help</span>
          </button>

          <button
            onClick={handleToggleBookmark}
            aria-label={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
            className={`p-2 rounded-xl border-2 transition-colors ${
              isBookmarked
                ? 'text-amber-600 border-amber-500 bg-amber-500/20'
                : 'border-stone-300 dark:border-stone-700 hover:bg-stone-500/10 text-stone-700 dark:text-stone-300'
            }`}
          >
            <BookmarkIcon size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={() => setShowNotesDrawer(true)}
            aria-label="Open Page Notes"
            className="p-2 rounded-xl border-2 border-stone-300 dark:border-stone-700 hover:bg-stone-500/10 text-stone-700 dark:text-stone-300 relative"
          >
            <MessageSquare size={16} />
            {pageNotes.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-600 border-2 border-white dark:border-stone-900" />
            )}
          </button>

          <button
            onClick={() => setShowTypographyDrawer(true)}
            aria-label="Typography & Reading Theme"
            className="p-2 rounded-xl border-2 border-stone-300 dark:border-stone-700 hover:bg-stone-500/10 text-stone-700 dark:text-stone-300"
          >
            <Sliders size={16} />
          </button>
        </div>
      </header>

      {/* QUICK INLINE PAGE SELECTOR & NAVIGATION SUB-BAR (Direct access on page) */}
      <div className="bg-stone-100 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-3 py-2 flex items-center justify-between text-xs font-bold gap-2">
        <button
          onClick={() => handlePageChange(currentPageNum - 1)}
          disabled={currentPageNum <= 1}
          className="px-2.5 py-1.5 rounded-lg border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white disabled:opacity-30 hover:border-amber-500 flex items-center gap-1 font-bold shrink-0 shadow-2xs"
        >
          <ChevronLeft size={14} /> Prev
        </button>

        {/* Direct inline jump input form */}
        <form onSubmit={handleQuickJumpSubmit} className="flex items-center gap-1.5 flex-1 max-w-[240px] justify-center">
          <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 whitespace-nowrap">
            Go to page:
          </span>
          <input
            type="number"
            min={1}
            max={book.totalPages}
            value={quickJumpInputVal}
            onChange={(e) => setQuickJumpInputVal(e.target.value)}
            className="w-14 py-1 px-1.5 text-center font-black text-xs rounded-lg border-2 border-stone-400 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-950 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
          />
          <button
            type="submit"
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg text-xs shadow-2xs"
          >
            Go
          </button>
        </form>

        <button
          onClick={() => handlePageChange(currentPageNum + 1)}
          disabled={currentPageNum >= book.totalPages}
          className="px-2.5 py-1.5 rounded-lg border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white disabled:opacity-30 hover:border-amber-500 flex items-center gap-1 font-bold shrink-0 shadow-2xs"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>

      {/* INLINE AI ASSISTANT PANEL */}
      {showInlineAssistant && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-stone-900 dark:to-stone-850 border-b-2 border-amber-300 dark:border-amber-900 p-3.5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-600 text-white rounded-lg">
                <Sparkles size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-stone-950 dark:text-white">
                  BookMind Assistant — Page {currentPageNum} Context
                </h4>
                <p className="text-[10px] font-bold text-stone-600 dark:text-stone-400">
                  Ask questions, request summaries, or understand concepts from this page
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onOpenAssistantWithContext && (
                <button
                  onClick={() => onOpenAssistantWithContext(book.id, currentPageNum, currentPage.text)}
                  className="px-2 py-1 bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-[10px] font-bold rounded-lg hover:bg-amber-100"
                >
                  Full Screen AI
                </button>
              )}
              <button
                onClick={() => setShowInlineAssistant(false)}
                className="p-1 text-stone-500 hover:text-stone-900"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              'Summarize this page in 3 points',
              'Explain difficult ideas simply',
              'What is the practical takeaway?',
              'Quiz me on this page',
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => handleAskInlineAssistant(chip)}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-800 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-100 shrink-0 shadow-2xs"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskInlineAssistant();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={assistantPrompt}
              onChange={(e) => setAssistantPrompt(e.target.value)}
              placeholder="Ask anything about this page..."
              disabled={isAssistantLoading}
              className="flex-1 p-2.5 rounded-xl border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-xs font-bold text-stone-950 dark:text-white placeholder:text-stone-500 placeholder:font-semibold focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              disabled={!assistantPrompt.trim() || isAssistantLoading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black disabled:opacity-40 shadow-xs"
            >
              {isAssistantLoading ? 'Thinking...' : 'Ask'}
            </button>
          </form>

          {/* Assistant Response Box */}
          {isAssistantLoading && (
            <div className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 flex items-center gap-2 text-xs font-bold text-amber-700">
              <span className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <span>BookMind AI is analyzing Page {currentPageNum}...</span>
            </div>
          )}

          {assistantResponse && (
            <div className="p-3.5 rounded-xl bg-white dark:bg-stone-800 border-2 border-amber-300 dark:border-amber-800 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-black text-amber-700 dark:text-amber-400">
                <span className="flex items-center gap-1">
                  <Lightbulb size={14} /> AI Analysis
                </span>
                <button
                  onClick={() => audioEngine.playPageText(assistantResponse, preferences.voiceId || 'kore', preferences.speed)}
                  className="hover:underline flex items-center gap-0.5"
                >
                  <Volume2 size={12} /> Read Answer
                </button>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-stone-900 dark:text-stone-100 whitespace-pre-wrap">
                {assistantResponse}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Page Content Body */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 pb-36">
        {/* Cover or Blank Page Banner with Direct Quick Jump Options */}
        {isCoverOrBlankPage && (
          <div className="p-4 mb-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 text-stone-900 dark:text-stone-100 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-amber-600 shrink-0" />
              <div>
                <h4 className="text-sm font-black text-stone-950 dark:text-white">
                  Cover / Illustration Page (Page {currentPageNum})
                </h4>
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                  This page has minimal text. To jump straight into the reading material:
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {[2, 5, 10, 20].filter((p) => p <= book.totalPages).map((targetP) => (
                <button
                  key={targetP}
                  onClick={() => handlePageChange(targetP)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border-2 border-amber-400 text-xs font-extrabold text-amber-900 dark:text-amber-200 hover:bg-amber-100 shadow-2xs"
                >
                  Jump to Page {targetP} →
                </button>
              ))}

              <button
                onClick={() => setShowPageSelectorModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-black hover:bg-amber-700 shadow-2xs"
              >
                Select Page Number...
              </button>
            </div>
          </div>
        )}

        <article
          className={`leading-relaxed transition-all ${
            fontFamily === 'serif' ? 'font-serif' : fontFamily === 'mono' ? 'font-mono' : 'font-sans'
          }`}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: lineSpacing,
          }}
        >
          {sentences.map((sentence, idx) => {
            const isHighlightedAudio =
              playbackState.isPlaying && playbackState.currentSentenceIndex === idx;

            const matchingHighlight = pageHighlights.find((h) =>
              sentence.includes(h.text) || h.text.includes(sentence)
            );

            return (
              <span
                key={idx}
                className={`transition-colors duration-150 inline rounded-sm font-normal ${
                  isHighlightedAudio
                    ? 'bg-amber-300/80 dark:bg-amber-500/50 text-amber-950 dark:text-amber-50 font-bold px-0.5 shadow-xs'
                    : matchingHighlight
                    ? matchingHighlight.color === 'yellow'
                      ? 'bg-yellow-300/70 dark:bg-yellow-900/50 font-medium'
                      : matchingHighlight.color === 'green'
                      ? 'bg-green-300/70 dark:bg-green-900/50 font-medium'
                      : matchingHighlight.color === 'blue'
                      ? 'bg-blue-300/70 dark:bg-blue-900/50 font-medium'
                      : 'bg-purple-300/70 dark:bg-purple-900/50 font-medium'
                    : ''
                }`}
              >
                {sentence}{' '}
              </span>
            );
          })}
        </article>
      </main>

      {/* Text Selection Action Popup */}
      {showSelectionPopup && selectionPosition && (
        <div
          style={{ top: selectionPosition.y, left: selectionPosition.x }}
          className="fixed z-50 bg-stone-900 text-white rounded-xl shadow-2xl p-1.5 flex items-center gap-1.5 text-xs border border-stone-700 animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            onClick={() => handleExplainText(selectedText.split(/\s+/).length <= 2 ? 'word' : 'sentence')}
            className="px-2.5 py-1 rounded-md bg-stone-800 hover:bg-stone-700 flex items-center gap-1 font-bold text-amber-400"
          >
            <Sparkles size={13} />
            {selectedText.split(/\s+/).length <= 2 ? 'Define Word' : 'Explain'}
          </button>

          <button
            onClick={() => handleHighlightSelection('yellow')}
            aria-label="Yellow highlight"
            className="w-5 h-5 rounded-full bg-yellow-400 hover:scale-110 transition-transform"
          />
          <button
            onClick={() => handleHighlightSelection('green')}
            aria-label="Green highlight"
            className="w-5 h-5 rounded-full bg-emerald-400 hover:scale-110 transition-transform"
          />
          <button
            onClick={() => handleHighlightSelection('blue')}
            aria-label="Blue highlight"
            className="w-5 h-5 rounded-full bg-sky-400 hover:scale-110 transition-transform"
          />

          {onOpenAssistantWithContext && (
            <button
              onClick={() => {
                setShowSelectionPopup(false);
                onOpenAssistantWithContext(book.id, currentPageNum, selectedText);
              }}
              className="px-2 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px]"
            >
              Ask AI
            </button>
          )}

          <button
            onClick={() => {
              setShowSelectionPopup(false);
              setExplainResult(null);
            }}
            aria-label="Close Selection Popup"
            className="p-1 rounded-md text-stone-400 hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Explanation Result Card Sheet */}
      {(isExplaining || explainResult) && (
        <div className="fixed bottom-24 left-3 right-3 max-w-lg mx-auto z-40 bg-white dark:bg-stone-900 border-2 border-amber-500 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-150">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              <Sparkles size={14} />
              {explainResult?.type === 'word' ? 'Word Definition & Mastery' : 'Passage Breakdown'}
            </div>
            <button
              onClick={() => {
                setExplainResult(null);
                setIsExplaining(false);
              }}
              aria-label="Dismiss Explanation"
              className="p-1 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
            >
              <X size={16} />
            </button>
          </div>

          {isExplaining ? (
            <div className="py-4 flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
              <span className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              BookMind AI is analyzing context...
            </div>
          ) : explainResult?.type === 'word' ? (
            <div className="mt-2 text-xs space-y-2 text-stone-900 dark:text-stone-100 font-medium">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-extrabold text-base text-stone-950 dark:text-white">
                    {selectedText}
                  </span>
                  <span className="text-stone-600 dark:text-stone-300 ml-2 font-mono text-[11px] font-bold">
                    {explainResult.data.phonetic}
                  </span>
                  <span className="text-stone-600 dark:text-stone-400 ml-2 italic text-[11px]">
                    {explainResult.data.partOfSpeech}
                  </span>
                </div>
                <button
                  onClick={handleAddToVocabulary}
                  disabled={!!addedVocabWord}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  {addedVocabWord ? <Check size={12} /> : <Plus size={12} />}
                  {addedVocabWord ? 'Saved' : 'Add to Vocab'}
                </button>
              </div>

              <p className="font-semibold text-stone-900 dark:text-stone-100 leading-relaxed">
                {explainResult.data.definition}
              </p>

              {explainResult.data.contextualMeaning && (
                <p className="text-[11px] text-stone-700 dark:text-stone-300 italic">
                  In Context: {explainResult.data.contextualMeaning}
                </p>
              )}

              {explainResult.data.synonyms?.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] font-medium">
                  <span className="font-bold text-stone-600 dark:text-stone-400">Synonyms:</span>
                  <span className="text-amber-700 dark:text-amber-400 font-semibold">
                    {explainResult.data.synonyms.join(', ')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2 text-xs space-y-2 text-stone-900 dark:text-stone-100 font-medium">
              <p className="leading-relaxed font-semibold">{explainResult?.data?.simpleLanguage}</p>
              <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-300 dark:border-amber-800">
                <span className="font-bold text-amber-900 dark:text-amber-200 block text-[11px]">
                  Core Takeaway:
                </span>
                <p className="text-[11px] mt-0.5 text-stone-800 dark:text-stone-200 font-medium">
                  {explainResult?.data?.mainPoint}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Persistent Bottom Voice Narration & Page Selection Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/98 dark:bg-stone-900/98 backdrop-blur-md border-t-2 border-stone-300 dark:border-stone-800 p-2.5 sm:p-3 shadow-2xl">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          {/* Top sub-row: Page Controls, Direct Page Selector Opener, and Voice Changer */}
          <div className="flex items-center justify-between text-xs font-bold gap-2">
            <button
              onClick={() => handlePageChange(currentPageNum - 1)}
              disabled={currentPageNum <= 1}
              aria-label="Previous Page"
              className="p-1.5 px-3 rounded-xl text-stone-900 dark:text-stone-100 disabled:opacity-30 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1 border-2 border-stone-300 dark:border-stone-700 font-black shadow-2xs"
            >
              <ChevronLeft size={16} /> Prev
            </button>

            {/* DIRECT PAGE SELECTOR BUTTON - HUGE & PROMINENT */}
            <button
              onClick={() => setShowPageSelectorModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 border-2 border-amber-500/50 hover:border-amber-600 text-stone-950 dark:text-white transition-all shadow-2xs group cursor-pointer"
            >
              <ListOrdered size={16} className="text-amber-600 shrink-0 font-bold" />
              <span className="font-extrabold text-xs sm:text-sm">
                Page <span className="font-black text-amber-700 dark:text-amber-400">{currentPageNum}</span> of {book.totalPages}
              </span>
              <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-md font-black group-hover:scale-105 transition-transform">
                Change Page ▾
              </span>
            </button>

            {/* Voice Studio Opener Button */}
            <button
              onClick={() => setShowVoiceStudio(true)}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-black border-2 border-stone-300 dark:border-stone-700 hover:border-amber-500 transition-colors shadow-2xs"
            >
              <Volume2 size={14} className="text-amber-600" />
              <span>{preferences.voiceId || 'Kore'}</span>
              <span className="text-amber-600 font-black">{preferences.speed}x</span>
            </button>

            <button
              onClick={() => handlePageChange(currentPageNum + 1)}
              disabled={currentPageNum >= book.totalPages}
              aria-label="Next Page"
              className="p-1.5 px-3 rounded-xl text-stone-900 dark:text-stone-100 disabled:opacity-30 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1 border-2 border-stone-300 dark:border-stone-700 font-black shadow-2xs"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>

          {/* Bottom row: Read Aloud action & Progress slider */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleReadAloud}
              disabled={playbackState.isLoading}
              aria-label={playbackState.isPlaying ? 'Pause Narration' : 'Play Narration'}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition-all shrink-0"
            >
              {playbackState.isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Loading Audio...</span>
                </>
              ) : playbackState.isPlaying ? (
                <>
                  <Pause size={15} fill="currentColor" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={15} fill="currentColor" />
                  <span>Read Aloud</span>
                </>
              )}
            </button>

            {playbackState.isPlaying && (
              <button
                onClick={handleStopAudio}
                aria-label="Stop Narration"
                className="p-2.5 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl hover:bg-stone-200 transition-colors shrink-0 font-bold border border-stone-300 dark:border-stone-700"
              >
                <Square size={14} fill="currentColor" />
              </button>
            )}

            {/* Progress track with click-to-jump */}
            <div
              onClick={() => setShowPageSelectorModal(true)}
              className="flex-1 flex flex-col justify-center cursor-pointer group"
              title="Click to jump to any page"
            >
              <div className="flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200 mb-0.5">
                <span className="truncate">
                  {playbackState.isPlaying
                    ? `Reading: sentence ${playbackState.currentSentenceIndex + 1}/${sentences.length}`
                    : `Page ${currentPageNum} of ${book.totalPages}`}
                </span>
                <span className="text-amber-700 dark:text-amber-400 font-black ml-1">
                  {Math.round((currentPageNum / book.totalPages) * 100)}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-200"
                  style={{ width: `${(currentPageNum / book.totalPages) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DIRECT PAGE SELECTOR MODAL (High-contrast, fast, responsive) */}
      {showPageSelectorModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl border-2 border-stone-300 dark:border-stone-700 space-y-4 animate-in slide-in-from-bottom duration-150">
            <div className="flex items-center justify-between pb-2 border-b-2 border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <ListOrdered size={18} className="text-amber-600" />
                <h3 className="text-base font-black text-stone-950 dark:text-white">
                  Select Page Number
                </h3>
              </div>
              <button
                onClick={() => setShowPageSelectorModal(false)}
                className="p-1 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Direct Number Input Form with Crisp, Bold, High-Contrast Text */}
            <form onSubmit={handleJumpSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-black text-stone-900 dark:text-stone-100 block mb-1">
                  Enter Page Number (1 to {book.totalPages}):
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={book.totalPages}
                    value={pageInputVal}
                    onChange={(e) => setPageInputVal(e.target.value)}
                    className="flex-1 p-3 rounded-xl border-2 border-stone-400 dark:border-stone-600 bg-white dark:bg-stone-850 text-stone-950 dark:text-white font-black text-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-sm shadow-xs"
                  >
                    Go to Page
                  </button>
                </div>
              </div>

              {/* Quick Jump Adjustment buttons: -10, -1, +1, +10 */}
              <div className="flex items-center gap-1.5 justify-center py-1">
                {[-10, -1, 1, 10].map((delta) => {
                  const target = Math.min(book.totalPages, Math.max(1, currentPageNum + delta));
                  return (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => handlePageChange(target)}
                      className="flex-1 py-1.5 rounded-lg border-2 border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white font-extrabold text-xs hover:border-amber-500"
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </button>
                  );
                })}
              </div>

              {/* Range Slider for scrubbing */}
              <div className="space-y-1.5 pt-1 bg-stone-50 dark:bg-stone-850 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                <div className="flex justify-between text-xs font-black text-stone-700 dark:text-stone-300">
                  <span>Page 1</span>
                  <span className="text-amber-700 dark:text-amber-400 font-black text-sm">
                    Page {pageInputVal} of {book.totalPages}
                  </span>
                  <span>Page {book.totalPages}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={book.totalPages}
                  value={pageInputVal}
                  onChange={(e) => setPageInputVal(e.target.value)}
                  className="w-full accent-amber-600 cursor-pointer h-2.5"
                />
              </div>

              {/* Milestone Quick Jump Buttons */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-black text-stone-700 dark:text-stone-300 block">
                  Quick Milestones:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 5, 10, 25, 50, 100, 200, 300, 400, book.totalPages]
                    .filter((p) => p <= book.totalPages)
                    .map((milestone) => (
                      <button
                        key={milestone}
                        type="button"
                        onClick={() => handlePageChange(milestone)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                          currentPageNum === milestone
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 hover:border-amber-500'
                        }`}
                      >
                        p.{milestone}
                      </button>
                    ))}
                </div>
              </div>

              {/* Paginated Grid of Page Buttons (30 pages per view to prevent sticking) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-black text-stone-700 dark:text-stone-300">
                  <span>Browse Pages ({gridStart} - {gridEnd}):</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={pageGridPage === 0}
                      onClick={() => setPageGridPage((g) => Math.max(0, g - 1))}
                      className="p-1 rounded-md border border-stone-300 disabled:opacity-30"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span>
                      {pageGridPage + 1}/{Math.ceil(book.totalPages / PAGES_PER_GRID)}
                    </span>
                    <button
                      type="button"
                      disabled={(pageGridPage + 1) * PAGES_PER_GRID >= book.totalPages}
                      onClick={() => setPageGridPage((g) => g + 1)}
                      className="p-1 rounded-md border border-stone-300 disabled:opacity-30"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="max-h-36 overflow-y-auto grid grid-cols-6 gap-1.5 p-1.5 bg-stone-50 dark:bg-stone-850 rounded-xl border border-stone-200 dark:border-stone-700">
                  {gridPages.map((pNum) => (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => handlePageChange(pNum)}
                      className={`py-2 rounded-lg text-xs font-black transition-all ${
                        currentPageNum === pNum
                          ? 'bg-amber-600 text-white shadow-xs scale-105'
                          : 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-700 hover:border-amber-500'
                      }`}
                    >
                      {pNum}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPageSelectorModal(false)}
                  className="w-full py-2.5 bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-black text-xs rounded-xl"
                >
                  Done
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Typography & Reading Theme Drawer */}
      {showTypographyDrawer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 border-2 border-stone-300 dark:border-stone-700 animate-in slide-in-from-bottom duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-sm font-extrabold text-stone-950 dark:text-white">
                Reading Display
              </h3>
              <button
                onClick={() => setShowTypographyDrawer(false)}
                className="p-1 text-stone-500 hover:text-stone-900"
              >
                <X size={18} />
              </button>
            </div>

            {/* Theme switcher */}
            <div>
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-2">
                Reading Theme
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setTheme('warm');
                    onUpdatePreferences({ readerTheme: 'warm' });
                  }}
                  className={`p-2.5 rounded-xl border-2 text-xs font-bold flex flex-col items-center gap-1 bg-[#faf6ee] text-[#1f1b18] ${
                    theme === 'warm' ? 'border-amber-600 ring-2 ring-amber-600/30' : 'border-stone-300'
                  }`}
                >
                  <span>Warm Sepia</span>
                </button>
                <button
                  onClick={() => {
                    setTheme('light');
                    onUpdatePreferences({ readerTheme: 'light' });
                  }}
                  className={`p-2.5 rounded-xl border-2 text-xs font-bold flex flex-col items-center gap-1 bg-white text-stone-950 ${
                    theme === 'light' ? 'border-amber-600 ring-2 ring-amber-600/30' : 'border-stone-300'
                  }`}
                >
                  <span>Light Clean</span>
                </button>
                <button
                  onClick={() => {
                    setTheme('dark');
                    onUpdatePreferences({ readerTheme: 'dark' });
                  }}
                  className={`p-2.5 rounded-xl border-2 text-xs font-bold flex flex-col items-center gap-1 bg-stone-950 text-stone-100 ${
                    theme === 'dark' ? 'border-amber-600 ring-2 ring-amber-600/30' : 'border-stone-700'
                  }`}
                >
                  <span>OLED Dark</span>
                </button>
              </div>
            </div>

            {/* Font size */}
            <div>
              <div className="flex justify-between text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                <span>Text Size</span>
                <span className="font-extrabold text-amber-700 dark:text-amber-400">{fontSize}px</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFontSize((s) => Math.max(14, s - 1))}
                  className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-lg text-sm font-extrabold border border-stone-300 dark:border-stone-700"
                >
                  A-
                </button>
                <input
                  type="range"
                  min={14}
                  max={28}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="flex-1 accent-amber-600 cursor-pointer"
                />
                <button
                  onClick={() => setFontSize((s) => Math.min(28, s + 1))}
                  className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-lg text-sm font-extrabold border border-stone-300 dark:border-stone-700"
                >
                  A+
                </button>
              </div>
            </div>

            {/* Font family */}
            <div>
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Typeface
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['serif', 'sans', 'mono'] as const).map((fam) => (
                  <button
                    key={fam}
                    onClick={() => {
                      setFontFamily(fam);
                      onUpdatePreferences({ fontFamily: fam });
                    }}
                    className={`p-2 rounded-xl border-2 text-xs font-bold capitalize ${
                      fam === 'serif' ? 'font-serif' : fam === 'mono' ? 'font-mono' : 'font-sans'
                    } ${
                      fontFamily === fam
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200'
                        : 'border-stone-300 dark:border-stone-700'
                    }`}
                  >
                    {fam}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Spacing */}
            <div>
              <div className="flex justify-between text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                <span>Line Spacing</span>
                <span className="font-extrabold">{lineSpacing}x</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1.4, 1.6, 2.0].map((spacing) => (
                  <button
                    key={spacing}
                    onClick={() => {
                      setLineSpacing(spacing);
                      onUpdatePreferences({ lineSpacing: spacing });
                    }}
                    className={`py-1.5 rounded-lg border-2 text-xs font-bold ${
                      lineSpacing === spacing
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200'
                        : 'border-stone-300 dark:border-stone-700'
                    }`}
                  >
                    {spacing === 1.4 ? 'Tight' : spacing === 1.6 ? 'Normal' : 'Relaxed'}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowTypographyDrawer(false)}
                className="w-full py-2.5 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 text-xs font-bold rounded-xl"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Drawer */}
      {showNotesDrawer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[80vh] flex flex-col border-2 border-stone-300 dark:border-stone-700 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-sm font-extrabold text-stone-950 dark:text-white flex items-center gap-1.5">
                <MessageSquare size={16} className="text-amber-600" />
                Notes for Page {currentPageNum}
              </h3>
              <button
                onClick={() => setShowNotesDrawer(false)}
                className="p-1 text-stone-500 hover:text-stone-900"
              >
                <X size={18} />
              </button>
            </div>

            {/* Note input */}
            <div className="space-y-2">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Write your personal reflections or takeaways for this page..."
                rows={3}
                className="w-full p-3 rounded-xl border-2 border-stone-400 dark:border-stone-600 bg-white dark:bg-stone-850 text-xs font-bold text-stone-950 dark:text-white placeholder:text-stone-600 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNoteContent.trim()}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Plus size={14} /> Add Note
              </button>
            </div>

            {/* Existing notes list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {pageNotes.length === 0 ? (
                <p className="text-xs text-stone-500 font-semibold text-center py-6">
                  No notes for this page yet.
                </p>
              ) : (
                pageNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-700 flex items-start justify-between gap-2"
                  >
                    <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                      <p className="leading-relaxed">{note.content}</p>
                      <span className="text-[10px] text-stone-500 mt-1 block">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 text-stone-400 hover:text-red-500 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voice Studio Modal */}
      {showVoiceStudio && (
        <VoiceStudioModal
          currentVoiceId={preferences.voiceId || 'kore'}
          currentSpeed={preferences.speed || 1.0}
          onSelectVoice={(voiceId, speed) => {
            onUpdatePreferences({ voiceId, speed });
            setShowVoiceStudio(false);
          }}
          onClose={() => setShowVoiceStudio(false)}
        />
      )}
    </div>
  );
};
