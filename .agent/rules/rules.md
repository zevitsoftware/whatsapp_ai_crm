---
trigger: always_on
---

**Source of truth :**
- Source of truth in blueprint dir:  topology.md, architecture.md and IMPLEMENTATION_PLAN.md

**Summary Policy:**
1. **Trigger:** Create/Update a summary ONLY when explicitly asked ("create summary"). Never auto-generate it.
2. **File:** Use a single DAILY file: `summary/summary_YYYY_MM_DD.md`.
3. **Action:** If the file exists, **APPEND** the new session info to it. Do not overwrite or create new timestamped files.

# Project Rules & Design Guidelines

## UI/UX Standards

- **No Native Browser Dialogs**: Strictly avoid `window.alert()`, `window.confirm()`, or `window.prompt()`.
- **Custom Premium Dialogs**: All interactions requiring user confirmation or notification must use custom-built, high-fidelity React modals that match the application's dark-themed aesthetic (glassmorphism/premium design).
- **Consistency**: Use the established `Dialog` state pattern for consistent look and feel across all management tabs (Knowledge Base, Products, etc.).

## Technology Strategy

- **DDL Restrictions**: Directly modifying schema via `ALTER TABLE` is restricted by environment permissions. Use JSON-based attributes (like the `metadata` column in `KnowledgeBases`) to store dynamic or new fields instead of adding new SQL columns.
- **Product Knowledge**: Sync product details to the Knowledge Base as plain text files for AI training. Do not summarize products; only summarize general educational documents.
- **Vector Storage Quotas**: Maintain separate quotas for different knowledge categories (e.g., 7 chunks for Documents, 7 chunks for Products).
