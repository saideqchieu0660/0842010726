# Changelog

## [Initial Baseline] - 2026-06-28

### System Archaeology Scan
- Reconstructed engineering knowledge base from raw repository evidence.
- **Bootstrapped Documents**:
  - `PROJECT_MEMORY.md`: Core system identity and history.
  - `ARCHITECTURE.md`: High-level system design.
  - `FEATURE_REGISTRY.md`: Catalog of all application capabilities.
  - `TECHNICAL_DEBT.md`: Identified areas for future refactoring.

### Noteworthy System States (Inferred from codebase)
- Express server acts as a unified proxy for AI services, implementing a robust round-robin and rate-limit handling mechanism across Gemini, Groq, Cerebras, and OpenRouter.
- Frontend utilizes React 19, Tailwind CSS v4, and React Router v7.
- Firebase handles Auth and Firestore database sync, heavily utilizing `onSnapshot` for real-time multiplayer features.
- Offline capabilities implemented for the Daily Quest feature using `localforage`.

## [Data Enrichment & V2 Schema Update] - 2026-06-28

### Flashcard Data Standard Evolution
- **Metadata V2 Schema**: Introduced `metadataVersion: 2` encompassing stricter typing for `ipa`, `primaryPartOfSpeech`, `category`, `cefrLevel`, and `frequency`.
- **Data Enrichment Policy**: Applied a formal knowledge retrieval priority policy to AI prompts. The AI now rigorously preserves user-provided input and only retrieves internal/external knowledge to fill missing gaps when card completeness is < 95%.
- **Seamless Migration**: Implemented a lazy background auto-repair endpoint (`/api/automation/repair-metadata`) that quietly upgrades legacy cards to V2 schema when opened in the `StudyRoom`.
- **Frontend Simplification**: Removed brittle Regex-based Part-of-Speech inference logic on the client, replacing it with explicit JSON data served by the updated AI compiler endpoints.

### Vocabulary State Engine Refactor
- **State Separation**: Fixed semantic logic flaw where "Unknown" (X marked) and "Review" (Bell marked) words were dangerously mixed in the same list. 
- **Storage Migration**: Removed UI-based `remind_later_items` and `weak_cards_` local storage tracking in favor of a normalized `status` field (`"unknown" | "review" | "mastered"`) tightly integrated with the existing `cardsState` sync engine.
- **Automated Data Normalization**: Added a silent runtime migration in `StudentDashboard` to automatically detect legacy disjointed interaction states and fold them into the unified `status` parameter, ensuring multi-device consistency.

## [Architecture Design Phase] - 2026-07-01

### Multi-Level Folder Architecture Proposed
- Received request to refactor standard flat Deck architecture to support deep nesting (up to 4 levels) with inherited permissions, progression model roll-up, and advanced virtualization capabilities.
- Added `docs/ADR/002-multi-level-folders.md` detailing the required database changes (`folder` collection, `parentId`), permission structures, and Skill Tree recursive rendering updates.

### Home Library Classification Proposed
- Received request to organize the Home learning library by ownership into: My Resources, Shared With Me, and Community Library.
- Added `docs/ADR/003-home-library-classification.md` detailing the required query logic, UI restructuring, and visibility/permission badging.
- **Enforced Security Policy**: Executed in SYSTEM BOOTSTRAP MODE. All structural plans have been successfully cataloged and mapped in the Feature Registry for execution once the repository lock is released. No production state changes or migrations were executed, strictly preserving existing user data formats and stability.