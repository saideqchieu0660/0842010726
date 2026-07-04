# ADR 003: Home Library Classification by Ownership

## Status
Proposed (Pending Post-Bootstrap Implementation)

## Context
The Home learning library currently mixes all modules into a single list. The user has requested to organize the library by ownership into three top-level categories: "My Resources", "Shared With Me", and "Community Library". This separation will clarify ownership, permission levels, and public vs. private resources. The structure must also support scalability for future categories like Team Spaces, Favorites, and Recently Opened.

## Proposed Architecture

### 1. Data Model & Access Control
- Resources (e.g., Decks, Modules, Folders) already track `ownerId`, `visibility` (public/private), and `permissions` (collaborators/roles).
- **Logical Queries for Categories:**
  - **My Resources:** `ownerId == currentUserId` (Includes both private and public items owned by the user).
  - **Shared With Me:** `collaborators contains currentUserId` (or specific permission link records) AND `ownerId != currentUserId`.
  - **Community Library:** `visibility == 'public'`. (Prioritizing `isOfficial == true` or similar admin flags for the top of the list).

### 2. User Interface
- Implement a tabbed interface or sidebar navigation for the main categories.
- **Visual Indicators:** Add badges for visibility (Public/Private), owner name (if not current user), and user role (Owner, Viewer, Editor). Official resources in the Community Library will feature an "Official" badge.
- **Controls:** Support Search, Sorting (A-Z, Updated, Created), and Filtering within each specific category context.
- **Performance:** Implement virtualization or pagination for scalable rendering, as libraries will grow large.

### 3. Extensibility
- The UI routing, view states, and query structure should allow easy addition of new categories (e.g., Favorites, Recent) by passing different filter schemas/parameters to the shared resource list component, rather than hardcoding only these three tabs.

## Consequences
- **Positive:** Clearer organization, preventing clutter. Better visibility of shared vs. owned resources. Matches modern SaaS file-management patterns.
- **Negative:** Requires refactoring the existing flat library dashboard to execute multiple distinct database queries (or apply robust client-side filtering and memoization).

## Notes
Implemented as an ADR due to SYSTEM BOOTSTRAP MODE constraints (which prohibit altering production code). No production code changes have been made.
