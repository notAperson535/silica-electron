const { app, BrowserView, BrowserWindow, Menu, ipcMain } = require("electron");
const fs = require("fs").promises;
const path = require("node:path");
const { MicaBrowserWindow } = require("mica-electron");

const createWindow = () => {
    let mainWindow = new MicaBrowserWindow({
        titleBarStyle: "hidden",
        // titleBarOverlay: true,
        transparent: true,
        frame: false,
        width: 1000,
        height: 700,
        icon: __dirname + "/assets/logo.png",
        show: false,
        webPreferences: {
            webviewTag: true,
            preload: path.join(__dirname, "preload.js"),
            sandbox: false,
        },
    });

    mainWindow.setBackgroundMaterial("acrylic");

    if (process.platform === "darwin") {
        app.dock.setIcon(path.join(__dirname, "/assets/logo.png"));
    }

    mainWindow.webContents.on("dom-ready", () => {
        mainWindow.show();
        if (process.platform === "darwin") {
            mainWindow.webContents.send("isMacOS");
        }
    });

    mainWindow.webContents.on("did-attach-webview", (_, contents) => {
        contents.setWindowOpenHandler((details) => {
            mainWindow.webContents.send("newTab", details.url);
            return { action: "deny" };
        });
    });

    void mainWindow.loadFile("index.html");

    const menuTemplate = [
        {
            label: app.name,
            submenu: [
                {
                    accelerator: "CmdOrCtrl+Q",
                    click: () => {
                        app.quit();
                    },
                    role: "quit",
                },
                {
                    accelerator: "CmdOrCtrl+T",
                    click: () => {
                        mainWindow.webContents.send("newTab");
                    },
                    role: "newTab",
                },
                {
                    accelerator: "CmdOrCtrl+Shift+I",
                    click: () => {
                        mainWindow.webContents.openDevTools();
                    },
                    role: "openDevTools",
                },
                {
                    accelerator: "CmdOrCtrl+Shift+R",
                    click: () => {
                        mainWindow.webContents.reload();
                    },
                    role: "reloadElectron",
                },
                {
                    accelerator: "CmdOrCtrl+R",
                    click: () => {
                        mainWindow.webContents.send("reload");
                    },
                    role: "reloadPage",
                },
                {
                    accelerator: "CmdOrCtrl+W",
                    click: () => {
                        mainWindow.webContents.send("closeCurrentTab");
                    },
                    role: "closeCurrentTab",
                },
                {
                    accelerator: "CmdOrCtrl+L",
                    click: () => {
                        mainWindow.webContents.send("selectUrlBar");
                    },
                    role: "selectUrlBar",
                },
                {
                    accelerator: "Ctrl+Tab",
                    click: () => {
                        mainWindow.webContents.send("nextTab");
                    },
                    role: "nextTab",
                },
                {
                    accelerator: "Ctrl+Shift+Tab",
                    click: () => {
                        mainWindow.webContents.send("previousTab");
                    },
                    role: "previousTab",
                },
                {
                    accelerator: "CmdOrCtrl+Shift+T",
                    click: () => {
                        mainWindow.webContents.send("openRecentlyClosed");
                    },
                    role: "openRecentlyClosed",
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    async function readFile(filePath) {
        try {
            return await fs.readFile(filePath, "utf8");
        } catch (err) {
            console.error("Error reading file: ", err);
            return "";
        }
    }

    async function writeFile(filePath, fileContents) {
        if (filePath !== undefined) {
            await fs.writeFile(filePath, fileContents);
        }
    }

    const userDataPath = app.getPath("userData");

    ipcMain.handle("closeWindow", async () => {
        mainWindow.close();
    });

    ipcMain.handle("writeFile", async (event, args) => {
        await writeFile(
            userDataPath + "/" + args[1] + ".json",
            JSON.stringify(args[0])
        );
    });

    ipcMain.handle("readFile", async (event, args) => {
        let savedRecommendations = await readFile(
            userDataPath + "/" + args + ".json"
        );
        if (savedRecommendations !== "") {
            savedRecommendations = JSON.parse(savedRecommendations);
        } else {
            savedRecommendations = "";
        }
        return savedRecommendations;
    });
};

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    app.quit();
});

try {
    require("electron-reloader")(module);
} catch {}
