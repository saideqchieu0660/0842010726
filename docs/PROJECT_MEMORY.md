# Henosis - Living Project Memory

## Project Identity
Henosis is an advanced, offline-capable, real-time educational platform designed for students and teachers. It focuses on spaced repetition (flashcards), AI-powered study assistance, and gamified learning experiences. 

## Core Engineering Principles
- **Robust Provider Abstraction**: AI features must remain resilient. The system implements a sophisticated round-robin rotation, rate limit handling, and automatic fallback across multiple AI providers (Gemini, Groq, Cerebras, OpenRouter).
- **Offline First & PWA**: Core study flows (like the Daily Quest) have offline fallback paths using `localforage` and IndexedDB.
- **Performance Tuning**: Given the heavy use of animations (`motion/react`, `canvas-confetti`, `tsparticles`), the app includes a "Fix Lag" mode to dynamically disable heavy UI effects.
- **Real-time Synchronization**: Firestore `onSnapshot` listeners power leaderboards, user profiles, and multiplayer Co-Study rooms.
- **Defensive Backend**: The Express server implements rigorous API key masking, quota monitoring, and request pacing to prevent cascade failures.

## Historical Context & Bootstrapping
- **Initial Reconstruction**: This document was bootstrapped from a repository analysis on 2026-06-28. Prior history is inferred from repository structure and code metadata.

## Permanent Engineering Standards
- **Data Enrichment Policy**: Flashcard processing strictly follows an input priority ladder: (1) User Input, (2) Existing Metadata, (3) Internal Model Knowledge, (4) External Retrieval. User-authored content (meaning, notes) must NEVER be overwritten. If completeness is >= 95%, the system only normalizes formatting to preserve token efficiency and prevent unnecessary generation.
- **Flashcard Metadata Standard (V2)**: All generated or repaired flashcards MUST adhere to the V2 schema, which enforces explicit metadata: `front`, `back`, `ipa`, `primaryPartOfSpeech`, `category`, `cefrLevel`, `frequency`, and `metadataVersion: 2`. Frontend logic must not attempt to dynamically infer Parts of Speech; it must rely on the structured backend JSON.
- **Vocabulary State Engine**: Flashcard review state is rigorously normalized using a `status` property (`"unknown" | "review" | "mastered"`). UI-driven loose storage (like mixing `isHard` and `remind_later_items` in localStorage) is forbidden. A card can only have one explicit status, which overrides previous states.
- **Multi-Agent System Control**: AI Agents (Deep Explanation Agent 2, Socratic Coach Agent 3) operate under strict system control parameters. Output must adhere to defined lexical modes and conversational structures, enforcing quotas, cooldowns, and accurate cost tracking without bypassing the Firebase runtime configuration.
- **Strict Offline-First Persistence**: IndexedDB is the single source of truth. The cloud is for backup/sync and must NEVER overwrite valid local data. Migrations must preserve data by field-level merging, snapshotting, and utilizing event sourcing. Local learning progress is immutable.
- **AI Provider Toggles**: AI availability is controlled via Firestore (`system_config/api_toggles`) with a fallback to REST API fetches. 
- **Error Handling (API)**: 429s (Rate Limits) and 503s (Overload) trigger automatic key rotation or brief cooldowns. 401s/403s trigger a "HARD_LOCKED" state for the affected API key.
- **Routing**: Client-side routing is handled by React Router. The Express server serves API routes (`/api/*`) first, falling back to Vite middleware (dev) or static files (prod).
- **Styling**: Tailwind CSS v4 is used exclusively.
- **State Management**: Zustand/Custom store (`store.ts`) for global state, combined with Firestore real-time listeners.
