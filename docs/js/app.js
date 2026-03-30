// ── Data source URLs ──────────────────────────────────────
const TEXTS_URL       = "https://raw.githubusercontent.com/adeloucas/NippUr/main/diss texts.csv";
const NAMES_URL       = "https://raw.githubusercontent.com/adeloucas/NippUr/main/diss names.csv";
const SUGGESTIONS_URL = "https://raw.githubusercontent.com/adeloucas/NippUr/main/name suggestions.csv";

// ── Placeholder strings (single source of truth) ─────────
const PH_SELECT_TEXT    = "Select a text to see names";
const PH_NO_NAMES       = "No names found for this text";
const PH_NAME_NOT_FOUND = "Name not found!";

// ── Module-level state ────────────────────────────────────
let allTextsData      = [];
let allNamesData      = [];
let nameSuggestions   = [];
let namesTable        = null;
let mainTableRef      = null;
let activeIndex       = -1;   // keyboard nav position in autocomplete
let lastTextRows      = null; // name rows for the currently selected text
let lastSelectedNames = null; // highlighted row in the names table
let lastSelectedTexts = null; // highlighted row in the texts table
let cityFilter        = "all";
let chapterFilter     = "all"; // "all" | "4" | "5" | "6" | "0" (unassigned)
let contextLabel      = { html: "All Texts" };
let activePerson      = null; // { pid, pn } — set when name-row filter is active

const G = s => `<span class="label-dynamic">${escapeHtml(s)}</span>`;

// Build full label HTML: context + city suffix + chapter suffix (all highlighted)
function compositeLabel() {
  const citySuffix = cityFilter === "nippur" ? ` from ${G("Nippur")}`
                   : cityFilter === "ur"     ? ` from ${G("Ur")}`
                   : "";
  const chapLabel  = chapterFilter === "0" ? "–" : chapterFilter;
  const chapSuffix = chapterFilter !== "all" ? ` · Ch.${G(chapLabel)}` : "";
  return contextLabel.html + citySuffix + chapSuffix;
}

// ── Helpers ───────────────────────────────────────────────

/** Escape all HTML special characters, including quotes for attribute safety. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

/**
 * Normalise a cell value: returns null for empty/dash strings,
 * otherwise returns the trimmed string.
 */
function val(v) {
  const t = String(v ?? "").trim();
  return (t === "" || t === "-") ? null : t;
}

/** Trim a cell value to a plain string (no null coercion like val()). */
function str(v) { return String(v ?? "").trim(); }

/** Render a read-only label/value detail row, or "" if the value is empty. */
function renderField(label, value) {
  const v = val(value);
  if (!v) return "";
  return `<div class="detail-row">
    <span class="detail-label">${label}:</span>
    <span class="detail-value">${escapeHtml(v)}</span>
  </div>`;
}

/** Render a clickable label/value detail row that filters the text table. */
function renderClickableField(label, value, field) {
  const v = val(value);
  if (!v) return "";
  return `<div class="detail-row">
    <span class="detail-label">${label}:</span>
    <span class="detail-value clickable"
          data-field="${escapeHtml(field)}"
          data-value="${escapeHtml(v)}"
    >${escapeHtml(v)}</span>
  </div>`;
}

/** Wrap the matched portion of text in a <mark> for autocomplete highlighting. */
function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  return escapeHtml(text.slice(0, idx))
       + `<mark>${escapeHtml(text.slice(idx, idx + query.length))}</mark>`
       + escapeHtml(text.slice(idx + query.length));
}

// ── Row selection ─────────────────────────────────────────

/** Highlight a row in one table without disturbing the other table's highlight. */
function setSelectedRow(row, source) {
  const isNames = source === "names";
  const prev    = isNames ? lastSelectedNames : lastSelectedTexts;

  if (prev && prev.getElement()) {
    prev.getElement().classList.remove("row-selected");
  }
  if (isNames) lastSelectedNames = row;
  else         lastSelectedTexts = row;

  if (row.getElement()) {
    row.getElement().classList.add("row-selected");
  }
}

/** Remove the highlight from one or both tables. */
function clearSelectedRow(source) {
  if (source === "names" || source === "both") {
    if (lastSelectedNames && lastSelectedNames.getElement()) {
      lastSelectedNames.getElement().classList.remove("row-selected");
    }
    lastSelectedNames = null;
  }
  if (source === "texts" || source === "both") {
    if (lastSelectedTexts && lastSelectedTexts.getElement()) {
      lastSelectedTexts.getElement().classList.remove("row-selected");
    }
    lastSelectedTexts = null;
  }
}

// ── Names table helpers ───────────────────────────────────

/** Repopulate the names table and resize the panel to fit. */
function setNamesData(rows, placeholder) {
  if (!namesTable) return;
  namesTable.setData(rows).then(() => {
    if (rows.length === 0) {
      namesTable.element.querySelector(".tabulator-placeholder span")
        ?.replaceWith(Object.assign(document.createElement("span"), { textContent: placeholder }));
    }
    setTimeout(clampNamesPanelHeight, 30);
  });
}

// ── Names panel: dynamic height ───────────────────────────
// NOTE: ROW_HEIGHT and GRID_GAP must match the Tabulator row height
// and the .page-grid gap value in CSS respectively.
const ROW_HEIGHT   = 35;
const GRID_GAP     = 14;
const HEADER_H_EST = 40;
const MIN_ROWS     = 3;
const COL_HEADER_H = 35; // Tabulator's internal column header bar height

function clampNamesPanelHeight() {
  const leftRows = [
    document.querySelector(".id-date-row"),
    document.getElementById("box-links"),
    document.getElementById("box-class")
  ];

  const maxH = leftRows.reduce((sum, el, i) => {
    if (!el) return sum;
    return sum + el.getBoundingClientRect().height + (i < leftRows.length - 1 ? GRID_GAP : 0);
  }, 0);

  if (maxH <= 0) return;

  const panel    = document.querySelector(".names-panel");
  const headerEl = document.querySelector(".names-panel-header");
  const body     = document.querySelector(".names-table-body");
  const headerH  = headerEl ? headerEl.getBoundingClientRect().height : HEADER_H_EST;

  const rowCount   = namesTable ? namesTable.getData().length : 0;

  const minBodyH   = COL_HEADER_H + MIN_ROWS * ROW_HEIGHT;
  const idealBodyH = rowCount > 0 ? COL_HEADER_H + rowCount * ROW_HEIGHT : minBodyH;
  const maxBodyH   = Math.max(minBodyH, maxH - headerH);
  const bodyH      = Math.min(Math.max(minBodyH, idealBodyH), maxBodyH);

  body.style.height     = `${bodyH}px`;
  panel.style.maxHeight = `${headerH + bodyH}px`;
}

window.addEventListener("load",   () => setTimeout(clampNamesPanelHeight, 150));
window.addEventListener("resize", clampNamesPanelHeight);

// ── Text table helpers ────────────────────────────────────

function updateTableHeader() {
  const count = mainTableRef ? mainTableRef.getDataCount("active") : 0;
  document.getElementById("main-table-label").innerHTML = compositeLabel();
  document.getElementById("main-table-count").textContent = `| ${count} ${count === 1 ? "text" : "texts"}`;
}

// Set context label: setContextLabel("static prefix ", "dynamic value")
// or setContextLabel("plain string") for fully static labels
function setContextLabel(staticPart, dynamicPart) {
  if (dynamicPart !== undefined) {
    contextLabel = { html: escapeHtml(staticPart) + G(dynamicPart) };
  } else {
    contextLabel = { html: escapeHtml(staticPart) };
  }
  updateTableHeader();
}

function resetTextFilter() {
  if (!mainTableRef) return;
  mainTableRef.clearFilter();
  contextLabel = { html: "All Texts" };
  activePerson = null;
  updateTableHeader();
}

// ── Detail panel ─────────────────────────────────────────

/** Populate the left-side detail boxes from a record object. */
function displayDetailOnly(record) {
  document.getElementById("box-textid").innerHTML = val(record.TextID_D)
    ? `<div class="big-value">${escapeHtml(record.TextID_D)}</div>`
    : "<span class='empty-state'>—</span>";

  const dateD = val(record.Date_D);
  const ruler = val(record.Ruler) || "-";
  const year  = val(record.Year)  || "-";
  const month = val(record.Month) || "-";
  const day   = val(record.Day)   || "-";
  const sub   = `(${escapeHtml(ruler)} ${escapeHtml(year)}, ${escapeHtml(month)}/${escapeHtml(day)})`;
  document.getElementById("box-date").innerHTML = dateD
    ? `<div class="big-value">${escapeHtml(dateD)} <span class="date-subtitle">${sub}</span></div>`
    : `<div class="date-subtitle">${sub}</div>`;

  // Build external links block
  let linksHtml = "";
  const cdliId  = val(record.TextID_C);
  const cdliP   = val(record.Pnum);
  const cdliUrl = val(record["CDLI Link"]);
  if (cdliId || cdliUrl || cdliP) {
    const p = cdliP ? ` (${escapeHtml(cdliP)})` : "";
    linksHtml += `<div class="link-group">`;
    if (cdliId) linksHtml += `<div class="link-group-label">CDLI: ${escapeHtml(cdliId)}${p}</div>`;
    if (cdliUrl) linksHtml += `<div class="link-group-sub">&#8627;&nbsp;<a class="external-link" href="${escapeHtml(cdliUrl)}" target="_blank">CDLI Link</a></div>`;
    linksHtml += `</div>`;
  }
  const archibabId  = val(record.TextNum_A);
  const archibabT   = val(record.TNum);
  const archibabUrl = val(record["ARCHIBAB Link"]);
  if (archibabId || archibabUrl || archibabT) {
    const t = archibabT ? ` (${escapeHtml(archibabT)})` : "";
    linksHtml += `<div class="link-group">`;
    if (archibabId) linksHtml += `<div class="link-group-label">ARCHIBAB: ${escapeHtml(archibabId)}${t}</div>`;
    if (archibabUrl) linksHtml += `<div class="link-group-sub">&#8627;&nbsp;<a class="external-link" href="${escapeHtml(archibabUrl)}" target="_blank">ARCHIBAB Link</a></div>`;
    linksHtml += `</div>`;
  }
  document.getElementById("detail-links").innerHTML =
    linksHtml || "<span class='empty-state'>No external database records</span>";

  // Build classification block and wire click handlers
  const classHtml =
    renderClickableField("Genre",   record.Genre_D,   "Genre_D")   +
    renderClickableField("Dossier", record.Dossier_D, "Dossier_D") +
    renderClickableField("Archive", record.Archive_D, "Archive_D");
  const classBox = document.getElementById("detail-class");
  classBox.innerHTML = classHtml || "<span class='empty-state'>No details available</span>";

  classBox.querySelectorAll(".detail-value.clickable").forEach(el => {
    el.addEventListener("click", () => {
      const { field, value } = el.dataset;
      if (!mainTableRef || !field || !value) return;
      mainTableRef.clearFilter();
      // Function filter: trim+lowercase both sides to avoid exact-match failures
      // (Tabulator's "=" operator is strict and case-sensitive)
      const needle = value.trim().toLowerCase();
      mainTableRef.setFilter(row => String(row[field] ?? "").trim().toLowerCase() === needle);
      if      (field === "Genre_D")   setContextLabel("Texts of the ", value + " genre");
      else if (field === "Dossier_D") setContextLabel("Texts from the ", value + " dossier");
      else if (field === "Archive_D") setContextLabel("The ", value + " archive");
      else setContextLabel(value);
    });
  });
}

/** Populate details and refresh the names panel for a selected text row. */
function displayRecord(record, tabulatorRow) {
  displayDetailOnly(record);
  if (tabulatorRow) setSelectedRow(tabulatorRow, "texts");
  loadNamesForText(record.TextID_D);
}

// ── Names for a specific text ─────────────────────────────

// Returns true if a names row's T_TID matches the current city filter
function nameMatchesCity(r) {
  if (cityFilter === "all") return true;
  const tid = str(r.T_TID).toUpperCase();
  if (cityFilter === "nippur") return tid.startsWith("NIPPUR");
  if (cityFilter === "ur")     return tid.startsWith("UR");
  return true;
}

function loadNamesForText(textID) {
  if (!namesTable) return;
  document.getElementById("names-search-input").value = "";
  hideAutocomplete();

  // Always remove any existing warning first
  const namesPanel = document.querySelector(".names-panel");
  namesPanel.querySelectorAll(".names-filter-warning").forEach(el => el.remove());

  const rows = allNamesData.filter(
    r => str(r.T_TID) === str(textID) && nameMatchesCity(r)
  );
  lastTextRows = rows;

  // ── City mismatch warning ──────────────────────────────
  if (rows.length === 0 && cityFilter !== "all") {
    const hiddenRows = allNamesData.filter(r => str(r.T_TID) === str(textID));
    if (hiddenRows.length > 0) {
      namesTable.setData([]).then(() => {
        const cityLabel = cityFilter.charAt(0).toUpperCase() + cityFilter.slice(1);
        const tid       = str(textID).toUpperCase();
        const textCity  = tid.startsWith("NIPPUR") ? "Nippur" : "Ur";
        const count     = hiddenRows.length;
        const noun      = count === 1 ? "name" : "names";

        const warning = document.createElement("div");
        warning.className = "names-filter-warning";
        warning.innerHTML = `
          <div class="names-filter-warning-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 2L14 13H2L8 2Z" stroke="#c9a84c" stroke-width="1.5" stroke-linejoin="round"/>
              <line x1="8" y1="6" x2="8" y2="9.5" stroke="#c9a84c" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="8" cy="11.5" r="0.75" fill="#c9a84c"/>
            </svg>
          </div>
          <div class="names-filter-warning-text">
            <strong>${count} ${noun}</strong> exist for this text but are hidden<br>
            because the <strong>${cityLabel}</strong> filter is active for a <strong>${textCity}</strong> text.
          </div>
          <button class="names-filter-warning-btn">&#8635; Show all cities</button>`;

        warning.querySelector(".names-filter-warning-btn").addEventListener("click", () => {
          cityFilter = "all";
          document.querySelectorAll(".city-btn").forEach(b =>
            b.classList.toggle("city-btn-active", b.dataset.city === "all")
          );
          setTimeout(updateTableHeader, 30);
          warning.remove();
          loadNamesForText(textID);
        });

        namesPanel.appendChild(warning);
        clampNamesPanelHeight();
      });
      return;
    }
  }

  // ── Chapter mismatch warning ───────────────────────────
  if (chapterFilter !== "all" && mainTableRef) {
    const textRecord = allTextsData.find(r => str(r.TextID_D) === str(textID));
    if (textRecord) {
      const chapVal    = str(textRecord.Chap);
      const isUnassigned = chapVal === "" || chapVal === "0" || chapVal === "-";
      const textChaps  = isUnassigned ? ["0"] : chapVal.split(";").map(c => c.trim());
      const matchesChap = chapterFilter === "0"
        ? isUnassigned
        : textChaps.includes(chapterFilter);

      if (!matchesChap) {
        const chapDisplay = chapterFilter === "0" ? "–" : chapterFilter;
        const textChapDisplay = textChaps.map(c => c === "0" ? "–" : `Ch.${c}`).join(", ");
        const allRows = allNamesData.filter(r => str(r.T_TID) === str(textID));
        const count = allRows.length;
        const noun  = count === 1 ? "name" : "names";

        namesTable.setData([]).then(() => {
          const warning = document.createElement("div");
          warning.className = "names-filter-warning";
          warning.innerHTML = `
            <div class="names-filter-warning-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 2L14 13H2L8 2Z" stroke="#c9a84c" stroke-width="1.5" stroke-linejoin="round"/>
                <line x1="8" y1="6" x2="8" y2="9.5" stroke="#c9a84c" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="8" cy="11.5" r="0.75" fill="#c9a84c"/>
              </svg>
            </div>
            <div class="names-filter-warning-text">
              <strong>${count} ${noun}</strong> exist for this text but are hidden<br>
              because the <strong>Ch.${chapDisplay}</strong> filter is active for a <strong>${textChapDisplay}</strong> text.
            </div>
            <button class="names-filter-warning-btn">&#8635; Show all chapters</button>`;

          warning.querySelector(".names-filter-warning-btn").addEventListener("click", () => {
            chapterFilter = "all";
            document.querySelectorAll(".chap-btn").forEach(b =>
              b.classList.toggle("city-btn-active", b.dataset.chap === "all")
            );
            setTimeout(updateTableHeader, 30);
            warning.remove();
            loadNamesForText(textID);
          });

          namesPanel.appendChild(warning);
          clampNamesPanelHeight();
        });
        return;
      }
    }
  }

  namesTable.options.placeholder = rows.length === 0 ? PH_NO_NAMES : PH_SELECT_TEXT;
  namesTable.setData(rows).then(() => {
    clampNamesPanelHeight();
    if (!activePerson) return;
    const { pid, pn } = activePerson;
    const match = namesTable.getRows().find(r => {
      const d = r.getData();
      return str(d.P_PID) === pid &&
             str(d.P_PN)  === pn;
    });
    if (match) setSelectedRow(match, "names");
  });
}

// ── Autocomplete ──────────────────────────────────────────

const namesSearchInput = document.getElementById("names-search-input");
const autocompleteList = document.getElementById("names-autocomplete-list");
const namesClearBtn    = document.getElementById("names-clear-search");

function getFilteredSuggestions(query) {
  if (!query || query.length < 3) return [];
  const q = query.toLowerCase();
  return nameSuggestions.filter(s => s.toLowerCase().includes(q));
}

function showAutocomplete(suggestions, query) {
  activeIndex = -1;
  if (suggestions.length === 0) { hideAutocomplete(); return; }

  autocompleteList.innerHTML = suggestions
    .map((s, i) =>
      `<div class="autocomplete-item" data-value="${escapeHtml(s)}" data-index="${i}">${highlightMatch(s, query)}</div>`
    )
    .join("");
  autocompleteList.classList.add("visible");

  autocompleteList.querySelectorAll(".autocomplete-item").forEach(item => {
    item.addEventListener("mousedown", e => {
      e.preventDefault(); // prevent blur firing before click
      selectSuggestion(item.dataset.value);
    });
  });
}

function hideAutocomplete() {
  autocompleteList.classList.remove("visible");
  autocompleteList.innerHTML = "";
  activeIndex = -1;
}

/** Select a suggestion: populate the input and immediately apply the filter. */
function selectSuggestion(value) {
  namesSearchInput.value = value;
  hideAutocomplete();
  applyNamesFilter(value);
}

// ── Names filter ──────────────────────────────────────────

/**
 * Filter the names table (and drive the text table) by a committed query.
 * Only called on explicit commits: suggestion select, Enter, or clear.
 */
function applyNamesFilter(query) {
  if (!namesTable) return;
  const q = query.trim().toLowerCase();
  resetTextFilter();

  if (!q) {
    const rows = lastTextRows ?? [];
    setNamesData(rows, rows.length === 0 ? PH_NO_NAMES : PH_SELECT_TEXT);
    return;
  }

  const filtered = allNamesData.filter(r =>
    nameMatchesCity(r) && (
      str(r.P_PN).toLowerCase().includes(q) ||
      str(r.P_Notes).toLowerCase().includes(q)
    )
  );
  setNamesData(filtered, filtered.length === 0 ? PH_NAME_NOT_FOUND : "");

  if (mainTableRef && filtered.length > 0) {
    const matchingTIDs = new Set(filtered.map(r => str(r.T_TID)));
    mainTableRef.setFilter(r => matchingTIDs.has(str(r.TextID_D)));
    setContextLabel("All Texts relating to the search ", query.trim());
  }
}

// Input: drives autocomplete only; never touches the table directly
namesSearchInput.addEventListener("input", function () {
  const q = this.value.trim();
  if (!q) { hideAutocomplete(); applyNamesFilter(""); return; }
  if (q.length >= 3) showAutocomplete(getFilteredSuggestions(q), q);
  else hideAutocomplete();
});

// Keyboard navigation within the autocomplete dropdown
namesSearchInput.addEventListener("keydown", function (e) {
  const items = autocompleteList.querySelectorAll(".autocomplete-item");
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    if (!items.length) return;
    e.preventDefault();
    activeIndex = e.key === "ArrowDown"
      ? Math.min(activeIndex + 1, items.length - 1)
      : Math.max(activeIndex - 1, 0);
    items.forEach((el, i) => el.classList.toggle("active", i === activeIndex));
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (activeIndex >= 0 && items[activeIndex]) {
      selectSuggestion(items[activeIndex].dataset.value);
    } else {
      hideAutocomplete();
      applyNamesFilter(this.value);
    }
  } else if (e.key === "Escape") {
    hideAutocomplete();
  }
});

// Blur: hide dropdown only; never commits a filter change
namesSearchInput.addEventListener("blur", () => setTimeout(hideAutocomplete, 150));

// Clear button: restore the last text's name rows
namesClearBtn.addEventListener("click", () => {
  namesSearchInput.value = "";
  hideAutocomplete();
  applyNamesFilter("");
});

// ── Clear All ─────────────────────────────────────────────
function clearAll() {
  namesSearchInput.value = "";
  document.getElementById("search-input").value = "";
  hideAutocomplete();

  lastTextRows = null;
  setNamesData([], PH_SELECT_TEXT);

  contextLabel = { html: "All Texts" };
  activePerson = null;
  cityFilter   = "all";
  chapterFilter = "all";
  document.querySelectorAll(".city-btn").forEach(b =>
    b.classList.toggle("city-btn-active", b.dataset.city === "all")
  );
  document.querySelectorAll(".chap-btn").forEach(b =>
    b.classList.toggle("city-btn-active", b.dataset.chap === "all")
  );
  if (mainTableRef) mainTableRef.clearFilter();
  updateTableHeader();

  document.getElementById("box-textid").innerHTML    = "<span class='empty-state'>—</span>";
  document.getElementById("box-date").innerHTML      = "<span class='empty-state'>—</span>";
  document.getElementById("detail-links").innerHTML  = "<span class='empty-state'>Click a row to view details</span>";
  document.getElementById("detail-class").innerHTML  = "<span class='empty-state'>Click a row to view details</span>";

  clearSelectedRow("both");
}

document.getElementById("clear-all-btn").addEventListener("click", clearAll);

// ── Data loading ──────────────────────────────────────────

/** Parse a CSV URL with PapaParse and return a promise of { data, fields }. */
function fetchCSV(url) {
  return fetch(url)
    .then(r => r.text())
    .then(text => {
      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim()
      });
      return { data: result.data, fields: result.meta.fields };
    });
}

// Load name suggestions (autocomplete pool)
fetchCSV(SUGGESTIONS_URL)
  .then(({ data }) => {
    const seen = new Set();
    data.forEach(row =>
      Object.values(row).forEach(cell => {
        const s = String(cell ?? "").trim();
        if (s && s !== "-") seen.add(s);
      })
    );
    nameSuggestions = Array.from(seen).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  })
  .catch(err => console.error("Suggestions CSV error:", err));

// Load names data and initialise the names Tabulator
fetchCSV(NAMES_URL)
  .then(({ data }) => {
    allNamesData = data;

    namesTable = new Tabulator("#names-table", {
      data: [],
      layout: "fitColumns",
      height: "100%",
      placeholder: PH_SELECT_TEXT,
      columns: [
        { title: "ID",               field: "T_TID",         width: 110,  resizable: false },
        { title: "Date",             field: "Texts::Date_D", width: 80,   resizable: false },
        { title: "PID",              field: "P_PID",         width: 55,   resizable: false },
        { title: "PN",               field: "P_PN",          width: 130,  resizable: false },
        { title: "Identifying Info", field: "P_Notes",       width: 200,  resizable: false },
        { title: "Role in Text",     field: "P_Role",        minWidth: 100, resizable: false }
      ]
    });

    namesTable.on("rowClick", (e, row) => {
      const data = row.getData();
      const tid  = str(data.T_TID);
      const pid  = str(data.P_PID);
      const pn   = str(data.P_PN);

      if (!pid && !pn) return;

      const matchingTIDs = new Set(
        allNamesData
          .filter(r =>
            nameMatchesCity(r) &&
            str(r.P_PID) === pid &&
            str(r.P_PN)  === pn
          )
          .map(r => str(r.T_TID))
      );
      if (matchingTIDs.size === 0) return;

      const pidPart = pid ? ` (${pid})` : " (uncertain)";
      const dynamic = pn ? `${pn}${pidPart}` : pidPart.trim();

      if (mainTableRef) {
        mainTableRef.setFilter(r => matchingTIDs.has(str(r.TextID_D)));
        setContextLabel("All Texts relating to ", dynamic);
        activePerson = { pid, pn };
      }

      setSelectedRow(row, "names");

      if (mainTableRef && tid) {
        // Try to highlight immediately — works when the filter hasn't changed
        // (e.g. clicking a different name row for the same person filter)
        const immediate = mainTableRef.getRows("active").find(
          r => str(r.getData().TextID_D) === tid
        );
        if (immediate) {
          setSelectedRow(immediate, "texts");
        } else {
          // Filter is still settling — wait for dataFiltered then highlight
          mainTableRef.on("dataFiltered", function highlightOnce() {
            mainTableRef.off("dataFiltered", highlightOnce);
            const match = mainTableRef.getRows("active").find(
              r => str(r.getData().TextID_D) === tid
            );
            if (match) setSelectedRow(match, "texts");
          });
        }
      }

      if (tid && allTextsData.length > 0) {
        const textRecord = allTextsData.find(
          r => str(r.TextID_D) === tid
        );
        if (textRecord) displayDetailOnly(textRecord);
      }
    });
  })
  .catch(err => console.error("Names CSV error:", err));

// Load texts data and initialise the main Tabulator
fetchCSV(TEXTS_URL)
  .then(({ data, fields }) => {
    allTextsData = data;

    const excludedFields = new Set(["CDLI Link", "ARCHIBAB Link", "Chap"]);

    const colTitles = {
      "TextID_D":  "ID",
      "Date_D":    "Date",
      "Dossier_D": "Dossier",
      "Archive_D": "Archive",
      "Genre_D":   "Genre",
      "Locus_D":   "Locus",
      "Stratum_D": "Stratum",
      "ExcNum_C":  "Excavation No.",
      "MusAcc_C":  "Accession No.",
      "Mus_C":     "Museum No.",
      "TNum":      "ARCHIBAB ID",
      "Pnum":      "CDLI ID",
      "TextID_C":  "CDLI Name",
      "TextNum_A": "ARCHIBAB Name",
      "TextID_A":  "Additional IDs (ARCHIBAB)"
    };

    const colOrder = [
      "TextID_D", "Date_D", "Ruler", "Year", "Month", "Day",
      "Genre_D", "Dossier_D", "Archive_D", "Locus_D", "Stratum_D",
      "ExcNum_C", "MusAcc_C", "Mus_C",
      "Pnum", "TextID_C",
      "TNum", "TextNum_A", "TextID_A"
    ];

    const orderedFields = [
      ...colOrder.filter(f => fields.includes(f) && !excludedFields.has(f)),
      ...fields.filter(f => !colOrder.includes(f) && !excludedFields.has(f))
    ];

    const CHAR_PX = 8;
    const COL_PAD = 24;
    const MIN_W   = 48;

    function colWidthForRows(field, rows) {
      const title   = colTitles[field] || field;
      const headerW = title.length * CHAR_PX + COL_PAD;
      const maxCell = rows.reduce((mx, row) => {
        const len = String(row[field] ?? "").length;
        return len > mx ? len : mx;
      }, 0);
      return Math.max(MIN_W, headerW, maxCell * CHAR_PX + COL_PAD);
    }

    function resizeColumnsToVisible() {
      if (!mainTableRef) return;
      const visible = mainTableRef.getData("active");
      orderedFields.forEach(field => {
        const col = mainTableRef.getColumn(field);
        if (col) col.setWidth(colWidthForRows(field, visible));
      });
    }

    const columns = orderedFields.map(f => ({
      title: colTitles[f] || f,
      field: f,
      width: colWidthForRows(f, data)
    }));

    mainTableRef = new Tabulator("#main-table", {
      data,
      layout: "fitData",
      height: "100%",
      columns
    });

    mainTableRef.on("rowClick",    (e, row) => displayRecord(row.getData(), row));
    mainTableRef.on("dataFiltered", (filters, rows) => {
      setTimeout(resizeColumnsToVisible, 0);
      document.getElementById("main-table-count").textContent = `| ${rows.length} ${rows.length === 1 ? "text" : "texts"}`;
    });

    mainTableRef.on("tableBuilt", () => updateTableHeader());

    // ── Prefix → field mapping for column-targeted search ──
    const PREFIX_MAP = {
      "id":   "TextID_D",
      "date": "Date_D",
      "r":    "Ruler",
      "y":    "Year",
      "m":    "Month",
      "d":    "Day",
      "dos":  "Dossier_D",
      "arch": "Archive_D",
      "gen":  "Genre_D"
    };

    // ── City toggle ────────────────────────────────────────
    document.querySelectorAll(".city-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        cityFilter = btn.dataset.city;
        document.querySelectorAll(".city-btn").forEach(b =>
          b.classList.toggle("city-btn-active", b === btn)
        );
        applyTextFilter();
        setTimeout(updateTableHeader, 30);
      });
    });

    // ── Chapter toggle ─────────────────────────────────────
    document.querySelectorAll(".chap-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        chapterFilter = btn.dataset.chap;
        document.querySelectorAll(".chap-btn").forEach(b =>
          b.classList.toggle("city-btn-active", b === btn)
        );
        applyTextFilter();
        setTimeout(updateTableHeader, 30);
      });
    });

    // ── Combined filter function ───────────────────────────
    const searchInput = document.getElementById("search-input");

    function applyTextFilter() {
      if (!mainTableRef) return;

      const raw = searchInput.value.trim();
      const pairs = [];
      const usedRanges = [];

      const prefixPattern = /(\w+):(\S+)/gi;
      let match;
      while ((match = prefixPattern.exec(raw)) !== null) {
        const prefix = match[1].toLowerCase();
        if (PREFIX_MAP[prefix] && match[2]) {
          pairs.push({ field: PREFIX_MAP[prefix], term: match[2].toLowerCase() });
          usedRanges.push([match.index, match.index + match[0].length]);
        }
      }

      let freeText = raw;
      [...usedRanges].reverse().forEach(([start, end]) => {
        freeText = freeText.slice(0, start) + freeText.slice(end);
      });
      freeText = freeText.trim().toLowerCase();

      if (raw) {
        contextLabel = { html: escapeHtml("Texts matching ") + G(raw) };
      } else {
        contextLabel = { html: "All Texts" };
      }
      document.getElementById("main-table-label").innerHTML = compositeLabel();

      const hasCityFilter    = cityFilter    !== "all";
      const hasChapterFilter = chapterFilter !== "all";
      const hasAnyFilter     = pairs.length > 0 || freeText || hasCityFilter || hasChapterFilter;

      if (!hasAnyFilter) {
        mainTableRef.clearFilter();
      } else {
        mainTableRef.setFilter(row => {
          const id = str(row.TextID_D).toUpperCase();
          if (cityFilter === "nippur" && !id.startsWith("NIPPUR")) return false;
          if (cityFilter === "ur"     && !id.startsWith("UR"))     return false;

          // Chapter filter: split on ";" to handle multi-chapter values like "4;6"
          if (hasChapterFilter) {
            const chapVal = str(row.Chap);
            const chapValue = chapterFilter === "0"
              ? (chapVal === "" || chapVal === "0" || chapVal === "-")
              : chapVal.split(";").map(c => c.trim()).includes(chapterFilter);
            if (!chapValue) return false;
          }

          for (const { field, term } of pairs) {
            if (!str(row[field]).toLowerCase().includes(term)) return false;
          }
          if (freeText) {
            const anyMatch = Object.values(row).some(v =>
              String(v).toLowerCase().includes(freeText)
            );
            if (!anyMatch) return false;
          }
          return true;
        });
      }
    }

    // Search commits on Enter only
    searchInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        activePerson = null;
        applyTextFilter();
      }
    });

    document.getElementById("clear-search").addEventListener("click", () => {
      searchInput.value = "";
      resetTextFilter();
      applyTextFilter();
    });
  })
  .catch(err => console.error("Texts CSV error:", err));
