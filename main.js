const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');

let mainWindow;
let isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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
      version: '1.4.0',
      display: {
        brightness: 100,
        dimAfter: 120, // seconds
        nightShift: {
          enabled: false,
          startTime: '22:00',
          endTime: '07:00',
          warmth: 0.5
        }
      },
      time: {
        format: '12h',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
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
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'undocked' });
    }
  });

  // Watch for flash updates
  const flashDir = path.join(app.getPath('userData'), 'system', 'flash');
  const watcher = chokidar.watch(flashDir, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('add', (filePath) => {
    if (path.extname(filePath) === '.js') {
      console.log(`Flash update detected: ${filePath}`);
      mainWindow.webContents.send('flash-update', path.basename(filePath));
    }
  });
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
ipcMain.handle('get-config', () => {
  const configPath = path.join(app.getPath('userData'), 'system', 'config', 'settings.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return null;
});

ipcMain.handle('save-config', (event, config) => {
  const configPath = path.join(app.getPath('userData'), 'system', 'config', 'settings.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return true;
});

ipcMain.handle('install-module', async (event, moduleName, moduleCode) => {
  const modulePath = path.join(app.getPath('userData'), 'system', 'modules', `${moduleName}.js`);
  fs.writeFileSync(modulePath, moduleCode);
  return true;
});
