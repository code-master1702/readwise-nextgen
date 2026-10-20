import {
  Book,
  Highlight,
  Bookmark,
  Note,
  VocabularyItem,
  VoiceOption,
  Conversation,
  ChatMessage,
  VerifiedBookRecord,
  DailyLearningSession,
  ActionItem,
  WritingDocument,
  UserPreferences,
  UserStats,
} from '../types';

export const api = {
  // Books
  async getBooks(): Promise<Book[]> {
    const res = await fetch('/api/books');
    const data = await res.json();
    return data.books || [];
  },

  async getBook(id: string): Promise<Book> {
    const res = await fetch(`/api/books/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch book');
    return data.book;
  },

  async uploadBook(file: File, metadata?: { title?: string; author?: string; genre?: string }): Promise<Book> {
    const formData = new FormData();
    formData.append('pdf', file);
    if (metadata?.title) formData.append('title', metadata.title);
    if (metadata?.author) formData.append('author', metadata.author);
    if (metadata?.genre) formData.append('genre', metadata.genre);

    const res = await fetch('/api/books/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Upload failed');
    return data.book;
  },

  async deleteBook(id: string): Promise<void> {
    const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to delete book');
  },

  async updateProgress(bookId: string, pageNumber: number, minutesRead: number = 2): Promise<{ currentPage: number; stats: UserStats }> {
    const res = await fetch(`/api/books/${bookId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageNumber, minutesRead }),
    });
    return res.json();
  },

  // Highlights & Notes
  async getHighlights(bookId: string): Promise<Highlight[]> {
    const res = await fetch(`/api/books/${bookId}/highlights`);
    const data = await res.json();
    return data.highlights || [];
  },

  async addHighlight(bookId: string, pageNumber: number, text: string, color: Highlight['color'], note?: string): Promise<Highlight> {
    const res = await fetch(`/api/books/${bookId}/highlights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageNumber, text, color, note }),
    });
    const data = await res.json();
    return data.highlight;
  },

  async deleteHighlight(bookId: string, hlId: string): Promise<void> {
    await fetch(`/api/books/${bookId}/highlights/${hlId}`, { method: 'DELETE' });
  },

  async getNotes(bookId: string): Promise<Note[]> {
    const res = await fetch(`/api/books/${bookId}/notes`);
    const data = await res.json();
    return data.notes || [];
  },

  async addNote(bookId: string, pageNumber: number, content: string, title?: string): Promise<Note> {
    const res = await fetch(`/api/books/${bookId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageNumber, content, title }),
    });
    const data = await res.json();
    return data.note;
  },

  async deleteNote(bookId: string, noteId: string): Promise<void> {
    await fetch(`/api/books/${bookId}/notes/${noteId}`, { method: 'DELETE' });
  },

  async getBookmarks(bookId: string): Promise<Bookmark[]> {
    const res = await fetch(`/api/books/${bookId}/bookmarks`);
    const data = await res.json();
    return data.bookmarks || [];
  },

  async toggleBookmark(bookId: string, pageNumber: number, title?: string): Promise<{ bookmarked: boolean }> {
    const res = await fetch(`/api/books/${bookId}/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageNumber, title }),
    });
    return res.json();
  },

  // Vocabulary
  async getVocabulary(): Promise<VocabularyItem[]> {
    const res = await fetch('/api/vocabulary');
    const data = await res.json();
    return data.vocabulary || [];
  },

  async addVocabulary(item: Partial<VocabularyItem>): Promise<VocabularyItem> {
    const res = await fetch('/api/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const data = await res.json();
    return data.item;
  },

  async toggleVocabularyMastered(id: string): Promise<VocabularyItem> {
    const res = await fetch(`/api/vocabulary/${id}/toggle`, { method: 'POST' });
    const data = await res.json();
    return data.item;
  },

  async deleteVocabulary(id: string): Promise<void> {
    await fetch(`/api/vocabulary/${id}`, { method: 'DELETE' });
  },

  // TTS & Voices
  async getVoices(): Promise<{ voices: VoiceOption[]; hasApiKey: boolean }> {
    const res = await fetch('/api/tts/voices');
    return res.json();
  },

  async synthesizeAudio(text: string, voiceId: string, speed: number = 1.0): Promise<{
    audioBase64: string | null;
    useDeviceFallback: boolean;
    voiceName?: string;
    message?: string;
  }> {
    const res = await fetch('/api/tts/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId, speed }),
    });
    return res.json();
  },

  // Assistant & Chat
  async getConversations(): Promise<Conversation[]> {
    const res = await fetch('/api/conversations');
    const data = await res.json();
    return data.conversations || [];
  },

  async createConversation(title?: string, mode?: string, bookId?: string): Promise<Conversation> {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, mode, bookId }),
    });
    const data = await res.json();
    return data.conversation;
  },

  async deleteConversation(id: string): Promise<void> {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
  },

  async sendChatMessage(payload: {
    conversationId?: string;
    mode: string;
    userMessage: string;
    bookId?: string;
    selectedText?: string;
    pageNumber?: number;
  }): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage; conversationId: string }> {
    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Word / Sentence Explain
  async explainText(payload: {
    type: 'word' | 'sentence';
    text: string;
    bookTitle?: string;
    pageNumber?: number;
  }): Promise<{ explanation: any }> {
    const res = await fetch('/api/gemini/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Recommendations
  async getRecommendations(params?: { genre?: string; query?: string; verifiedOnly?: boolean }): Promise<{ books: VerifiedBookRecord[] }> {
    const query = new URLSearchParams();
    if (params?.genre) query.append('genre', params.genre);
    if (params?.query) query.append('query', params.query);
    if (params?.verifiedOnly) query.append('verifiedOnly', 'true');

    const res = await fetch(`/api/recommendations?${query.toString()}`);
    return res.json();
  },

  // Daily Learning
  async getDailyLearning(): Promise<{ session: DailyLearningSession; actions: ActionItem[] }> {
    const res = await fetch('/api/learning/today');
    return res.json();
  },

  async completeDailyLearning(payload: {
    sessionId: string;
    userReflection?: string;
    selectedQuizOption?: number;
  }): Promise<{ session: DailyLearningSession; stats: UserStats }> {
    const res = await fetch('/api/learning/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async updateActionStatus(actionId: string, status: 'pending' | 'completed' | 'skipped'): Promise<{ action: ActionItem; stats: UserStats }> {
    const res = await fetch(`/api/learning/actions/${actionId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  // Create Workspace
  async getDocuments(): Promise<WritingDocument[]> {
    const res = await fetch('/api/create/documents');
    const data = await res.json();
    return data.documents || [];
  },

  async createDocument(payload: { title: string; type: WritingDocument['type']; tags?: string[] }): Promise<WritingDocument> {
    const res = await fetch('/api/create/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.document;
  },

  async updateDocument(id: string, payload: Partial<WritingDocument>): Promise<WritingDocument> {
    const res = await fetch(`/api/create/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.document;
  },

  async deleteDocument(id: string): Promise<void> {
    await fetch(`/api/create/documents/${id}`, { method: 'DELETE' });
  },

  async aiWriteAssist(payload: {
    action: string;
    currentText?: string;
    promptContext?: string;
    documentType?: string;
  }): Promise<{ result: string }> {
    const res = await fetch('/api/gemini/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Stats & Preferences
  async getUserStats(): Promise<UserStats> {
    const res = await fetch('/api/user/stats');
    const data = await res.json();
    return data.stats;
  },

  async getUserPreferences(): Promise<UserPreferences> {
    const res = await fetch('/api/user/preferences');
    const data = await res.json();
    return data.preferences;
  },

  async updateUserPreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const res = await fetch('/api/user/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    });
    const data = await res.json();
    return data.preferences;
  },
};
