const KEY = "notes_v1";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-selection-note",
    title: "Seçimi Notlara Ekle",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "add-selection-note") return;

  const note = {
    id: crypto.randomUUID(),
    text: info.selectionText || "",
    comment: "",
    url: tab?.url || "",
    title: tab?.title || "",
    createdAt: Date.now()
  };

  await addNote(note);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === "ADD_NOTE") {
      await addNote(msg.payload);
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === "GET_NOTES") {
      const notes = await getNotes();
      sendResponse({ ok: true, notes });
      return;
    }

    if (msg?.type === "UPDATE_NOTE") {
      const notes = await getNotes();
      const idx = notes.findIndex(n => n.id === msg.payload.id);
      if (idx >= 0) notes[idx] = { ...notes[idx], ...msg.payload, updatedAt: Date.now() };
      await chrome.storage.local.set({ [KEY]: notes });
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === "DELETE_NOTE") {
      const notes = await getNotes();
      const next = notes.filter(n => n.id !== msg.payload.id);
      await chrome.storage.local.set({ [KEY]: next });
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, message: "Unknown message" });
  })();

  return true; // async response
});

async function getNotes() {
  const data = await chrome.storage.local.get(KEY);
  return Array.isArray(data[KEY]) ? data[KEY] : [];
}

async function addNote(note) {
  const notes = await getNotes();
  notes.unshift(note);
  await chrome.storage.local.set({ [KEY]: notes });
}
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL("notes.html") });
  });
  