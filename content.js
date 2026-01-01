let popupEl = null;
let isOpen = false;
let lastSelectedText = "";

document.addEventListener("mouseup", (e) => {
  // Popup açıksa yeni selection ile uğraşma
  if (isOpen) return;

  // Popup üzerine mouseup gelirse (kopyala/yapıştır gibi) ignore
  if (popupEl && popupEl.contains(e.target)) return;

  const sel = window.getSelection();
  const text = sel?.toString()?.trim() || "";
  if (!text || text.length < 2) return;

  // Selection rect
  let rect;
  try {
    const range = sel.getRangeAt(0);
    rect = range.getBoundingClientRect();
  } catch {
    return;
  }

  lastSelectedText = text;
  showPopup(rect, text);

  // Popup açıldıktan sonra selection’ı temizle (tıklayınca bozulmasın)
  // ama popup hide etmesin diye isOpen zaten true
  setTimeout(() => {
    try { window.getSelection()?.removeAllRanges(); } catch {}
  }, 0);
});

document.addEventListener(
  "pointerdown",
  (e) => {
    // Popup yoksa bir şey yapma
    if (!popupEl) return;

    // Popup içi tıklama -> kapatma
    if (popupEl.contains(e.target)) return;

    // Dışarı tıklama -> kapat
    hidePopup();
  },
  true // capture: daha stabil
);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isOpen) hidePopup();
});

function showPopup(rect, selectedText) {
  if (!popupEl) popupEl = createPopup();

  isOpen = true;

  popupEl.querySelector("[data-selected]").textContent = selectedText;
  popupEl.querySelector("[data-comment]").value = "";
  setStatus("");

  // Konum: selection üstüne
  const top = window.scrollY + rect.top - 10;
  const left = window.scrollX + rect.left;

  popupEl.style.top = `${top}px`;
  popupEl.style.left = `${left}px`;
  popupEl.style.display = "block";

  // Focus textarea
  setTimeout(() => {
    popupEl.querySelector("[data-comment]")?.focus();
  }, 0);
}

function hidePopup() {
  if (!popupEl) return;
  popupEl.style.display = "none";
  isOpen = false;
  lastSelectedText = "";
  setStatus("");
}

function setStatus(msg) {
  if (!popupEl) return;
  const el = popupEl.querySelector("[data-status]");
  if (el) el.textContent = msg || "";
}

function createPopup() {
  const el = document.createElement("div");
  el.className = "sn-popup";

  el.innerHTML = `
    <div class="sn-card" role="dialog" aria-label="Selection note">
      <div class="sn-selected" data-selected></div>

      <textarea class="sn-textarea" data-comment rows="3"
        placeholder="Ek not... (isteğe bağlı)"></textarea>

      <div class="sn-status" data-status></div>

      <div class="sn-actions">
        <button class="sn-btn sn-btn-ghost" data-cancel>İptal</button>
        <button class="sn-btn" data-save>Kaydet</button>
      </div>
    </div>
  `;

  // Popup içindeki pointerdown olayları dışarı tıklama gibi algılanmasın
  el.addEventListener("pointerdown", (e) => e.stopPropagation(), true);

  document.documentElement.appendChild(el);

  el.querySelector("[data-cancel]").addEventListener("click", hidePopup);

  el.querySelector("[data-save]").addEventListener("click", async () => {
    const selected = (lastSelectedText || el.querySelector("[data-selected]").textContent || "").trim();
    const comment = (el.querySelector("[data-comment]").value || "").trim();
  
    if (!selected) {
      setStatus("Seçili metin bulunamadı.");
      return;
    }
  
    // ✅ uzantı reload edildi mi kontrol
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
      setTimeout(hidePopup, 500);
    } catch (err) {
      // ✅ context invalidated dahil hepsini yakalar
      console.error(err);
      setStatus("Uzantı yeniden yüklendi. Sayfayı yenileyip tekrar deneyin.");
    }
  });
  

  return el;
}
