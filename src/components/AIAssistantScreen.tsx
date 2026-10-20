import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  BookOpen,
  Volume2,
  Copy,
  Check,
  Plus,
  Trash2,
  GraduationCap,
  PenTool,
  Library,
  Languages,
  BrainCircuit,
  Compass,
  CornerDownRight,
  BookMarked,
  X,
} from 'lucide-react';
import { Book, Conversation, ChatMessage, AssistantMode, UserPreferences } from '../types';
import { ASSISTANT_MODES } from '../data/assistantModes';
import { api } from '../services/api';
import { audioEngine } from '../utils/audioPlayer';

interface AIAssistantScreenProps {
  books: Book[];
  preferences: UserPreferences;
  initialBookId?: string;
  initialPageNumber?: number;
  initialSelectedText?: string;
}

export const AIAssistantScreen: React.FC<AIAssistantScreenProps> = ({
  books,
  preferences,
  initialBookId,
  initialPageNumber,
  initialSelectedText,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<AssistantMode>('book_expert');
  const [selectedBookId, setSelectedBookId] = useState<string>(initialBookId || (books[0]?.id || ''));
  const [activePageNum, setActivePageNum] = useState<number | undefined>(initialPageNumber);
  const [activeContextText, setActiveContextText] = useState<string | undefined>(initialSelectedText);
  const [userPrompt, setUserPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (initialBookId) setSelectedBookId(initialBookId);
    if (initialPageNumber) setActivePageNum(initialPageNumber);
    if (initialSelectedText) {
      setActiveContextText(initialSelectedText);
      setUserPrompt(`Explain this passage from Page ${initialPageNumber || 1}: "${initialSelectedText.slice(0, 100)}..."`);
    }
  }, [initialBookId, initialPageNumber, initialSelectedText]);

  useEffect(() => {
    scrollToBottom();
  }, [conversations, activeConvId]);

  const loadConversations = async () => {
    try {
      const convs = await api.getConversations();
      setConversations(convs);
      if (convs.length > 0) {
        setActiveConvId(convs[0].id);
        setSelectedMode(convs[0].mode || 'book_expert');
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const activeBook = books.find((b) => b.id === selectedBookId);

  const handleStartNewChat = async (modeToUse?: AssistantMode) => {
    try {
      const newConv = await api.createConversation(
        `Chat with ${modeToUse || selectedMode}`,
        modeToUse || selectedMode,
        selectedBookId || undefined
      );
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv.id);
    } catch (err) {
      console.error('New chat error:', err);
    }
  };

  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = (customMessage || userPrompt).trim();
    if (!textToSend || isSending) return;

    setIsSending(true);
    setUserPrompt('');

    try {
      const res = await api.sendChatMessage({
        conversationId: activeConvId || undefined,
        mode: selectedMode,
        userMessage: textToSend,
        bookId: selectedBookId || undefined,
        selectedText: activeContextText,
        pageNumber: activePageNum,
      });

      // Update state
      setConversations((prev) => {
        const existingIdx = prev.findIndex((c) => c.id === res.conversationId);
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx].messages.push(res.userMessage, res.assistantMessage);
          return updated;
        } else {
          return [
            {
              id: res.conversationId,
              title: textToSend.slice(0, 30) + '...',
              mode: selectedMode,
              bookId: selectedBookId,
              messages: [res.userMessage, res.assistantMessage],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            ...prev,
          ];
        }
      });

      setActiveConvId(res.conversationId);
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleSpeakMessage = (msgId: string, content: string) => {
    if (speakingMsgId === msgId) {
      audioEngine.stop();
      setSpeakingMsgId(null);
    } else {
      setSpeakingMsgId(msgId);
      audioEngine.playPageText(content, preferences.voiceId || 'kore', preferences.speed, () => {
        setSpeakingMsgId(null);
      });
    }
  };

  const currentModeInfo = ASSISTANT_MODES.find((m) => m.id === selectedMode) || ASSISTANT_MODES[0];

  const getModeIcon = (modeId: AssistantMode) => {
    switch (modeId) {
      case 'book_expert':
        return <BookOpen size={14} />;
      case 'explain_simply':
        return <Sparkles size={14} />;
      case 'research_assistant':
        return <Compass size={14} />;
      case 'learning_coach':
        return <GraduationCap size={14} />;
      case 'writing_assistant':
        return <PenTool size={14} />;
      case 'personal_librarian':
        return <Library size={14} />;
      case 'vocabulary_tutor':
        return <Languages size={14} />;
      case 'critical_thinking_coach':
        return <BrainCircuit size={14} />;
      default:
        return <Sparkles size={14} />;
    }
  };

  return (
    <div className="pb-24 pt-3 px-3 sm:px-6 max-w-2xl mx-auto flex flex-col h-[calc(100vh-65px)]">
      {/* Top Header with Mode Selector & New Chat */}
      <header className="pb-2.5 border-b-2 border-stone-200 dark:border-stone-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-stone-950 dark:text-white flex items-center gap-1.5">
                BookMind AI
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                  {currentModeInfo.name}
                </span>
              </h1>
              <p className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 line-clamp-1">
                {currentModeInfo.tagline}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleStartNewChat()}
            aria-label="Start New Chat"
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 hover:bg-stone-100 text-stone-900 dark:text-stone-100 text-xs font-bold shadow-2xs transition-colors"
          >
            <Plus size={15} /> New Chat
          </button>
        </div>

        {/* 8 Mode Selector Horizontal Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {ASSISTANT_MODES.map((m) => {
            const isActive = selectedMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedMode(m.id);
                  if (!activeConv || activeConv.messages.length === 0) {
                    handleStartNewChat(m.id);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-xs scale-102'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-300'
                }`}
              >
                {getModeIcon(m.id)}
                <span>{m.name}</span>
              </button>
            );
          })}
        </div>

        {/* Book Context Selector with clear, thick text */}
        <div className="flex items-center justify-between text-xs font-bold bg-amber-50/70 dark:bg-stone-850 px-3 py-2 rounded-xl border-2 border-amber-200 dark:border-stone-700">
          <span className="text-stone-700 dark:text-stone-300 flex items-center gap-1">
            <BookMarked size={14} className="text-amber-600" /> Book Context:
          </span>
          <select
            value={selectedBookId}
            onChange={(e) => {
              setSelectedBookId(e.target.value);
              setActivePageNum(undefined);
              setActiveContextText(undefined);
            }}
            className="bg-transparent text-amber-800 dark:text-amber-300 font-extrabold focus:outline-hidden cursor-pointer"
          >
            <option value="">General Knowledge (No Book)</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                📖 {b.title} ({b.totalPages} pages)
              </option>
            ))}
          </select>
        </div>

        {/* Active Page / Selected Text context banner if arrived from Reader */}
        {activeBook && activePageNum && (
          <div className="p-2.5 rounded-xl bg-amber-100/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles size={14} className="text-amber-600 shrink-0" />
              <span className="truncate">
                Grounding on <strong>{activeBook.title}</strong> — Page {activePageNum}
              </span>
            </div>
            <button
              onClick={() => {
                setActivePageNum(undefined);
                setActiveContextText(undefined);
              }}
              className="p-1 text-stone-500 hover:text-stone-800 shrink-0"
              title="Clear page context"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1">
        {(!activeConv || activeConv.messages.length === 0) ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
              {getModeIcon(selectedMode)}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-950 dark:text-white">
                {currentModeInfo.name}
              </h3>
              <p className="text-xs font-semibold text-stone-600 dark:text-stone-400 max-w-sm mx-auto mt-1 leading-relaxed">
                {currentModeInfo.description}
              </p>
            </div>

            {/* Prompt Starters */}
            <div className="space-y-1.5 max-w-md mx-auto text-left pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block px-1">
                Suggested questions:
              </span>
              {currentModeInfo.promptStarters.map((starter, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(starter)}
                  className="w-full text-left p-3 rounded-xl border-2 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 hover:border-amber-500 text-xs font-bold text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-between group shadow-2xs"
                >
                  <span className="line-clamp-1">{starter}</span>
                  <CornerDownRight size={14} className="text-stone-400 group-hover:text-amber-600 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          activeConv.messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSpeaking = speakingMsgId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl p-3.5 text-xs sm:text-sm font-semibold leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-br-xs'
                      : 'bg-white dark:bg-stone-850 text-stone-950 dark:text-white border-2 border-stone-200 dark:border-stone-800 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Citations if assistant cited a book page */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-stone-200 dark:border-stone-700 flex flex-wrap gap-1">
                      {msg.citations.map((c, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 font-extrabold text-[11px] flex items-center gap-1"
                        >
                          <BookOpen size={12} />
                          {c.title} {c.pageNumber ? `[Page ${c.pageNumber}]` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message action buttons */}
                {!isUser && (
                  <div className="flex items-center gap-2 mt-1 px-1 text-xs font-bold text-stone-500">
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      aria-label="Copy message"
                      className="hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-0.5"
                    >
                      {copiedMsgId === msg.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>

                    <span>•</span>

                    <button
                      onClick={() => handleSpeakMessage(msg.id, msg.content)}
                      aria-label="Listen with selected voice"
                      className={`hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-0.5 ${
                        isSpeaking ? 'text-amber-600 font-extrabold' : ''
                      }`}
                    >
                      <Volume2 size={13} />
                      <span>{isSpeaking ? 'Listening...' : 'Speak'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {isSending && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-stone-850 border-2 border-stone-200 dark:border-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 w-fit">
            <span className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <span>Analyzing with {currentModeInfo.name}...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar with High-Contrast Thick Input */}
      <div className="pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder={`Ask ${currentModeInfo.name}...`}
            disabled={isSending}
            className="flex-1 py-3 px-4 rounded-xl border-2 border-stone-400 dark:border-stone-600 bg-white dark:bg-stone-850 text-xs sm:text-sm font-black text-stone-950 dark:text-white placeholder:text-stone-600 placeholder:font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
          />

          <button
            type="submit"
            disabled={!userPrompt.trim() || isSending}
            aria-label="Send message"
            className="p-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
