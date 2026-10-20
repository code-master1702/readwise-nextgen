import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Volume2,
  TrendingUp,
  Search,
  ChevronRight,
  Flame,
  Award,
  GraduationCap,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { Book, UserStats, DailyLearningSession, ActionItem, VerifiedBookRecord, GENRES_LIST } from '../types';
import { GenreDetailModal } from './GenreDetailModal';

interface HomeScreenProps {
  books: Book[];
  stats: UserStats;
  dailyLearning: DailyLearningSession;
  actionItems: ActionItem[];
  curatedBooks: VerifiedBookRecord[];
  onOpenBook: (book: Book) => void;
  onOpenAssistant: () => void;
  onNavigateToTab: (tab: any) => void;
  onUploadClick: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  books,
  stats,
  dailyLearning,
  actionItems,
  curatedBooks,
  onOpenBook,
  onOpenAssistant,
  onNavigateToTab,
  onUploadClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const currentBook = books.length > 0 ? books[0] : null;

  const filteredLibrary = searchQuery.trim()
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.author.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const genreIcons: Record<string, string> = {
    Psychology: '🧠',
    'Personal Development': '🌱',
    Philosophy: '🏛️',
    'Business and Entrepreneurship': '🚀',
    'Finance and Investing': '📈',
    'Science and Technology': '🔬',
    History: '📜',
    'Biography and Memoir': '👤',
    Fiction: '✨',
    'Mystery and Thriller': '🔍',
    'Fantasy and Science Fiction': '🪐',
    Romance: '🌹',
    Spirituality: '🕊️',
    'Health and Wellness': '🍎',
    'Communication and Relationships': '💬',
    'Productivity and Leadership': '⚡',
    Education: '🎓',
    'Literature and Classics': '📚',
  };

  const progressPct = currentBook
    ? Math.round((currentBook.currentPage / currentBook.totalPages) * 100)
    : 0;

  return (
    <div className="pb-24 pt-4 px-4 sm:px-6 max-w-2xl mx-auto space-y-6">
      {/* SECTION A: Welcome and Quick Access */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase font-black tracking-widest text-amber-600 dark:text-amber-400">
                BookMind AI
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[11px] text-stone-600 dark:text-stone-400 font-bold">
                Neural Companion
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-950 dark:text-white tracking-tight">
              Good day, Thinker
            </h1>
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">
              Read deeply. Understand everything. Grow through knowledge.
            </p>
          </div>

          <button
            onClick={onOpenAssistant}
            aria-label="Open AI Assistant"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-extrabold shadow-md hover:opacity-95 active:scale-95 transition-all"
          >
            <Sparkles size={14} />
            <span>AI Assistant</span>
          </button>
        </div>

        {/* High-Contrast Search Bar */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search library books, authors, or concepts..."
            className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm font-bold text-stone-950 dark:text-white placeholder:text-stone-500 placeholder:font-semibold rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
          />
        </div>

        {/* Quick Search Results if active */}
        {searchQuery.trim().length > 0 && (
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-850 border-2 border-stone-300 dark:border-stone-700 space-y-2">
            <span className="text-xs font-extrabold text-stone-700 dark:text-stone-300 block">
              Search Results ({filteredLibrary.length})
            </span>
            {filteredLibrary.length === 0 ? (
              <p className="text-xs font-semibold text-stone-500 py-2">No matching books found.</p>
            ) : (
              filteredLibrary.map((b) => (
                <div
                  key={b.id}
                  onClick={() => onOpenBook(b)}
                  className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 flex items-center justify-between cursor-pointer hover:border-amber-500"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-extrabold text-xs text-stone-950 dark:text-white block truncate">
                      {b.title}
                    </span>
                    <span className="text-[11px] font-semibold text-stone-500">by {b.author}</span>
                  </div>
                  <ChevronRight size={16} className="text-stone-500 font-bold" />
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* SECTION B: Continue Reading */}
      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
          <span>Continue Reading</span>
          <button
            onClick={() => onNavigateToTab('books')}
            className="text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5 text-xs font-extrabold"
          >
            All Books ({books.length}) <ChevronRight size={14} />
          </button>
        </div>

        {currentBook ? (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50/40 dark:from-stone-900 dark:via-stone-850 dark:to-stone-900 border-2 border-amber-200 dark:border-stone-800 shadow-sm space-y-3">
            <div className="flex gap-3.5 items-start">
              <div
                className="w-16 h-24 rounded-lg shadow-md flex-shrink-0 flex flex-col justify-between p-2 text-white text-[9px] font-bold select-none"
                style={{ backgroundColor: currentBook.coverBgColor || '#78350f' }}
              >
                <span className="line-clamp-2 leading-tight font-extrabold">{currentBook.title}</span>
                <span className="opacity-80 text-[8px] truncate font-medium">{currentBook.author}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-sm bg-amber-500/15 text-amber-800 dark:text-amber-300">
                    {currentBook.genre}
                  </span>
                  {currentBook.isSample && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold">
                      Classic
                    </span>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-stone-950 dark:text-white truncate">
                  {currentBook.title}
                </h3>
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                  by {currentBook.author}
                </p>

                {/* Progress bar */}
                <div className="mt-2.5 space-y-1">
                  <div className="flex items-center justify-between text-xs text-stone-800 dark:text-stone-200 font-black">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Page {currentBook.currentPage} of {currentBook.totalPages}
                    </span>
                    <span className="font-black text-amber-700 dark:text-amber-400 text-sm">
                      {progressPct}% Completed
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-200"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions: Continue Reading & Voice Reading */}
            <div className="pt-1 flex items-center gap-2">
              <button
                onClick={() => onOpenBook(currentBook)}
                className="flex-1 py-2.5 px-3 bg-stone-950 dark:bg-stone-100 text-white dark:text-stone-950 text-xs font-black rounded-xl hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <BookOpen size={16} /> Continue Page {currentBook.currentPage}
              </button>

              <button
                onClick={() => onOpenBook(currentBook)}
                aria-label="Listen with AI Voice"
                className="py-2.5 px-3.5 bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-black rounded-xl hover:bg-amber-200 transition-colors flex items-center gap-1.5 border-2 border-amber-300 dark:border-amber-800"
              >
                <Volume2 size={16} /> Listen
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-700 text-center space-y-3">
            <BookOpen size={40} className="mx-auto text-stone-400 opacity-60" />
            <div>
              <p className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                Your Library is Empty
              </p>
              <p className="text-xs font-semibold text-stone-500 max-w-xs mx-auto mt-0.5">
                Upload your first PDF book or document to begin deep reading and voice listening.
              </p>
            </div>
            <button
              onClick={onUploadClick}
              className="px-5 py-2.5 bg-amber-600 text-white text-xs font-extrabold rounded-xl hover:bg-amber-700 transition-colors shadow-xs"
            >
              Upload Your First PDF
            </button>
          </div>
        )}
      </section>

      {/* SECTION C: Discover Books by Genre */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-stone-950 dark:text-white flex items-center gap-1.5">
              <span>Discover by Genre</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                18 Curated
              </span>
            </h2>
            <p className="text-xs font-semibold text-stone-500">
              Verified books with verified metadata, ratings, and samples
            </p>
          </div>
        </div>

        {/* Horizontally scrollable genre cards */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {GENRES_LIST.map((genre) => {
            const icon = genreIcons[genre] || '📖';
            const count = curatedBooks.filter((b) => b.genre.toLowerCase() === genre.toLowerCase()).length;

            return (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className="shrink-0 w-36 sm:w-40 p-3 rounded-2xl border-2 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 hover:border-amber-500 dark:hover:border-amber-500 transition-all text-left flex flex-col justify-between group shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
                  <span className="text-[10px] font-bold text-stone-500 group-hover:text-amber-600">
                    {count} {count === 1 ? 'title' : 'titles'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-extrabold text-stone-950 dark:text-white line-clamp-1 block">
                    {genre}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block mt-0.5 flex items-center gap-0.5">
                    Explore <ChevronRight size={11} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* SECTION D: Personalized Recommendations */}
      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
          <span>Recommended for You</span>
          <span className="text-[11px] text-stone-500 font-semibold">Verified Literature</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {curatedBooks.slice(0, 4).map((book) => (
            <div
              key={book.id}
              onClick={() => setSelectedGenre(book.genre)}
              className="p-3.5 rounded-2xl border-2 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 hover:border-amber-400 transition-all flex gap-3 cursor-pointer group shadow-2xs"
            >
              <div
                className="w-12 h-18 rounded-md shadow-sm shrink-0 flex flex-col justify-between p-1 text-white text-[8px] font-bold"
                style={{ backgroundColor: book.coverBgColor || '#1e3a8a' }}
              >
                <span className="line-clamp-2">{book.title}</span>
                <span className="opacity-70 truncate">{book.author}</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 block truncate uppercase">
                    {book.genre}
                  </span>
                  <h4 className="text-xs font-extrabold text-stone-950 dark:text-white truncate group-hover:text-amber-600">
                    {book.title}
                  </h4>
                  <p className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 truncate">{book.author}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-stone-600 dark:text-stone-300 font-bold mt-1">
                  {book.verifiedRating ? (
                    <span className="flex items-center gap-0.5 text-amber-600 font-extrabold">
                      <Star size={11} fill="currentColor" /> {book.verifiedRating}
                    </span>
                  ) : (
                    <span className="italic text-stone-400 font-normal">Rating unavailable</span>
                  )}
                  <span>•</span>
                  <span>{book.difficulty}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION E: Daily Learning & Today's Actions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-stone-950 dark:text-white">
            <GraduationCap size={16} className="text-amber-600" />
            <span>Today's Learning Bite</span>
          </div>
          <button
            onClick={() => onNavigateToTab('progress')}
            className="text-amber-700 dark:text-amber-400 text-xs font-bold hover:underline flex items-center gap-0.5"
          >
            Practice Quiz <ChevronRight size={13} />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800/50 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-amber-900 dark:text-amber-300">
              {dailyLearning.bookTitle}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 font-black text-[11px]">
              +25 Pts
            </span>
          </div>

          <h3 className="text-sm font-extrabold text-stone-950 dark:text-white">
            {dailyLearning.concept}
          </h3>

          <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 leading-relaxed">
            {dailyLearning.simpleExplanation}
          </p>

          <div className="pt-1 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-stone-700 dark:text-stone-300 font-bold">
              <Flame size={15} className="text-orange-500" />
              <span>{stats.currentStreak} Day Streak</span>
            </div>

            <button
              onClick={() => onNavigateToTab('progress')}
              className="px-3.5 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors shadow-xs"
            >
              Start Session
            </button>
          </div>
        </div>

        {/* Pending Actions */}
        {actionItems.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
              Today's Action Steps ({actionItems.filter((a) => a.status === 'completed').length}/{actionItems.length})
            </span>
            {actionItems.slice(0, 2).map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigateToTab('progress')}
                className="p-3 rounded-xl border-2 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 flex items-center justify-between cursor-pointer hover:border-amber-500"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2
                    size={18}
                    className={item.status === 'completed' ? 'text-emerald-500' : 'text-stone-400'}
                  />
                  <div className="min-w-0">
                    <span className={`text-xs font-bold block truncate ${item.status === 'completed' ? 'line-through text-stone-400' : 'text-stone-900 dark:text-stone-100'}`}>
                      {item.title}
                    </span>
                    <span className="text-[11px] font-semibold text-stone-500">+{item.points} pts</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-stone-400 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION F: Quick Statistics */}
      <section className="space-y-2">
        <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">Reading Metrics</span>
        <div className="grid grid-cols-4 gap-2">
          <div className="p-3 rounded-2xl bg-white dark:bg-stone-850 border-2 border-stone-200 dark:border-stone-800 text-center">
            <span className="text-xl font-black text-amber-700 dark:text-amber-400 block">
              {stats.pagesRead}
            </span>
            <span className="text-[10px] text-stone-600 dark:text-stone-400 uppercase font-bold">Pages</span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-stone-850 border-2 border-stone-200 dark:border-stone-800 text-center">
            <span className="text-xl font-black text-orange-600 block">
              {stats.currentStreak}
            </span>
            <span className="text-[10px] text-stone-600 dark:text-stone-400 uppercase font-bold">Streak</span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-stone-850 border-2 border-stone-200 dark:border-stone-800 text-center">
            <span className="text-xl font-black text-emerald-600 block">
              {stats.totalPoints}
            </span>
            <span className="text-[10px] text-stone-600 dark:text-stone-400 uppercase font-bold">Points</span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-stone-850 border-2 border-stone-200 dark:border-stone-800 text-center">
            <span className="text-xl font-black text-indigo-600 block">
              {stats.booksCompleted}
            </span>
            <span className="text-[10px] text-stone-600 dark:text-stone-400 uppercase font-bold">Finished</span>
          </div>
        </div>
      </section>

      {/* Genre Detail Modal */}
      <GenreDetailModal
        genre={selectedGenre}
        books={curatedBooks}
        isOpen={!!selectedGenre}
        onClose={() => setSelectedGenre(null)}
      />
    </div>
  );
};
