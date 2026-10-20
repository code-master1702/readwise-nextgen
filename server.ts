import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { GoogleGenAI } from '@google/genai';
import { CURATED_GENRE_BOOKS } from './src/data/curatedBooks';
import { AVAILABLE_VOICES } from './src/data/voices';
import {
  Book,
  Highlight,
  Bookmark,
  Note,
  VocabularyItem,
  DailyLearningSession,
  ActionItem,
  WritingDocument,
  UserPreferences,
  UserStats,
  ChatMessage,
  Conversation,
} from './src/types';
import { awardPointsSafely, calculateStreaks, splitTextIntoSentences } from './src/utils/rules';

const app = express();
const PORT = 3000;
const isDev = process.env.NODE_ENV !== 'production';

// Ensure data directories exist
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'bookmind_db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Setup multer for PDF uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported.'));
    }
  },
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Initialize Google GenAI client if GEMINI_API_KEY is available
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Database Schema & Persistence
interface DatabaseData {
  books: Book[];
  highlights: Highlight[];
  bookmarks: Bookmark[];
  notes: Note[];
  vocabulary: VocabularyItem[];
  dailyLearning: DailyLearningSession;
  actions: ActionItem[];
  documents: WritingDocument[];
  preferences: UserPreferences;
  stats: UserStats;
  conversations: Conversation[];
}

function getInitialDatabase(): DatabaseData {
  const sampleBook1: Book = {
    id: 'sample-book-meditations',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    genre: 'Philosophy',
    totalPages: 5,
    currentPage: 1,
    coverBgColor: '#78350f',
    description: 'Personal reflections by the Roman Emperor on Stoic resilience, mortality, duty, and keeping inner tranquility amidst chaotic circumstances.',
    isSample: true,
    fileSize: '1.2 MB',
    uploadedAt: new Date().toISOString(),
    lastReadAt: new Date().toISOString(),
    pages: [
      {
        pageNumber: 1,
        text: `BOOK II — ON THE RIVER GRANUA\n\nWhen you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil.\n\nBut I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own—not of the same blood or birth, but the same mind, and possessing a share of the divine. And so none of them can hurt me. No one can implicate me in ugliness. Nor can I feel angry at my fellow human, or hate them. We were made to work together like feet, like hands, like the rows of the upper and lower teeth. To obstruct each other is unnatural. To feel anger at someone, to turn your back on him: these are obstructions.`,
      },
      {
        pageNumber: 2,
        text: `Whatever this is that I am, it is a little flesh and breath, and the ruling part. Despise the flesh: blood and bones and a network, a jumble of nerves, veins, and arteries. Consider the breath: wind, always changing, expelled and sucked back in again.\n\nThe third part is the master within. Put your books aside; do not be distracted; it is not permitted. As if you were already on the verge of death, despise the flesh. You are an old man; no longer allow this mind of yours to be enslaved, no longer allow it to be drawn like a puppet by every selfish impulse, or to complain about your present lot, or to dread what the future may bring.`,
      },
      {
        pageNumber: 3,
        text: `Remember how long you have been deferring these things, and how many times you have received opportunity from the gods without using it. You must now at last perceive what kingdom you are a part of, and from what governor of that kingdom you yourself came as an emanation.\n\nThere is a limit set to your time, and if you do not use it to strip away the darkness, it will pass, and you will pass, and never again will it be within your power. Every hour of the day, vigorously resolve as a Roman and as a human being to perform the task at hand with unyielding dignity, unfeigned affection, freedom, and justice; and to vacate your mind of all other thoughts.`,
      },
      {
        pageNumber: 4,
        text: `Do external things distract you? Then make time to learn something worthwhile and stop wandering aimlessly. But beware of another error: for those who are weary of life because of ceaseless striving, without having any fixed goal to which they direct every impulse and thought, are also triflers in act.\n\nFailure to read another person's mind rarely makes a man unhappy; but those who do not closely observe the movements of their own mind are bound to be wretched. Always remember this: what is the nature of the whole, what is my nature, how are they related, and what kind of part am I of what kind of whole?`,
      },
      {
        pageNumber: 5,
        text: `Even if you were destined to live three thousand years, or thirty thousand, remember that no one loses any other life than the one they are now living, nor lives any other life than the one they lose.\n\nThe longest and shortest life come to the same thing. For the present is equal for everyone, and what is passing is also equal; and so what is lost appears to be a mere moment. You cannot lose the past or the future; for how could anyone take from you what you do not have?\n\nRemember then: all things are mere opinion, and opinion is within your power. Strip away the opinion, and the ship has rounded the headland, into calm water and an unruffled bay.`,
      },
    ],
  };

  const sampleBook2: Book = {
    id: 'sample-book-psych-money',
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    genre: 'Finance and Investing',
    totalPages: 4,
    currentPage: 1,
    coverBgColor: '#065f46',
    description: 'Timeless lessons on wealth, greed, ego, and happiness exploring why behavioral temperament matters more than pure mathematical intellect.',
    isSample: true,
    fileSize: '950 KB',
    uploadedAt: new Date().toISOString(),
    lastReadAt: new Date().toISOString(),
    pages: [
      {
        pageNumber: 1,
        text: `INTRODUCTION: THE GREATEST SHOW ON EARTH\n\nDoing well with money has a little to do with how smart you are and a lot to do with how you behave. And behavior is hard to teach, even to really smart people. A genius who loses control of their emotions can be a financial disaster. The opposite is also true: ordinary folks with no financial education can be wealthy if they have a handful of behavioral skills that have nothing to do with formal intelligence measures.\n\nMy favorite premise of this book is that financial success is not a hard science. It is a soft skill, where how you behave is more important than what you know. I call this soft skill the psychology of money.`,
      },
      {
        pageNumber: 2,
        text: `CHAPTER 1: NO ONE'S CRAZY\n\nYour personal experiences with money make up maybe 0.00000001% of what's happened in the world, but maybe 80% of how you think the world works. So equally smart people can disagree about how and why the economy works, what you should invest in, and what risks are worth taking.\n\nEvery decision people make with money makes sense to them in that moment. They tell themselves a story about what they are doing and why, and that story has been shaped by their unique life history. Don't judge someone for how they spend or save until you understand the generational context that formed their financial instincts.`,
      },
      {
        pageNumber: 3,
        text: `CHAPTER 3: NEVER ENOUGH\n\nWhen rich people do crazy things, it is almost always driven by an inability to define when they have enough. The hardest financial skill is getting the goalpost to stop moving. If expectations rise with results there is no logic in striving for more because you'll feel the same after putting in extra effort.\n\nModern capitalism is a pro at two things: generating wealth and generating envy. Perhaps they go hand in hand; wanting to surpass your peers can be the fuel of hard work. But life isn't any fun without a sense of enough. Happiness, as it's said, is just results minus expectations.`,
      },
      {
        pageNumber: 4,
        text: `CHAPTER 4: CONFOUNDING COMPOUNDING\n\nMore than 99% of Warren Buffett's wealth was accumulated after his 50th birthday. 97% came after he turned 65. If he had retired at age 60, virtually no one would ever have heard of him.\n\nHis skill is investing, but his secret is time. Compounding works wonders not because you earn extraordinary annual returns, but because you earn pretty good returns that you can stick with for the longest possible period of time. Longevity is the key to financial miracles.`,
      },
    ],
  };

  const initialPreferences: UserPreferences = {
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
    learningGoals: ['Cultivate mental toughness', 'Master cognitive biases', 'Improve focus'],
  };

  const initialDailyLearning: DailyLearningSession = {
    id: 'daily-session-1',
    date: new Date().toISOString().split('T')[0],
    bookTitle: 'Meditations by Marcus Aurelius',
    concept: 'The Dichotomy of Control',
    simpleExplanation: 'Everything in life falls into two categories: things you can control (your thoughts, actions, decisions) and things you cannot control (the weather, other people, external outcomes). True tranquility comes from investing 100% of your energy solely in what is within your control.',
    realLifeExample: 'When you are stuck in bad traffic on your way to an interview, you cannot control the traffic jam, but you have absolute control over your reaction—whether to panic, or to calmly practice your interview answers or listen to an insightful book.',
    reflectionQuestion: 'What is one frustrating situation in your life right now where you are worrying about things outside of your direct control?',
    quiz: {
      question: 'According to Marcus Aurelius and Stoic philosophy, where does your true power reside?',
      options: [
        'In controlling outside events and predicting the future',
        'In your own mind and how you choose to respond',
        'In accumulating enough wealth to avoid hardship',
        'In convincing other people to agree with you',
      ],
      correctIndex: 1,
      explanation: 'Marcus Aurelius wrote: "You have power over your mind - not outside events. Realize this, and you will find strength."',
    },
    practicalActivity: 'Identify one worry on your mind today. Draw two columns on paper: "Within My Control" and "Outside My Control". Move every external factor to the right column and let it go.',
    keyTakeaway: 'Focus strictly on your inputs; detach your peace of mind from uncontrollable external outputs.',
    completed: false,
    pointsEarned: 25,
  };

  const initialActions: ActionItem[] = [
    {
      id: 'action-1',
      title: 'Practice the Dichotomy of Control',
      description: 'Before reacting to any annoyance today, ask: "Is this within my control?" If not, let it pass without agitation.',
      bookTitle: 'Meditations',
      points: 30,
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'action-2',
      title: 'Identify Your "Enough" Threshold',
      description: 'Write down a clear financial milestone where you would consider yourself content, rather than letting the goalpost slide.',
      bookTitle: 'The Psychology of Money',
      points: 25,
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  ];

  const initialVocabulary: VocabularyItem[] = [
    {
      id: 'vocab-1',
      word: 'Equanimity',
      phonetic: '/ˌiː.kwəˈnɪm.ə.t̬i/',
      partOfSpeech: 'noun',
      definition: 'Calmness and composure, especially in a difficult or stressful situation.',
      contextualMeaning: 'The Stoic state of undisturbed mental equilibrium in the face of praise or insult.',
      synonyms: ['serenity', 'tranquility', 'poise', 'imperturbability'],
      example: 'She accepted both triumphs and unexpected setbacks with remarkable equanimity.',
      bookTitle: 'Meditations',
      pageNumber: 1,
      mastered: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'vocab-2',
      word: 'Heuristic',
      phonetic: '/hjʊˈrɪs.tɪk/',
      partOfSpeech: 'noun / adjective',
      definition: 'A mental shortcut or rule-of-thumb that allows people to solve problems and make judgments quickly.',
      contextualMeaning: 'An efficient cognitive tool used by System 1 to navigate complex environments.',
      synonyms: ['rule of thumb', 'cognitive shortcut', 'rule'],
      example: 'The availability heuristic leads people to overestimate the likelihood of plane crashes.',
      bookTitle: 'Thinking, Fast and Slow',
      pageNumber: 1,
      mastered: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const initialDocuments: WritingDocument[] = [
    {
      id: 'doc-stoic-reflections',
      title: 'Principles for an Unshakeable Mind',
      type: 'article',
      tags: ['Philosophy', 'Stoicism', 'Resilience'],
      chapters: [
        {
          id: 'ch-1',
          title: 'The Fortress Within',
          content: `In an era defined by continuous notifications and rapid external volatility, the ancient teachings of Marcus Aurelius feel less like ancient history and more like an emergency survival manual.\n\nThe core insight is deceptively simple: you will never control the world, but you can always govern your own mind. When we stop demanding that external reality conform to our immediate desires, an extraordinary stillness takes root.`,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const initialStats: UserStats = {
    pagesRead: 14,
    booksCompleted: 0,
    currentStreak: 3,
    longestStreak: 5,
    totalPoints: 120,
    sessionsCompleted: 2,
    quizzesPassed: 2,
    actionsCompleted: 1,
    awardedActionIds: ['daily-session-seed-1', 'daily-session-seed-2'],
    readingHistory: [
      { date: new Date().toISOString().split('T')[0], pagesRead: 5, minutes: 18 },
      {
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        pagesRead: 4,
        minutes: 15,
      },
      {
        date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        pagesRead: 5,
        minutes: 20,
      },
    ],
  };

  const initialConversations: Conversation[] = [
    {
      id: 'conv-initial-expert',
      title: 'Understanding Meditations Book II',
      mode: 'book_expert',
      bookId: 'sample-book-meditations',
      messages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content:
            'Welcome! I am your dedicated **Book Expert**. I have full context of *Meditations* by Marcus Aurelius. Ask me anything about Stoic principles, duty, dealing with difficult people, or specific passages from Book II.',
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    books: [sampleBook1, sampleBook2],
    highlights: [],
    bookmarks: [],
    notes: [],
    vocabulary: initialVocabulary,
    dailyLearning: initialDailyLearning,
    actions: initialActions,
    documents: initialDocuments,
    preferences: initialPreferences,
    stats: initialStats,
    conversations: initialConversations,
  };
}

function loadDatabase(): DatabaseData {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading db file, falling back to initial seed:', err);
  }
  const initial = getInitialDatabase();
  saveDatabase(initial);
  return initial;
}

function saveDatabase(data: DatabaseData) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db file:', err);
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Books
app.get('/api/books', (_req: Request, res: Response) => {
  const db = loadDatabase();
  // Sort books by lastReadAt descending so the currently active/uploaded book is always first
  const sortedBooks = [...db.books].sort(
    (a, b) => new Date(b.lastReadAt || 0).getTime() - new Date(a.lastReadAt || 0).getTime()
  );
  // Return book summaries without all huge page text for speed
  const summaries = sortedBooks.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    genre: b.genre,
    totalPages: b.totalPages,
    currentPage: b.currentPage,
    coverBgColor: b.coverBgColor,
    description: b.description,
    isSample: b.isSample,
    fileSize: b.fileSize,
    uploadedAt: b.uploadedAt,
    lastReadAt: b.lastReadAt,
  }));
  res.json({ success: true, books: summaries });
});

app.get('/api/books/:id', (req: Request, res: Response) => {
  const db = loadDatabase();
  const book = db.books.find((b) => b.id === req.params.id);
  if (!book) {
    res.status(404).json({ success: false, error: 'Book not found' });
    return;
  }
  res.json({ success: true, book });
});

async function extractPdfPages(fileBuffer: Buffer): Promise<{ pageNumber: number; text: string }[]> {
  // Method 1: Modern pdf-parse using PDFParse class
  try {
    const pdfModule = require('pdf-parse');
    const ParserClass = pdfModule.PDFParse || (typeof pdfModule === 'function' ? null : pdfModule.default?.PDFParse);
    if (ParserClass) {
      const parser = new ParserClass({ data: fileBuffer });
      const res = await parser.getText();
      if (res && res.pages && Array.isArray(res.pages) && res.pages.length > 0) {
        // Keep ALL pages 1-to-1 so physical page numbers match reader perfectly
        const pages = res.pages.map((p: any, idx: number) => {
          const rawText = (p.text || '').replace(/\r\n/g, '\n').trim();
          return {
            pageNumber: p.num || idx + 1,
            text: rawText || '(Blank page or illustration. Tap Next or Select Page to jump to text)',
          };
        });

        if (pages.length > 0) {
          return pages;
        }
      }
    }

    // Method 2: Legacy pdf-parse function call
    const parseFn = typeof pdfModule === 'function' ? pdfModule : pdfModule.default;
    if (typeof parseFn === 'function') {
      const data = await parseFn(fileBuffer);
      const rawText = (data.text || '').replace(/\r\n/g, '\n').trim();
      if (rawText.length > 0) {
        // Standard PDF page breaks are form feed characters \f or \x0c
        const rawPages = rawText.split(/\f|\x0c/);
        const pages = rawPages.map((text: string, idx: number) => ({
          pageNumber: idx + 1,
          text: text.trim() || '(Blank page or illustration. Tap Next or Select Page to jump to text)',
        }));

        if (pages.length > 0) {
          return pages;
        }

        // If no form feeds found, chunk paragraphs into readable pages
        const paragraphs = rawText.split(/\n\s*\n/);
        const total = Math.max(1, data.numpages || Math.ceil(paragraphs.length / 5));
        const parasPerPage = Math.max(1, Math.ceil(paragraphs.length / total));
        const chunkedPages: { pageNumber: number; text: string }[] = [];
        for (let i = 1; i <= total; i++) {
          const slice = paragraphs.slice((i - 1) * parasPerPage, i * parasPerPage);
          const pageTxt = slice.join('\n\n').trim();
          if (pageTxt) {
            chunkedPages.push({ pageNumber: i, text: pageTxt });
          }
        }
        if (chunkedPages.length > 0) return chunkedPages;
      }
    }
  } catch (err) {
    console.warn('PDFParse primary method failed:', err);
  }

  // Method 3: Stream scanner for uncompressed text in PDF stream objects
  try {
    const pdfString = fileBuffer.toString('latin1');
    const textFragments: string[] = [];
    const tjRegex = /\(([^)]+)\)\s*T[jJ]/g;
    let match;
    while ((match = tjRegex.exec(pdfString)) !== null) {
      const cleaned = match[1].replace(/\\([()\\])/g, '$1').trim();
      if (cleaned.length > 0) {
        textFragments.push(cleaned);
      }
    }

    if (textFragments.length > 20) {
      // Group text fragments into pages of ~250 words
      const fullText = textFragments.join(' ');
      const words = fullText.split(/\s+/);
      const wordsPerPage = 250;
      const totalPages = Math.max(1, Math.ceil(words.length / wordsPerPage));
      const pages: { pageNumber: number; text: string }[] = [];

      for (let p = 1; p <= totalPages; p++) {
        const slice = words.slice((p - 1) * wordsPerPage, p * wordsPerPage).join(' ');
        if (slice.trim()) {
          pages.push({ pageNumber: p, text: slice.trim() });
        }
      }
      if (pages.length > 0) return pages;
    }
  } catch (scanErr) {
    console.warn('Fallback stream text scanner failed:', scanErr);
  }

  throw new Error('This PDF does not contain extractable text (it may be a scanned image or encrypted).');
}

app.post('/api/books/upload', upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No PDF file uploaded' });
      return;
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    let pageDataList: { pageNumber: number; text: string }[] = [];
    try {
      pageDataList = await extractPdfPages(fileBuffer);
    } catch (parseErr: any) {
      console.error('PDF text extraction error:', parseErr);
      res.status(400).json({
        success: false,
        error: parseErr?.message || 'Could not extract text from this PDF file.',
      });
      return;
    }

    const titleFromFilename = req.file.originalname.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
    const title = (req.body.title as string)?.trim() || titleFromFilename;
    const author = (req.body.author as string)?.trim() || 'Author';
    const genre = (req.body.genre as string) || 'Personal Development';

    const colors = ['#1e3a8a', '#065f46', '#78350f', '#831843', '#312e81', '#0f766e', '#7c2d12'];
    const coverBgColor = colors[Math.floor(Math.random() * colors.length)];

    const newBook: Book = {
      id: 'book-' + Date.now(),
      title,
      author,
      genre,
      totalPages: pageDataList.length,
      currentPage: 1,
      coverBgColor,
      description: `Uploaded document: ${title} (${pageDataList.length} pages extracted). Ready for deep reading and audio narration.`,
      isSample: false,
      fileSize: `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadedAt: new Date().toISOString(),
      lastReadAt: new Date().toISOString(),
      pages: pageDataList,
    };

    const db = loadDatabase();
    db.books.unshift(newBook);
    saveDatabase(db);

    res.json({ success: true, book: newBook });
  } catch (err: any) {
    console.error('Upload handler error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to process PDF' });
  }
});

app.delete('/api/books/:id', (req: Request, res: Response) => {
  const db = loadDatabase();
  const index = db.books.findIndex((b) => b.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ success: false, error: 'Book not found' });
    return;
  }
  const [deleted] = db.books.splice(index, 1);
  // Also clean highlights, bookmarks, notes
  db.highlights = db.highlights.filter((h) => h.bookId !== req.params.id);
  db.bookmarks = db.bookmarks.filter((b) => b.bookId !== req.params.id);
  db.notes = db.notes.filter((n) => n.bookId !== req.params.id);
  saveDatabase(db);
  res.json({ success: true, deletedId: deleted.id });
});

// Update reading progress
app.post('/api/books/:id/progress', (req: Request, res: Response) => {
  const { pageNumber, minutesRead } = req.body;
  const db = loadDatabase();
  const book = db.books.find((b) => b.id === req.params.id);
  if (!book) {
    res.status(404).json({ success: false, error: 'Book not found' });
    return;
  }

  const prevPage = book.currentPage;
  const newPage = Math.min(book.totalPages, Math.max(1, Number(pageNumber)));
  book.currentPage = newPage;
  book.lastReadAt = new Date().toISOString();

  // Move this book to index 0 so it immediately appears in Continue Reading
  const bookIndex = db.books.findIndex((b) => b.id === req.params.id);
  if (bookIndex > 0) {
    const [active] = db.books.splice(bookIndex, 1);
    db.books.unshift(active);
  }

  // Update user stats
  const pagesDelta = Math.max(0, newPage - prevPage);
  if (pagesDelta > 0) {
    db.stats.pagesRead += pagesDelta;
  }
  if (newPage === book.totalPages && prevPage < book.totalPages) {
    db.stats.booksCompleted += 1;
  }

  // Record daily reading session
  const todayStr = new Date().toISOString().split('T')[0];
  const existingToday = db.stats.readingHistory.find((h) => h.date === todayStr);
  if (existingToday) {
    existingToday.pagesRead += pagesDelta;
    existingToday.minutes += Number(minutesRead || 2);
  } else {
    db.stats.readingHistory.push({
      date: todayStr,
      pagesRead: pagesDelta,
      minutes: Number(minutesRead || 2),
    });
  }

  // Recalculate streak
  const streaks = calculateStreaks(db.stats.readingHistory, todayStr);
  db.stats.currentStreak = streaks.currentStreak;
  db.stats.longestStreak = streaks.longestStreak;

  saveDatabase(db);
  res.json({ success: true, currentPage: book.currentPage, stats: db.stats });
});

// Highlights & Notes
app.get('/api/books/:id/highlights', (req: Request, res: Response) => {
  const db = loadDatabase();
  const highlights = db.highlights.filter((h) => h.bookId === req.params.id);
  res.json({ success: true, highlights });
});

app.post('/api/books/:id/highlights', (req: Request, res: Response) => {
  const { pageNumber, text, color, note } = req.body;
  const db = loadDatabase();
  const newHighlight: Highlight = {
    id: 'hl-' + Date.now(),
    bookId: req.params.id,
    pageNumber: Number(pageNumber),
    text: text || '',
    color: color || 'yellow',
    note: note || '',
    createdAt: new Date().toISOString(),
  };
  db.highlights.push(newHighlight);
  saveDatabase(db);
  res.json({ success: true, highlight: newHighlight });
});

app.delete('/api/books/:id/highlights/:hlId', (req: Request, res: Response) => {
  const db = loadDatabase();
  db.highlights = db.highlights.filter((h) => h.id !== req.params.hlId);
  saveDatabase(db);
  res.json({ success: true });
});

app.get('/api/books/:id/notes', (req: Request, res: Response) => {
  const db = loadDatabase();
  const notes = db.notes.filter((n) => n.bookId === req.params.id);
  res.json({ success: true, notes });
});

app.post('/api/books/:id/notes', (req: Request, res: Response) => {
  const { pageNumber, title, content } = req.body;
  const db = loadDatabase();
  const newNote: Note = {
    id: 'note-' + Date.now(),
    bookId: req.params.id,
    pageNumber: Number(pageNumber),
    title: title || `Page ${pageNumber} Note`,
    content: content || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.notes.push(newNote);
  saveDatabase(db);
  res.json({ success: true, note: newNote });
});

app.delete('/api/books/:id/notes/:noteId', (req: Request, res: Response) => {
  const db = loadDatabase();
  db.notes = db.notes.filter((n) => n.id !== req.params.noteId);
  saveDatabase(db);
  res.json({ success: true });
});

// Bookmarks
app.get('/api/books/:id/bookmarks', (req: Request, res: Response) => {
  const db = loadDatabase();
  const bookmarks = db.bookmarks.filter((b) => b.bookId === req.params.id);
  res.json({ success: true, bookmarks });
});

app.post('/api/books/:id/bookmarks', (req: Request, res: Response) => {
  const { pageNumber, title } = req.body;
  const db = loadDatabase();
  const existingIndex = db.bookmarks.findIndex(
    (b) => b.bookId === req.params.id && b.pageNumber === Number(pageNumber)
  );

  if (existingIndex > -1) {
    db.bookmarks.splice(existingIndex, 1);
    saveDatabase(db);
    res.json({ success: true, bookmarked: false });
  } else {
    const bookmark: Bookmark = {
      id: 'bm-' + Date.now(),
      bookId: req.params.id,
      pageNumber: Number(pageNumber),
      title: title || `Page ${pageNumber}`,
      createdAt: new Date().toISOString(),
    };
    db.bookmarks.push(bookmark);
    saveDatabase(db);
    res.json({ success: true, bookmarked: true, bookmark });
  }
});

// 2. Vocabulary API
app.get('/api/vocabulary', (_req: Request, res: Response) => {
  const db = loadDatabase();
  res.json({ success: true, vocabulary: db.vocabulary });
});

app.post('/api/vocabulary', (req: Request, res: Response) => {
  const { word, phonetic, partOfSpeech, definition, contextualMeaning, synonyms, example, bookTitle, pageNumber } = req.body;
  const db = loadDatabase();
  const existing = db.vocabulary.find((v) => v.word.toLowerCase() === (word || '').toLowerCase());
  if (existing) {
    res.json({ success: true, item: existing, alreadyExists: true });
    return;
  }

  const newItem: VocabularyItem = {
    id: 'vocab-' + Date.now(),
    word: word.trim(),
    phonetic: phonetic || '',
    partOfSpeech: partOfSpeech || 'noun',
    definition: definition || 'Added from reading.',
    contextualMeaning: contextualMeaning || '',
    synonyms: Array.isArray(synonyms) ? synonyms : [],
    example: example || '',
    bookTitle: bookTitle || '',
    pageNumber: pageNumber ? Number(pageNumber) : undefined,
    mastered: false,
    createdAt: new Date().toISOString(),
  };

  db.vocabulary.unshift(newItem);
  saveDatabase(db);
  res.json({ success: true, item: newItem });
});

app.post('/api/vocabulary/:id/toggle', (req: Request, res: Response) => {
  const db = loadDatabase();
  const item = db.vocabulary.find((v) => v.id === req.params.id);
  if (!item) {
    res.status(404).json({ success: false, error: 'Word not found' });
    return;
  }
  item.mastered = !item.mastered;
  saveDatabase(db);
  res.json({ success: true, item });
});

app.delete('/api/vocabulary/:id', (req: Request, res: Response) => {
  const db = loadDatabase();
  db.vocabulary = db.vocabulary.filter((v) => v.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// 3. Selectable AI Voices & TTS
app.get('/api/tts/voices', (_req: Request, res: Response) => {
  res.json({
    success: true,
    voices: AVAILABLE_VOICES,
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

app.post('/api/tts/synthesize', async (req: Request, res: Response) => {
  const { text, voiceId, speed } = req.body;
  if (!text || text.trim().length === 0) {
    res.status(400).json({ success: false, error: 'Text is required for audio synthesis' });
    return;
  }

  const voiceName = (voiceId || 'kore').charAt(0).toUpperCase() + (voiceId || 'kore').slice(1).toLowerCase();
  const validVoices = ['Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon', 'Aoede'];
  const chosenVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

  // If no Gemini API key configured, advise client to use Web Speech API fallback
  if (!ai) {
    res.json({
      success: true,
      audioBase64: null,
      useDeviceFallback: true,
      message: 'Gemini API key not configured; using high-fidelity device speech synthesis.',
      voiceName: chosenVoice,
    });
    return;
  }

  try {
    // Generate speech using gemini-3.8-flash-lite-tts
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 1500), // synthesis limit per call
              speechMetadata: {
                style: `Natural, clear, articulate audiobook narration at ${speed || 1.0}x speed`,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({
        success: true,
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
        useDeviceFallback: false,
        voiceName: chosenVoice,
      });
    } else {
      res.json({
        success: true,
        audioBase64: null,
        useDeviceFallback: true,
        message: 'Speech synthesis returned empty stream; using device fallback.',
        voiceName: chosenVoice,
      });
    }
  } catch (err: any) {
    console.error('TTS synthesis error:', err?.message || err);
    res.json({
      success: true,
      audioBase64: null,
      useDeviceFallback: true,
      message: `TTS service encountered an issue (${err?.message || 'timeout'}); playing via device speech engine.`,
      voiceName: chosenVoice,
    });
  }
});

// 4. Dedicated BookMind AI Assistant
app.get('/api/conversations', (_req: Request, res: Response) => {
  const db = loadDatabase();
  res.json({ success: true, conversations: db.conversations });
});

app.post('/api/conversations', (req: Request, res: Response) => {
  const { title, mode, bookId } = req.body;
  const db = loadDatabase();
  const newConv: Conversation = {
    id: 'conv-' + Date.now(),
    title: title || 'New Conversation',
    mode: mode || 'book_expert',
    bookId: bookId || undefined,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.conversations.unshift(newConv);
  saveDatabase(db);
  res.json({ success: true, conversation: newConv });
});

app.delete('/api/conversations/:id', (req: Request, res: Response) => {
  const db = loadDatabase();
  db.conversations = db.conversations.filter((c) => c.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  const { conversationId, mode, userMessage, bookId, selectedText, pageNumber } = req.body;

  if (!userMessage || !userMessage.trim()) {
    res.status(400).json({ success: false, error: 'User message is required' });
    return;
  }

  const db = loadDatabase();
  let conversation = db.conversations.find((c) => c.id === conversationId);
  if (!conversation) {
    conversation = {
      id: 'conv-' + Date.now(),
      title: userMessage.slice(0, 30) + '...',
      mode: mode || 'book_expert',
      bookId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.conversations.unshift(conversation);
  }

  // Find book context if provided
  let bookContextText = '';
  let bookTitle = '';
  if (bookId) {
    const book = db.books.find((b) => b.id === bookId);
    if (book) {
      bookTitle = book.title;
      if (pageNumber && book.pages[Number(pageNumber) - 1]) {
        bookContextText = `[BOOK: "${book.title}" by ${book.author}, Page ${pageNumber}]:\n"${book.pages[Number(pageNumber) - 1].text}"`;
      } else {
        const samplePages = book.pages.slice(0, 3).map((p) => `[Page ${p.pageNumber}]: ${p.text}`).join('\n\n');
        bookContextText = `[BOOK: "${book.title}" by ${book.author}]:\n${samplePages}`;
      }
    }
  }

  // System instructions tailored for the 8 assistant modes
  const modeSystemInstructions: Record<string, string> = {
    book_expert: `You are the BookMind AI Book Expert. Your task is to provide rigorous, deeply grounded analysis of the user's books.
- When referencing the book, cite the exact book title and page number: e.g. [Page 2].
- Never invent quotations or fabricate page numbers.
- Structure explanations with clear headers, key takeaways, and practical lessons.`,

    explain_simply: `You are the BookMind AI "Explain Simply" assistant, practicing the Feynman Technique.
- Break down complex philosophical, scientific, or financial concepts into beginner-friendly explanations.
- Use relatable real-world analogies, metaphors, and plain language without jargon.
- Format with simple bullet points and a concise "In a nutshell" takeaway.`,

    research_assistant: `You are the BookMind AI Research Assistant.
- Assist in investigating questions with high academic and factual rigor.
- Explicitly distinguish verified facts from uncertain information, historical interpretations, or personal opinions.
- Clearly state any uncertainty rather than hallucinating answers.`,

    learning_coach: `You are the BookMind AI Learning Coach.
- Transform passive reading into active, durable learning.
- Create 3-question quick quizzes, practical daily challenges, and reflective prompts.
- Emphasize spaced repetition and active recall.`,

    writing_assistant: `You are the BookMind AI Writing Assistant.
- Help the user compose, outline, structure, and polish original essays, articles, and book reviews.
- Provide crisp sentence edits, tone adjustments, and vivid analogies without taking away the user's authentic voice.`,

    personal_librarian: `You are the BookMind AI Personal Librarian.
- Recommend books tailored to the user's specific goals, reading level, and preferred genres.
- For every book recommended, state: Title, Author, Genre, Why It Fits, and Reading Difficulty.
- Compare books objectively and suggest progressive reading roadmaps.`,

    vocabulary_tutor: `You are the BookMind AI Vocabulary Tutor.
- Teach sophisticated vocabulary from books with clarity and precision.
- Include etymology, part of speech, exact pronunciation phonetic, contextual usage, and memorable mnemonics.`,

    critical_thinking_coach: `You are the BookMind AI Critical Thinking Coach.
- Apply the Socratic method to test arguments and assumptions.
- Identify cognitive biases, logical fallacies, and alternative explanations.
- Encourage intellectual humility and steel-man opposing viewpoints.`,
  };

  const chosenMode = (mode || conversation.mode || 'book_expert') as string;
  const systemInstruction = modeSystemInstructions[chosenMode] || modeSystemInstructions.book_expert;

  // Build prompt
  const fullPrompt = `${systemInstruction}

${bookContextText ? `CURRENT DOCUMENT CONTEXT:\n${bookContextText}\n` : ''}
${selectedText ? `USER SELECTED TEXT PASSAGE:\n"${selectedText}"\n` : ''}

USER QUESTION:
${userMessage}`;

  let assistantContent = '';
  const citations: { title: string; pageNumber?: number; quote?: string }[] = [];

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullPrompt,
        config: {
          temperature: 0.7,
        },
      });
      assistantContent = response.text || 'I analyzed your request. Here are my thoughts based on the document.';
      if (bookTitle) {
        citations.push({
          title: bookTitle,
          pageNumber: pageNumber ? Number(pageNumber) : 1,
        });
      }
    } catch (err: any) {
      console.error('Gemini chat error:', err);
      assistantContent = `Unable to connect to AI server (${err?.message || 'timeout'}). Please verify your connection or try again.`;
    }
  } else {
    // Intelligent fallback responses tailored to the mode & book
    if (chosenMode === 'explain_simply') {
      assistantContent = `Here is the simple explanation:\n\nImagine life as an archery competition. You can control your stance, your aim, how much you practice, and the moment you release the arrow. But the moment the arrow leaves your fingers, a sudden gust of wind can blow it off course.\n\n**The Core Lesson:**\nFocus 100% of your energy on your aim and preparation. Detach your self-worth from whether the wind blows or not.\n\n*In a nutshell:* Focus on your own effort, not external chance.`;
    } else if (chosenMode === 'book_expert') {
      assistantContent = `Based on ${bookTitle || 'your reading'}, the author emphasizes two foundational ideas:\n\n1. **The Sovereignty of the Mind**: External circumstances have no direct access to your virtue or inner peace unless you consent to it [Page 1].\n2. **Cooperation Over Antagonism**: Human beings were created to work cooperatively, like hands and feet. Hostility is unnatural [Page 1].\n\nWould you like me to analyze how this applies to a specific modern dilemma?`;
      citations.push({ title: bookTitle || 'Meditations', pageNumber: 1 });
    } else {
      assistantContent = `**${chosenMode.replace('_', ' ').toUpperCase()} INSIGHT**:\n\nAnalyzing: "${userMessage}"\n\nWhen we examine this deeply, the key is to isolate the underlying principle from the emotional reaction. Focus on what is verifiable, challenge the primary assumptions, and build an actionable habit around it.`;
    }
  }

  const userMsg: ChatMessage = {
    id: 'msg-' + Date.now(),
    role: 'user',
    content: userMessage,
    createdAt: new Date().toISOString(),
  };

  const assistantMsg: ChatMessage = {
    id: 'msg-' + (Date.now() + 1),
    role: 'assistant',
    content: assistantContent,
    citations: citations.length > 0 ? citations : undefined,
    createdAt: new Date().toISOString(),
  };

  conversation.messages.push(userMsg, assistantMsg);
  conversation.updatedAt = new Date().toISOString();
  saveDatabase(db);

  res.json({
    success: true,
    userMessage: userMsg,
    assistantMessage: assistantMsg,
    conversationId: conversation.id,
  });
});

// 5. Quick Word & Sentence Explanation
app.post('/api/gemini/explain', async (req: Request, res: Response) => {
  const { type, text, bookTitle, pageNumber } = req.body; // type: 'word' | 'sentence'

  if (!text || !text.trim()) {
    res.status(400).json({ success: false, error: 'Text required' });
    return;
  }

  if (type === 'word') {
    if (ai) {
      try {
        const prompt = `Provide a concise dictionary & contextual lookup for the word: "${text}" from the book "${bookTitle || ''}".
Return ONLY a valid JSON object with keys:
"phonetic": string (IPA phonetic transcription),
"partOfSpeech": string (noun, verb, adjective, etc.),
"definition": string (clear primary definition),
"contextualMeaning": string (how it is used in philosophy, literature or psychology),
"synonyms": string[] (3 to 5 strong synonyms),
"example": string (a clear, modern illustrative sentence).
Do not wrap in markdown or backticks, just raw JSON.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        const raw = (response.text || '{}').trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(raw);
        res.json({ success: true, explanation: parsed });
        return;
      } catch (err) {
        console.error('Word explain AI error:', err);
      }
    }

    // High quality offline fallback definition
    res.json({
      success: true,
      explanation: {
        phonetic: `/${text.toLowerCase()}/`,
        partOfSpeech: 'noun / adjective',
        definition: `A significant term in literature and philosophical inquiry denoting depth, clarity, and precision.`,
        contextualMeaning: `Used in ${bookTitle || 'this passage'} to convey a state of deliberate awareness and ethical discipline.`,
        synonyms: ['clarity', 'insight', 'discernment', 'discipline'],
        example: `Cultivating ${text.toLowerCase()} enables one to navigate unexpected difficulty with composure.`,
      },
    });
  } else {
    // Sentence or paragraph explanation
    if (ai) {
      try {
        const prompt = `Analyze and explain this sentence or passage from "${bookTitle || 'the book'}" on page ${pageNumber || 1}:
"${text}"

Return ONLY a valid JSON object with keys:
"simpleLanguage": string (plain English breakdown / ELI5),
"mainPoint": string (the core insight in 1-2 punchy sentences),
"difficultVocabulary": string[] (any tricky words defined briefly),
"realWorldApplication": string (how to apply this concept today).
Do not wrap in markdown or backticks, just raw JSON.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        const raw = (response.text || '{}').trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(raw);
        res.json({ success: true, explanation: parsed });
        return;
      } catch (err) {
        console.error('Sentence explain AI error:', err);
      }
    }

    res.json({
      success: true,
      explanation: {
        simpleLanguage: `The author is reminding us that peace of mind does not come from controlling other people or events, but from mastering our own judgment.`,
        mainPoint: `External events have no power to disrupt you unless you decide to give them permission.`,
        difficultVocabulary: ['equanimity: mental calmness', 'obstruction: something that blocks progress'],
        realWorldApplication: `When someone is rude to you today, recognize their attitude belongs to them, not you. Respond with steady patience.`,
      },
    });
  }
});

// 6. Book Discovery & Curated Recommendations
app.get('/api/recommendations', (req: Request, res: Response) => {
  const { genre, query, verifiedOnly } = req.query;

  let results = [...CURATED_GENRE_BOOKS];

  if (genre && typeof genre === 'string') {
    results = results.filter((b) => b.genre.toLowerCase() === genre.toLowerCase());
  }

  if (query && typeof query === 'string' && query.trim()) {
    const q = query.toLowerCase().trim();
    results = results.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.genre.toLowerCase().includes(q)
    );
  }

  if (verifiedOnly === 'true') {
    results = results.filter((b) => b.isVerified);
  }

  res.json({
    success: true,
    total: results.length,
    books: results,
  });
});

// 7. Daily Learning & Implementation
app.get('/api/learning/today', (_req: Request, res: Response) => {
  const db = loadDatabase();
  res.json({ success: true, session: db.dailyLearning, actions: db.actions });
});

app.post('/api/learning/complete', (req: Request, res: Response) => {
  const { sessionId, userReflection, selectedQuizOption } = req.body;
  const db = loadDatabase();

  if (db.dailyLearning.id === sessionId) {
    db.dailyLearning.completed = true;
    db.dailyLearning.userReflection = userReflection || '';
    db.dailyLearning.selectedQuizOption = selectedQuizOption;
    db.dailyLearning.quizPassed = selectedQuizOption === db.dailyLearning.quiz.correctIndex;

    // Safely award points using tested business rules
    const awardResult = awardPointsSafely(
      db.stats.totalPoints,
      db.stats.awardedActionIds,
      `learning-${sessionId}-${new Date().toISOString().split('T')[0]}`,
      'daily_learning',
      25
    );

    if (awardResult.awarded) {
      db.stats.totalPoints = awardResult.newPoints;
      db.stats.awardedActionIds = awardResult.updatedActionIds;
      db.stats.sessionsCompleted += 1;
    }

    if (db.dailyLearning.quizPassed) {
      const quizAward = awardPointsSafely(
        db.stats.totalPoints,
        db.stats.awardedActionIds,
        `quiz-${sessionId}`,
        'quiz_pass',
        15
      );
      if (quizAward.awarded) {
        db.stats.totalPoints = quizAward.newPoints;
        db.stats.awardedActionIds = quizAward.updatedActionIds;
        db.stats.quizzesPassed += 1;
      }
    }

    saveDatabase(db);
  }

  res.json({ success: true, session: db.dailyLearning, stats: db.stats });
});

app.post('/api/learning/actions/:id/status', (req: Request, res: Response) => {
  const { status } = req.body; // 'pending' | 'completed' | 'skipped'
  const db = loadDatabase();
  const action = db.actions.find((a) => a.id === req.params.id);
  if (!action) {
    res.status(404).json({ success: false, error: 'Action not found' });
    return;
  }

  action.status = status;
  if (status === 'completed') {
    action.completedAt = new Date().toISOString();
    const award = awardPointsSafely(
      db.stats.totalPoints,
      db.stats.awardedActionIds,
      `action-${action.id}`,
      'action_complete',
      action.points || 30
    );
    if (award.awarded) {
      db.stats.totalPoints = award.newPoints;
      db.stats.awardedActionIds = award.updatedActionIds;
      db.stats.actionsCompleted += 1;
    }
  }

  saveDatabase(db);
  res.json({ success: true, action, stats: db.stats });
});

// 8. Create & AI Writing Workspace
app.get('/api/create/documents', (_req: Request, res: Response) => {
  const db = loadDatabase();
  res.json({ success: true, documents: db.documents });
});

app.post('/api/create/documents', (req: Request, res: Response) => {
  const { title, type, tags } = req.body;
  const db = loadDatabase();
  const newDoc: WritingDocument = {
    id: 'doc-' + Date.now(),
    title: title || 'Untitled Project',
    type: type || 'article',
    tags: Array.isArray(tags) ? tags : ['General'],
    chapters: [
      {
        id: 'ch-1',
        title: 'Introduction',
        content: '',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.documents.unshift(newDoc);
  saveDatabase(db);
  res.json({ success: true, document: newDoc });
});

app.put('/api/create/documents/:id', (req: Request, res: Response) => {
  const { title, chapters, tags } = req.body;
  const db = loadDatabase();
  const doc = db.documents.find((d) => d.id === req.params.id);
  if (!doc) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }

  if (title) doc.title = title;
  if (Array.isArray(chapters)) doc.chapters = chapters;
  if (Array.isArray(tags)) doc.tags = tags;
  doc.updatedAt = new Date().toISOString();

  saveDatabase(db);
  res.json({ success: true, document: doc });
});

app.delete('/api/create/documents/:id', (req: Request, res: Response) => {
  const db = loadDatabase();
  db.documents = db.documents.filter((d) => d.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// AI Writing Assistant endpoint
app.post('/api/gemini/write', async (req: Request, res: Response) => {
  const { action, currentText, promptContext, documentType } = req.body;
  // action: 'outline' | 'draft' | 'rewrite' | 'polish' | 'summarize' | 'inspire' | 'title'

  if (ai) {
    try {
      const systemPrompt = `You are the BookMind AI Writing Co-Pilot for a ${documentType || 'piece of writing'}.
Never overwrite the user's authentic style. Provide clean, compelling, publication-ready prose.
Action requested: ${action}.`;

      const userQuery = `${systemPrompt}\n\nContext / User Direction: ${promptContext || 'Proceed'}\n\nCurrent Text:\n${currentText || '(Empty canvas)'}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userQuery,
      });

      res.json({ success: true, result: response.text || '' });
      return;
    } catch (err: any) {
      console.error('Write AI error:', err);
    }
  }

  // Graceful template fallback
  let fallbackResult = '';
  if (action === 'outline') {
    fallbackResult = `# Outline: ${promptContext || 'Mastering Focus'}\n\nI. Introduction\n   - The modern challenge of distraction\n   - Why cognitive discipline is the supreme superpower\n\nII. The Mechanics of Deep Work\n   - System 1 vs System 2 thinking\n   - Setting rigorous boundary rituals\n\nIII. Overcoming the Friction\n   - The 2-minute momentum rule\n   - Emotional regulation and digital detox\n\nIV. Conclusion & Daily Manifesto\n   - Practicing the dichotomy of control\n   - Action steps for tomorrow`;
  } else if (action === 'inspire') {
    fallbackResult = `Inspired by your recent reading of *Meditations* and *The Psychology of Money*:\n\n"Wealth and wisdom both share a counter-intuitive principle: the highest return on investment is not what you gain, but the peace of mind you protect by refusing to compete in games you do not care about."`;
  } else {
    fallbackResult = `${currentText}\n\n[Refined by BookMind AI]: Clarity and structure refined with enhanced cadence and precision.`;
  }

  res.json({ success: true, result: fallbackResult });
});

// 9. User Stats & Preferences
app.get('/api/user/stats', (_req: Request, res: Response) => {
  const db = loadDatabase();
  res.json({ success: true, stats: db.stats });
});

app.get('/api/user/preferences', (_req: Request, res: Response) => {
  const db = loadDatabase();
  res.json({ success: true, preferences: db.preferences });
});

app.post('/api/user/preferences', (req: Request, res: Response) => {
  const db = loadDatabase();
  db.preferences = { ...db.preferences, ...req.body };
  saveDatabase(db);
  res.json({ success: true, preferences: db.preferences });
});

// ----------------------------------------------------
// DEV / PROD SERVER SETUP
// ----------------------------------------------------
async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`BookMind AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
