/* ======== KONFIGURASI — EDIT BAGIAN INI SAJA ✔️ ======== */
const CONFIG = {
  tz: "Asia/Jakarta",
  // Nama & tampilan
  bride: "Hesti",
  groom: "Ifan",
  brideParents: "Putri dari Bapak Purhadi & Ibu Endang",
  groomParents: "Putra dari Bapak Hartono & Alm Ibu Kartini",
  musicStart: 144.7, // detik mulai
  musicUrl: "assets/music.mp3",

  waNumber: "6282324858528", // ganti ke nomor tujuan (format internasional tanpa +)
  // Tanggal (ISO, +07:00 untuk WIB)
  akad: {
    start: "2025-08-23T13:30:00+07:00",
    end:   "2025-08-23T18:00:00+07:00",
    place: "Kediaman Mempelai Wanita",
    addr:  "Dk. Kaligawe DS. Sidoarum RT. 02 RW 05 Kec. Jakenan Kab. Pati",
    map:   "https://maps.app.goo.gl/TXvQbkwDXwtKhZ5F7?g_st=ac"
  },





  // Musik
  musicVolume: 0.6,

  // (6) Parameter nama tamu di URL: ?to=Nama%20Tamu
  guestParam: "to",
  defaultGuest: "Bapak/Ibu/Saudara/i"
};
/* ======== /KONFIGURASI ======== */

const q = s => document.querySelector(s);

/* ==== Cover open + musik + lock scroll (1,3,4) ==== */
const cover = q("#cover");
const openBtn = q("#openInvitation");
const audio = q("#bgm");
const musicToggle = q("#musicToggle");
const body = document.body;

function safePlay() {
  if (!audio) return;
  audio.volume = CONFIG.musicVolume;
  audio.loop = false; // kita yang kontrol loop-nya
  const START = Number(CONFIG.musicStart || 0);
  const LOOP_END = (CONFIG.musicLoopEnd ?? null);

  // Pastikan seek setelah metadata siap (supaya tidak diabaikan Safari/Chrome)
  const seekToStart = () => {
    if (audio.duration && START < audio.duration) {
      audio.currentTime = Math.max(0, START);
    }
  };
  if (audio.readyState >= 1) seekToStart();
  else audio.addEventListener('loadedmetadata', seekToStart, { once:true });

  // Mulai
  audio.play().catch(()=>{ /* butuh gesture */ });

  // 1) Loop ke START saat lagu berakhir
  audio.addEventListener('ended', () => {
    seekToStart();
    audio.play().catch(()=>{});
  });

  // 2) (Opsional) Loop segmen START..LOOP_END
  if (LOOP_END != null) {
    audio.addEventListener('timeupdate', () => {
      if (audio.currentTime >= LOOP_END - 0.05) { // -0.05 untuk menghindari gap
        seekToStart();
        // keep playing tanpa jeda
        if (audio.paused) audio.play().catch(()=>{});
      }
    });
  }
}

// ====== Web Audio: prefetch & seamless loop A→B ======
let audioCtx, gainNode, sourceNode, audioBuffer, prefetchPromise;
let usingWebAudio = false;

function prefetchAudio() {
  if (prefetchPromise) return prefetchPromise;
  prefetchPromise = fetch(CONFIG.musicUrl, { mode: "cors", cache: "force-cache" })
    .then(r => r.arrayBuffer())
    .then(buf => {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      return audioCtx.decodeAudioData(buf);
    })
    .then(decoded => { audioBuffer = decoded; })
    .catch(() => { /* biar fallback ke <audio> */ });
  return prefetchPromise;
}

// Mulai play (dipanggil saat klik "Buka Undangan")
async function safePlay() {
  // 1) Prefetch dulu biar instant
  await prefetchAudio().catch(()=>{});

  // 2) Coba Web Audio kalau buffer tersedia
  if (audioBuffer && (window.AudioContext || window.webkitAudioContext)) {
    usingWebAudio = true;

    // (Re)init context setelah gesture (iOS butuh resume)
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") await audioCtx.resume().catch(()=>{});

    // Build graph: Source -> Gain -> Destination
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0; // fade-in
    gainNode.connect(audioCtx.destination);

    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.loop = true;

    const START = Math.max(0, Number(CONFIG.musicStart || 0));
    const END   = CONFIG.musicLoopEnd != null ? Math.max(START + 0.01, Number(CONFIG.musicLoopEnd)) : audioBuffer.duration;

    // Loop segmen A→B tanpa gap
    sourceNode.loopStart = START;
    sourceNode.loopEnd   = END;

    // Start dari offset START
    sourceNode.connect(gainNode);
    sourceNode.start(0, START);

    // Fade-in halus
    const target = Math.max(0, Math.min(1, CONFIG.musicVolume ?? 0.6));
    const now = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(target, now + 0.6);

    // Visibility fix: kalau tab di-re-activate, resume context
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && audioCtx?.state === "suspended") {
        audioCtx.resume().catch(()=>{});
      }
    });

    return;
  }

  // 3) Fallback ke <audio> element (pastikan tidak pakai loop)
  const el = document.getElementById("bgm");
  if (el) {
    el.removeAttribute("loop");
    el.volume = CONFIG.musicVolume ?? 0.6;

    const seekStart = () => {
      if (el.duration && (CONFIG.musicStart || 0) < el.duration) {
        el.currentTime = Number(CONFIG.musicStart || 0);
      }
    };
    if (el.readyState >= 1) seekStart(); else el.addEventListener("loadedmetadata", seekStart, { once:true });

    // Loop A→B manual (atau ke start saat ended)
    const END = CONFIG.musicLoopEnd ?? null;
    el.addEventListener("timeupdate", () => {
      if (END != null && el.currentTime >= END - 0.05) {
        el.currentTime = Number(CONFIG.musicStart || 0);
      }
    });
    el.addEventListener("ended", () => {
      el.currentTime = Number(CONFIG.musicStart || 0);
      el.play().catch(()=>{});
    });

    el.play().catch(()=>{});
  }
}

// (Opsional) Mulai prefetch begitu halaman siap (biar cepat saat klik)
window.addEventListener("DOMContentLoaded", () => {
  prefetchAudio().catch(()=>{});
});




// Pop-in sudah di CSS (class .pop-in di .cover__card)
// Body sudah class .no-scroll dari HTML; hapus saat undangan dibuka
openBtn.addEventListener("click", () => {
  cover.style.opacity = "0";
  setTimeout(()=> cover.remove(), 350);
  body.classList.remove("no-scroll");
  body.classList.add("main-open"); // 4) sembunyikan header
  safePlay();
  q("#hero").scrollIntoView({behavior:"smooth"});
});

// Toggle musik
musicToggle.addEventListener("click", () => {
  if (audio.paused) { audio.play(); } else { audio.pause(); }
});

// Cegah scroll pada cover (tambahan aman untuk iOS)
cover.addEventListener("touchmove", (e)=> e.preventDefault(), {passive:false});
cover.addEventListener("wheel", (e)=> e.preventDefault(), {passive:false});

/* ==== Nav mobile ==== */
const toggle = document.querySelector('.nav__toggle');
const nav = document.getElementById('nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.style.transform = open ? 'translateY(-120%)' : 'translateY(0)';
  });
  nav.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', ()=>{
      nav.style.transform = 'translateY(-120%)';
      toggle.setAttribute('aria-expanded','false');
    });
  });
}

/* ==== Smooth scroll ==== */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) { e.preventDefault(); el.scrollIntoView({behavior:"smooth", block:"start"}); }
  });
});

/* ==== Helper tanggal ==== */
const dayName = new Intl.DateTimeFormat("id-ID", { weekday:"long", timeZone: CONFIG.tz });
const dateFull = new Intl.DateTimeFormat("id-ID", { day:"2-digit", month:"long", year:"numeric", timeZone: CONFIG.tz });
const hm = new Intl.DateTimeFormat("id-ID", { hour:"2-digit", minute:"2-digit", hour12:false, timeZone: CONFIG.tz });

/* ==== Inject teks & profil ==== */
q("#brideGroomCover").textContent = `${CONFIG.bride} & ${CONFIG.groom}`;
q("#brideGroom").innerHTML = `${CONFIG.bride} <span class="amp">&amp;</span> ${CONFIG.groom}`;
q("#brideName").textContent = CONFIG.bride;
q("#groomName").textContent = CONFIG.groom;
q("#brideParents").textContent = CONFIG.brideParents;
q("#groomParents").textContent = CONFIG.groomParents;

/* ==== Param nama tamu (6) ==== */
(function setGuest(){
  // Prefill nama form dengan param ?to=
(() => {
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
(function setBadge(){
  const d = new Date(CONFIG.akad.start);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth()+1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  q("#dateBadge").textContent = `${dd} . ${mm} . ${yy}`;
})();

/* ==== Event detail ==== */
function fillEvent(idPrefix, info){
  const start = new Date(info.start);
  const end   = new Date(info.end);
  q(`#${idPrefix}Day`).textContent = dayName.format(start);
  q(`#${idPrefix}Date`).textContent = dateFull.format(start);
  q(`#${idPrefix}Time`).textContent = `${hm.format(start)} – Selesai`;
  q(`#${idPrefix}Place`).textContent = info.place;
  q(`#${idPrefix}Addr`).textContent  = info.addr;
  q(`#${idPrefix}Map`).href = info.map;
}
fillEvent("akad", CONFIG.akad);

/* ==== Countdown ==== */
const $dd = q("#dd"), $hh = q("#hh"), $mm = q("#mm"), $ss = q("#ss");
const TARGET = new Date(CONFIG.akad.start);
function tick() {
  const now = new Date();
  const diff = TARGET - now;
  if (diff <= 0) {
    $dd.textContent = "00"; $hh.textContent="00"; $mm.textContent="00"; $ss.textContent="00";
    clearInterval(t);
    return;
  }
  const sec = Math.floor(diff/1000);
  const days = Math.floor(sec/86400);
  const hrs  = Math.floor((sec%86400)/3600);
  const mins = Math.floor((sec%3600)/60);
  const secs = sec%60;
  $dd.textContent = String(days).padStart(2,"0");
  $hh.textContent = String(hrs).padStart(2,"0");
  $mm.textContent = String(mins).padStart(2,"0");
  $ss.textContent = String(secs).padStart(2,"0");
}
const t = setInterval(tick, 1000); tick();

/* ==== ICS ==== */
function toICSDate(d){
  const pad = n => String(n).padStart(2,"0");
  return d.getUTCFullYear()
    + pad(d.getUTCMonth()+1)
    + pad(d.getUTCDate())
    + "T"
    + pad(d.getUTCHours())
    + pad(d.getUTCMinutes())
    + pad(d.getUTCSeconds());
}
(function buildICS(){
  const title = `${CONFIG.bride} & ${CONFIG.groom} — Akad`;
  const loc = `${CONFIG.akad.place}, ${CONFIG.akad.addr}`;
  const dtStartUTC = new Date(new Date(CONFIG.akad.start).toISOString());
  const dtEndUTC   = new Date(new Date(CONFIG.akad.end).toISOString());
  const ics =
`BEGIN:VCALENDAR
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
})();

/* ==== Copy helper ==== */
document.querySelectorAll("[data-copy-target]").forEach(btn=>{
  btn.addEventListener("click", async ()=>{
    const sel = btn.getAttribute("data-copy-target");
    const el = document.querySelector(sel);
    if (!el) return;
    const text = el.textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
      const old = btn.textContent;
      btn.textContent = "Disalin ✔️";
      setTimeout(()=> btn.textContent = old, 1600);
    } catch {
      alert("Gagal menyalin. Salin manual ya.");
    }
  });
});

/* ==== Guestbook (localStorage) ==== */
const STORAGE_KEY = "wishes-v1";
const form = q("#wishForm");
const list = q("#wishList");
function loadWishes(){
  let data = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    data = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) data = [];
  } catch {
    // kalau data korup, kosongkan biar nggak error terus
    localStorage.removeItem(STORAGE_KEY);
    data = [];
  }

  list.innerHTML = "";

  const escapeHTML = (v) =>
    String(v ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    })[m]);

  data.slice(-50).reverse().forEach(item => {
    const name = escapeHTML(item?.name);
    const attend = escapeHTML(item?.attend);
    const message = escapeHTML(item?.message);

    const li = document.createElement("li");
    li.innerHTML = `<strong>${name || "-"}</strong> • <em>${attend || "-"}</em><br>${message || ""}`;
    list.appendChild(li);
  });
}

function saveWish(w){
  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(arr)) arr = [];
  } catch { arr = []; }

  arr.push({
    name: String(w.name ?? ""),
    message: String(w.message ?? ""),
    attend: String(w.attend ?? "")
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

/* ==== RSVP submit -> WhatsApp (robust) ==== */
/* ==== RSVP submit -> WhatsApp (robust) ==== */
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = q("#name").value.trim();
  const message = q("#message").value.trim();
  const attend = (new FormData(form)).get("attend");

  if (!name || !message) {
    alert("Nama, ucapan, dan status kehadiran wajib diisi ya.");
    return;
  }

  // Simpan lokal (biar muncul di list)
  saveWish({ name, message, attend, at: Date.now() });
  loadWishes();

  // Ambil nama tamu dari URL (?to=)
  const u = new URL(location.href);
  const guest = u.searchParams.get(CONFIG.guestParam);

  // Susun pesan
  const lines = [
    guest ? `To: ${CONFIG.bride} & ${CONFIG.groom}` : null,
    `From: ${name}`,
    `Wish:`,
    message,
    "",
  ].filter(Boolean);
  const text = encodeURIComponent(lines.join("\n"));

  // Nomor valid? (internasional tanpa +)
  const phone = (CONFIG.waNumber && /^\d{8,15}$/.test(CONFIG.waNumber)) ? CONFIG.waNumber : null;

  // Deteksi perangkat sederhana
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  // Bangun URL WA
  let waUrl;
  if (isMobile) {
    // App WA di HP
    waUrl = phone
      ? `whatsapp://send?phone=${phone}&text=${text}`
      : `whatsapp://send?text=${text}`;
  } else {
    // Desktop (browser/WA Web)
    waUrl = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
  }

  // Coba buka di tab baru; jika diblokir, fallback same-tab
  const win = window.open(waUrl, "_blank", "noopener,noreferrer");
  if (!win) {
    // popup diblokir → pakai same-tab
    location.href = waUrl;
  }

  // Reset form
  form.reset();
});




(function makePetalsNaturalLoopWithWind(){
  const wrap = document.querySelector('.petals');
  if (!wrap) return;

  const TOTAL_ON_SCREEN = 18;
  const INTERVAL = 1500;

  let styleEl = document.getElementById('petal-drift-kf');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'petal-drift-kf';
    document.head.appendChild(styleEl);
  }
  const sheet = styleEl.sheet;
  let petalCount = 0;
  let windOffset = 0; // arah global

  function createPetal(){
    if (wrap.childElementCount >= TOTAL_ON_SCREEN) return;

    petalCount++;
    const p = document.createElement('span');
    p.className = 'petal';

    const w = 42 + Math.random()*27;
    const h = w * (1.45 + Math.random()*0.35);
    p.style.left = `${Math.random()*100}%`;
    p.style.setProperty('--size',  `${w}px`);
    p.style.setProperty('--sizeH', `${h}px`);

    // Waktu jatuh lebih cepat (8–14 detik)
    const tFall  = 8 + Math.random()*6;
    const tDrift = 5  + Math.random()*3.5;
    const delay  = 0;
    p.style.setProperty('--t', `${tFall}s`);
    p.style.setProperty('--d', `${delay}s`);

    // Drift unik per petal
    const name = `drift-p${petalCount}`;
    const AMP = 10 + Math.random()*18;
    const R0  = -6 + Math.random()*12;

    const points = [0,20,40,60,80,100].map((pct, idx) => {
      const sign = Math.random() > .5 ? 1 : -1;
      const amp  = AMP * (0.6 + Math.random()*0.6);
      const x    = Math.round(sign * amp * (idx===0||idx===5 ? .5 : 1));
      const rot  = (R0 + (Math.random()*8 - 4)).toFixed(2);
      return `${pct}% { transform: translateX(${x}px) rotate(${rot}deg); }`;
    });

    try { sheet.insertRule(`@keyframes ${name}{ ${points.join(' ')} }`, sheet.cssRules.length); }
    catch(e){}

    // Animasi jatuh konstan + drift acak
    p.style.animation = `
      fallY ${tFall}s linear ${delay}s infinite,
      ${name} ${tDrift}s ease-in-out ${delay}s infinite alternate
    `;

    wrap.appendChild(p);
    setTimeout(()=>{ p.remove(); }, tFall*1000);
  }

  // Loop buat petal baru
  setInterval(createPetal, INTERVAL);
  for (let i = 0; i < TOTAL_ON_SCREEN/2; i++) {
    setTimeout(createPetal, i*400);
  }

  // Efek angin global
  setInterval(()=>{
    // kadang tiup, kadang diam
    if (Math.random() > 0.5) {
      windOffset = (Math.random()*40 - 20); // -20..+20 px
    } else {
      windOffset = 0;
    }
    document.querySelectorAll('.petal').forEach(el=>{
      el.style.transform = `translateX(${windOffset}px)`;
    });
  }, 4000); // setiap 4 detik ganti arah/berhenti
})();


// 2) Force anim lewat URL (?anim=on) atau fallback saat reduce motion
(function(){
  const url = new URL(location.href);
  const force = url.searchParams.get('anim') === 'on';
  if (force) document.documentElement.classList.add('anim-force');

  // Optional: kalau reduce motion aktif & tidak force,
  // biar tetap kelihatan statis di posisi acak dalam viewport
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce && !force) {
    document.querySelectorAll('.petal').forEach(p => {
      p.style.top = `${Math.random()*80 + 5}vh`; // sebar di layar
    });
  }
})();
