/**
 * BookMind AI Data Types & Enums
 */

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  totalPages: number;
  currentPage: number;
  coverUrl?: string;
  coverBgColor?: string;
  description: string;
  isSample?: boolean;
  fileSize?: string;
  uploadedAt: string;
  lastReadAt?: string;
  pages: ExtractedPage[];
}

export interface Highlight {
  id: string;
  bookId: string;
  pageNumber: number;
  text: string;
  color: 'yellow' | 'green' | 'blue' | 'purple' | 'pink';
  note?: string;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  pageNumber: number;
  title: string;
  createdAt: string;
}

export interface Note {
  id: string;
  bookId: string;
  pageNumber: number;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface VocabularyItem {
  id: string;
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition: string;
  contextualMeaning?: string;
  synonyms: string[];
  example: string;
  bookId?: string;
  bookTitle?: string;
  pageNumber?: number;
  mastered: boolean;
  createdAt: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  provider: 'gemini' | 'system';
  language: string;
  accent: string;
  gender: 'female' | 'male' | 'neutral';
  style: string;
  description: string;
  sampleText: string;
  previewAudioUrl?: string;
  isDefault?: boolean;
}

export type AssistantMode =
  | 'book_expert'
  | 'explain_simply'
  | 'research_assistant'
  | 'learning_coach'
  | 'writing_assistant'
  | 'personal_librarian'
  | 'vocabulary_tutor'
  | 'critical_thinking_coach';

export interface AssistantModeInfo {
  id: AssistantMode;
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  promptStarters: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: { title: string; pageNumber?: number; quote?: string }[];
  isVerifiedFact?: boolean;
  uncertaintyNote?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  mode: AssistantMode;
  bookId?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface VerifiedBookRecord {
  id: string;
  title: string;
  author: string;
  genre: string;
  coverUrl?: string;
  coverBgColor?: string;
  description: string;
  whyRecommended: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  lengthPages: number;
  publicationYear?: number;
  isbn?: string;
  verifiedRating: number | null; // e.g. 4.8 or null if unavailable
  verifiedRatingSource?: string; // e.g. "Goodreads / Library of Congress"
  isVerified: boolean;
  previewUrl?: string;
  purchaseUrl?: string;
  samplePassage?: string;
}

export interface DailyLearningSession {
  id: string;
  date: string;
  bookId?: string;
  bookTitle: string;
  concept: string;
  simpleExplanation: string;
  realLifeExample: string;
  reflectionQuestion: string;
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  practicalActivity: string;
  keyTakeaway: string;
  completed: boolean;
  userReflection?: string;
  selectedQuizOption?: number;
  quizPassed?: boolean;
  pointsEarned: number;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  bookTitle?: string;
  points: number;
  status: 'pending' | 'completed' | 'skipped';
  createdAt: string;
  completedAt?: string;
}

export type DocumentType = 'book' | 'guide' | 'article' | 'note';

export interface WritingChapter {
  id: string;
  title: string;
  content: string;
}

export interface WritingDocument {
  id: string;
  title: string;
  type: DocumentType;
  chapters: WritingChapter[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  voiceId: string;
  speed: number;
  pitch: number;
  autoAdvancePage: boolean;
  repeatPage: boolean;
  pauseOnExit: boolean;
  continuousPlayback: boolean;
  readerTheme: 'light' | 'dark' | 'warm';
  fontSize: number; // 14 to 28
  lineSpacing: number; // 1.4 to 2.2
  fontFamily: 'serif' | 'sans' | 'mono';
  dailyReadingMinutesTarget: number;
  dailyPageTarget: number;
  preferredGenres: string[];
  learningGoals: string[];
}

export interface UserStats {
  pagesRead: number;
  booksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  sessionsCompleted: number;
  quizzesPassed: number;
  actionsCompleted: number;
  awardedActionIds: string[];
  readingHistory: { date: string; pagesRead: number; minutes: number }[];
}

export const GENRES_LIST = [
  'Psychology',
  'Personal Development',
  'Philosophy',
  'Business and Entrepreneurship',
  'Finance and Investing',
  'Science and Technology',
  'History',
  'Biography and Memoir',
  'Fiction',
  'Mystery and Thriller',
  'Fantasy and Science Fiction',
  'Romance',
  'Spirituality',
  'Health and Wellness',
  'Communication and Relationships',
  'Productivity and Leadership',
  'Education',
  'Literature and Classics',
] as const;

export type GenreType = (typeof GENRES_LIST)[number];
