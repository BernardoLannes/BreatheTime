const { app, BrowserWindow, ipcMain, screen, globalShortcut, shell, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const { registerBitrixIpc } = require('./bitrix.cjs');

let mainWindow = null;
let isAlwaysOnTop = true;
let isCompactMode = false;
let currentOpacity = 1.0;
let isTransitioningMode = false;
let avoidMouseEnabled = false;
let avoidMouseInterval = null;
let lastDodgeAt = 0;

let powerSettings = {
  autoPauseIdleMinutes: 10,
  pauseOnSleepOrLock: true,
};
let idleTriggeredForCurrentStretch = false;
let idleMonitorInterval = null;

function startIdleMonitor() {
  if (idleMonitorInterval) return;
  idleMonitorInterval = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!powerSettings.autoPauseIdleMinutes || powerSettings.autoPauseIdleMinutes <= 0) {
      idleTriggeredForCurrentStretch = false;
      return;
    }
    try {
      const idleSecs = powerMonitor.getSystemIdleTime();
      if (idleSecs < 10) {
        idleTriggeredForCurrentStretch = false;
        return;
      }
      if (
        !idleTriggeredForCurrentStretch &&
        idleSecs >= powerSettings.autoPauseIdleMinutes * 60
      ) {
        idleTriggeredForCurrentStretch = true;
        mainWindow.webContents.send('power:auto-pause', {
          reason: `Sem atividade no PC há ${powerSettings.autoPauseIdleMinutes} min`,
          idleSeconds: idleSecs,
        });
      }
    } catch {
      // ignore
    }
  }, 5000);
}

function stopIdleMonitor() {
  if (idleMonitorInterval) {
    clearInterval(idleMonitorInterval);
    idleMonitorInterval = null;
  }
}

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
  copyDescription: 'Alt+Shift+C',
  toggleAvoidMouse: 'Alt+Shift+E',
};

function startAvoidMouseLoop() {
  if (avoidMouseInterval) return;
  avoidMouseInterval = setInterval(() => {
    if (!avoidMouseEnabled || !mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized() || !mainWindow.isVisible() || isTransitioningMode) return;
    // Se a janela estiver focada (usuário clicou via taskbar/Alt+Tab), deixa interagir normalmente
    if (mainWindow.isFocused()) return;

    const now = Date.now();
    if (now - lastDodgeAt < 550) return;

    const cursor = screen.getCursorScreenPoint();
    const b = mainWindow.getBounds();
    const inside =
      cursor.x >= b.x - 6 &&
      cursor.x <= b.x + b.width + 6 &&
      cursor.y >= b.y - 6 &&
      cursor.y <= b.y + b.height + 6;

    if (!inside) return;

    lastDodgeAt = now;
    const display = screen.getDisplayMatching(b);
    const wa = display.workArea;
    const windowCenterX = b.x + b.width / 2;
    const workCenterX = wa.x + wa.width / 2;

    // Move para o lado horizontal oposto do monitor atual
    const targetX =
      windowCenterX > workCenterX
        ? wa.x + 20
        : Math.max(wa.x + 20, wa.x + wa.width - b.width - 20);
    const clampedY = Math.max(
      wa.y + 12,
      Math.min(b.y, wa.y + wa.height - b.height - 12)
    );

    isTransitioningMode = true;
    mainWindow.setBounds(
      {
        x: Math.round(targetX),
        y: Math.round(clampedY),
        width: b.width,
        height: b.height,
      },
      true
    );
    saveCurrentWindowBounds();
    setTimeout(() => {
      isTransitioningMode = false;
    }, 150);
  }, 80);
}

function stopAvoidMouseLoop() {
  if (avoidMouseInterval) {
    clearInterval(avoidMouseInterval);
    avoidMouseInterval = null;
  }
}

function setAvoidMouse(enabled) {
  avoidMouseEnabled = Boolean(enabled);
  if (avoidMouseEnabled) {
    startAvoidMouseLoop();
  } else {
    stopAvoidMouseLoop();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('shortcut:avoid-mouse-changed', avoidMouseEnabled);
  }
  return avoidMouseEnabled;
}

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

  if (merged.copyDescription) {
    try {
      globalShortcut.register(merged.copyDescription, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('shortcut:copy-description');
        }
      });
    } catch (e) {
      console.error('Failed to register copyDescription shortcut:', e);
    }
  }

  if (merged.toggleAvoidMouse) {
    try {
      globalShortcut.register(merged.toggleAvoidMouse, () => {
        setAvoidMouse(!avoidMouseEnabled);
      });
    } catch (e) {
      console.error('Failed to register toggleAvoidMouse shortcut:', e);
    }
  }

  // Atalhos globais de Opacidade: Alt+Shift++ (ou =) para aumentar, Alt+Shift+- para diminuir
  const adjustOpacityBy = (delta) => {
    const next = Math.round(Math.max(0.35, Math.min(1.0, currentOpacity + delta)) * 100) / 100;
    applyOpacityWithPreview(next);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('shortcut:opacity-changed', next);
    }
  };

  for (const accel of ['Alt+Shift+Plus', 'Alt+Shift+=', 'Alt+Shift+numadd']) {
    try {
      globalShortcut.register(accel, () => adjustOpacityBy(0.1));
    } catch {
      // ignore if key not supported on current layout
    }
  }

  for (const accel of ['Alt+Shift+-', 'Alt+Shift+numsub']) {
    try {
      globalShortcut.register(accel, () => adjustOpacityBy(-0.1));
    } catch {
      // ignore
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
    avoidMouse: avoidMouseEnabled,
    powerSettings,
  };
});

ipcMain.handle('window:set-power-settings', (_event, next) => {
  powerSettings = {
    autoPauseIdleMinutes: Math.max(0, Number(next?.autoPauseIdleMinutes) || 0),
    pauseOnSleepOrLock:
      typeof next?.pauseOnSleepOrLock === 'boolean'
        ? next.pauseOnSleepOrLock
        : powerSettings.pauseOnSleepOrLock,
  };
  idleTriggeredForCurrentStretch = false;
  return powerSettings;
});

ipcMain.handle('window:set-avoid-mouse', (_event, enabled) => {
  return setAvoidMouse(enabled);
});

ipcMain.handle('window:open-external', (_event, rawUrl) => {
  if (typeof rawUrl === 'string' && /^https?:\/\//i.test(rawUrl)) {
    return shell.openExternal(rawUrl);
  }
  return Promise.resolve();
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

function applyOpacityWithPreview(value) {
  if (!mainWindow || mainWindow.isDestroyed()) return currentOpacity;
  const clamped = Math.max(0.35, Math.min(1.0, Number(value) || 1.0));
  currentOpacity = clamped;

  mainWindow.setOpacity(clamped);
  if (opacityPreviewTimer) clearTimeout(opacityPreviewTimer);
  opacityPreviewTimer = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused()) {
      mainWindow.setOpacity(1.0);
    }
  }, 900);

  return currentOpacity;
}

ipcMain.handle('window:set-opacity', (_event, value) => {
  return applyOpacityWithPreview(value);
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

registerBitrixIpc(ipcMain);

app.whenReady().then(() => {
  createWindow();
  registerGlobalShortcuts(currentShortcuts);
  startIdleMonitor();

  const sendPauseEvent = (reason) => {
    if (!powerSettings.pauseOnSleepOrLock) return;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('power:auto-pause', { reason, idleSeconds: 0 });
    }
  };

  powerMonitor.on('suspend', () => sendPauseEvent('Computador entrou em suspensão'));
  powerMonitor.on('lock-screen', () => sendPauseEvent('Tela do Windows bloqueada'));
  powerMonitor.on('shutdown', () => sendPauseEvent('Computador sendo desligado'));

  const sendResumeEvent = () => {
    idleTriggeredForCurrentStretch = false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('power:resume');
    }
  };
  powerMonitor.on('resume', sendResumeEvent);
  powerMonitor.on('unlock-screen', sendResumeEvent);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  stopIdleMonitor();
  stopAvoidMouseLoop();
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
