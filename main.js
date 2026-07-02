const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

// electron-updater — only active in packaged builds
let autoUpdater;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
} catch (e) {
  // Not installed yet (dev mode) — silently skip
  autoUpdater = null;
}

// ── App icon — drawn programmatically (blue circle + white checkmark) ─────────
function createAppIcon(size) {
  const buf = Buffer.alloc(size * size * 4, 0);

  function setPixel(x, y, r, g, b, a = 255) {
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || xi >= size || yi < 0 || yi >= size) return;
    const i = (yi * size + xi) * 4;
    const oa = buf[i + 3] / 255, na = a / 255;
    const fa = na + oa * (1 - na);
    if (fa === 0) return;
    buf[i]     = Math.round((r * na + buf[i]     * oa * (1 - na)) / fa);
    buf[i + 1] = Math.round((g * na + buf[i + 1] * oa * (1 - na)) / fa);
    buf[i + 2] = Math.round((b * na + buf[i + 2] * oa * (1 - na)) / fa);
    buf[i + 3] = Math.round(fa * 255);
  }

  // Anti-aliased filled circle (accent blue)
  const cx = (size - 1) / 2, cy = (size - 1) / 2, radius = size / 2 - 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist < radius) {
        const alpha = dist > radius - 1 ? Math.round((radius - dist) * 255) : 255;
        setPixel(x, y, 90, 158, 240, alpha);
      }
    }
  }

  // White checkmark strokes
  const sc = size / 16;
  function drawLine(x0, y0, x1, y1, w) {
    x0 *= sc; y0 *= sc; x1 *= sc; y1 *= sc; w *= sc;
    const dx = x1 - x0, dy = y1 - y0;
    const steps = Math.ceil(Math.sqrt(dx * dx + dy * dy) * 4);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + dx * t, py = y0 + dy * t;
      for (let oy = -Math.ceil(w); oy <= Math.ceil(w); oy++) {
        for (let ox = -Math.ceil(w); ox <= Math.ceil(w); ox++) {
          const d = Math.sqrt(ox * ox + oy * oy);
          if (d <= w) {
            const a = d > w - 1 ? Math.round((w - d) * 255) : 255;
            setPixel(px + ox, py + oy, 255, 255, 255, a);
          }
        }
      }
    }
  }
  drawLine(3.5, 9.0,  6.5, 12.0, 1.3);
  drawLine(6.5, 12.0, 13.5,  4.5, 1.3);

  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

let win;
let tray;
const DB_PATH = path.join(app.getPath('userData'), 'todos.json');

// ── DB helpers ──────────────────────────────────────────────────────────────
function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {}
  return { todos: [] };
}
function writeDB(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }

// ── Toggle visibility (tray) ──────────────────────────────────────────────────
function toggleWindow() {
  if (win.isVisible()) { win.hide(); }
  else { win.show(); win.focus(); }
}

// ── Smart toggle: hide if visible, show+focus-input if hidden ────────────────
function smartToggle() {
  if (win.isVisible()) {
    win.hide();
  } else {
    win.show();
    win.focus();
    setTimeout(() => {
      if (win && !win.isDestroyed()) win.webContents.send('window:focusInput');
    }, 110);
  }
}

// ── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: 320, height,
    x: width - 320, y: 0,
    transparent: true, frame: false,
    alwaysOnTop: true, skipTaskbar: true,
    resizable: false, hasShadow: false,
    focusable: true,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadFile('src/index.html');
  win.setIcon(createAppIcon(32));
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  win.setAlwaysOnTop(true, 'floating');
  screen.on('display-metrics-changed', () => {
    const { width: w, height: h } = screen.getPrimaryDisplay().workAreaSize;
    win.setBounds({ x: w - 320, y: 0, width: 320, height: h });
  });
}

// ── Tray ─────────────────────────────────────────────────────────────────────
function createTray() {
  const icon = createAppIcon(16);
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show / Hide  (Ctrl+Shift+Space)', click: toggleWindow },
    { type: 'separator' },
    { label: 'Quit FloaTodo', click: () => app.quit() },
  ]);
  tray.setToolTip('FloaTodo — Ctrl+Shift+Space');
  tray.setContextMenu(contextMenu);
  tray.on('click', toggleWindow);
}

// ── Global shortcut ───────────────────────────────────────────────────────────
function registerShortcut() {
  const ret = globalShortcut.register('CommandOrControl+Shift+Space', smartToggle);
  if (!ret) console.log('Shortcut registration failed');
}

// ── IPC handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('todos:get', () => readDB().todos);

ipcMain.handle('todos:add', (_, text) => {
  const db = readDB();
  db.todos.unshift({
    id: Date.now().toString(),
    text, done: false,
    notes: '', subtasks: [],
    createdAt: new Date().toISOString(),
    priority: 'normal',
  });
  writeDB(db);
  return db.todos;
});

ipcMain.handle('todos:toggle', (_, id) => {
  const db = readDB();
  const t = db.todos.find(t => t.id === id);
  if (t) { t.done = !t.done; t.updatedAt = new Date().toISOString(); }
  writeDB(db);
  return db.todos;
});

ipcMain.handle('todos:delete', (_, id) => {
  const db = readDB();
  db.todos = db.todos.filter(t => t.id !== id);
  writeDB(db);
  return db.todos;
});

ipcMain.handle('todos:update', (_, { id, text, notes, subtasks, priority }) => {
  const db = readDB();
  const t = db.todos.find(t => t.id === id);
  if (t) {
    if (text     !== undefined && text.trim()) t.text     = text.trim();
    if (notes    !== undefined) t.notes    = notes;
    if (subtasks !== undefined) t.subtasks = subtasks;
    if (priority !== undefined) t.priority = priority;
    t.updatedAt = new Date().toISOString();
  }
  writeDB(db);
  return db.todos;
});

ipcMain.handle('todos:setPriority', (_, { id, priority }) => {
  const db = readDB();
  const t = db.todos.find(t => t.id === id);
  if (t) { t.priority = priority; t.updatedAt = new Date().toISOString(); }
  writeDB(db);
  return db.todos;
});

ipcMain.handle('todos:reorder', (_, ids) => {
  const db = readDB();
  const map = Object.fromEntries(db.todos.map(t => [t.id, t]));
  db.todos = ids.map(id => map[id]).filter(Boolean);
  writeDB(db);
  return db.todos;
});

ipcMain.handle('window:hide', () => win.hide());

// ── Auto-updater IPC ──────────────────────────────────────────────────────────
ipcMain.handle('updater:check',   () => autoUpdater?.checkForUpdates());
ipcMain.handle('updater:install', () => autoUpdater?.quitAndInstall(false, true));

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerShortcut();

  if (autoUpdater && app.isPackaged) {
    // Wire updater events → renderer
    autoUpdater.on('update-available',  info => win?.webContents.send('updater:available', info));
    autoUpdater.on('update-downloaded', info => win?.webContents.send('updater:downloaded', info));
    autoUpdater.on('error',             err  => console.log('Updater error:', err));

    // Check 5 s after launch, then every 4 hours
    setTimeout(() => autoUpdater.checkForUpdates(), 5000);
    setInterval(()  => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000);
  }
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', e => e.preventDefault());
app.on('activate', () => win && win.show());
