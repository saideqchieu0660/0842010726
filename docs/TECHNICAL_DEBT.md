# Technical Debt

## 1. Monolithic Server File
- **Problem** (Observed Fact): `server.ts` is over 4,000 lines long, handling everything from API key rotation, prompt generation (including complex AI enrichment policies), routing, to Express middleware.
- **Impact**: Difficult to navigate, prone to merge conflicts, and harder to test isolated components.
- **Recommended Solution**: Extract routing into `server/routes/`, API key rotation into `server/services/`, and prompt templates into `server/prompts/`.
- **Priority**: High

## 2. API Key Management Complexity
- **Problem** (Observed Fact): API keys are loaded directly from `process.env` dynamically looping through numeric suffixes (e.g., `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`). 
- **Impact**: Fragile deployment configuration. Environment variable limits might be hit on hosting platforms.
- **Recommended Solution**: Migrate primary quota management to a robust secret manager or database-driven pool if scaling further.
- **Priority**: Medium

## 3. Large Frontend Entry Point
- **Problem** (Observed Fact): `App.tsx` contains excessive logic, including global keyboard shortcut handling, contrast checking, and deep auth resolution.
- **Impact**: Large bundle size for the entry point, potential performance bottlenecks during React renders.
- **Recommended Solution**: Move shortcuts to a custom hook (`useGlobalShortcuts`), extract A11y monitoring to a dedicated component/provider, and split layouts.
- **Priority**: Medium

## 4. Hardcoded Mock Keys
- **Problem** (Observed Fact): `server.ts` injects simulated mock keys (e.g., `gsk_y4aH9dk_mock1_m5W2`) when `GROQ_KEYS` are empty.
- **Impact**: Could mask actual missing configuration errors in production environments.
- **Recommended Solution**: Fail explicitly or log critical warnings in production instead of silently injecting mock data.
- **Priority**: Low (Hypothesis: Added for smooth local development experience)

## 5. Legacy Flashcard Migration Strategy
- **Problem** (Observed Fact): The migration to V2 Metadata relies entirely on lazy evaluation via a `useEffect` inside `StudyRoom.tsx` that patches legacy cards when users open them. There is no automated batch migration script.
- **Impact**: Cards that are never opened by users remain in the legacy format, potentially causing inconsistencies in exported datasets or global search indexing.
- **Recommended Solution**: Implement a server-side background chron job or a dedicated admin batch migration tool to uniformly upgrade all existing Firestore records to `metadataVersion: 2`.
- **Priority**: Medium
