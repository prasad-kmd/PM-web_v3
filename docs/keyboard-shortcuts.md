# Keyboard shortcuts — the definitive inventory

This file is the single source of truth for every keyboard binding in the
workspace and for every shortcut the interface **advertises**.

The rule it enforces is one sentence:

> **No control advertises a shortcut that does not exist.**

That cuts both ways. A label for a dead shortcut is a lie the user acts on;
and a working shortcut that is never labelled is a secret the user has to
guess. Both are defects.

Every entry below was read out of the source, not from memory. The audit
commands are at the bottom — run them after any change to a shortcut.

---

## 1. Modifier shortcuts

| Keys | Action | Handler | Advertised at |
|---|---|---|---|
| `⌘K` / `Ctrl+K` | Open (or toggle) the **workspace command palette** | `components/desktop/Desktop.tsx` | MenuBar → **Go → Find in workspace…**; the menubar magnifier button's tooltip; the desktop right-click menu |

`⌘K` is the **only** modifier-shortcut handler in the desktop shell.

The handler ignores `Alt` and ignores `Shift`, so `⌘⇧K` does nothing. That is
deliberate: the palette is a single binding, not a family.

### Advertised three times, and it is the same binding each time

| Surface | How it is advertised |
|---|---|
| MenuBar → **Go** | a `MenubarShortcut` label reading `⌘K` |
| MenuBar status button (magnifier) | a tooltip reading `⌘K`, plus `aria-keyshortcuts="Meta+K Control+K"` |
| Desktop right-click menu → **Workspace** | a `ContextMenuShortcut` label reading `⌘K`, plus `aria-keyshortcuts="Meta+K Control+K"` |

---

## 2. The desktop canvas

Active **only while a shortcut is selected**, and only when no window is open.

| Keys | Action |
|---|---|
| `↑` `↓` `←` `→` | Move the selection to the nearest shortcut **in that direction** |
| `Enter` | Open the selected shortcut |
| `Escape` | Clear the selection and remove focus from it |
| `Home` / `End` | Select the first / last shortcut |
| Right-click | Open the context menu for that shortcut |

The arrow keys are a **spatial** search, not a grid index: the candidate in
the pressed direction with the smallest distance wins, and lateral offset
carries a 2.5× penalty — so "down" prefers the icon directly below over one
that is further down but level.

The handler bails out of inputs, textareas, selects, `contenteditable`, menus,
listboxes, dialogs, the lock curtain, any event with a modifier held, and any
moment a window is open. Those keys belong to whatever has focus.

---

## 3. The reader

Active on a content detail page, and only when the reader is the live content.

| Keys | Action | Advertised at |
|---|---|---|
| `j` | Next entry in the collection | the reader's footer hint (`J` / `K`) |
| `k` | Previous entry in the collection | the reader's footer hint (`J` / `K`) |
| `o` | Toggle the outline rail | the reader's footer hint (`O`); the outline control's tooltip (`shortcut="O"`); `aria-keyshortcuts="O"` on that control |

The handler ignores modifiers and repeated events, and it skips typing
targets — so `j` typed into the command palette's search box is just a `j`.

---

## 4. The search surfaces

Three surfaces, one idea: **typing does not search until you ask it to.**

| Surface | Submit | Focus | Clear |
|---|---|---|---|
| Collection listing (`/articles`, `/news`, …) | `Enter`, or the `↵` button | `/` | the `✕` button, or `Escape` |
| Workspace command palette (`⌘K`) | `Enter`, or the `↵` button — **only while the draft differs** from the applied query | — | the `✕` button |
| Settings → Controls (the reference table) | — | — | — |

In the command palette, `Enter` has exactly one meaning at a time: while the
draft is dirty it **searches**; once the draft matches the applied query it
**opens** the highlighted result. The footer says which — `↵ Search` or
`↵ Open`.

The `/` handler focuses the collection search box and never types a slash into
it. It ignores modifiers, typing targets, and menus.

---

## 5. Overlays and primitive-owned navigation

These are **not** advertised as shortcuts. They belong to the Animate UI /
Base UI primitives, which own their own keyboard behaviour, and they are
listed here only so the inventory is complete.

| Keys | Action | Owner |
|---|---|---|
| `Escape` | Close the focused menu, popover, dialog or flyout | Base UI primitives |
| `Escape` | Close the comment discussion sheet | `components/comments/DiscussionContext.tsx` |
| `Escape` | Step back from the lock curtain's challenge, or close it | `components/admin/WorkstationLockCurtain.tsx` |
| `←` `→` | Move to the previous / next media item | `components/notion/MediaViewer.tsx` |
| `Enter` / `Space` | Activate the focused gallery image | `components/notion/ImageGallery.tsx` |
| `↑` `↓` `Home` `End` | Move the command palette's highlighted result | `components/command/CommandPalette.tsx` |
| `Enter` | Activate the focused context-menu item | Base UI primitive |
| Digits, `Backspace` | Enter the one-time code on the lock curtain | `components/admin/WorkstationLockCurtain.tsx` |

---

## 6. Native browser shortcuts the context menu advertises

The desktop right-click menu offers three browser-navigation items and labels
them with the browser's own keys:

| Label | Item | Why it is truthful |
|---|---|---|
| `Alt+←` | **Back** (`window.history.back()`) | `Alt+←` is the browser's own back gesture |
| `Alt+→` | **Forward** (`window.history.forward()`) | `Alt+→` is the browser's own forward gesture |
| `⌘R` | **Reload workspace** (`window.location.reload()`) | `⌘R` is the browser's own reload |

These are the browser's shortcuts, not the application's, and each one
performs the same action as the item it labels. They are listed in the
platform's own notation, which is why `Alt+←` appears alongside `⌘R` rather
than `⌘[` — the label names the key the reader's browser actually uses.

---

## 7. Shortcuts that were removed, and why

| Removed | Replaced by |
|---|---|
| `⌘⇧L` — owner sign-in | MenuBar → **Profile → Sign in…** |
| `⌘⇧G` — OG Image Studio | MenuBar → **View → OG Image Studio** |
| `⌘⇧I` — Invoice Studio | MenuBar → **View → Invoice Studio** |
| `⌘⇧A` — Content Insights | MenuBar → **View → Content Insights**, or `⌘K` → `insights` |
| `⌘,` — Settings | MenuBar → **View → Settings…**, or `⌘K` → `settings` |
| `⌘O` — Résumé / About | MenuBar → **Go → Open Resume**, or **Help → About Prasad** |

Each of these had a **label but no handler** — the menus advertised shortcuts
that did nothing. Removing the label fixed the lie; the function is still
reachable from the menu bar.

The owner studios are additionally guarded server-side: signed out, they
return a genuine **404** rather than a login prompt.

---

## 8. The audit

Run these after any change to a shortcut.

```bash
# 1. every advertised shortcut label, tooltip and aria-keyshortcuts
grep -rn --include=*.tsx \
  "aria-keyshortcuts\|MenubarShortcut>\|ContextMenuShortcut>\|shortcut=\"" \
  app components

# 2. every handler
grep -rn --include=*.ts --include=*.tsx \
  'addEventListener("key\|onKeyDown' app components hooks lib

# 3. any surviving mention of a removed shortcut, in code or prose
grep -rn "⌘⇧L\|⌘⇧G\|⌘⇧I\|⌘⇧A\|⌘,\|⌘O" . \
  --include=*.ts --include=*.tsx --include=*.md \
  | grep -v node_modules | grep -v '^\./\.git/'
```

Audit 1 must return **only** labels that audit 2 backs with a real handler.
Audit 3 must return **nothing** except a historical note explaining the
removal.
