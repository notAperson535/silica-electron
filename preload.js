const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    send: (channel, data) => ipcRenderer.invoke(channel, data),
    handle: (channel, callable, event, data) =>
        ipcRenderer.on(channel, callable(event, data)),
});

const {
    injectBrowserAction,
} = require("electron-chrome-extensions/dist/browser-action");

injectBrowserAction();
