# ADR 002: Multi-Level Folder Architecture & Skill Tree Refactoring

## Status
Proposed (Pending Post-Bootstrap Implementation)

## Context
The application currently uses a flat structure for Flashcard Collections (Decks) and Learning Modules. As the Admin and User Libraries grow, this flat structure has become unmanageable. There is a need for a robust, multi-level folder system (up to 4 levels deep) to organize resources. 

Simultaneously, the Skill Tree needs to transition from a flat module list to a hierarchical progression model, where completing all modules in a folder unlocks the parent folder's completion status.

## Proposed Architecture

### 1. Data Model Changes (Database)
- **New Entity: `Folder`**
  - `id`: Unique identifier
  - `name`: Display name
  - `parentId`: Nullable, reference to parent folder
  - `ownerId`: User ID of the creator
  - `permissions`: Inherited or overridden permissions
  - `level`: Integer (1 to 4) to enforce maximum depth
- **Modifications to `Deck` (Flashcard Collections)**
  - Add `folderId`: Reference to the containing folder
- **Skill Tree Node Updates**
  - Distinguish between `module` nodes and `folder` nodes. Folder nodes will act as parent containers and track aggregated mastery of their children.

### 2. User Interface (Library)
- Transition from flat list views to a nested file-explorer UI.
- Use `react-virtuoso` or `react-window` for virtualized rendering to handle thousands of folders without performance degradation.
- Implement drag-and-drop using a library like `dnd-kit` to allow moving decks and folders safely.
- Add context menus for creation, renaming, deletion, and permission management.

### 3. Skill Tree Graph Rendering
- Update `SkillTreeGraph.tsx` to handle recursive structures.
- Implement lazy loading and dynamic edge calculation to prevent canvas lag when expanding large nested structures.
- Introduce collapsible folder nodes.

### 4. Migration Strategy
- Introduce a migration script that groups existing flat decks by their `subject` or `category` tags and automatically creates the corresponding parent folders.
- Map all legacy flat decks into this new structure to ensure zero data loss and backward compatibility.

## Consequences
- **Positive:** Massive improvement in content organization and navigability for both Admins and Students. Enables complex curriculum design (e.g., Year -> Subject -> Chapter -> Lesson).
- **Negative:** Significant increase in database query complexity (recursive parent-child lookups). Requires careful performance tuning on both frontend (virtualization) and backend (read optimizations).

## Notes
Due to the strict SYSTEM BOOTSTRAP MODE constraint (`You MUST NOT modify any production code during bootstrap. Your only output is: analysis, reconstruction, documentation generation`), this feature cannot be directly implemented in the current execution context. The architecture has been analyzed and prepared for immediate implementation once the bootstrap lock is lifted.
