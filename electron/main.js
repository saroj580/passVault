// Electron "main process" (Node.js, no UI). It:
//   1. makes sure port 5055 is free
//   2. starts the backend (python run.py in development, backend.exe when packaged)
//   3. waits until http://127.0.0.1:5055/health answers
//   4. opens a window on http://127.0.0.1:5055/ (FastAPI serves the React build)
//   5. kills the backend when the app quits
const { app, BrowserWindow, Menu, dialog, shell } = require('electron')
const { spawn, execFileSync } = require('node:child_process')
const fs = require('node:fs')
const net = require('node:net')
const path = require('node:path')

const HOST = '127.0.0.1'
const PORT = 5055
const APP_URL = `http://${HOST}:${PORT}/`
const STARTUP_TIMEOUT_MS = 30 * 1000

let backend = null // the running backend child process (null = not running)
let mainWindow = null
let quitting = false // true once the app is closing on purpose
let startError = null // why the backend could not be started, if it failed

// ---------- where things are ----------

// app.isPackaged is false with "npm start", true in the packaged app (Step 8)
function backendCommand() {
  if (app.isPackaged) {
    // process.resourcesPath = the "resources" folder next to PassVault.exe
    const dir = path.join(process.resourcesPath, 'backend')
    return { file: path.join(dir, 'backend.exe'), args: [], cwd: dir }
  }
  const dir = path.join(__dirname, '..', 'backend')
  // Using the venv's python.exe directly: no need to "activate" the venv
  return { file: path.join(dir, '.venv', 'Scripts', 'python.exe'), args: ['run.py'], cwd: dir }
}

function checkFilesExist(command) {
  if (!fs.existsSync(command.file)) {
    throw new Error(`Backend not found:\n${command.file}`)
  }
  if (!app.isPackaged) {
    const indexHtml = path.join(__dirname, '..', 'frontend', 'dist', 'index.html')
    if (!fs.existsSync(indexHtml)) {
      throw new Error('The React build is missing.\nRun "npm run build" in the frontend folder first.')
    }
  }
}

// ---------- backend process ----------

// Try to listen on the port ourselves: if that fails, something else has it
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, HOST)
  })
}

function startBackend(command) {
  backend = spawn(command.file, command.args, {
    cwd: command.cwd,
    windowsHide: true, // no black console window
    // Development: show the backend's log in the same terminal as "npm start"
    stdio: app.isPackaged ? 'ignore' : 'inherit',
    env: { ...process.env, PYTHONUNBUFFERED: '1' }, // print logs immediately
  })
  backend.once('error', (err) => {
    // e.g. the file cannot be run; waitForBackend reports it
    startError = `Could not start the backend:\n${err.message}`
    backend = null
  })
  backend.once('exit', (code) => {
    backend = null
    // Stopping on its own after the window opened (not because we are
    // quitting) means it crashed. During startup, waitForBackend reports it.
    if (!quitting && mainWindow) fail(`The backend stopped unexpectedly (exit code ${code}).`)
  })
}

async function waitForBackend() {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (!backend) throw new Error(startError ?? 'The backend stopped while starting.')
    try {
      const res = await fetch(`${APP_URL}health`)
      if (res.ok) return
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('The backend did not start within 30 seconds.')
}

function stopBackend() {
  if (!backend) return
  const pid = backend.pid
  backend = null
  try {
    // /T = also kill its child processes, /F = force. A plain backend.kill()
    // could leave the second process of a PyInstaller --onefile exe running.
    execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
  } catch {
    // already gone
  }
}

// ---------- window ----------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    minWidth: 480,
    minHeight: 600,
    title: 'PassVault',
    autoHideMenuBar: true, // menu bar hidden; Alt shows it (development only)
    show: false, // show once the page has painted, so no white flash
    webPreferences: {
      // The page is a locked-down browser tab: no Node.js, no file access
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
    },
  })
  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // target="_blank" links (a vault item's URL): open in the real browser,
  // never in a new app window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  // The app window itself may never leave our own backend
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_URL)) event.preventDefault()
  })

  void mainWindow.loadURL(APP_URL)
}

// ---------- app lifecycle ----------

function fail(message) {
  dialog.showErrorBox('PassVault', message)
  app.quit()
}

async function start() {
  try {
    // Packaged: no menu at all (no Reload, which would log you out, no DevTools).
    // Copy/paste shortcuts in text boxes still work on Windows without a menu.
    if (app.isPackaged) Menu.setApplicationMenu(null)

    if (!(await isPortFree(PORT))) {
      throw new Error(
        `Port ${PORT} is already in use.\n\n` +
          'Another PassVault or an old backend is probably still running.\n' +
          'Close it, or run in PowerShell:  taskkill /IM backend.exe /F',
      )
    }
    const command = backendCommand()
    checkFilesExist(command)
    startBackend(command)
    await waitForBackend()
    createWindow()
  } catch (err) {
    fail(err.message)
  }
}

// Only one PassVault at a time: a second launch just focuses the first window
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
  app.whenReady().then(start)
}

// Closing the window quits the whole app...
app.on('window-all-closed', () => app.quit())
// ...and quitting always stops the backend
app.on('before-quit', () => {
  quitting = true
})
app.on('will-quit', stopBackend)
