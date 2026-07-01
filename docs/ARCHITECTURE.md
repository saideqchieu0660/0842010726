# Architecture

## System Overview
Henosis is a full-stack TypeScript application utilizing a Vite + React frontend and an Express Node.js backend. 

## 1. Application Layer (Frontend)
- **Framework**: React 19 + Vite.
- **Routing**: React Router v7.
- **Styling**: Tailwind CSS v4, utilizing CSS variables for dynamic theming (Dark/Light, Font Size, UI Density).
- **Offline & Storage**: `localforage` / IndexedDB for offline roadmap caching. 
- **Animation**: `motion/react` for layout transitions, `canvas-confetti` for achievements.
- **Components**: Complex bespoke UI including `Agent3Widget` (floating AI assistant), `AudioVisualizer`, `MasteryHeatmap`.

## 2. API & Service Layer (Backend)
- **Framework**: Express (`server.ts`).
- **Build System**: Bundled into a single `dist/server.cjs` via `esbuild` for production.
- **AI Orchestration (`server/providers/`)**:
  - `HealthMonitor`: Tracks API key health, error counts, usage, and cooldowns.
  - `CerebrasRotator`, `CrossProviderRotator`: Manages streaming generation with automatic fallback, rate limit backoff (HTTP 429), and quota exhaustion (HTTP 403) handling.
- **Security**: 
  - Dynamic IP Spoofing & User-Agent rotation for external API requests to mitigate harsh WAF blocking.
  - Role escalation endpoint (`/api/auth/escalate-role`).

## 3. Data Layer
- **Firebase Firestore**:
  - `users`: User profiles, stats, roles.
  - `sets`: Flashcard decks (Supports V2 Metadata format with background auto-repair hydration).
  - `costudy_room`: Real-time multiplayer presence.
  - `system_config` / `system_metrics`: Global feature toggles and API key health status.
- **Firebase Auth**: Supports Google Provider and Anonymous (Guest) login.

## Architectural Decisions (ADR)
### 1. Unified Express Server for AI Proxy
- **Decision**: Keep all AI API calls strictly server-side via Express.
- **Reason**: Protect API keys (Gemini, Groq, Cerebras) from being exposed to the client.
- **Impact**: Requires a unified build pipeline (Vite for client, esbuild for server).

### 2. Multi-Provider Fallback System
- **Decision**: Implement a rotating key system across multiple LLM providers.
- **Reason**: Single provider quotas (especially free tiers) are easily exhausted during high traffic or automated flashcard generation.
- **Impact**: Highly resilient AI features, but complex state management for key health.

### 3. Client-Side Contrast & A11y Monitor
- **Decision**: Implement a runtime DOM scanner in `App.tsx` that checks WCAG contrast ratios.
- **Reason**: Ensure readability across dynamic themes without requiring a dedicated QA pipeline.
- **Impact**: Minor runtime performance cost, but guarantees accessibility.

### 4. Data Enrichment Policy & V2 Metadata Schema
- **Decision**: Adopt a strict Data Enrichment Policy prioritizing user-input, migrating flashcards to a stricter JSON schema (`metadataVersion: 2`). Legacy cards are seamlessly upgraded on the client side via a background repair endpoint (`/api/automation/repair-metadata`).
- **Reason**: Preserve user-authored content, minimize unnecessary AI generation (improving token efficiency), and guarantee rich, consistent flashcard metadata (IPA, POS, CEFR, Topic).
- **Impact**: Increased data quality and lower API costs. Avoids disruptive mass-migration locks by hydrating legacy cards lazily on access.

### 5. Vocabulary State Engine
- **Decision**: Implement a strictly normalized state engine for flashcard learning status, assigning a definitive `status` string (`"unknown"`, `"review"`, `"mastered"`) to cards in `cardsState` and removing local storage arrays (e.g. `remind_later_items`, `weak_cards`).
- **Reason**: The previous implementation mixed "X marked" (chưa thuộc) and "Bell marked" (nhắc nhở) into disjointed local storage arrays, causing list collisions and UI inconsistencies. A definitive status field guarantees data integrity and separated list queries.
- **Impact**: Code simplification, multi-device sync integrity, and correct semantic grouping. Existing disjointed data is automatically normalized into the correct status upon loading.
