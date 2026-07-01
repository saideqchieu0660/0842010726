import { Deck } from "../lib/store";

export interface HierarchicalNode {
  id: string;
  name: string;
  level: number;
  children: Record<string, HierarchicalNode>;
  decks: Deck[];
}

export const buildHierarchy = (decks: Deck[]): Record<string, HierarchicalNode> => {
  const root: Record<string, HierarchicalNode> = {};

  decks.forEach(deck => {
    // Treat '📌 ĐÃ GHIM' or empty as root level subjects if we want, or handle pinned separately.
    // We will parse the subject by '/'
    const subjectRaw = (deck.subject || "Tự chọn").trim();
    
    // Split by '/' and clean up spaces
    const parts = subjectRaw.split('/').map(p => p.trim()).filter(Boolean);
    
    // Max depth of folders is 3 (Level 1, 2, 3), so Deck is Level 4.
    // If more than 3, we truncate and merge the rest.
    let path = parts;
    if (path.length > 3) {
      path = [...path.slice(0, 2), path.slice(2).join(' / ')];
    }
    if (path.length === 0) {
      path = ["Tự chọn"];
    }

    let currentLevel = root;
    for (let i = 0; i < path.length; i++) {
      const part = path[i];
      if (!currentLevel[part]) {
        currentLevel[part] = {
          id: path.slice(0, i + 1).join('/'),
          name: part,
          level: i + 1,
          children: {},
          decks: []
        };
      }
      
      if (i === path.length - 1) {
        currentLevel[part].decks.push(deck);
      }
      
      currentLevel = currentLevel[part].children;
    }
  });

  return root;
};

export const validateHierarchyDepth = (subject: string): boolean => {
  const parts = subject.split('/').map(p => p.trim()).filter(Boolean);
  return parts.length <= 3;
};
