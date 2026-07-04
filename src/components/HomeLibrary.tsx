import React, { useState, useMemo } from 'react';
import { Deck, store } from '../lib/store';
import { DeckList } from './DeckList';
import { Folder, Users, Globe, Lock, Unlock, ShieldCheck, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
function formatDistanceToNow(date: number | Date) {
  const diffInSeconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diffInSeconds < 60) return "vừa xong";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
}

interface HomeLibraryProps {
  decks: Deck[];
  isAdmin: boolean;
  onEditDeck?: (deck: Deck) => void;
  onCategoryQuiz?: (subject: string, subjectDecks: Deck[]) => void;
  onCategoryReviewHardCards?: (subject: string, subjectDecks: Deck[]) => void;
  onCategoryStudyAll?: (subject: string, subjectDecks: Deck[]) => void;
}

type LibraryTab = 'my_resources' | 'shared_with_me' | 'community';

export function HomeLibrary({ decks, isAdmin, onEditDeck, onCategoryQuiz, onCategoryReviewHardCards, onCategoryStudyAll }: HomeLibraryProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>('my_resources');
  
  const currentUser = store.getCurrentUser();
  const currentUserId = currentUser?.id;

  const filteredDecks = useMemo(() => {
    let result = decks.filter(deck => {
      const isOwner = deck.createdBy === currentUserId;
      const systemDecks = ["deck_1", "deck_phil_2", "deck_math_1", "deck_math_2", "deck_physics_1", "deck_physics_2", "daily-quest", "remind-later-deck"];
      const isSystem = systemDecks.includes(deck.id) || !deck.createdBy || deck.createdBy === "system" || deck.isOfficial;
      
      switch (activeTab) {
        case 'my_resources':
          // Resources owned by the current user
          return isOwner;
        case 'shared_with_me':
          // Resources owned by others and shared with the user
          return !isOwner && !isSystem && deck.sharedWith?.includes(currentUserId || '');
        case 'community':
          // Public resources available to everyone
          return deck.visibility === 'public' || isSystem;
        default:
          return false;
      }
    });

    if (activeTab === 'community') {
      result.sort((a, b) => {
        const aOfficial = a.isOfficial || ["deck_1", "deck_phil_2", "deck_math_1", "deck_math_2", "deck_physics_1", "deck_physics_2", "daily-quest", "remind-later-deck"].includes(a.id) || !a.createdBy || a.createdBy === "system";
        const bOfficial = b.isOfficial || ["deck_1", "deck_phil_2", "deck_math_1", "deck_math_2", "deck_physics_1", "deck_physics_2", "daily-quest", "remind-later-deck"].includes(b.id) || !b.createdBy || b.createdBy === "system";
        
        if (aOfficial && !bOfficial) return -1;
        if (!aOfficial && bOfficial) return 1;
        return 0;
      });
    }

    return result;
  }, [decks, activeTab, currentUserId]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveTab('my_resources')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap",
            activeTab === 'my_resources' 
              ? "bg-orange-500 text-white shadow-lg" 
              : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-orange-50 dark:hover:bg-zinc-700"
          )}
        >
          <Folder className="w-5 h-5" />
          My Resources
        </button>
        <button
          onClick={() => setActiveTab('shared_with_me')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap",
            activeTab === 'shared_with_me' 
              ? "bg-blue-500 text-white shadow-lg" 
              : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-blue-50 dark:hover:bg-zinc-700"
          )}
        >
          <Users className="w-5 h-5" />
          Shared With Me
        </button>
        <button
          onClick={() => setActiveTab('community')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap",
            activeTab === 'community' 
              ? "bg-emerald-500 text-white shadow-lg" 
              : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-emerald-50 dark:hover:bg-zinc-700"
          )}
        >
          <Globe className="w-5 h-5" />
          Community Library
        </button>
      </div>

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <DeckList 
          decks={filteredDecks}
          showSearch={true}
          groupBySubject={activeTab === 'my_resources'}
          isAdmin={isAdmin}
          onEditDeck={onEditDeck}
          onCategoryQuiz={onCategoryQuiz}
          onCategoryReviewHardCards={onCategoryReviewHardCards}
          onCategoryStudyAll={onCategoryStudyAll}
        />
      </div>
    </div>
  );
}
