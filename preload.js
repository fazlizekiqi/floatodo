const { contextBridge, ipcRenderer } = require('electron');

// Single focus-input listener registered once at preload level
let _focusInputCb = null;
ipcRenderer.on('window:focusInput', () => { if (typeof _focusInputCb === 'function') _focusInputCb(); });

// Updater listeners
let _updateAvailableCb = null;
let _updateDownloadedCb = null;
ipcRenderer.on('updater:available',  (_, info) => _updateAvailableCb?.(info));
ipcRenderer.on('updater:downloaded', (_, info) => _updateDownloadedCb?.(info));

contextBridge.exposeInMainWorld('api', {
  getTodos:     ()           => ipcRenderer.invoke('todos:get'),
  addTodo:      (text)       => ipcRenderer.invoke('todos:add', text),
  toggleTodo:   (id)         => ipcRenderer.invoke('todos:toggle', id),
  deleteTodo:   (id)         => ipcRenderer.invoke('todos:delete', id),
  updateTodo:   (id, data)   => ipcRenderer.invoke('todos:update', { id, ...data }),
  setPriority:  (id, p)      => ipcRenderer.invoke('todos:setPriority', { id, priority: p }),
  reorderTodos: (ids)        => ipcRenderer.invoke('todos:reorder', ids),
  hideWindow:   ()           => ipcRenderer.invoke('window:hide'),
  onFocusInput: (cb)         => { _focusInputCb = cb; },

  // Auto-updater
  onUpdateAvailable:  (cb) => { _updateAvailableCb  = cb; },
  onUpdateDownloaded: (cb) => { _updateDownloadedCb = cb; },
  checkForUpdate:     ()   => ipcRenderer.invoke('updater:check'),
  installUpdate:      ()   => ipcRenderer.invoke('updater:install'),
});
