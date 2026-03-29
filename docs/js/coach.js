// ── Coach Mark System ─────────────────────────────────────
// Depends on: COACH_STEPS (defined in coach-steps.js, loaded before this file)

(function () {
  // ── Build overlay HTML ──────────────────────────────────
  const overlayEl = document.createElement("div");
  overlayEl.id = "coach-overlay";
  overlayEl.innerHTML = `
    <svg id="coach-backdrop" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="coach-cutout-mask">
          <rect width="100%" height="100%" fill="white"/>
          <rect id="coach-cutout-rect" rx="8" fill="black"/>
        </mask>
      </defs>
      <rect id="coach-dim-rect" width="100%" height="100%"
            fill="rgba(0,0,0,0.62)" mask="url(#coach-cutout-mask)"/>
    </svg>
    <div id="coach-dim"></div>
    <div id="coach-spotlight-ring"></div>
    <div id="coach-popover">
      <div id="coach-popover-header">
        <span id="coach-step-label"></span>
        <button id="coach-close-btn" aria-label="Close guide">&#x2715;</button>
      </div>
      <h3 id="coach-title"></h3>
      <div id="coach-body"></div>
      <div id="coach-footer">
        <div id="coach-dots"></div>
        <button class="coach-nav-btn" id="coach-prev-btn">&#8592; Back</button>
        <button class="coach-nav-btn" id="coach-next-btn">Next &#8594;</button>
      </div>
    </div>`;
  document.body.appendChild(overlayEl);

  // ── Assign IDs to class-only elements the tour needs to spotlight ─
  const idDateRow = document.querySelector(".id-date-row");
  if (idDateRow) idDateRow.id = "id-date-row";

  const namesPanelHeader = document.querySelector(".names-panel-header");
  if (namesPanelHeader) namesPanelHeader.id = "names-panel-header";

  const namesTableBody = document.querySelector(".names-table-body");
  if (namesTableBody) namesTableBody.id = "names-table-body";

  const mainTableHeader = document.querySelector(".main-table-header");
  if (mainTableHeader && !mainTableHeader.id) mainTableHeader.id = "main-table-header";

  const bottomControls = document.querySelector(".bottom-controls");
  if (bottomControls && !bottomControls.id) bottomControls.id = "bottom-controls";

  // ── Element refs ────────────────────────────────────────
  const overlay    = document.getElementById("coach-overlay");
  const backdrop   = document.getElementById("coach-backdrop");
  const cutoutRect = document.getElementById("coach-cutout-rect");
  const ring       = document.getElementById("coach-spotlight-ring");
  const dimLayer   = document.getElementById("coach-dim");
  const popover    = document.getElementById("coach-popover");
  const stepLabel  = document.getElementById("coach-step-label");
  const titleEl    = document.getElementById("coach-title");
  const bodyEl     = document.getElementById("coach-body");
  const dotsEl     = document.getElementById("coach-dots");
  const prevBtn    = document.getElementById("coach-prev-btn");
  const nextBtn    = document.getElementById("coach-next-btn");
  const closeBtn   = document.getElementById("coach-close-btn");

  let coachStep   = 0;
  let coachActive = false;

  // ── Open / Close ────────────────────────────────────────
  function coachOpen() {
    coachStep   = 0;
    coachActive = true;
    overlay.classList.add("active");
    coachRender();
  }

  function coachClose() {
    coachActive = false;
    overlay.classList.remove("active");
    ring.style.display = "none";
    cutoutRect.setAttribute("width", 0);
    cutoutRect.setAttribute("height", 0);
  }

  // ── Render current step ─────────────────────────────────
  function coachRender() {
    const step  = COACH_STEPS[coachStep];
    const total = COACH_STEPS.length;

    stepLabel.textContent = `Step ${coachStep + 1} of ${total}`;
    titleEl.textContent   = step.title;
    bodyEl.innerHTML      = step.body;

    dotsEl.innerHTML = COACH_STEPS.map((_, i) =>
      `<span class="coach-dot${i === coachStep ? " active" : ""}"></span>`
    ).join("");

    prevBtn.disabled    = coachStep === 0;
    nextBtn.textContent = coachStep === total - 1 ? "Finish \u2713" : "Next \u2192";

    // Resolve bounding rect: single targetId or union of multiple targetIds
    let resolvedRect = null;
    if (step.targetIds) {
      const rects = step.targetIds
        .map(id => document.getElementById(id))
        .filter(Boolean)
        .map(el => el.getBoundingClientRect())
        .filter(r => r.width > 0 && r.height > 0);
      if (rects.length) {
        const left   = Math.min(...rects.map(r => r.left));
        const top    = Math.min(...rects.map(r => r.top));
        const right  = Math.max(...rects.map(r => r.right));
        const bottom = Math.max(...rects.map(r => r.bottom));
        resolvedRect = { left, top, right, bottom, width: right - left, height: bottom - top };
      }
    } else if (step.targetId) {
      const el = document.getElementById(step.targetId);
      if (el) resolvedRect = el.getBoundingClientRect();
    }

    // Defer spotlight one frame so popover height is accurate after content swap
    requestAnimationFrame(() => {
      syncSVGSize();
      if (resolvedRect) {
        const r   = resolvedRect;
        const PAD = 8;
        // Clamp to visible viewport height
        const top    = Math.max(r.top, 0);
        const bottom = Math.min(r.bottom, window.innerHeight);
        const cr = { left: r.left, top, right: r.right, bottom,
                     width: r.width, height: Math.max(bottom - top, 0) };

        cutoutRect.setAttribute("x",      cr.left   - PAD);
        cutoutRect.setAttribute("y",      cr.top    - PAD);
        cutoutRect.setAttribute("width",  cr.width  + PAD * 2);
        cutoutRect.setAttribute("height", cr.height + PAD * 2);

        ring.style.cssText = `display:block;left:${cr.left-PAD}px;top:${cr.top-PAD}px;` +
                             `width:${cr.width+PAD*2}px;height:${cr.height+PAD*2}px;`;

        placePopover(cr, PAD);
      } else {
        cutoutRect.setAttribute("width", 0);
        cutoutRect.setAttribute("height", 0);
        ring.style.display = "none";
        centrePopover();
      }
    });
  }

  function syncSVGSize() {
    backdrop.setAttribute("width",  window.innerWidth);
    backdrop.setAttribute("height", window.innerHeight);
  }

  function centrePopover() {
    popover.style.left = `${Math.round((window.innerWidth  - 320) / 2)}px`;
    popover.style.top  = `${Math.round((window.innerHeight - 300) / 2)}px`;
  }

  function placePopover(cr, pad) {
    const PW     = 320;
    const MARGIN = 14;
    const vw     = window.innerWidth;
    const vh     = window.innerHeight;
    const popH   = popover.offsetHeight || 280;

    let left = Math.max(MARGIN, Math.min(cr.left - pad, vw - PW - MARGIN));
    let top  = cr.bottom + pad + MARGIN;          // prefer below

    if (top + popH > vh - MARGIN) {              // try above
      const aboveTop = cr.top - pad - MARGIN - popH;
      if (aboveTop >= MARGIN) {
        top = aboveTop;
      } else {                                    // fall back: right side
        left = Math.min(cr.right + pad + MARGIN, vw - PW - MARGIN);
        top  = Math.max(MARGIN, cr.top - pad);
      }
    }

    popover.style.left = `${left}px`;
    popover.style.top  = `${top}px`;
  }

  // ── Button wiring ───────────────────────────────────────
  closeBtn.addEventListener("click", coachClose);
  dimLayer.addEventListener("click", coachClose);

  prevBtn.addEventListener("click", () => {
    if (coachStep > 0) { coachStep--; coachRender(); }
  });

  nextBtn.addEventListener("click", () => {
    if (coachStep < COACH_STEPS.length - 1) { coachStep++; coachRender(); }
    else coachClose();
  });

  document.addEventListener("keydown", e => {
    if (!coachActive) return;
    if (e.key === "Escape")     coachClose();
    if (e.key === "ArrowRight" && coachStep < COACH_STEPS.length - 1) { coachStep++; coachRender(); }
    if (e.key === "ArrowLeft"  && coachStep > 0)                       { coachStep--; coachRender(); }
  });

  window.addEventListener("resize", () => { if (coachActive) coachRender(); });

  // Re-sync spotlight when the page or any scrollable container scrolls
  window.addEventListener("scroll", () => { if (coachActive) coachRender(); }, { passive: true });
  document.addEventListener("scroll", e => {
    if (coachActive) coachRender();
  }, { passive: true, capture: true });

  // ── Wire User Guide button ──────────────────────────────
  document.getElementById("user-guide-tips-btn").addEventListener("click", () => {
    coachActive ? coachClose() : coachOpen();
  });

}()); // end IIFE
