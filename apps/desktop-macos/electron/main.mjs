import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBookFs } from "./book-fs.mjs";
import {
  browserWindowOptions,
  isDevMode,
  resolveLoadURL,
} from "./load-url.mjs";

const bookFs = createBookFs({
  pickFolderDialog: async (options) => {
    const win =
      BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ["openDirectory", "createDirectory"],
      title: options?.prompt ?? "Select your book folder",
    });
    if (canceled || !filePaths[0]) return null;
    return filePaths[0];
  },
});

function registerBookIpc() {
  ipcMain.handle("inscriva:book:openBook", (_event, bookPath) =>
    bookFs.openBook(bookPath),
  );
  ipcMain.handle("inscriva:book:listFiles", () => bookFs.listFiles());
  ipcMain.handle("inscriva:book:readFile", (_event, rel) =>
    bookFs.readFile(rel),
  );
  ipcMain.handle("inscriva:book:writeFile", (_event, { rel, content }) =>
    bookFs.writeFile(rel, content),
  );
  ipcMain.handle("inscriva:book:renameFile", (_event, { from, to }) =>
    bookFs.renameFile(from, to),
  );
  ipcMain.handle("inscriva:book:deleteFile", (_event, rel) =>
    bookFs.deleteFile(rel),
  );
  ipcMain.handle("inscriva:book:getRecents", () => bookFs.getRecents());
  ipcMain.handle("inscriva:book:addRecent", (_event, bookPath) =>
    bookFs.addRecent(bookPath),
  );
  ipcMain.handle("inscriva:book:getBooksLibraryPath", () =>
    bookFs.getBooksLibraryPath(),
  );
  ipcMain.handle("inscriva:book:pickBookFolder", (_event, options) =>
    bookFs.pickBookFolder(options),
  );
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function webDistDir() {
  return path.resolve(__dirname, "../../../packages/web/dist");
}

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.cjs");
  const win = new BrowserWindow(browserWindowOptions({ preloadPath }));
  const isDev = isDevMode({ isPackaged: app.isPackaged });
  const url = resolveLoadURL({ isDev, webDistDir: webDistDir() });
  win.loadURL(url);
}

app.whenReady().then(() => {
  registerBookIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
