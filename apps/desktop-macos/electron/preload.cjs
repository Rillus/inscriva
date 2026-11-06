"use strict";

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("inscrivaBridge", {
  platform: "electron",
});
