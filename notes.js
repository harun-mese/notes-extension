const listEl = document.getElementById("list");
const qEl = document.getElementById("q");

let notes = [];

init();

async function init() {
  const res = await chrome.runtime.sendMessage({ type: "GET_NOTES" });
  notes = Array.isArray(res?.notes) ? res.notes : [];
  render();
  qEl?.addEventListener("input", render);
}

function render() {
  const q = (qEl?.value || "").trim().toLowerCase();

  const filtered = !q ? notes : notes.filter(n => {
    // ✅ storage alanları: text + comment
    const hay = `${n.text || ""}\n${n.comment || ""}\n${n.url || ""}\n${n.title || ""}`.toLowerCase();
    return hay.includes(q);
  });

  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty">Henüz not yok. Bir sayfada metin seçip “Kaydet” deyince burada görünecek.</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(itemHtml).join("");
  bindItemEvents();
}

function itemHtml(n) {
  const date = new Date(n.createdAt || Date.now()).toLocaleString();

  const safeUrl     = escapeHtml(n.url || "");
  const safeTitle   = escapeHtml(n.title || "Sayfa");
  const safeText    = escapeHtml(n.text || "");
  const safeComment = escapeHtml(n.comment || "");

  return `
    <div class="item" data-id="${escapeHtml(n.id)}">
      <div class="meta">
        <span>${escapeHtml(date)}</span>
        <span>•</span>
        <a href="${safeUrl}" target="_blank" rel="noreferrer">${safeTitle}</a>
      </div>

      <div class="quote">${safeText}</div>

      <textarea class="note" placeholder="Not..." data-comment>${safeComment}</textarea>

      <div class="actions">
        <button class="btn" data-del>Sil</button>
        <button class="btn btn-primary" data-save>Kaydet</button>
      </div>
    </div>
  `;
}

function bindItemEvents() {
  document.querySelectorAll(".item").forEach(item => {
    const id = item.getAttribute("data-id");
    const ta = item.querySelector("[data-comment]");

    item.querySelector("[data-del]").onclick = async () => {
      await chrome.runtime.sendMessage({ type: "DELETE_NOTE", payload: { id } });
      notes = notes.filter(n => n.id !== id);
      render();
    };

    item.querySelector("[data-save]").onclick = async () => {
      const comment = (ta?.value || "").trim();

      await chrome.runtime.sendMessage({
        type: "UPDATE_NOTE",
        payload: { id, comment }
      });

      const idx = notes.findIndex(n => n.id === id);
      if (idx >= 0) notes[idx].comment = comment; // ✅ doğru alan
    };
  });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
