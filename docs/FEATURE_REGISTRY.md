# Feature Registry

## Architecture Pending Implementation
1. **Multi-Level Folder System & Hierarchical Skill Tree**
   - Status: Proposed (ADR-002)
   - Description: Transition from flat deck organization to a nested folder structure (up to 4 levels) with drag-and-drop, virtualized rendering, permission inheritance, and hierarchical progression roll-ups in the Skill Tree.
2. **Home Library Classification**
   - Status: Proposed (ADR-003)
   - Description: Organize the Home learning library by ownership into three top-level categories: My Resources, Shared With Me, and Community Library, with robust search and sorting.

## Core Features
1. **Flashcard System (Spaced Repetition)**
   - Status: Core
   - Description: Creation, viewing, and studying of flashcards. Includes offline support (`daily-quest`) and V2 Metadata Auto-Repair.
2. **AI Study Assistant (Agent 3)**
   - Status: Core
   - Description: A floating chat widget (`Agent3Widget.tsx`) allowing context-aware queries about the current study deck.
3. **Student Dashboard**
   - Status: Core
   - Description: Hub for students to view statistics (`MasteryHeatmap`, `SkillTreeGraph`), achievements, and recent decks.
4. **Teacher & Admin Dashboard**
   - Status: Core
   - Description: Interfaces for content creation (`AdminCreateCards.tsx`) and system monitoring (`ApiHealthMonitor.tsx`).
5. **Data Compiler & JSON Validator**
   - Status: Core
   - Description: Enforces the Data Enrichment Policy to parse, repair, and enrich text or malformed JSON into the strict V2 Flashcard JSON format while preserving user inputs.

## Extension Features
1. **Document to Flashcards**
   - Status: Extension
   - Description: `DocumentConverter.tsx` extracts text from uploaded PDFs/images and converts them to flashcard sets via AI.
2. **Co-Study Room**
   - Status: Extension
   - Description: Real-time collaborative study environment synced via Firestore.
3. **Deep Work Timer**
   - Status: Extension
   - Description: Pomodoro-style focus timer with ambient soundscapes.
4. **Global Activity Feed**
   - Status: Extension
   - Description: Live feed of system-wide achievements and study activities.

## Experimental / Quality of Life Features
1. **Dynamic UI Toggles**
   - Status: Variant
   - Description: Font scaling, UI density (compact/comfortable), and "Fix Lag" mode to disable heavy effects on low-end devices.
2. **Auto-Fix Contrast**
   - Status: Experimental
   - Description: Runtime DOM scanner that detects and automatically corrects low-contrast text for accessibility.
