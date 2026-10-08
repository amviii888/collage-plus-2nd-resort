# Custom Instructions

- **CRITICAL FILE DELETION RULE**: Never delete any files from the workspace without explicitly stopping and asking the user for permission first. The user has expressly forbidden the deletion of files without manual confirmation.
- **NO MASS DELETION**: Absolutely NO mass deletion of files. 
- **NO WIPING CONTENT**: Never wipe out entire files or app-related content folders. Do not delete full, content-filled app-related files.
- **NEVER RESET WORKSPACE**: If making structural changes, migrate carefully. Do NOT delete and recreate from scratch in a way that wipes history.
- **ABSOLUTELY NO AUTOMATIC BUILDS (NEVER BUILD AUTONOMOUSLY)**: You are STRICTLY FORBIDDEN from calling the build/compile system (`compile_applet`) automatically. ONLY run `compile_applet` when the user explicitly asks you to build, or when it is absolutely critical at the very end of a complex series of manual tests. Do not build between edits!
- **NO UNNECESSARY BUILDS**: Do NOT build the applet after every small change. ONLY build when it is critical or explicitly requested.
- **NO RE-SCAFFOLDING**: NEVER autonomously run massive scaffolding, init scripts, or recreate the boilerplate directory layout. Only create or modify the specific files the user requested.

---

## 💾 Core Synchronization Architecture: "One-Way Smart Push" Hybrid System

To ensure absolute user privacy, zero redundant reads, and infinite performance scaling, the application implements a **One-Way Smart Push** database synchronization model:

1. **State-Label Local Master**:
   - The primary source of truth is the local `localStorage` state on the user's browser/phone.
   - All records (Students, Plans, Transactions, Attendance) have a `synced` (boolean) flag.
   - When a teacher makes any modification (adds, edits, deletes) while offline or online, the record is immediately written to local storage and tagged with `synced: false`.
   - Deleted items are stored as IDs in a dynamic tracking array in local storage under the key `deleted_[subcollection]`.

2. **Zero-Read Smart Upload Triggers**:
   - Instead of reading thousands of remote documents from Firestore to detect changes (which drains read quota rapidly), the context queries the local state to gather **only** unsynced (`synced: false`) elements and locally deleted IDs.
   - On specific triggers, these dirty elements are bulk-pushed using individual `setDoc` and `deleteDoc` operations (consuming ONLY write/delete quotas for modified items, with **zero** document-reads!).
   - Successful writes/deletes immediately tag local items as `synced: true` and clear local deleted tracking registers.

3. **Event-Driven Execution**:
   - **Boot / App Launch**: A gentle 8-second delayed single-push scan to back up any un-synchronized changes upon opening the application online.
   - **Connection Recovery**: Initiated immediately when browser connection is restored (triggered via `online` window events).
   - **Debounced Interaction Buffer**: Triggered automatically 18 seconds after the most recent offline/online change occurs, preventing visual stutter or network lag.
   - **No Background Poll Loop**: Periodic background collection scans are eliminated entirely, conserving network bandwidth and client resources.

---

## 🎨 Visual Identity, Theme & Color Palette

The application uses an atmospheric, professional, high-contrast digital dark mode designed to minimize eye strain and present a highly polished workspace:

- **Theme Atmosphere**: Immersive, premium, chat-inspired visual canvas with subtle geometric radial gradients. Glowing green-and-amber accent clouds float softly behind the clean typography, paired with a subtle, technical point grid.
- **Color Variables (`globals.css`)**:
  - `background`: `#09090b` (Deep obsidian slate, rich black)
  - `card`: `#131316` (Premium dark graphite)
  - `primary`: `#22c55e` (Electric Green — representive of success, vitality, and classroom growth)
  - `accent`: `#bf7c1c` / `amber-600` (Desert Amber — providing warm highlights, attention focal points, and action markers)
  - `foreground` / `card-foreground`: `#f8fafc` (Bright crisp off-white for comfortable reading)
  - `border`: `#27272a` (Zinc border for structural division)
- **Glassmorphism Styling**: Uses `.glass-card` classes applying backdrop-blur filters (`backdrop-blur-xl`) and transparent slate backings (`bg-card/75`) for a futuristic, lightweight material layer.

---

## 🏷️ Visual Logo Direction & Aesthetic Concept

The application logo should reinforce the theme of structured, natural, and modern classroom guidance:

1. **Symbolic Core**: A minimalist geometric emblem representing a **glowing emerald leaf** growing from a **structured dark grid**.
   - The *leaf* represents student development, growth, and the electric green primary brand color.
   - The *grid* represents scheduling, records, ledger balance, and teacher organization.
2. **Visual Palette for Vector Assets**:
   - Gradient fill transitioning from a vivid Electric Green (`#22c55e`) at the top crown to a deep Forest Slate Green toward the stem.
   - Highlight accents rendered in warm Desert Amber (`#bf7c1c`) depicting dynamic starlight or water droplets.
3. **Typography Accompaniment**:
   - Display font styled in clean, rounded geometric letters (e.g., *Outfit* or *Space Grotesk*) utilizing generous tracking (letter spacing) and lowercase tech styling for a friendly, approachable, and modern visual.

---

## ⚠️ Legacy Modules & Architecture Guidance

- **Admin Education Check-In Page (`/src/components/admin/education/CheckInPage.tsx`)**:
  - This is a legacy educational center check-in system from older center workflows.
  - It is currently set aside and inactive in the primary user workflows.
  - Active teacher attendance and student check-ins are handled via the modern teacher portal (`/src/components/teacher/TeacherAttendance.tsx`).
  - Do not modify, re-scaffold, or perform unrequested maintenance on `CheckInPage.tsx`. Keep it safely untouched.



