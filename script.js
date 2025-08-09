/* ======== KONFIGURASI — EDIT BAGIAN INI SAJA ✔️ ======== */
const CONFIG = {
  tz: "Asia/Jakarta",

  // Nama & tampilan
  bride: "Hesti",
  groom: "Ifan",
  brideParents: "Putri dari Bapak Purhadi & Ibu Endang",
  groomParents: "Putra dari Bapak Hartono & Alm Ibu Kartini",

  // Musik
  musicUrl: "assets/music.mp3",
  musicVolume: 0.6,         // 0..1
  // (opsional) loop A→B:
  // musicStart: 0,
  // musicLoopEnd: 42.5,

  // Kontak WA untuk RSVP (internasional tanpa '+')
  waNumber: "6282324858528",

  // Tanggal (ISO, +07:00 untuk WIB)
  akad: {
    start: "2025-08-23T13:30:00+07:00",
    end:   "2025-08-23T18:00:00+07:00",
    place: "Kediaman Mempelai Wanita",
    addr:  "Dk. Kaligawe DS. Sidoarum RT. 02 RW 05 Kec. Jakenan Kab. Pati",
    map:   "https://maps.app.goo.gl/TXvQbkwDXwtKhZ5F7?g_st=ac"
  },

  // Parameter nama tamu di URL: ?to=Nama%20Tamu
  guestParam: "to",
  defaultGuest: "Bapak/Ibu/Saudara/i"
};
/* ======== /KONFIGURASI ======== */

const q = (s) => document.querySelector(s);

/* ==== Cover + musik + lock scroll ==== */
const cover = q("#cover");
const openBtn = q("#openInvitation");
const audioEl = q("#bgm");
const musicToggle = q("#musicToggle");
const body = document.body;

/* =========================
   AUDIO: autoplay aman (tanpa play di tombol)
   ========================= */
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/* =========================
   AUDIO: Mobile‑first unlock (GitHub Pages / iOS safe)
   ========================= */
(function initBgmAutoPlay() {
  if (!audioEl) return;

  // Pastikan source & state awal
  if (CONFIG.musicUrl) audioEl.src = CONFIG.musicUrl;
  audioEl.loop = false;          // kita kontrol manual kalau pakai A→B
  audioEl.volume = 0;            // start silent
  audioEl.muted  = true;         // start muted → lolos autoplay policy

  // Siapkan seek awal (bukan di gesture handler, biar iOS tidak nge-drop pemutaran)
  const START = Number(CONFIG.musicStart || 0);
  const onMeta = () => {
    if (audioEl.duration && START < audioEl.duration) {
      audioEl.currentTime = Math.max(0, START);
    }
  };
  if (audioEl.readyState >= 1) onMeta(); else audioEl.addEventListener("loadedmetadata", onMeta, { once:true });

  // Loop A→B manual bila diset
  const LOOP_END = CONFIG.musicLoopEnd ?? null;
  audioEl.addEventListener("timeupdate", () => {
    if (LOOP_END != null && audioEl.currentTime >= LOOP_END - 0.05) {
      audioEl.currentTime = START;
      if (audioEl.paused) audioEl.play().catch(()=>{});
    }
  });
  audioEl.addEventListener("ended", () => {
    audioEl.currentTime = START;
    audioEl.play().catch(()=>{});
  });

  // Coba play muted seawal mungkin (bisa gagal di iOS, nggak apa)
  audioEl.play().catch(()=>{});

  // ========== HARDENED GESTURE UNLOCK ==========
  const TARGET_VOL = typeof CONFIG?.musicVolume === "number" ? Math.min(1, Math.max(0, CONFIG.musicVolume)) : 0.6;
  let unlocked = false;

  function fadeTo(target = TARGET_VOL, ms = 600) {
    target = Math.min(1, Math.max(0, target));
    const start = Math.min(1, Math.max(0, audioEl.volume || 0));
    const t0 = performance.now();
    function step(t) {
      const k = Math.min(1, (t - t0) / ms);
      audioEl.volume = Math.min(1, Math.max(0, start + (target - start) * k));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Penting: panggil play() langsung di handler gesture yang sama—tanpa async/await
  function unlockAudio() {
    if (unlocked) return;
    unlocked = true;

    // Unmute + play sinkron dalam handler
    audioEl.muted = false;
    try { audioEl.play(); } catch (_) {}

    // Fade setelah call play (tanpa menunggu promise)
    fadeTo(TARGET_VOL, 500);

    detach(); // lepas semua listener setelah sukses dipanggil
  }

  function detach() {
    ["pointerdown","pointerup","touchend","click","keydown"].forEach(ev => {
      document.removeEventListener(ev, unlockAudio, passiveOpt);
    });
    openBtn?.removeEventListener("click", unlockAudio, { once:true });
  }

  const passiveOpt = { passive:true };

  // Daftarkan ke beberapa event supaya peluang sukses maksimum di iOS
  ["pointerdown","pointerup","touchend","click","keydown"].forEach(ev => {
    document.addEventListener(ev, unlockAudio, passiveOpt);
  });

  // Tambahkan juga langsung ke tombol "Buka Undangan"
  // (klik tombol = gesture paling natural bagi tamu)
  openBtn?.addEventListener("click", unlockAudio, { once:true });

  // Jika user kembali ke tab & sudah di‑unmute, coba lanjut
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !audioEl.muted && audioEl.paused) {
      audioEl.play().catch(()=>{});
    }
  });
})();

/* ==== Buka undangan (tanpa memutar musik) ==== */
openBtn.addEventListener("click", () => {
  // Tutup cover
  cover.style.opacity = "0";
  setTimeout(() => cover.remove(), 350);
  body.classList.remove("no-scroll");
  body.classList.add("main-open");
  q("#hero").scrollIntoView({ behavior: "smooth" });

  // 🎵 Unmute + play musik kalau belum jalan
  if (audioEl) {
    audioEl.muted = false;
    if (audioEl.paused) {
      audioEl.play().catch(()=>{});
    }
    if (typeof fadeTo === "function") fadeTo((CONFIG.musicVolume ?? 0.6), 500);
  }

  // ✨ Animasi icon musik
  if (musicToggle) {
    musicToggle.classList.add("pulse-music");
    setTimeout(() => musicToggle.classList.remove("pulse-music"), 1200);
  }
});


// Toggle musik manual
musicToggle.addEventListener("click", () => {
  if (audioEl.paused) {
    audioEl.play().catch(() => {});
  } else {
    audioEl.pause();
  }
});

audioEl.addEventListener("play", () => {
  musicToggle.classList.add("music-playing");
});

audioEl.addEventListener("pause", () => {
  musicToggle.classList.remove("music-playing");
});


// Kunci scroll ketika cover tampil
cover.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
cover.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });

/* ==== Nav mobile ==== */
const toggle = document.querySelector(".nav__toggle");
const nav = document.getElementById("nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    nav.style.transform = open ? "translateY(-120%)" : "translateY(0)";
  });
  nav.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", () => {
      nav.style.transform = "translateY(-120%)";
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ==== Smooth scroll ==== */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href").slice(1);
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

/* ==== Helper tanggal ==== */
const dayName = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: CONFIG.tz });
const dateFull = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: CONFIG.tz });
const hm = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: CONFIG.tz });

/* ==== Inject teks & profil ==== */
q("#brideGroomCover").textContent = `${CONFIG.bride} & ${CONFIG.groom}`;
q("#brideGroom").innerHTML = `${CONFIG.bride} <span class="amp">&amp;</span> ${CONFIG.groom}`;
q("#brideName").textContent = CONFIG.bride;
q("#groomName").textContent = CONFIG.groom;
q("#brideParents").textContent = CONFIG.brideParents;
q("#groomParents").textContent = CONFIG.groomParents;

/* ==== Param nama tamu ==== */
(function setGuest() {
  // Prefill nama form dari ?to=
  (function () {
    const url = new URL(location.href);
    const g = url.searchParams.get(CONFIG.guestParam);
    if (g) {
      const nm = document.getElementById("name");
      if (nm && !nm.value) nm.value = decodeURIComponent(g).trim();
    }
  })();

  const url = new URL(location.href);
  const g = url.searchParams.get(CONFIG.guestParam);
  const name = g ? decodeURIComponent(g).trim() : CONFIG.defaultGuest;
  q("#guestName").textContent = name || CONFIG.defaultGuest;
})();

/* ==== Badge tanggal ==== */
(function setBadge() {
  const d = new Date(CONFIG.akad.start);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  q("#dateBadge").textContent = `${dd} . ${mm} . ${yy}`;
})();

/* ==== Event detail ==== */
function fillEvent(idPrefix, info) {
  const start = new Date(info.start);
  q(`#${idPrefix}Day`).textContent = dayName.format(start);
  q(`#${idPrefix}Date`).textContent = dateFull.format(start);
  q(`#${idPrefix}Time`).textContent = `${hm.format(start)} – Selesai`;
  q(`#${idPrefix}Place`).textContent = info.place;
  q(`#${idPrefix}Addr`).textContent = info.addr;
  q(`#${idPrefix}Map`).href = info.map;
}
fillEvent("akad", CONFIG.akad);

/* ==== Countdown ==== */
const $dd = q("#dd"),
  $hh = q("#hh"),
  $mm = q("#mm"),
  $ss = q("#ss");
const TARGET = new Date(CONFIG.akad.start);
function tick() {
  const now = new Date();
  const diff = TARGET - now;
  if (diff <= 0) {
    $dd.textContent = "00";
    $hh.textContent = "00";
    $mm.textContent = "00";
    $ss.textContent = "00";
    clearInterval(t);
    return;
  }
  const sec = Math.floor(diff / 1000);
  const days = Math.floor(sec / 86400);
  const hrs = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  $dd.textContent = String(days).padStart(2, "0");
  $hh.textContent = String(hrs).padStart(2, "0");
  $mm.textContent = String(mins).padStart(2, "0");
  $ss.textContent = String(secs).padStart(2, "0");
}
const t = setInterval(tick, 1000);
tick();

/* ==== ICS (Add to Calendar) ==== */
function toICSDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds())
  );
}
(function buildICS() {
  const title = `${CONFIG.bride} & ${CONFIG.groom} — Akad`;
  const loc = `${CONFIG.akad.place}, ${CONFIG.akad.addr}`;
  const dtStartUTC = new Date(new Date(CONFIG.akad.start).toISOString());
  const dtEndUTC = new Date(new Date(CONFIG.akad.end).toISOString());
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Undangan Maroon//ID
BEGIN:VEVENT
UID:${Date.now()}@undangan
DTSTAMP:${toICSDate(new Date())}Z
DTSTART:${toICSDate(dtStartUTC)}Z
DTEND:${toICSDate(dtEndUTC)}Z
SUMMARY:${title}
LOCATION:${loc}
END:VEVENT
END:VCALENDAR`;
  // (opsional) pakai string ics di tombol "Add to Calendar"
})();

/* ==== Copy helper (data-copy-target) ==== */
document.querySelectorAll("[data-copy-target]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const sel = btn.getAttribute("data-copy-target");
    const el = document.querySelector(sel);
    if (!el) return;
    const text = el.textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
      const old = btn.textContent;
      btn.textContent = "Disalin ✔️";
      setTimeout(() => (btn.textContent = old), 1600);
    } catch {
      alert("Gagal menyalin. Salin manual ya.");
    }
  });
});

/* ==== Guestbook (localStorage) ==== */
const STORAGE_KEY = "wishes-v1";
const form = q("#wishForm");
const list = q("#wishList");

function loadWishes() {
  let data = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    data = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) data = [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    data = [];
  }

  list.innerHTML = "";

  const escapeHTML = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  data
    .slice(-50)
    .reverse()
    .forEach((item) => {
      const name = escapeHTML(item?.name);
      const attend = escapeHTML(item?.attend);
      const message = escapeHTML(item?.message);
      const li = document.createElement("li");
      li.innerHTML = `<strong>${name || "-"}</strong> • <em>${attend || "-"}</em><br>${message || ""}`;
      list.appendChild(li);
    });
}

function saveWish(w) {
  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(arr)) arr = [];
  } catch {
    arr = [];
  }
  arr.push({
    name: String(w.name ?? ""),
    message: String(w.message ?? ""),
    attend: String(w.attend ?? "")
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

/* ==== RSVP submit → WhatsApp ==== */
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = q("#name").value.trim();
  const message = q("#message").value.trim();

  if (!name || !message) {
    alert("Nama dan ucapan wajib diisi ya.");
    return;
  }

  saveWish({ name, message, attend: "", at: Date.now() });
  loadWishes();

  const lines = [`From: ${name}`, `Wish:`, message, ""];
  const text = encodeURIComponent(lines.join("\n"));

  const phone =
    CONFIG.waNumber && /^\d{8,15}$/.test(CONFIG.waNumber) ? CONFIG.waNumber : null;

  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  const waUrl = isMobile
    ? (phone ? `whatsapp://send?phone=${phone}&text=${text}` : `whatsapp://send?text=${text}`)
    : (phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`);

  const win = window.open(waUrl, "_blank", "noopener,noreferrer");
  if (!win) location.href = waUrl;

  form.reset();
});

window.addEventListener("DOMContentLoaded", loadWishes);

/* ==== Petals (bunga jatuh) ==== */
(function makePetalsNaturalLoopWithWind() {
  const wrap = document.querySelector(".petals");
  if (!wrap) return;

  const TOTAL_ON_SCREEN = 18;
  const INTERVAL = 1500;

  let styleEl = document.getElementById("petal-drift-kf");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "petal-drift-kf";
    document.head.appendChild(styleEl);
  }
  const sheet = styleEl.sheet;
  let petalCount = 0;

  function createPetal() {
    if (wrap.childElementCount >= TOTAL_ON_SCREEN) return;

    petalCount++;
    const p = document.createElement("span");
    p.className = "petal";

    const w = 42 + Math.random() * 27;
    const h = w * (1.45 + Math.random() * 0.35);
    p.style.left = `${Math.random() * 100}%`;
    p.style.setProperty("--size", `${w}px`);
    p.style.setProperty("--sizeH", `${h}px`);

    const tFall = 8 + Math.random() * 6;
    const tDrift = 5 + Math.random() * 3.5;
    const delay = 0;
    p.style.setProperty("--t", `${tFall}s`);
    p.style.setProperty("--d", `${delay}s`);

    const name = `drift-p${petalCount}`;
    const AMP = 10 + Math.random() * 18;
    const R0 = -6 + Math.random() * 12;

    const points = [0, 20, 40, 60, 80, 100].map((pct, idx) => {
      const sign = Math.random() > 0.5 ? 1 : -1;
      const amp = AMP * (0.6 + Math.random() * 0.6);
      const x = Math.round(sign * amp * (idx === 0 || idx === 5 ? 0.5 : 1));
      const rot = (R0 + (Math.random() * 8 - 4)).toFixed(2);
      return `${pct}% { transform: translateX(${x}px) rotate(${rot}deg); }`;
    });

    try {
      sheet.insertRule(`@keyframes ${name}{ ${points.join(" ")} }`, sheet.cssRules.length);
    } catch {}

    p.style.animation = `
      fallY ${tFall}s linear ${delay}s infinite,
      ${name} ${tDrift}s ease-in-out ${delay}s infinite alternate
    `;

    wrap.appendChild(p);
    setTimeout(() => {
      p.remove();
    }, tFall * 1000);
  }

  setInterval(createPetal, INTERVAL);
  for (let i = 0; i < TOTAL_ON_SCREEN / 2; i++) {
    setTimeout(createPetal, i * 400);
  }
})();
