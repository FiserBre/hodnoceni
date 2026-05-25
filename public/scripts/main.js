const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/place/HiddenStory/@50.0776011,14.4322611,17.87z/data=!4m8!3m7!1s0x470b9588dd71f5c1:0x10ef13a0c6bdd331!8m2!3d50.0777501!4d14.4332348!9m1!1b1!16s%2Fg%2F11xzq89rvb?entry=ttu&g_ep=EgoyMDI2MDQyMi4wIKXMDSoASAFQAw%3D%3D";

let SVG_GOOGLE_MAPS = null;

async function loadIcons() {
  try {
    const resp = await fetch('/icons/google-maps.svg');
    if (resp.ok) SVG_GOOGLE_MAPS = await resp.text();
  } catch (e) {
    console.warn('Could not load google-maps.svg', e);
  }
}

function setupStars(container, onSelect) {
  const labels = container.querySelectorAll("label");
  labels.forEach((lbl) => {
    lbl.addEventListener("mouseenter", () =>
      highlight(labels, +lbl.dataset.val),
    );
    lbl.addEventListener("mouseleave", () => {
      const checked = container.querySelector("input:checked");
      highlight(labels, checked ? +checked.value : 0);
    });
    lbl.addEventListener("click", () => {
      highlight(labels, +lbl.dataset.val);
      if (onSelect) onSelect(+lbl.dataset.val);
    });
  });
}

function highlight(labels, val) {
  labels.forEach((l) => {
    l.classList.toggle("active", +l.dataset.val <= val);
  });
}

let overallVal = 0;

setupStars(document.getElementById("mainStars"), (v) => {
  overallVal = v;
  const hint = document.getElementById("mainHint");
  hint.textContent = "";
  hint.className = "star-hint" + (v ? " filled" : "");
});

document.getElementById("submitBtn").addEventListener("click", async () => {
  const err = document.getElementById("errorMsg");
  err.textContent = "";

  if (!overallVal) {
    err.textContent = "Prosím vyberte celkové hodnocení hvězdičkami.";
    return;
  }

  const payload = {
    overall_stars: overallVal,
    email: document.getElementById("email").value.trim() || null,
    message: document.getElementById("message").value.trim() || null,
  };

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Odesílám...';

  try {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    showModal(overallVal);
  } catch (e) {
    err.textContent =
      "Chyba při odesílání: " + (e.message || "Zkuste to prosím znovu.");
    btn.disabled = false;
    btn.textContent = "Odeslat hodnocení";
  }
});

function showModal(rating) {
  const overlay = document.getElementById("modalOverlay");
  const isPositive = rating >= 4;
  document.getElementById("modalTitle").textContent = isPositive
    ? "Skvělé, děkujeme!"
    : "Děkujeme za zpětnou vazbu";
  document.getElementById("modalText").textContent = isPositive
    ? "Moc si vážíme vašeho hodnocení!"
    : "Vaše hodnocení jsme obdrželi a budeme se jím zabývat. Omlouváme se za jakékoli nedostatky.";

  const btns = document.getElementById("modalBtns");
  btns.innerHTML = "";

  if (rating === 5) {
    const a = document.createElement("a");
    a.href = GOOGLE_MAPS_URL;
    a.target = "_blank";
    a.rel = "noopener";
    a.className = "btn-google";
    // insert icon + text
  a.innerHTML = `${SVG_GOOGLE_MAPS || ''}<span>Ohodnotit na Google Mapách</span>`;
    btns.appendChild(a);
  }

  const close = document.createElement("button");
  close.className = "btn-close";
  close.textContent = "Zavřít";
  close.addEventListener("click", () => {
    overlay.classList.remove("show");
    setTimeout(() => location.reload(), 350);
  });
  btns.appendChild(close);

  overlay.classList.add("show");
}

document.getElementById("modalOverlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.remove("show");
    setTimeout(() => location.reload(), 350);
  }
});

loadIcons();
