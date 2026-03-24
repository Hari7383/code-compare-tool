const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const fs = require("fs");

let win;

function createWindow() {
    win = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: __dirname + "/preload.js"
        }
    });

    win.loadFile("renderer/index.html");

    // 🔥 CREATE MENU
    const template = [
        {
            label: "File",
            submenu: [
                {
                    label: "Open Left",
                    accelerator: "Ctrl+1",
                    click: () => win.webContents.send("menu-open-left")
                },
                {
                    label: "Open Right",
                    accelerator: "Ctrl+2",
                    click: () => win.webContents.send("menu-open-right")
                },
                { type: "separator" },
                {
                    label: "Save Left",
                    accelerator: "Ctrl+S",
                    click: () => win.webContents.send("menu-save-left")
                },
                {
                    label: "Save Right",
                    accelerator: "Ctrl+Shift+S",
                    click: () => win.webContents.send("menu-save-right")
                },
                { type: "separator" },
                { role: "quit", accelerator: "Ctrl+Q" }
            ]
        },

        {
            label: "Edit",
            submenu: [
                { role: "undo", accelerator: "Ctrl+Z" },
                { role: "redo", accelerator: "Ctrl+Y" },

                { type: "separator" },

                { role: "cut", accelerator: "Ctrl+X" },
                { role: "copy", accelerator: "Ctrl+C" },
                { role: "paste", accelerator: "Ctrl+V" },
                { role: "delete", accelerator: "Delete" },

                { type: "separator" },

                { role: "selectAll", accelerator: "Ctrl+A" },

                { type: "separator" },

                // 🔥 FIND (custom → Monaco)
                {
                    label: "Find",
                    accelerator: "Ctrl+F",
                    click: () => win.webContents.send("menu-find")
                },

                {
                    label: "Replace",
                    accelerator: "Ctrl+H",
                    click: () => win.webContents.send("menu-replace")
                }
            ]
        },
        // ================= VIEW =================
        {
            label: "View",
            submenu: [
                { role: "reload" },
                { role: "forceReload" },
                { role: "toggleDevTools", accelerator: "Ctrl+Shift+I" },
                { type: "separator" },
                { role: "resetZoom" },
                { role: "zoomIn", accelerator: "Ctrl+=" },
                { role: "zoomOut", accelerator: "Ctrl+-" },
                { type: "separator" },
                { role: "togglefullscreen", accelerator: "F11" }
            ]
        },

        // ================= WINDOW =================
        {
            label: "Window",
            submenu: [
                { role: "minimize" },
                { role: "close" }
            ]
        },

        // ================= HELP =================
        {
            label: "Help",
            submenu: [
                {
                    label: "About",
                    click: () => {
                        require("electron").dialog.showMessageBox({
                            type: "info",
                            title: "About",
                            message: "DOTfit Code Compare Tool",
                            detail: "Version 1.0\nBuilt with Electron + Monaco Editor"
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);



// ==========================
// ✅ ADD THIS PART (IMPORTANT)
// ==========================

// 📂 OPEN FILE
ipcMain.handle("open-file", async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openFile"]
    });

    if (result.canceled) return null;

    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, "utf-8");

    return { content };
});


// 💾 SAVE FILE
ipcMain.handle("save-file", async (event, { content, defaultName }) => {
    const result = await dialog.showSaveDialog({
        defaultPath: defaultName
    });

    if (result.canceled) return;

    fs.writeFileSync(result.filePath, content);
});
