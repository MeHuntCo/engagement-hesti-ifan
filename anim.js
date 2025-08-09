(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Reveal target
  const targets = [
    [".hero__text", "fx-up"],
    [".hero__monogram", "fx-zoom"],
    [".couples .person", "fx-up"],
    [".section .title", "fx-right"],
    [".cards .card", ""],
    [".timeline .tl-item", ""],
    [".site-footer .footer__inner", "fx-up"]
  ];

  // Tambah kelas awal
  targets.forEach(([sel, extra]) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add("will-animate");
      if (extra) el.classList.add(extra);
      if (i>0 && i<5) el.classList.add(`fx-delay-${Math.min(i,4)}`);
    });
  });

  // Float & tilt hero (ringan, nonaktifkan di touch)
  const mono = document.querySelector(".hero__monogram");
  const isTouch = matchMedia("(pointer:coarse)").matches;
  if (mono && !prefersReduced) mono.classList.add("float");
  if (mono && !prefersReduced && !isTouch){
    const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
    mono.addEventListener("mousemove", e => {
      const r = mono.getBoundingClientRect();
      const cx = (e.clientX - r.left)/r.width - .5;
      const cy = (e.clientY - r.top)/r.height - .5;
      mono.style.transform = `rotateX(${clamp(-cy*6,-6,6)}deg) rotateY(${clamp(cx*6,-6,6)}deg)`;
    });
    mono.addEventListener("mouseleave", ()=> mono.style.transform = "");
  }

  // Intersection reveal
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    });
  }, {rootMargin: "0px 0px -10% 0px", threshold: 0.15});
  document.querySelectorAll(".will-animate").forEach(el => io.observe(el));

  // Flip anim untuk countdown
  const spans = document.querySelectorAll("#countdown span");
  const mo = new MutationObserver((muts)=>{
    muts.forEach(m=>{
      if (m.type === "childList"){
        const s = m.target;
        s.classList.remove("flip");
        void s.offsetWidth; // reflow
        s.classList.add("flip");
      }
    });
  });
  spans.forEach(s=>mo.observe(s, {childList:true}));

  // Reveal untuk item buku tamu dinamis
  const wishList = document.getElementById("wishList");
  if (wishList){
    const dynObs = new MutationObserver((muts)=>{
      muts.forEach(m=>{
        m.addedNodes.forEach(node=>{
          if (node.nodeType===1){
            node.classList.add("will-animate","fx-up");
            requestAnimationFrame(()=> node.classList.add("in-view"));
          }
        });
      });
    });
    dynObs.observe(wishList, {childList:true});
  }
})();


// Curtain open on scroll into view
// (() => {
//   const el = document.getElementById("curtainCouple");
//   if (!el || !('IntersectionObserver' in window)) return;
//   const io = new IntersectionObserver(([ent]) => {
//     if (ent.isIntersecting) {
//       el.classList.add("curtain-open");
//       io.disconnect();
//     }
//   }, { threshold: 0.35, rootMargin: "0px 0px -15% 0px" });
//   io.observe(el);
// })();

// Trigger curtainFX saat sceneCouple terlihat
(() => {
  const scene = document.getElementById('sceneCouple');
  const curtain = document.getElementById('curtainCouple');
  const couplesContainer = document.querySelector('.couples');
  if (!scene || !curtain) return;

  // Fungsi buat buka curtain + munculin couples
  const openCurtain = () => {
    scene.classList.add('expand');
    curtain.classList.add('open');

    // Tambahkan delay sedikit supaya couples muncul setelah curtain terbuka
    if (couplesContainer) {
      setTimeout(() => {
        couplesContainer.classList.add('show');
      }, 1600); // delay disesuaikan dengan durasi animasi curtain
    }
  };

  if (!('IntersectionObserver' in window)) {
    openCurtain();
    return;
  }

  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      openCurtain();
      io.disconnect();
    }
  }, { threshold: 0.35, rootMargin: '0px 0px -15% 0px' });

  io.observe(scene);
})();

