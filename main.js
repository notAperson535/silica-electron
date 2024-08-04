const { app, BrowserWindow, Menu, ipcMain, webContents } = require("electron");
const fs = require("fs").promises;
const path = require("node:path");
const { MicaBrowserWindow, IS_WINDOWS_11 } = require("mica-electron");
const { ElectronBlocker } = require("@cliqz/adblocker-electron");
const { ElectronChromeExtensions } = require("electron-chrome-extensions");
const { buildChromeContextMenu } = require("electron-chrome-context-menu");
const crx = require("crx-util");

async function createWindow() {
    await app.whenReady();

    let mainWindow = new BrowserWindow({
        titleBarStyle: "hidden",
        titleBarOverlay: true,
        backgroundMaterial: "acrylic",
        vibrancy: "window",
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

    // if (IS_WINDOWS_11) {
    //     mainWindow.setMicaAcrylicEffect();
    // } else {
    //     mainWindow.setAcrylic();
    // }

    const extensions = new ElectronChromeExtensions({
        session: mainWindow.webContents.session,
        async createTab(details) {
            mainWindow.webContents.send("newTab", details.url);
        },
        selectTab(tab, browserWindow) {
            // Optionally implemented for chrome.tabs.update support
        },
        removeTab(tab, browserWindow) {
            // Optionally implemented for chrome.tabs.remove support
        },
        createWindow(details) {
            // Optionally implemented for chrome.windows.create support
        },
    });

    ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
        blocker.enableBlockingInSession(mainWindow.webContents.session);
    });

    const manifestExists = async (dirPath) => {
        if (!dirPath) return false;
        const manifestPath = path.join(dirPath, "manifest.json");
        try {
            return (await fs.stat(manifestPath)).isFile();
        } catch {
            return false;
        }
    };

    async function loadExtensions(session, extensionsPath) {
        const subDirectories = await fs.readdir(extensionsPath, {
            withFileTypes: true,
        });

        const extensionDirectories = await Promise.all(
            subDirectories
                .filter((dirEnt) => dirEnt.isDirectory())
                .map(async (dirEnt) => {
                    const extPath = path.join(extensionsPath, dirEnt.name);

                    if (await manifestExists(extPath)) {
                        return extPath;
                    }

                    const extSubDirs = await fs.readdir(extPath, {
                        withFileTypes: true,
                    });

                    const versionDirPath =
                        extSubDirs.length === 1 && extSubDirs[0].isDirectory()
                            ? path.join(extPath, extSubDirs[0].name)
                            : null;

                    if (await manifestExists(versionDirPath)) {
                        return versionDirPath;
                    }
                })
        );

        const results = [];

        for (const extPath of extensionDirectories.filter(Boolean)) {
            console.log(`Loading extension from ${extPath}`);
            try {
                await session.loadExtension(extPath);
                // results.push(extensionInfo);
            } catch (e) {
                console.error(e);
            }
        }

        return results;
    }

    await loadExtensions(
        mainWindow.webContents.session,
        path.join(__dirname, "./extensions")
    );

    ipcMain.handle("newTab", async (args, webContentsId) => {
        let contents = await webContents.fromId(webContentsId);

        const type = contents.getType();
        const url = contents.getURL();
        console.log(`'web-contents-created' event [type:${type}, url:${url}]`);

        if (
            process.env.SHELL_DEBUG &&
            ["backgroundPage", "remote"].includes(contents.getType())
        ) {
            contents.openDevTools({ mode: "detach", activate: true });
        }

        contents.on("context-menu", (event, params) => {
            console.log(params);
            const menu = buildChromeContextMenu({
                params,
                contents,
                extensionMenuItems: extensions.getContextMenuItems(
                    contents,
                    params
                ),
                openLink: (url) => {
                    mainWindow.webContents.send("newTab", url);
                },
            });

            menu.popup();
        });

        extensions.addTab(contents, mainWindow);
        extensions.selectTab(contents);
    });

    ipcMain.handle("newSelectedTab", (args, webContentsId) => {
        let contents = webContents.fromId(webContentsId);
        extensions.selectTab(contents);
    });

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
                {
                    accelerator: "CmdOrCtrl+=",
                    click: () => {
                        mainWindow.webContents.send("zoomIn");
                    },
                    role: "zoomIn",
                },
                {
                    accelerator: "CmdOrCtrl+-",
                    click: () => {
                        mainWindow.webContents.send("zoomOut");
                    },
                    role: "zoomOut",
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

    ipcMain.handle("closeWindow", async () => {
        mainWindow.close();
    });

    const userDataPath = app.getPath("userData");

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

    ipcMain.handle("downloadExtension", async (event, args) => {
        try {
            const dir = `${userDataPath}/extensions/${args}`;
            const crxFilePath = `${dir}.crx`;
            await crx.downloadById(`${args}`, "chrome", crxFilePath);
            try {
                await fs.access(dir);
                await fs.rm(dir, { recursive: true, force: true });
            } catch (err) {}
            crx.parser.extract(crxFilePath, dir);
            await fs.rm(crxFilePath, { force: true });
            mainWindow.webContents.send("newPopup", "restartBrowser");
        } catch (err) {
            console.log(err);
        }
    });
}

app.whenReady().then(async () => {
    await createWindow();

    app.on("activate", async () => {
        if (BrowserWindow.getAllWindows().length === 0) await createWindow();
    });
});

app.on("window-all-closed", () => {
    app.quit();
});

// if (process.env.NODE_ENV !== "production") {
//     try {
//         require("electron-reloader")(module);
//     } catch {}
// }
