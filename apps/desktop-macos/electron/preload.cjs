"use strict";

const { contextBridge, ipcRenderer } = require("electron");

const { START, CANCEL, CHUNK, ERROR, DONE } = {
  START: "inscriva:llm:start",
  CANCEL: "inscriva:llm:cancel",
  CHUNK: "inscriva:llm:chunk",
  ERROR: "inscriva:llm:error",
  DONE: "inscriva:llm:done",
};

const keys = {
  setApiKey: (provider, key) =>
    ipcRenderer.invoke("inscriva:keys:set", { provider, key }),
  clearApiKey: (provider) =>
    ipcRenderer.invoke("inscriva:keys:clear", provider),
  listProviders: () => ipcRenderer.invoke("inscriva:keys:list"),
};

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

const llm = {
  /**
   * @param {import("@inscriva/bridge").LlmRequest} request
   * @param {string} requestId
   */
  startStream: (request, requestId) =>
    ipcRenderer.invoke(START, { request, requestId }),
  cancelStream: (requestId) => ipcRenderer.invoke(CANCEL, requestId),
  onChunk: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on(CHUNK, listener);
    return () => ipcRenderer.removeListener(CHUNK, listener);
  },
  onError: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on(ERROR, listener);
    return () => ipcRenderer.removeListener(ERROR, listener);
  },
  onDone: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on(DONE, listener);
    return () => ipcRenderer.removeListener(DONE, listener);
  },
};

contextBridge.exposeInMainWorld("inscrivaElectron", {
  platform: "electron",
  book,
  keys,
  llm,
});