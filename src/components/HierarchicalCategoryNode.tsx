import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronDown, Folder, BookOpen, Check, X, Edit3, DownloadCloud, Share2, Sparkles } from 'lucide-react';
import { HierarchicalNode } from '../utils/hierarchy';
import { Deck } from '../lib/store';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

// Re-using the tilt card and horizontal scroll from DeckList
// But since DeckList exports DeckList, we should either extract TiltCard or pass renderDeck function.
// Since we want minimal modifications to DeckList, we can write the recursive part directly inside DeckList or as a sub-component.
