import React, { useState, useEffect } from 'react';
import {
  PenTool,
  Plus,
  Trash2,
  Sparkles,
  Download,
  Book,
  FileText,
  Bookmark,
  Check,
  ChevronRight,
  Layers,
  Wand2,
  ListOrdered,
  Lightbulb,
} from 'lucide-react';
import { WritingDocument, DocumentType, WritingChapter } from '../types';
import { api } from '../services/api';

export const CreateScreen: React.FC = () => {
  const [documents, setDocuments] = useState<WritingDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);

  // New Doc Modal
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<DocumentType>('article');

  // AI Tool drawer
  const [aiAction, setAiAction] = useState<string | null>(null);
  const [aiPromptContext, setAiPromptContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isSavedBanner, setIsSavedBanner] = useState(false);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
      if (docs.length > 0 && !activeDocId) {
        setActiveDocId(docs[0].id);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const activeDoc = documents.find((d) => d.id === activeDocId);
  const currentChapter: WritingChapter | undefined = activeDoc?.chapters[activeChapterIndex] || activeDoc?.chapters[0];

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const doc = await api.createDocument({
        title: newTitle.trim() || 'Untitled Project',
        type: newType,
        tags: [newType],
      });
      setDocuments((prev) => [doc, ...prev]);
      setActiveDocId(doc.id);
      setActiveChapterIndex(0);
      setIsNewDocOpen(false);
      setNewTitle('');
    } catch (err) {
      console.error('Error creating doc:', err);
    }
  };

  const handleContentChange = (content: string) => {
    if (!activeDoc || !currentChapter) return;
    const updatedChapters = [...activeDoc.chapters];
    updatedChapters[activeChapterIndex] = {
      ...currentChapter,
      content,
    };

    const updatedDoc = { ...activeDoc, chapters: updatedChapters };
    setDocuments((prev) =>
      prev.map((d) => (d.id === activeDoc.id ? updatedDoc : d))
    );

    // Debounced autosave
    api.updateDocument(activeDoc.id, { chapters: updatedChapters }).then(() => {
      setIsSavedBanner(true);
      setTimeout(() => setIsSavedBanner(false), 2000);
    });
  };

  const handleAddChapter = () => {
    if (!activeDoc) return;
    const newCh: WritingChapter = {
      id: 'ch-' + Date.now(),
      title: `Chapter ${activeDoc.chapters.length + 1}`,
      content: '',
    };
    const updatedChapters = [...activeDoc.chapters, newCh];
    const updatedDoc = { ...activeDoc, chapters: updatedChapters };
    setDocuments((prev) =>
      prev.map((d) => (d.id === activeDoc.id ? updatedDoc : d))
    );
    setActiveChapterIndex(updatedChapters.length - 1);
    api.updateDocument(activeDoc.id, { chapters: updatedChapters });
  };

  const handleRunAiAssist = async (action: string) => {
    if (!currentChapter) return;
    setIsGenerating(true);
    setAiAction(action);
    setAiResult(null);

    try {
      const res = await api.aiWriteAssist({
        action,
        currentText: currentChapter.content,
        promptContext: aiPromptContext || activeDoc?.title,
        documentType: activeDoc?.type,
      });
      setAiResult(res.result);
    } catch (err) {
      console.error('AI write assist error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyAiResult = (mode: 'replace' | 'append') => {
    if (!aiResult || !currentChapter) return;
    const newContent =
      mode === 'replace'
        ? aiResult
        : currentChapter.content + (currentChapter.content ? '\n\n' : '') + aiResult;
    handleContentChange(newContent);
    setAiResult(null);
    setAiAction(null);
  };

  const handleExportText = () => {
    if (!activeDoc) return;
    const fullText = activeDoc.chapters
      .map((c) => `# ${c.title}\n\n${c.content}`)
      .join('\n\n---\n\n');

    const blob = new Blob([fullText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDoc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pb-24 pt-3 px-3 sm:px-6 max-w-2xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <span>Create</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
              AI Workspace
            </span>
          </h1>
          <p className="text-xs text-stone-500">
            Synthesize books and write original books, guides, and articles
          </p>
        </div>

        <button
          onClick={() => setIsNewDocOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus size={14} /> New Document
        </button>
      </div>

      {/* Document Selector Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {documents.map((doc) => {
          const isActive = doc.id === activeDocId;
          return (
            <button
              key={doc.id}
              onClick={() => {
                setActiveDocId(doc.id);
                setActiveChapterIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                  : 'bg-white dark:bg-stone-850 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800'
              }`}
            >
              <FileText size={12} />
              <span className="max-w-[120px] truncate">{doc.title}</span>
            </button>
          );
        })}
      </div>

      {activeDoc && (
        <div className="bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs space-y-3">
          {/* Document Title & Chapters list */}
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-600">
                {activeDoc.type} Project
              </span>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {activeDoc.title}
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              {isSavedBanner && (
                <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                  <Check size={11} /> Saved
                </span>
              )}
              <button
                onClick={handleExportText}
                aria-label="Export Markdown"
                className="p-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 rounded-lg"
              >
                <Download size={15} />
              </button>
            </div>
          </div>

          {/* Chapters Sub-nav */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {activeDoc.chapters.map((ch, i) => (
              <button
                key={ch.id || i}
                onClick={() => setActiveChapterIndex(i)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeChapterIndex === i
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                {ch.title}
              </button>
            ))}
            <button
              onClick={handleAddChapter}
              className="p-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-amber-600"
              aria-label="Add Chapter"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* AI Assistance Toolbar */}
          <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-300">
              <span className="flex items-center gap-1">
                <Sparkles size={13} /> AI Co-Pilot Tools
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                onClick={() => handleRunAiAssist('outline')}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-amber-200 dark:border-amber-900/60 font-medium text-stone-700 dark:text-stone-300 hover:border-amber-500 flex items-center gap-1"
              >
                <ListOrdered size={12} /> Generate Outline
              </button>
              <button
                onClick={() => handleRunAiAssist('draft')}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-amber-200 dark:border-amber-900/60 font-medium text-stone-700 dark:text-stone-300 hover:border-amber-500 flex items-center gap-1"
              >
                <Wand2 size={12} /> Draft Section
              </button>
              <button
                onClick={() => handleRunAiAssist('rewrite')}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-amber-200 dark:border-amber-900/60 font-medium text-stone-700 dark:text-stone-300 hover:border-amber-500 flex items-center gap-1"
              >
                <Sparkles size={12} /> Polish Prose
              </button>
              <button
                onClick={() => handleRunAiAssist('inspire')}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-amber-200 dark:border-amber-900/60 font-medium text-stone-700 dark:text-stone-300 hover:border-amber-500 flex items-center gap-1"
              >
                <Lightbulb size={12} /> Inspire Me
              </button>
            </div>
          </div>

          {/* AI Result Card with Confirmation before overwriting */}
          {(isGenerating || aiResult) && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs space-y-2">
              <span className="font-bold text-amber-800 dark:text-amber-300 block">
                AI Suggestion ({aiAction}):
              </span>

              {isGenerating ? (
                <div className="flex items-center gap-2 text-stone-500 py-3">
                  <span className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  Generating suggestions...
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap leading-relaxed text-stone-800 dark:text-stone-200 max-h-48 overflow-y-auto bg-white/70 dark:bg-stone-900/70 p-2.5 rounded-lg border border-amber-200/50">
                    {aiResult}
                  </p>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setAiResult(null)}
                      className="px-2.5 py-1 rounded-md text-stone-500 hover:bg-stone-200"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleApplyAiResult('append')}
                      className="px-3 py-1 bg-stone-800 text-white rounded-md font-medium"
                    >
                      Append to Draft
                    </button>
                    <button
                      onClick={() => handleApplyAiResult('replace')}
                      className="px-3 py-1 bg-amber-600 text-white rounded-md font-medium shadow-2xs"
                    >
                      Replace Draft
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Main Writing Canvas with crisp, thick text */}
          <textarea
            value={currentChapter?.content || ''}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start drafting here or click 'Generate Outline' to jumpstart ideas..."
            rows={12}
            className="w-full p-4 rounded-xl border-2 border-stone-400 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-950 dark:text-white font-bold text-sm sm:text-base leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none font-serif placeholder:text-stone-500 placeholder:font-semibold"
          />

          <div className="flex justify-between items-center text-xs font-black text-stone-700 dark:text-stone-300">
            <span>
              {(currentChapter?.content || '').split(/\s+/).filter(Boolean).length} words
            </span>
            <span>Autosaved locally</span>
          </div>
        </div>
      )}

      {/* New Document Modal */}
      {isNewDocOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-2xl p-5 shadow-2xl border-2 border-stone-300 dark:border-stone-700 space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-extrabold text-stone-950 dark:text-white">
              New Writing Document
            </h3>

            <form onSubmit={handleCreateDocument} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-800 dark:text-stone-200 block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Synthesis of Stoic Wisdom"
                  className="w-full p-3 rounded-xl border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-850 text-stone-950 dark:text-white font-bold text-xs placeholder:text-stone-500 placeholder:font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                  Document Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['book', 'guide', 'article', 'note'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewType(t)}
                      className={`p-2 rounded-xl border text-xs font-semibold capitalize ${
                        newType === t
                          ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                          : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewDocOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-500 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 shadow-xs"
                >
                  Create Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
