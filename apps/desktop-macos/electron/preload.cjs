"use strict";

const { contextBridge, ipcRenderer } = require("electron");

const book = {
  openBook: (path) => ipcRenderer.invoke("inscriva:book:openBook", path),
  listFiles: () => ipcRenderer.invoke("inscriva:book:listFiles"),
  readFile: (rel) => ipcRenderer.invoke("inscriva:book:readFile", rel),
  writeFile: (rel, content) =>
    ipcRenderer.invoke("inscriva:book:writeFile", { rel, content }),
  renameFile: (from, to) =>
    ipcRenderer.invoke("inscriva:book:renameFile", { from, to }),
  deleteFile: (rel) => ipcRenderer.invoke("inscriva:book:deleteFile", rel),
  getRecents: () => ipcRenderer.invoke("inscriva:book:getRecents"),
  addRecent: (path) => ipcRenderer.invoke("inscriva:book:addRecent", path),
  getBooksLibraryPath: () =>
    ipcRenderer.invoke("inscriva:book:getBooksLibraryPath"),
  pickBookFolder: (options) =>
    ipcRenderer.invoke("inscriva:book:pickBookFolder", options),
};

contextBridge.exposeInMainWorld("inscrivaElectron", {
  platform: "electron",
  book,
});
