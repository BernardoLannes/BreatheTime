const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');

let mainWindow = null;
let isAlwaysOnTop = true;
let isCompactMode = false;
let currentOpacity = 1.0;

let currentShortcuts = {
  togglePlay: 'Alt+Shift+P',
  toggleCompact: 'Alt+Shift+M',
  toggleMinimize: 'Alt+Shift+B',
};

// Keep track of full window bounds before switching to compact pill
let savedFullBounds = {
  width: 430,
  height: 740,
  x: undefined,
  y: undefined,
};

function applyCompactMode(targetCompact) {
  if (!mainWindow) return isCompactMode;

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  const nextCompact =
    typeof targetCompact === 'boolean' ? targetCompact : !isCompactMode;

  if (nextCompact === isCompactMode) {
    return isCompactMode;
  }

  if (nextCompact) {
    const bounds = mainWindow.getBounds();
    if (bounds.height > 200) {
      savedFullBounds = bounds;
    }
    isCompactMode = true;
    mainWindow.setMinimumSize(320, 96);
    mainWindow.setBounds(
      {
        x: bounds.x,
        y: bounds.y,
        width: Math.max(360, Math.min(bounds.width, 430)),
        height: 112,
      },
      true
    );
  } else {
    const currentBounds = mainWindow.getBounds();
    isCompactMode = false;
    mainWindow.setMinimumSize(360, 420);
    mainWindow.setBounds(
      {
        x: currentBounds.x,
        y: currentBounds.y,
        width: savedFullBounds.width || 430,
        height: savedFullBounds.height || 740,
      },
      true
    );
  }

  if (isAlwaysOnTop) {
    mainWindow.setAlwaysOnTop(true, 'floating');
  }

  mainWindow.webContents.send('shortcut:compact-changed', isCompactMode);
  return isCompactMode;
}

function toggleMinimizeRestore() {
  if (!mainWindow) return;

  if (mainWindow.isMinimized() || !mainWindow.isVisible()) {
    mainWindow.restore();
    mainWindow.show();
    if (isAlwaysOnTop) {
      mainWindow.setAlwaysOnTop(true, 'floating');
    }
    mainWindow.focus();
  } else {
    mainWindow.minimize();
  }
}

function registerGlobalShortcuts(shortcutsConfig) {
  globalShortcut.unregisterAll();

  const merged = {
    ...currentShortcuts,
    ...(shortcutsConfig || {}),
  };
  currentShortcuts = merged;

  // 1. Play / Pause active timer
  if (merged.togglePlay) {
    try {
      globalShortcut.register(merged.togglePlay, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('shortcut:toggle-play');
        }
      });
    } catch (e) {
      console.error('Failed to register togglePlay shortcut:', e);
    }
  }

  // 2. Toggle Compact Pill <-> Full Expanded Window
  if (merged.toggleCompact) {
    try {
      globalShortcut.register(merged.toggleCompact, () => {
        applyCompactMode(!isCompactMode);
      });
    } catch (e) {
      console.error('Failed to register toggleCompact shortcut:', e);
    }
  }

  // 3. Minimize <-> Restore Window
  if (merged.toggleMinimize) {
    try {
      globalShortcut.register(merged.toggleMinimize, () => {
        toggleMinimizeRestore();
      });
    } catch (e) {
      console.error('Failed to register toggleMinimize shortcut:', e);
    }
  }

  return currentShortcuts;
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } =
    primaryDisplay.workAreaSize;

  const initialWidth = 430;
  const initialHeight = 740;
  const initialX = Math.max(20, screenWidth - initialWidth - 24);
  const initialY = Math.max(20, Math.round((screenHeight - initialHeight) / 2));

  savedFullBounds = {
    width: initialWidth,
    height: initialHeight,
    x: initialX,
    y: initialY,
  };

  mainWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    x: initialX,
    y: initialY,
    minWidth: 340,
    minHeight: 92,
    frame: false,
    transparent: false,
    backgroundColor: '#0f172a',
    alwaysOnTop: isAlwaysOnTop,
    resizable: true,
    hasShadow: true,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isAlwaysOnTop) {
    mainWindow.setAlwaysOnTop(true, 'floating');
  }

  const isDevFlag = process.argv.includes('--dev');
  const distIndex = path.join(__dirname, '..', 'dist', 'index.html');

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDevFlag) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(distIndex);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('window:get-state', () => {
  return {
    alwaysOnTop: isAlwaysOnTop,
    compactMode: isCompactMode,
    opacity: currentOpacity,
    shortcuts: currentShortcuts,
  };
});

ipcMain.handle('window:toggle-always-on-top', () => {
  if (!mainWindow) return isAlwaysOnTop;
  isAlwaysOnTop = !isAlwaysOnTop;
  mainWindow.setAlwaysOnTop(
    isAlwaysOnTop,
    isAlwaysOnTop ? 'floating' : 'normal'
  );
  return isAlwaysOnTop;
});

ipcMain.handle('window:set-compact-mode', (_event, compact) => {
  return applyCompactMode(compact);
});

ipcMain.handle('window:set-opacity', (_event, value) => {
  if (!mainWindow) return currentOpacity;
  const clamped = Math.max(0.35, Math.min(1.0, Number(value) || 1.0));
  currentOpacity = clamped;
  mainWindow.setOpacity(clamped);
  return currentOpacity;
});

ipcMain.handle('window:update-shortcuts', (_event, newShortcuts) => {
  return registerGlobalShortcuts(newShortcuts);
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

app.whenReady().then(() => {
  createWindow();
  registerGlobalShortcuts(currentShortcuts);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
