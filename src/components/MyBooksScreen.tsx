import React, { useState, useRef } from 'react';
import {
  Upload,
  BookOpen,
  Search,
  Grid,
  List,
  Trash2,
  FileText,
  AlertCircle,
  Plus,
  X,
  Sparkles,
} from 'lucide-react';
import { Book, GENRES_LIST } from '../types';
import { api } from '../services/api';

interface MyBooksScreenProps {
  books: Book[];
  onOpenBook: (book: Book) => void;
  onRefreshBooks: () => Promise<void>;
}

export const MyBooksScreen: React.FC<MyBooksScreenProps> = ({
  books,
  onOpenBook,
  onRefreshBooks,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('All');

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploadGenre, setUploadGenre] = useState('Personal Development');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Delete modal state
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setUploadError('Only PDF files are supported.');
        return;
      }
      setUploadFile(file);
      setUploadError(null);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(25);

    const interval = setInterval(() => {
      setUploadProgress((p) => (p < 85 ? p + 15 : p));
    }, 250);

    try {
      const newBook = await api.uploadBook(uploadFile, {
        title: uploadTitle.trim() || uploadFile.name.replace(/\.pdf$/i, ''),
        author: uploadAuthor.trim() || 'Author',
        genre: uploadGenre,
      });

      setUploadProgress(100);
      clearInterval(interval);
      await onRefreshBooks();

      setTimeout(() => {
        setIsUploading(false);
        setIsUploadOpen(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadAuthor('');
        setUploadProgress(0);
        // Automatically open the uploaded book for reading immediately!
        if (newBook) {
          onOpenBook(newBook);
        }
      }, 400);
    } catch (err: any) {
      clearInterval(interval);
      setIsUploading(false);
      setUploadError(err?.message || 'Failed to extract text from this PDF file.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!bookToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteBook(bookToDelete.id);
      await onRefreshBooks();
      setBookToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter books
  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre =
      selectedGenreFilter === 'All' ||
      b.genre.toLowerCase() === selectedGenreFilter.toLowerCase();
    return matchesSearch && matchesGenre;
  });

  return (
    <div className="pb-24 pt-4 px-4 sm:px-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-stone-950 dark:text-white">
            My Books
          </h1>
          <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
            {books.length} {books.length === 1 ? 'document' : 'documents'} in your personal library
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
        >
          <Upload size={15} /> Upload PDF
        </button>
      </div>

      {/* Search & View Toggle Controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, or keyword..."
              className="w-full pl-10 pr-3.5 py-2.5 text-xs font-bold text-stone-950 dark:text-white placeholder:text-stone-500 placeholder:font-semibold rounded-xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center rounded-xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 p-1">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
              className={`p-1.5 rounded-lg ${
                viewMode === 'grid'
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List View"
              className={`p-1.5 rounded-lg ${
                viewMode === 'list'
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Genre filter tags */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedGenreFilter('All')}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              selectedGenreFilter === 'All'
                ? 'bg-stone-950 text-white dark:bg-white dark:text-stone-950 shadow-xs'
                : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold'
            }`}
          >
            All ({books.length})
          </button>
          {GENRES_LIST.slice(0, 8).map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenreFilter(genre)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                selectedGenreFilter === genre
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Book Items Render */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <BookOpen size={42} className="mx-auto text-stone-400 opacity-60" />
          <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
            No books found matching your search.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {filteredBooks.map((book) => {
            const pct = Math.round((book.currentPage / book.totalPages) * 100);
            return (
              <div
                key={book.id}
                className="group p-3 rounded-2xl border-2 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 flex flex-col justify-between hover:border-amber-400 transition-all relative shadow-2xs"
              >
                {/* Book Cover */}
                <div
                  onClick={() => onOpenBook(book)}
                  className="w-full aspect-3/4 rounded-xl shadow-md flex flex-col justify-between p-2.5 text-white text-[10px] font-bold select-none cursor-pointer transition-transform group-hover:scale-[1.02]"
                  style={{ backgroundColor: book.coverBgColor || '#1e3a8a' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">
                      {book.genre}
                    </span>
                    {book.isSample && (
                      <span className="px-1.5 py-0.5 rounded-sm bg-black/40 text-[8px] font-bold">
                        Classic
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="line-clamp-2 leading-tight text-xs font-extrabold">{book.title}</h3>
                    <p className="opacity-90 text-[10px] truncate mt-0.5 font-medium">{book.author}</p>
                  </div>
                </div>

                {/* Progress & Actions */}
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-stone-700 dark:text-stone-300">
                    <span>
                      p. {book.currentPage}/{book.totalPages}
                    </span>
                    <span className="text-amber-700 dark:text-amber-400 font-extrabold">
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="pt-1.5 flex items-center justify-between gap-1">
                    <button
                      onClick={() => onOpenBook(book)}
                      className="flex-1 py-1 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black text-center shadow-2xs"
                    >
                      Read p.{book.currentPage} →
                    </button>
                    {!book.isSample && (
                      <button
                        onClick={() => setBookToDelete(book)}
                        aria-label={`Delete ${book.title}`}
                        className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-2.5">
          {filteredBooks.map((book) => {
            const pct = Math.round((book.currentPage / book.totalPages) * 100);
            return (
              <div
                key={book.id}
                className="p-3.5 rounded-2xl border-2 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 flex items-center gap-3.5 hover:border-amber-400 transition-colors shadow-2xs"
              >
                <div
                  onClick={() => onOpenBook(book)}
                  className="w-14 h-20 rounded-lg shadow-sm shrink-0 flex flex-col justify-between p-1.5 text-white text-[8px] font-bold cursor-pointer"
                  style={{ backgroundColor: book.coverBgColor || '#1e3a8a' }}
                >
                  <span className="line-clamp-2">{book.title}</span>
                  <span className="opacity-80 truncate">{book.author}</span>
                </div>

                <div className="flex-1 min-w-0" onClick={() => onOpenBook(book)}>
                  <div className="cursor-pointer">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                        {book.genre}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-stone-950 dark:text-white truncate">
                      {book.title}
                    </h3>
                    <p className="text-xs font-semibold text-stone-600 dark:text-stone-400 truncate">by {book.author}</p>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 whitespace-nowrap">
                      {pct}% (p.{book.currentPage}/{book.totalPages})
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => onOpenBook(book)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black shadow-2xs"
                  >
                    Read
                  </button>
                  {!book.isSample && (
                    <button
                      onClick={() => setBookToDelete(book)}
                      aria-label={`Delete ${book.title}`}
                      className="p-1 text-stone-400 hover:text-red-500 rounded-lg text-center"
                    >
                      <Trash2 size={15} className="mx-auto" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* UPLOAD PDF MODAL WITH HIGH CONTRAST INPUTS */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl border-2 border-stone-300 dark:border-stone-700 space-y-4 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-base font-extrabold text-stone-950 dark:text-white flex items-center gap-2">
                <Upload size={18} className="text-amber-600" />
                Upload PDF Document
              </h3>
              <button
                onClick={() => {
                  if (!isUploading) setIsUploadOpen(false);
                }}
                disabled={isUploading}
                className="p-1 text-stone-500 hover:text-stone-900"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
              {/* File selector drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-stone-400 dark:border-stone-600 hover:border-amber-500 rounded-2xl text-center cursor-pointer bg-stone-50 dark:bg-stone-850 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileText size={36} className="mx-auto text-amber-600 mb-2 opacity-90" />
                {uploadFile ? (
                  <div>
                    <p className="font-extrabold text-sm text-stone-950 dark:text-white truncate">
                      {uploadFile.name}
                    </p>
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                      {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB PDF Ready
                    </span>
                  </div>
                ) : (
                  <>
                    <p className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      Tap here to choose a PDF file
                    </p>
                    <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 mt-1">
                      Extracts real page text for deep reading, jump-to-page & voice narration
                    </p>
                  </>
                )}
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Title & Author with crisp high-contrast fields */}
              <div className="space-y-2.5">
                <div>
                  <label className="font-bold text-xs text-stone-900 dark:text-stone-100 block mb-1">
                    Book Title
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Enter book title"
                    className="w-full p-3 rounded-xl border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-850 text-stone-950 dark:text-white font-bold text-xs placeholder:text-stone-500 placeholder:font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold text-xs text-stone-900 dark:text-stone-100 block mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={uploadAuthor}
                    onChange={(e) => setUploadAuthor(e.target.value)}
                    placeholder="Enter author name"
                    className="w-full p-3 rounded-xl border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-850 text-stone-950 dark:text-white font-bold text-xs placeholder:text-stone-500 placeholder:font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold text-xs text-stone-900 dark:text-stone-100 block mb-1">
                    Genre
                  </label>
                  <select
                    value={uploadGenre}
                    onChange={(e) => setUploadGenre(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-850 text-stone-950 dark:text-white font-bold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    {GENRES_LIST.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Progress bar if uploading */}
              {isUploading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-bold text-stone-700 dark:text-stone-300">
                    <span>Extracting book pages & text...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={isUploading}
                  className="px-4 py-2.5 rounded-xl text-stone-700 hover:bg-stone-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl disabled:opacity-40 shadow-xs"
                >
                  {isUploading ? 'Extracting Text...' : 'Upload & Start Reading'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {bookToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-2xl p-5 shadow-2xl border-2 border-stone-300 dark:border-stone-700 space-y-3 animate-in zoom-in-95">
            <h3 className="text-base font-extrabold text-stone-950 dark:text-white">
              Delete Book?
            </h3>
            <p className="text-xs font-medium text-stone-700 dark:text-stone-300 leading-relaxed">
              Are you sure you want to remove <strong>"{bookToDelete.title}"</strong>? Its reading
              progress, bookmarks, and notes will be permanently removed.
            </p>
            <div className="pt-2 flex justify-end gap-2 text-xs font-bold">
              <button
                onClick={() => setBookToDelete(null)}
                className="px-4 py-2 rounded-xl text-stone-700 hover:bg-stone-100"
              >
                Keep Book
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
