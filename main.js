const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // Get primary display info
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    fullscreen: true, // Start in fullscreen
    frame: false, // No window borders
    alwaysOnTop: true, // Stay on top
    kiosk: true, // Kiosk mode (cannot exit fullscreen)
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  // Load your HTML file
  mainWindow.loadFile('index.html');
  
  // Disable dev tools for final version (uncomment when ready)
  // mainWindow.webContents.on('devtools-opened', () => {
  //   mainWindow.webContents.closeDevTools();
  // });
  
  // Prevent app from closing
  mainWindow.on('close', (event) => {
    event.preventDefault();
  });
}

// When Electron is ready
app.whenReady().then(() => {
  createWindow();
  
  // Disable screensaver/power saving
  const { powerSaveBlocker } = require('electron');
  powerSaveBlocker.start('prevent-display-sleep');
  
  // Disable menu bar
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Re-create window on macOS dock click
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
