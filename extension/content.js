let iconEl = null;
let popupEl = null;

let lastSelectionText = "";
let lastSelectionRect = null;

init();

function init() {
  // seçimi takip et
  document.addEventListener("selectionchange", onSelectionChange);

  // dışarı tık = kapat
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (popupEl && popupEl.style.display === "block" && !popupEl.contains(e.target)) hidePopup();
      if (iconEl && iconEl.style.display === "block" && !iconEl.contains(e.target)) hideIcon();
    },
    true
  );

  // escape = kapat
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hidePopup();
      hideIcon();
    }
  });

  // scroll/resize = konum güncelle
  window.addEventListener("scroll", () => {
    if (iconEl?.style.display === "block") positionIcon();
    if (popupEl?.style.display === "block") positionPopup();
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (iconEl?.style.display === "block") positionIcon();
    if (popupEl?.style.display === "block") positionPopup();
  });
}

function onSelectionChange() {
  const sel = window.getSelection();
  const text = sel?.toString()?.trim() || "";

  // popup açıkken selection ile oynama
  if (popupEl?.style.display === "block") return;

  if (!text || text.length < 2) {
    lastSelectionText = "";
    lastSelectionRect = null;
    hideIcon();
    return;
  }

  // input/textarea içi selection: karışmasın
  const anchorNode = sel?.anchorNode;
  const el = anchorNode?.nodeType === 1 ? anchorNode : anchorNode?.parentElement;
  if (el && (el.closest("input, textarea, [contenteditable='true']"))) {
    hideIcon();
    return;
  }

  // rect al
  try {
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || rect.width < 2 || rect.height < 2) {
      hideIcon();
      return;
    }

    lastSelectionText = text;
    lastSelectionRect = rect;

    showIcon();
  } catch {
    hideIcon();
  }
}

// ---------- ICON ----------
function ensureIcon() {
  if (iconEl) return iconEl;

  iconEl = document.createElement("button");
  iconEl.type = "button";
  iconEl.className = "sn-icon";
  iconEl.title = "Not al";
  const iconUrl = chrome.runtime.getURL("icons/48.png");
  iconEl.innerHTML = `
    <span class="sn-icon-dot"></span>
    <img src="${iconUrl}" alt="Not al" class="sn-icon-img" />
  `;

  

  // ikon tıklanınca popup aç
  iconEl.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  }, true);

  iconEl.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    showPopup();
  });

  document.documentElement.appendChild(iconEl);
  return iconEl;
}

function showIcon() {
  ensureIcon();
  positionIcon();
  iconEl.style.display = "flex";
}

function hideIcon() {
  if (!iconEl) return;
  iconEl.style.display = "none";
}

function positionIcon() {
  if (!iconEl || !lastSelectionRect) return;

  const r = lastSelectionRect;

  const iconW = 34; // icon genişliği
  const centerX = r.left + r.width / 2;

  const top  = window.scrollY + r.top - 38;
  const left = window.scrollX + centerX - iconW / 2;

  iconEl.style.top  = `${Math.max(8, top)}px`;
  iconEl.style.left = `${Math.max(8, left)}px`;
}


// ---------- POPUP ----------
function ensurePopup() {
  if (popupEl) return popupEl;

  popupEl = document.createElement("div");
  popupEl.className = "sn-popup";
  popupEl.innerHTML = `
    <div class="sn-card" role="dialog" aria-label="Not ekle">
      <div class="sn-head">
        <div class="sn-title">Not ekle</div>
        <button class="sn-close" type="button" data-close aria-label="Kapat">×</button>
      </div>

      <div class="sn-selected" data-selected></div>

      <textarea id="textareaNote" name="textareaNote" class="sn-textarea" data-comment rows="1"
        placeholder="Ek not... (isteğe bağlı)"></textarea>

      

      <div class="sn-actions">
        <div class="sn-status" data-status>test ediliyor</div>
        <button class="sn-btn sn-btn-ghost" type="button" data-cancel>İptal</button>
        <button class="sn-btn" type="button" data-save>Kaydet</button>
      </div>
    </div>
  `;

  // popup içi tıklama dışarı gibi algılanmasın
  popupEl.addEventListener("pointerdown", (e) => e.stopPropagation(), true);

  popupEl.querySelector("[data-close]").addEventListener("click", hidePopup);
  popupEl.querySelector("[data-cancel]").addEventListener("click", hidePopup);

  popupEl.querySelector("[data-save]").addEventListener("click", saveNote);

  document.documentElement.appendChild(popupEl);
  return popupEl;
}

function showPopup() {
  if (!lastSelectionText || !lastSelectionRect) return;

  ensurePopup();

  popupEl.querySelector("[data-selected]").textContent = lastSelectionText;
  popupEl.querySelector("[data-comment]").value = "";
  setStatus("");

  positionPopup();
  popupEl.style.display = "block";

  // ikon kalsın ama istersen kapatabilirsin:
  // hideIcon();

  // focus
  setTimeout(() => popupEl.querySelector("[data-comment]")?.focus(), 0);

  // selection temizle (popup yazarken bozulmasın)
  setTimeout(() => {
    try { window.getSelection()?.removeAllRanges(); } catch {}
  }, 0);
}

function hidePopup() {
  if (!popupEl) return;
  popupEl.style.display = "none";
  setStatus("");
}

function positionPopup() {
  if (!popupEl || !iconEl) return;

  const popupW = 340;

  // ✅ ikonun pozisyonu
  const iconRect = iconEl.getBoundingClientRect();
  const centerX = iconRect.left + iconRect.width / 2;

  const top  = window.scrollY + iconRect.bottom + 8;
  const left = window.scrollX + centerX - popupW / 2;

  popupEl.style.top  = `${top}px`;
  popupEl.style.left = `${Math.max(8, left)}px`;
}


function setStatus(msg) {
  if (!popupEl) return;
  const el = popupEl.querySelector("[data-status]");
  if (el) el.textContent = msg || "";
}

async function saveNote() {
  const selected = (lastSelectionText || "").trim();
  const comment = (popupEl.querySelector("[data-comment]")?.value || "").trim();

  if (!selected) {
    setStatus("Seçili metin yok.");
    return;
  }

  if (!chrome?.runtime?.id) {
    setStatus("Uzantı yenilendi. Sayfayı yenileyin (F5).");
    return;
  }

  const payload = {
    id: crypto.randomUUID(),
    text: selected,
    comment,
    url: location.href,
    title: document.title,
    createdAt: Date.now()
  };

  setStatus("Kaydediliyor...");

  try {
    const res = await chrome.runtime.sendMessage({ type: "ADD_NOTE", payload });
    if (!res?.ok) throw new Error(res?.message || "Kaydedilemedi");
    setStatus("Kaydedildi ✅");

    // kapat
    setTimeout(() => {
      hidePopup();
      hideIcon();
      lastSelectionText = "";
      lastSelectionRect = null;
    }, 450);
  } catch (err) {
    console.error(err);
    setStatus("Hata: Kaydedilemedi ❌");
  }
}
