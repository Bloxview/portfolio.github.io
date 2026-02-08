const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Ensure system directories exist
function ensureSystemDirectories() {
  const userData = app.getPath('userData');
  const systemDirs = [
    path.join(userData, 'system'),
    path.join(userData, 'system', 'modules'),
    path.join(userData, 'system', 'flash'),
    path.join(userData, 'system', 'config')
  ];

  systemDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Create default config if not exists
  const configPath = path.join(userData, 'system', 'config', 'settings.json');
  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      version: '1.4.1',
      display: {
        brightness: 100,
        dimAfter: 120,
        nightShift: {
          enabled: false,
          startTime: '22:00',
          endTime: '07:00',
          warmth: 0.5
        }
      },
      time: {
        format: '12h',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
      },
      animations: {
        intensity: 'medium',
        springPhysics: true,
        durationMultiplier: 1.0
      },
      features: {
        hapticFeedback: true,
        devTools: false,
        performanceMonitor: false
      }
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#F5F5F7',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the system shell
  mainWindow.loadFile('index.html');

  // Remove menu bar for cleaner look
  mainWindow.setMenuBarVisibility(false);
  
  // Show window when content is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools({ mode: 'undocked' });
    }
  });

  // Simple file watcher without chokidar dependency
  const flashDir = path.join(app.getPath('userData'), 'system', 'flash');
  let lastCheck = 0;
  
  setInterval(() => {
    const now = Date.now();
    if (now - lastCheck > 2000) { // Check every 2 seconds
      lastCheck = now;
      fs.readdir(flashDir, (err, files) => {
        if (!err) {
          const jsFiles = files.filter(f => f.endsWith('.js'));
          if (jsFiles.length > 0) {
            mainWindow.webContents.send('flash-update', jsFiles[0]);
            // Move the file after processing
            jsFiles.forEach(file => {
              const oldPath = path.join(flashDir, file);
              const newPath = path.join(flashDir, 'processed', file);
              if (!fs.existsSync(path.join(flashDir, 'processed'))) {
                fs.mkdirSync(path.join(flashDir, 'processed'), { recursive: true });
              }
              fs.renameSync(oldPath, newPath);
            });
          }
        }
      });
    }
  }, 2000);
}

app.whenReady().then(() => {
  ensureSystemDirectories();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for system operations
ipcMain.handle('get-config', async () => {
  const configPath = path.join(app.getPath('userData'), 'system', 'config', 'settings.json');
  try {
    if (fs.existsSync(configPath)) {
      const data = await fs.promises.readFile(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading config:', error);
  }
  return null;
});

ipcMain.handle('save-config', async (event, config) => {
  const configPath = path.join(app.getPath('userData'), 'system', 'config', 'settings.json');
  try {
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
});
