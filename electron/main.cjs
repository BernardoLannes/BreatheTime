const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let isAlwaysOnTop = true;
let isCompactMode = false;
let currentOpacity = 1.0;
let isTransitioningMode = false;

function getStartupExePath() {
  // Se estiver rodando do BreatheTime.exe empacotado, usa o próprio process.execPath
  if (process.execPath.toLowerCase().endsWith('breathetime.exe')) {
    return process.execPath;
  }
  // Caso esteja em modo dev, aponta para o BreatheTime.exe da pasta release se existir
  const releaseExe = path.resolve(
    __dirname,
    '..',
    'release',
    'BreatheTime',
    'BreatheTime.exe'
  );
  if (fs.existsSync(releaseExe)) {
    return releaseExe;
  }
  return process.execPath;
}

function getAutoLaunchEnabled() {
  try {
    const exePath = getStartupExePath();
    const settings = app.getLoginItemSettings({ path: exePath });
    return Boolean(settings.openAtLogin);
  } catch {
    return false;
  }
}

function setAutoLaunchEnabled(enabled) {
  try {
    const exePath = getStartupExePath();
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      path: exePath,
    });
    return getAutoLaunchEnabled();
  } catch (e) {
    console.error('Failed to set login item settings:', e);
    return false;
  }
}

let currentShortcuts = {
  togglePlay: 'Alt+Shift+P',
  toggleCompact: 'Alt+Shift+M',
  toggleMinimize: 'Alt+Shift+B',
};

// Guarda separadamente o tamanho/posição do modo completo e do modo compacto
let savedFullBounds = {
  width: 440,
  height: 750,
  x: undefined,
  y: undefined,
};

let savedCompactBounds = {
  width: 420,
  height: 175,
  x: undefined,
  y: undefined,
};

function saveCurrentWindowBounds() {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized() || isTransitioningMode) {
    return;
  }
  const b = mainWindow.getBounds();
  if (isCompactMode) {
    savedCompactBounds = { ...b };
  } else {
    savedFullBounds = { ...b };
  }
}

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

  // Salva as dimensões atuais antes de trocar de modo
  saveCurrentWindowBounds();

  isTransitioningMode = true;
  const currentBounds = mainWindow.getBounds();

  if (nextCompact) {
    isCompactMode = true;
    mainWindow.setMinimumSize(360, 145);
    mainWindow.setBounds(
      {
        x: savedCompactBounds.x !== undefined ? savedCompactBounds.x : currentBounds.x,
        y: savedCompactBounds.y !== undefined ? savedCompactBounds.y : currentBounds.y,
        width: Math.max(360, savedCompactBounds.width || 420),
        height: Math.max(145, savedCompactBounds.height || 175),
      },
      true
    );
  } else {
    isCompactMode = false;
    mainWindow.setMinimumSize(360, 420);
    mainWindow.setBounds(
      {
        x: savedFullBounds.x !== undefined ? savedFullBounds.x : currentBounds.x,
        y: savedFullBounds.y !== undefined ? savedFullBounds.y : currentBounds.y,
        width: Math.max(380, savedFullBounds.width || 440),
        height: Math.max(420, savedFullBounds.height || 750),
      },
      true
    );
  }

  setTimeout(() => {
    isTransitioningMode = false;
  }, 150);

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

  if (merged.toggleCompact) {
    try {
      globalShortcut.register(merged.toggleCompact, () => {
        applyCompactMode(!isCompactMode);
      });
    } catch (e) {
      console.error('Failed to register toggleCompact shortcut:', e);
    }
  }

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

  const initialWidth = 440;
  const initialHeight = 750;
  const initialX = Math.max(20, screenWidth - initialWidth - 24);
  const initialY = Math.max(20, Math.round((screenHeight - initialHeight) / 2));

  savedFullBounds = {
    width: initialWidth,
    height: initialHeight,
    x: initialX,
    y: initialY,
  };

  savedCompactBounds = {
    width: 420,
    height: 175,
    x: initialX,
    y: initialY,
  };

  mainWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    x: initialX,
    y: initialY,
    minWidth: 360,
    minHeight: 145,
    frame: false,
    transparent: false,
    backgroundColor: '#0b1120',
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

  // Sempre que o usuário redimensionar ou mover a janela, memoriza o tamanho do modo atual
  mainWindow.on('resized', () => {
    saveCurrentWindowBounds();
  });
  mainWindow.on('moved', () => {
    saveCurrentWindowBounds();
  });

  // Quando a janela está selecionada (em foco), volta para 100% de opacidade;
  // quando perde o foco (blur), aplica a transparência configurada pelo usuário
  mainWindow.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setOpacity(1.0);
    }
  });

  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setOpacity(currentOpacity);
    }
  });

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
    autoLaunch: getAutoLaunchEnabled(),
  };
});

ipcMain.handle('window:set-auto-launch', (_event, enabled) => {
  return setAutoLaunchEnabled(enabled);
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

// Ajusta altura mínima do modo compacto quando há vários cronômetros rodando em Multi-Task
ipcMain.handle('window:ensure-compact-height', (_event, minHeightNeeded) => {
  if (!mainWindow || !isCompactMode) return;
  const b = mainWindow.getBounds();
  const targetMin = Math.max(150, Math.min(480, Number(minHeightNeeded) || 175));
  if (b.height < targetMin) {
    mainWindow.setBounds(
      {
        x: b.x,
        y: b.y,
        width: b.width,
        height: targetMin,
      },
      true
    );
    savedCompactBounds.height = targetMin;
  }
});

let opacityPreviewTimer = null;

ipcMain.handle('window:set-opacity', (_event, value) => {
  if (!mainWindow) return currentOpacity;
  const clamped = Math.max(0.35, Math.min(1.0, Number(value) || 1.0));
  currentOpacity = clamped;

  // Mostra uma prévia rápida do nível escolhido e, se a janela continuar selecionada (em foco),
  // volta para 100% até que o usuário clique fora da janela (blur)
  mainWindow.setOpacity(clamped);
  if (opacityPreviewTimer) clearTimeout(opacityPreviewTimer);
  opacityPreviewTimer = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused()) {
      mainWindow.setOpacity(1.0);
    }
  }, 900);

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
