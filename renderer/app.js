require.config({
    paths: { vs: "https://unpkg.com/monaco-editor@0.44.0/min/vs" }
});

let editor1, editor2;
let decorations1 = [];
let decorations2 = [];
let isSyncing = false;
let diffTimeout;
let noteEditor;

require(["vs/editor/editor.main"], function () {

    // ==========================
    // 🔥 EDITORS
    // ==========================

    editor1 = monaco.editor.create(document.getElementById("editor1"), {
        value: `def add(a, b):
    return a + b`,
        language: "python",
        theme: "vs-dark",
        automaticLayout: true
    });

    editor2 = monaco.editor.create(document.getElementById("editor2"), {
        value: `def add(a, b):
    return a - b`,
        language: "python",
        theme: "vs-dark",
        automaticLayout: true
    });

    // ==========================
    // 🔥 LANGUAGE SWITCH
    // ==========================

    const langSelect = document.getElementById("languageSelect");

    langSelect.addEventListener("change", () => {
        const lang = langSelect.value;

        monaco.editor.setModelLanguage(editor1.getModel(), lang);
        monaco.editor.setModelLanguage(editor2.getModel(), lang);
    });

    // ==========================
    // 🔥 SCROLL SYNC
    // ==========================

    editor1.onDidScrollChange(() => {
        if (isSyncing) return;
        isSyncing = true;

        editor2.setScrollTop(editor1.getScrollTop());
        editor2.setScrollLeft(editor1.getScrollLeft());

        isSyncing = false;
    });

    editor2.onDidScrollChange(() => {
        if (isSyncing) return;
        isSyncing = true;

        editor1.setScrollTop(editor2.getScrollTop());
        editor1.setScrollLeft(editor2.getScrollLeft());

        isSyncing = false;
    });

    noteEditor = monaco.editor.create(
        document.getElementById("noteEditorContainer"),
        {
            value: "",
            language: "plaintext",
            theme: "vs-dark",
            automaticLayout: true
        }
    );

    // ==========================
    // 🔥 DIFF TRIGGER
    // ==========================

    function triggerDiff() {
        clearTimeout(diffTimeout);
        diffTimeout = setTimeout(() => {
            highlightChanges(editor1.getValue(), editor2.getValue());
        }, 150);
    }

    editor1.onDidChangeModelContent(triggerDiff);
    editor2.onDidChangeModelContent(triggerDiff);

    highlightChanges(editor1.getValue(), editor2.getValue());

    // ✅ CREATE FIRST NOTE
    addNoteTab();
});


// ==========================
// 🔥 DIFF ENGINE
// ==========================

function highlightChanges(code1, code2) {
    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(code1, code2);
    dmp.diff_cleanupSemantic(diffs);

    let pos1 = 0;
    let pos2 = 0;

    let newDecorations1 = [];
    let newDecorations2 = [];

    function getLineCol(text, index) {
        const lines = text.substring(0, index).split("\n");
        return {
            line: lines.length,
            col: lines[lines.length - 1].length + 1
        };
    }

    diffs.forEach(([type, text]) => {
        const length = text.length;

        if (type === -1) {
            const start = getLineCol(code1, pos1);
            const end = getLineCol(code1, pos1 + length);

            newDecorations1.push({
                range: new monaco.Range(start.line, start.col, end.line, end.col),
                options: {
                    inlineClassName: "removedText",
                    overviewRuler: {
                        color: "rgba(255,0,0,0.8)",
                        position: monaco.editor.OverviewRulerLane.Right
                    }
                }
            });

            pos1 += length;
        }

        else if (type === 1) {
            const start = getLineCol(code2, pos2);
            const end = getLineCol(code2, pos2 + length);

            newDecorations2.push({
                range: new monaco.Range(start.line, start.col, end.line, end.col),
                options: {
                    inlineClassName: "addedText",
                    overviewRuler: {
                        color: "rgba(0,255,0,0.8)",
                        position: monaco.editor.OverviewRulerLane.Right
                    }
                }
            });

            pos2 += length;
        }

        else {
            pos1 += length;
            pos2 += length;
        }
    });

    decorations1 = editor1.deltaDecorations(decorations1, newDecorations1);
    decorations2 = editor2.deltaDecorations(decorations2, newDecorations2);
}


// ==========================
// 🔥 FILE FUNCTIONS
// ==========================

function getExtension() {
    const lang = document.getElementById("languageSelect").value;

    const map = {
        python: ".py",
        javascript: ".js",
        html: ".html",
        java: ".java",
        cpp: ".cpp",
        php: ".php",
        notepad: ".txt"
    };

    return map[lang] || ".txt";
}

async function openLeft() {
    const file = await window.api.openFile();
    if (file) editor1.setValue(file.content);
}

async function openRight() {
    const file = await window.api.openFile();
    if (file) editor2.setValue(file.content);
}

async function saveLeft() {
    const content = editor1.getValue();
    const ext = getExtension();

    await window.api.saveFile({
        content,
        defaultName: "left_code" + ext
    });
}

async function saveRight() {
    const content = editor2.getValue();
    const ext = getExtension();

    await window.api.saveFile({
        content,
        defaultName: "right_code" + ext
    });
}


// ==========================
// 🔥 NOTES SYSTEM (VS CODE STYLE)
// ==========================

let notes = [];
let currentNoteIndex = -1;
let noteCounter = 1;

function getNextNoteNumber() {
    const used = notes.map(n => {
        const match = n.name.match(/untitled-(\d+)/);
        return match ? parseInt(match[1]) : null;
    }).filter(n => n !== null);

    let i = 1;
    while (used.includes(i)) i++;
    return i;
}

// ➕ ADD TAB
function addNoteTab() {
    const num = getNextNoteNumber();
    const name = `untitled-${num}`;

    notes.push({
        name: name,
        model: monaco.editor.createModel("", "plaintext")
    });

    currentNoteIndex = notes.length - 1;

    renderTabs();
    loadCurrentNote();
}


// ❌ CLOSE TAB
function closeTab(index, e) {
    e.stopPropagation();

    notes.splice(index, 1);

    if (notes.length === 0) {
        currentNoteIndex = -1;
    } else if (currentNoteIndex >= notes.length) {
        currentNoteIndex = notes.length - 1;
    }

    renderTabs();
    loadCurrentNote();
}


// 🔄 RENDER TABS
function renderTabs() {
    const container = document.getElementById("noteTabs");
    container.innerHTML = "";

    notes.forEach((note, index) => {

        const tab = document.createElement("div");
        tab.className = "tab";
        if (index === currentNoteIndex) tab.classList.add("active");

        // ===== NAME =====
        const nameSpan = document.createElement("span");
        nameSpan.innerText = note.name;
        nameSpan.className = "tab-name";

        // 🔥 DOUBLE CLICK ONLY ON NAME (no conflict)
        nameSpan.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            startRename(index, nameSpan);
        });

        // 🔥 prevent click bubbling during rename
        nameSpan.addEventListener("mousedown", (e) => {
            e.stopPropagation();
        });

        // ===== CLOSE BUTTON =====
        const closeBtn = document.createElement("span");
        closeBtn.innerText = "✕";
        closeBtn.className = "tab-close";
        closeBtn.onclick = (e) => closeTab(index, e);

        // ===== TAB CLICK (INSTANT SWITCH) =====
        tab.onclick = () => {
            if (currentNoteIndex === index) return;

            currentNoteIndex = index;
            loadCurrentNote();

            // 🔥 ONLY update active class (no re-render)
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
        };

        tab.appendChild(nameSpan);
        tab.appendChild(closeBtn);
        container.appendChild(tab);
    });

    // ===== ADD BUTTON =====
    const addBtn = document.createElement("div");
    addBtn.id = "addTab";
    addBtn.innerText = "+";
    addBtn.onclick = addNoteTab;

    container.appendChild(addBtn);
}


// ✏️ RENAME
function startRename(index, nameSpan) {
    const oldName = notes[index].name;

    // create input
    const input = document.createElement("input");
    input.value = oldName;

    // 🔥 copy styles from span → seamless merge
    input.style.background = "transparent";
    input.style.border = "none";
    input.style.outline = "none";
    input.style.color = "#fff";
    input.style.fontSize = "inherit";
    input.style.fontFamily = "inherit";
    input.style.width = (oldName.length + 2) + "ch";

    // 🔥 replace ONLY text visually (no layout break)
    nameSpan.innerText = "";
    nameSpan.appendChild(input);

    input.focus();
    input.select();

    function save() {
        const newName = input.value.trim() || oldName;
        notes[index].name = newName;

        // 🔥 DO NOT call renderTabs immediately
        setTimeout(() => renderTabs(), 0);
    }

    function cancel() {
        renderTabs();
    }

    input.addEventListener("blur", save);

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") cancel();
    });

    // 🔥 auto-resize while typing (VS Code feel)
    input.addEventListener("input", () => {
        input.style.width = (input.value.length + 2) + "ch";
    });
}


function loadCurrentNote() {
    updateNotesUI();

    if (currentNoteIndex === -1 || notes.length === 0) return;

    noteEditor.setModel(notes[currentNoteIndex].model);
    noteEditor.layout();
    noteEditor.focus();
}

// function closeTab(index, e) {
//     e.stopPropagation();

//     notes.splice(index, 1);

//     if (notes.length === 0) {
//         currentNoteIndex = -1;
//     } else if (currentNoteIndex >= notes.length) {
//         currentNoteIndex = notes.length - 1;
//     }

//     renderTabs();
//     loadCurrentNote();
// }


// 💾 SAVE CURRENT NOTE
async function saveCurrentNote() {
    // saveCurrentNoteState();

    if (currentNoteIndex === -1) return;

    const note = notes[currentNoteIndex];

    await window.api.saveFile({
        // content: note.content,
        content: note.model.getValue(),
        defaultName: note.name + ".txt"
    });
}


// 💾 SAVE ALL NOTES
async function saveAllNotes() {
    let allText = notes.map(note => {
        return `--- ${note.name} ---\n${note.model.getValue().trim()}`;
    }).join("\n\n");

    await window.api.saveFile({
        content: allText,
        defaultName: "all_notes.txt"
    });
}
// ==========================
// 🔥 MENU FIND / REPLACE
// ==========================

window.api.onMenuFind(() => {
    if (editor1) {
        editor1.focus();
        editor1.getAction("actions.find").run();
    }
});

window.api.onMenuReplace(() => {
    if (editor1) {
        editor1.focus();
        editor1.getAction("editor.action.startFindReplaceAction").run();
    }
});

function updateNotesUI() {
    const hasNotes = notes.length > 0;

    document.getElementById("notesTitle").style.display = hasNotes ? "block" : "none";
    document.getElementById("noteTabs").style.display = hasNotes ? "flex" : "none";
    document.getElementById("noteActions").style.display = hasNotes ? "flex" : "none";

    document.getElementById("noteEditorContainer").style.display = hasNotes ? "block" : "none";
    document.getElementById("emptyState").style.display = hasNotes ? "none" : "flex";
}
