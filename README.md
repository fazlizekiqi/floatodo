# FloaTodo

A lightweight always-on-top desktop todo overlay with a dark neumorphic UI built on Electron.

## Features

- **Always on top** — floats on the right edge of your screen, above every window
- **Dark + light neumorphism** — tactile raised/inset shadow design; toggle with `Alt+T`
- **Local JSON storage** — todos saved automatically, no account or cloud required
- **Day-based grouping** — tasks grouped under Today / Yesterday / day names
- **Task detail view** — open any task to edit title, freeform notes, and a checklist
- **Keyboard-first** — navigate, add, complete, delete and jump to tasks entirely without a mouse
- **Spotlight focus mode** — non-focused cards dim when keyboard-navigating
- **Auto-updates** — update button appears in-app when a new version is available
- **System tray** — runs in background; `Ctrl+Shift+Space` to show/hide from anywhere

---

## Quick Start

```bash
# Install dependencies
npm install

# Run in development
npm start
```

---

## Build for distribution

```bash
# Windows installer (no publish — local build only)
npm run build:win

# Windows installer + publish to GitHub Releases (see Auto-updates section)
npm run release:win
```

Output goes to `dist/`.

---

## Keyboard shortcuts

### Global (works from any app)

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Space` | Show / hide the panel |

### Task list

| Key | Action |
|-----|--------|
| `Enter` | Add typed task silently |
| `Shift+Enter` | Expand input → multi-line textarea |
| `↑` / `↓` | Navigate between task cards |
| `Enter` or `E` | Open detail view for focused card |
| `Space` | Toggle done / undone |
| `Delete` | Delete focused card |
| `1` – `9` | Jump directly to card #1–9 |
| `Escape` | Deselect card |
| `Alt+T` | Toggle light / dark theme |

### Inside expanded input (Shift+Enter mode)

| Key | Action |
|-----|--------|
| `Enter` | Save task + open detail view |
| `Shift+Enter` | Add a new line |
| `Escape` | Collapse back to single-line |

> First line = task title shown on the card. Everything below = private notes (only visible in detail view).

### Detail view

| Key | Action |
|-----|--------|
| `Escape` | Save and close |
| `Ctrl+Enter` | Save and close |
| `Space` / `Enter` (on checklist step) | Toggle step done |
| `Delete` (on checklist step) | Remove step |
| `↑` / `↓` (on checklist steps) | Navigate steps |

---

## Data location

Todos are stored as plain JSON at:

| Platform | Path |
|----------|------|
| **Windows** | `%APPDATA%\FloaTodo\todos.json` |
| **macOS** | `~/Library/Application Support/FloaTodo/todos.json` |
| **Linux** | `~/.config/FloaTodo/todos.json` |

---

## Auto-updates (step-by-step)

FloaTodo uses [`electron-updater`](https://www.electron.build/auto-update) with GitHub Releases.
When a new version is published, the app downloads it silently and shows a **"Restart & Update"**
button in the panel — no reinstall needed.

### Step 1 — Create a GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Create a repository called `floatodo` (or any name you like)
3. Push the project:

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/fazlizekiqi/floatodo
git push -u origin main
```

---

### Step 2 — Set your repo in package.json

Open `package.json` and edit the `publish` block:

```json
"publish": {
  "provider": "github",
  "owner": "YOUR_GITHUB_USERNAME",
  "repo":  "floatodo"
}
```

---

### Step 3 — Create a GitHub Personal Access Token

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **"Generate new token (classic)"**
3. Give it a name, e.g. `FloaTodo releases`
4. Set expiration as needed
5. Check the scope: **`repo`** (full repo access — needed to create releases)
6. Click **Generate token** and **copy it immediately** (you can't see it again)

---

### Step 4 — Set the token as an environment variable

> This must be set each time you open a new terminal to build.

**PowerShell (Windows):**
```powershell
$env:GH_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxx"
```

**To persist it permanently (Windows):**
```powershell
[System.Environment]::SetEnvironmentVariable("GH_TOKEN", "ghp_xxxxxxxxxxxx", "User")
```
Then restart your terminal.

---

### Step 5 — Bump the version

In `package.json`, update the version number before each release:

```json
{
  "version": "1.1.0"
}
```

Use [semantic versioning](https://semver.org/): `MAJOR.MINOR.PATCH`
- `1.0.1` — bug fix
- `1.1.0` — new feature
- `2.0.0` — breaking change

---

### Step 6 — Build and publish

```bash
npm run release:win
```

This does everything in one command:
1. Builds the NSIS installer (`FloaTodo-Setup-1.1.0.exe`)
2. Generates `latest.yml` (the update manifest the app polls)
3. Creates a GitHub Release tagged `v1.1.0`
4. Uploads both files to the release

---

### Step 7 — How users receive the update

Once the release is published on GitHub:

1. Any running instance of FloaTodo checks for updates **5 seconds after launch** and then every **4 hours**
2. If a newer version is found it downloads silently in the background
3. A banner appears at the top of the panel:  
   **"Update 1.1.0 is downloading…"** → becomes **"Restart & Update"** when ready
4. User clicks the button → app restarts and the new version is installed automatically

No reinstall. No prompts. One click.

---

### Troubleshooting updates

| Problem | Fix |
|---------|-----|
| `GH_TOKEN` not set | Set the env var (Step 4) and retry |
| SmartScreen warning on first install | Expected on unsigned builds. Click "More info → Run anyway". Sign the exe with a code-signing cert to prevent this. |
| No update banner appears | Only works in packaged builds (`app.isPackaged`). Updates are silently skipped in dev mode (`npm start`). |
| Release not found | Make sure the GitHub release is **published** (not a draft) and the version in `package.json` is higher than the installed version. |

---

## Customization

Edit the CSS variables at the top of `src/index.html`:

```css
/* Dark theme */
--base: #252525;   /* panel background */
--surf: #2b2b2b;   /* cards and button surfaces */
--ac:   #5a9ef0;   /* accent / add-button color */

/* Light theme */
--base: #f0f0f0;
--surf: #f0f0f0;
--ac:   #2563eb;
```

Shadow depth is controlled by `--nr` (raised) and `--ni` (inset) variables.
