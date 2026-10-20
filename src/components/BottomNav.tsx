import React from 'react';
import { Home, BookOpen, Sparkles, PenTool, TrendingUp, User } from 'lucide-react';

export type NavTab = 'home' | 'books' | 'assistant' | 'create' | 'progress' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isAudioPlaying?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  isAudioPlaying,
}) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'books', label: 'My Books', icon: BookOpen },
    { id: 'assistant', label: 'AI Assistant', icon: Sparkles, badge: 'AI' },
    { id: 'create', label: 'Create', icon: PenTool },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'profile', label: 'Profile', icon: User },
  ] as const;

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 transition-colors"
    >
      <div className="max-w-md mx-auto px-2 py-1.5 flex justify-around items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id as NavTab)}
              aria-label={tab.label}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all relative ${
                isActive
                  ? 'text-amber-700 dark:text-amber-400 font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              <div className="relative">
                <Icon
                  size={20}
                  className={`transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'
                  }`}
                />
                {tab.id === 'assistant' && (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 bg-gradient-to-r from-amber-500 to-orange-500 text-[9px] font-bold text-white rounded-full leading-none shadow-xs">
                    AI
                  </span>
                )}
                {tab.id === 'home' && isAudioPlaying && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-full">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-amber-600 dark:bg-amber-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
