import React, { useState } from 'react';
import { X, Star, BookOpen, ExternalLink, Bookmark, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { VerifiedBookRecord } from '../types';

interface GenreDetailModalProps {
  genre: string | null;
  books: VerifiedBookRecord[];
  isOpen: boolean;
  onClose: () => void;
  onSelectBookToRead?: (book: VerifiedBookRecord) => void;
}

export const GenreDetailModal: React.FC<GenreDetailModalProps> = ({
  genre,
  books,
  isOpen,
  onClose,
  onSelectBookToRead,
}) => {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'verified' | 'beginner'>('all');
  const [expandedSampleId, setExpandedSampleId] = useState<string | null>(null);

  if (!isOpen || !genre) return null;

  const genreBooks = books.filter(
    (b) => b.genre.toLowerCase() === genre.toLowerCase()
  );

  const toggleWishlist = (id: string) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filtered = genreBooks.filter((b) => {
    if (activeTab === 'verified') return b.isVerified;
    if (activeTab === 'beginner') return b.difficulty === 'Beginner';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-amber-50/50 dark:bg-stone-900">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold tracking-wider uppercase">
              <Sparkles size={13} /> Curated Genre Explorer
            </div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5">
              {genre}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {genreBooks.length} verified titles with scholarly review metrics
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Genre Modal"
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-100 dark:border-stone-800 text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-amber-600 text-white'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            All Titles ({genreBooks.length})
          </button>
          <button
            onClick={() => setActiveTab('verified')}
            className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1 ${
              activeTab === 'verified'
                ? 'bg-amber-600 text-white'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <ShieldCheck size={12} /> Verified Records
          </button>
          <button
            onClick={() => setActiveTab('beginner')}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              activeTab === 'beginner'
                ? 'bg-amber-600 text-white'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            Beginner Friendly
          </button>
        </div>

        {/* Books List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No books found in this filter.</p>
            </div>
          ) : (
            filtered.map((book) => {
              const isWishlisted = wishlist.includes(book.id);
              const isSampleExpanded = expandedSampleId === book.id;

              return (
                <div
                  key={book.id}
                  className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850 space-y-3"
                >
                  <div className="flex gap-3">
                    {/* Simulated Book Spine / Cover */}
                    <div
                      className="w-16 h-24 rounded-md shadow-md flex-shrink-0 flex flex-col justify-between p-1.5 text-white text-[9px] font-bold select-none"
                      style={{ backgroundColor: book.coverBgColor || '#1e3a8a' }}
                    >
                      <span className="line-clamp-2 leading-tight">{book.title}</span>
                      <span className="opacity-80 text-[8px] truncate">{book.author}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                            {book.title}
                          </h3>
                          <p className="text-xs font-medium text-stone-600 dark:text-stone-300">
                            by {book.author}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleWishlist(book.id)}
                          aria-label={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isWishlisted
                              ? 'text-amber-600 bg-amber-100 dark:bg-amber-950/40'
                              : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
                          }`}
                        >
                          <Bookmark size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      {/* Verified Rating or Rating Unavailable */}
                      <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px]">
                        {book.verifiedRating !== null ? (
                          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                            <Star size={13} fill="currentColor" />
                            <span>{book.verifiedRating} / 5.0</span>
                            <span className="text-[10px] text-stone-400 font-normal">
                              ({book.verifiedRatingSource})
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic text-[11px]">
                            Rating unavailable
                          </span>
                        )}
                      </div>

                      {/* Metadata badges */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-sm bg-stone-200/70 dark:bg-stone-750 text-stone-700 dark:text-stone-300">
                          {book.difficulty}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-sm bg-stone-200/70 dark:bg-stone-750 text-stone-700 dark:text-stone-300">
                          {book.lengthPages} pages
                        </span>
                        {book.publicationYear && (
                          <span className="text-[10px] px-2 py-0.5 rounded-sm bg-stone-200/70 dark:bg-stone-750 text-stone-700 dark:text-stone-300">
                            {book.publicationYear > 0 ? book.publicationYear : `${Math.abs(book.publicationYear)} BCE`}
                          </span>
                        )}
                        {book.isVerified && (
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                            <ShieldCheck size={11} /> Verified Record
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description & Why Recommended */}
                  <div className="text-xs space-y-1.5 pt-1 text-stone-700 dark:text-stone-300">
                    <p className="line-clamp-2 text-stone-600 dark:text-stone-300 leading-relaxed">
                      {book.description}
                    </p>
                    <div className="bg-white dark:bg-stone-800 p-2.5 rounded-lg border border-stone-200/70 dark:border-stone-700">
                      <span className="font-semibold text-amber-700 dark:text-amber-400 block text-[11px] mb-0.5">
                        Why It's Recommended:
                      </span>
                      <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                        {book.whyRecommended}
                      </p>
                    </div>
                  </div>

                  {/* Sample Passage Toggle */}
                  {book.samplePassage && (
                    <div className="pt-1">
                      <button
                        onClick={() =>
                          setExpandedSampleId(isSampleExpanded ? null : book.id)
                        }
                        className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <BookOpen size={12} />
                        {isSampleExpanded ? 'Hide Sample Passage' : 'Read Sample Preview'}
                      </button>

                      {isSampleExpanded && (
                        <div className="mt-2 p-3 bg-amber-50/70 dark:bg-amber-950/20 border-l-2 border-amber-500 rounded-r-lg text-xs italic text-stone-800 dark:text-stone-200 leading-relaxed">
                          "{book.samplePassage}"
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-stone-200/70 dark:border-stone-700/70 flex items-center justify-between text-xs">
                    {book.isbn && (
                      <span className="text-[10px] text-stone-400 font-mono">
                        ISBN: {book.isbn}
                      </span>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      {book.purchaseUrl && (
                        <a
                          href={book.purchaseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-[11px] font-medium rounded-md text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center gap-1 transition-colors"
                        >
                          Find Book <ExternalLink size={11} />
                        </a>
                      )}
                      <button
                        onClick={() => toggleWishlist(book.id)}
                        className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1 ${
                          isWishlisted
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-600'
                        }`}
                      >
                        {isWishlisted ? (
                          <>
                            <Check size={11} /> Saved
                          </>
                        ) : (
                          'Save to Wishlist'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
