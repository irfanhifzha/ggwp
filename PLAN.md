
# PLAN — GreatGridWorkspace

## Project Overview

GreatGridWorkspace is a minimalist, responsive, and lightweight web workspace designed for writing, studying, note-taking, bookmarking, and organizing information.

The goal is to create a flexible digital workspace where users can arrange different types of content side by side, making it easier to read, write, research, and connect information without constantly switching between tabs or applications.

The project prioritizes:

- **Minimalism** — Clean interface, minimal visual distractions, and simple interactions.
- **Performance** — Fast rendering, lightweight implementation, and efficient resource usage.
- **Responsiveness** — Designed for both desktop and mobile, not just adapted to mobile afterward.
- **Flexibility** — Customizable layouts that let users organize their workspace according to their needs.
- **Simplicity** — Avoid unnecessary features, dependencies, and styling complexity.
- **Local-first** — Data is stored locally in the browser, without requiring an account or backend.

## Current Tech Stack

This project was initialized using `npm create vite@latest`.

- **Build tool:** Vite
- **Language:** TypeScript
- **Linting:** Oxlint
- **Storage:** Browser localStorage
- **Styling:** CSS (prefer native CSS capabilities over heavy styling frameworks)

The stack can be adjusted if there's a more optimized approach.

---

## Core Concept — A Flexible Grid Workspace

The main interface is a customizable grid consisting of independent content areas (panels).

Each panel acts as a workspace unit that can contain different types of content.

Users should be able to:

- Add and remove panels.
- Resize panels by adjusting their width and height.
- Configure the number of columns in the grid.
- Merge adjacent columns or panels to create larger content areas.
- Split larger areas into smaller panels.
- Rearrange panels to create different layouts.
- Change the content type of a panel, if practical.
- Display multiple content types simultaneously.

The idea is to let users build their own workspace instead of being restricted to a predefined layout.

**Some things I'm still unsure about:**

- Should the grid use a fixed column system, or should panels have more independent positioning and sizing?
- Should users be able to freely drag and resize panels, or should the layout follow predefined grid rules?
- Should merging panels actually combine their content, or simply make one panel occupy more grid space?
- How should the grid behave on mobile? Maybe switch to a single-column layout, or allow users to navigate between panels?
- Should desktop and mobile have separate layout configurations, or share the same layout with responsive adjustments?

I'm open to recommendations on the simplest and most maintainable approach.

---

## Content Types

Each panel supports a specific content type. 

> i still dont exactly know how to build this content type, but i'll follow your recommendation to build the most simple and the most optimzed fast render and lightweight usage. So if you could make the thingy the simplest thing you could do

### 1. Plain Text Editor

A simple writing area for:

- Taking notes.
- Writing thoughts and ideas.
- Creating study summaries.
- Drafting content.
- Keeping reference information.

Desired characteristics:

- Minimal, distraction-free interface.
- Comfortable typography and spacing.
- Fast editing experience.
- Automatic saving.
- No unnecessary formatting tools in the initial version.

**Things to consider:**

- Should it be completely plain text, or should it support Markdown? i mean i think plain text fine
- Should each text panel have its own title?
- Should there be basic formatting tools, or should everything remain keyboard-focused?
- Should text panels support search?

### 2. PDF Viewer

A panel that displays PDF documents from a URL.

Desired characteristics:

- Load PDFs directly inside the workspace.
- Support document scrolling and navigation.
- Allow users to read documents without leaving the workspace.
- Resize the viewer according to the panel dimensions.
- Preserve the PDF URL when saving workspace data.

**Things to consider:**

- Should PDF viewing use the browser's native PDF viewer or a library such as PDF.js?
- Should users be able to add local PDF files, or only URLs?
- Should PDF viewing support page navigation and zoom?
- What happens if a URL cannot be embedded or accessed?

Ideally, users should be able to read a PDF in one panel while writing notes in another.

### 3. Link Manager / Bookmark Panel

A panel for saving and organizing useful URLs.

Desired characteristics:

- Save links with a title and URL.
- Display bookmarks in a clean, compact list.
- Allow users to edit and delete saved links.
- Open links in a new browser tab.
- Optionally include a description or personal note.

### 4. Future Development

Potential features and content types that could be introduced in the future.

These are just ideas for now, not requirements for the initial version. The architecture should ideally make it easy to extend the workspace with new panel types and capabilities.

Possible ideas:

- **Markdown Editor** — Write notes using Markdown syntax, with an optional live preview.
- **Rich Text Editor** — Support basic formatting such as headings, bold, italic, lists, and links.
- **Image Viewer** — Display images from URLs or locally imported files.
- **Web Page Viewer** — Display external websites directly inside a panel, if embedding is supported.
- **Code Editor** — Write and store code snippets for learning or reference.
- **Task / To-do List** — Manage tasks, checklists, and study progress.
- **Calendar / Planner** — Organize study schedules, deadlines, and events.
- **Table / Spreadsheet** — Store structured information in simple tables.
- **Quick Notes** — A lightweight scratchpad for temporary thoughts and ideas.
- **Search** — Search across text panels, bookmarks, and other workspace content.
- **Cross-panel References** — Link one panel to another, making it easier to connect notes and references.
- **Templates** — Create reusable workspace layouts for different activities, such as studying, research, or writing.

Additional possibilities:

- Multiple workspaces.
- Duplicate panels.
- Keyboard shortcuts.
- Dark and light themes.
- Customizable panel appearance.
- Drag-and-drop content between panels.
- Workspace presets and templates.

**Note:** Keep these features optional and prioritize the core workspace experience first. Avoid introducing unnecessary complexity before the basic grid, text editor, PDF viewer, and bookmark manager are solid.

**Things to consider:**

- Should bookmarks be organized using folders, tags, or both?
- Should the application automatically retrieve website titles and favicons?
- Should users be able to save a link directly into a specific panel?
- Should bookmarks support search and filtering?

---

## Intended Workflow

The workspace should encourage a natural study and research workflow.

For example:

1. Create a PDF panel and load a document from a URL.
2. Create a text panel beside it.
3. Read the document while writing notes.
4. Add another text panel for summaries or additional references.
5. Create a bookmark panel to keep useful research links.
6. Resize and rearrange panels to fit the current task.

The idea is to create a flexible environment where reading, writing, and organizing information happen in one place.

---

## Data Persistence & Management

The application should use browser localStorage to save workspace data locally.

There should be no requirement for an account, authentication, or backend in the initial version.

### 1. Automatic Saving

Save the following data:

**Workspace / Grid Settings**
- Number of columns.
- Panel positions.
- Panel dimensions and spans.
- Panel arrangement.
- Other relevant layout configurations.

**Panel Content**
- Text content.
- PDF URLs and relevant viewer settings.
- Bookmark data.
- Panel titles and other metadata.
- Panel type and unique identifiers.

The goal is to preserve both the workspace layout and its content, so users can return to the same workspace after refreshing or reopening the application.

### 2. Import & Export

Provide the ability to export all application data into a single JSON file.

The exported JSON should include:

- Workspace configurations.
- Grid settings.
- Panel metadata.
- All panel content.
- Bookmark data.
- Any other relevant application settings.

Users should also be able to import a previously exported JSON file to restore their workspace.

**Things to consider:**

- Should importing replace all existing data or offer a merge option?
- Should the application validate imported JSON before applying it?
- Should exports include a schema version for future compatibility?
- Should there be a way to recover from an invalid or corrupted import?

### 3. Clear All Data

Provide an option to completely clear all locally stored application data.

This should include:

- Workspace layouts.
- Grid settings.
- All panel content.
- Bookmarks.
- Other application settings.

There should be a confirmation step before permanently deleting everything.

### 4. Storage Considerations

localStorage is a simple starting point, but there are some limitations:

- It stores data synchronously.
- It has limited storage capacity.
- Large amounts of text or other data can become problematic.
- It is not suitable for storing large PDF files.

**I'm open to recommendations here.** Would IndexedDB be a better long-term solution, especially if the application grows?

> well to be honest, i dont even need localstorage, this is just make things more convenience, i could just if exit the app it clear the whole thing. i dont mind, cause there already an import/export feature.

The initial implementation should remain as simple as possible without creating unnecessary migration work later.

---

## UI / UX Direction

The visual design should be minimalist and functional.

### Design Principles

- Use a neutral color palette.
- Avoid excessive borders, shadows, gradients, and decorative elements.
- Prefer subtle separators over heavy card-style containers.
- Keep controls unobtrusive and accessible when needed.
- Prioritize usable space over interface decoration.
- Use consistent typography and spacing.
- Provide clear visual feedback for resizing, rearranging, and editing.
- Keep the interface comfortable to use on both small and large screens.

The workspace itself should be the primary focus, not the surrounding interface.

### Responsive Design

Desktop and mobile are both important targets.

**Desktop:**
- Make good use of available screen space.
- Allow multiple panels to be visible simultaneously.
- Support flexible grid layouts and resizing.
- Make reading and writing side by side comfortable.

**Mobile:**
- Prioritize readability and easy navigation.
- Consider a single-column layout.
- Allow users to switch between panels easily.
- Keep controls touch-friendly.
- Avoid squeezing multiple panels into an unusably narrow layout.

**Things I'm unsure about:**

- Should mobile use the same grid configuration as desktop, or have a separate mobile arrangement?
- Should panels become full-screen views on mobile?
- Should there be a panel switcher or navigation drawer?
- How should panel resizing work on touch devices?

---

## Technical & Architectural Direction

### Development Principles

- Keep the application lightweight and avoid unnecessary dependencies.
- Prefer native browser capabilities and CSS over libraries when practical.
- Use CSS Grid for the underlying workspace layout where appropriate.
- Use Flexbox for internal panel layouts.
- Keep components modular and independent.
- Separate panel layout logic from panel content rendering.
- Avoid unnecessary global state and excessive re-rendering.
- Lazy-load heavier components, especially PDF-related functionality.
- Use CSS variables for shared design tokens.
- Avoid unnecessary animations and expensive visual effects.

### Suggested Architecture

Think of the application as three separate layers:

**1. Workspace Manager**
- Manages the overall layout.
- Handles adding, removing, resizing, and rearranging panels.
- Stores workspace configuration.

**2. Panel System**
- Defines individual panels.
- Handles panel dimensions, position, and content type.
- Provides a consistent interface for different panel types.

**3. Panel Content**
- Implements the actual functionality of each panel.
- Examples: text editor, PDF viewer, bookmark manager.

**4. Data Persistence**
- Handles saving and loading application data.
- Manages import and export.
- Handles clearing all data.
- Keeps storage logic separate from UI components.

This separation should make the application easier to maintain and extend.

## Development Priorities

Build incrementally instead of implementing everything at once, each phase do git commit and message like "feat(..):...."

### Phase 1 — Foundation

- Set up the application structure.
- Create the main workspace interface.
- Implement a basic responsive grid.
- Add and remove panels.
- Support basic panel resizing.
- Establish the initial data model.

### Phase 2 — Core Content

- Implement the plain text editor.
- Implement the PDF viewer.
- Implement the bookmark manager.
- Allow different content types to coexist in the workspace.
- Add automatic saving.

### Phase 3 — Layout Customization

- Support configurable columns.
- Implement panel merging and splitting.
- Add panel rearrangement.
- Persist workspace layouts.
- Refine mobile workspace behavior.

### Phase 4 — Data Management

- Implement JSON export.
- Implement JSON import with validation.
- Add clear-all-data functionality.
- Consider storage migration and versioning.

### Phase 5 — Refinement

- Improve mobile and tablet experiences.
- Optimize rendering and component updates.
- Improve keyboard accessibility and shortcuts.
- Refine the minimalist UI.
- Evaluate additional content types.

---

## Overall Vision

GreatGridWorkspace should feel like a flexible digital desk.

Rather than forcing users into predefined pages, documents, or tabs, it provides a customizable space where different types of information can coexist.

Users decide how their workspace is structured, what each area contains, and how much space each area occupies.

The core idea:

**A simple, fast, and flexible workspace for thinking, reading, writing, studying, and organizing information.**

---

## Open Questions / Recommendations Needed

I'm intentionally leaving some decisions open because I want to explore the most optimized and maintainable approach before committing to an implementation.

Please evaluate and recommend approaches for:

1. **Grid architecture:** CSS Grid, a dedicated grid layout library, or another approach?
2. **Panel resizing:** Free resizing, predefined grid spans, or a combination?
3. **Mobile experience:** Shared responsive grid or separate mobile layout?
4. **Text editor:** Plain text, Markdown, or something else?
5. **PDF viewer:** Native browser viewer or PDF.js?
6. **Storage:** localStorage or IndexedDB?
7. **State management:** Native React state/context or a lightweight state management library?
8. **Import/export:** Best JSON structure, validation, and versioning strategy?
9. **Performance:** How to keep rendering fast when multiple panels are open?
10. **Project structure:** Is the suggested architecture appropriate for a project of this size?

**Important:** Don't feel obligated to follow every idea in this document. If a concept is unnecessarily complicated, inefficient, or has a better alternative, recommend changing it.

The goal is not to build the most feature-rich application, but to build the simplest solid foundation that can grow without becoming unnecessarily complicated.
