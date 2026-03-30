// ── Coach Mark Step Definitions ───────────────────────────
// Edit this file to update user guide content.

const COACH_STEPS = [
  {
    targetId: "sort-toggle",
    title: "Filter by Chapter or City",
    body: `<p>Sort by <strong style="color:#c9a84c">Chapter</strong>, <strong style="color:#c9a84c">City</strong>, or <strong style="color:#c9a84c">All</strong> to restrict search. The active city or chapter is highlighted in gold.</p>
           <p><strong style="color:#c9a84c">Changing the filter updates the texts table, detail panels, and the names panel.</strong></p>`
  },
  {
    targetId: "bottom-controls",
    title: "Search Across All Fields",
    body: `<p>Type any term and press <strong style="color:#c9a84c">Enter</strong> to search across all columns for any field.</p>
           <p>You can target a specific column using <strong style="color:#c9a84c">prefix:</strong> syntax.</p>
           <table class="coach-prefix-table">
             <thead><tr><th>Prefix</th><th>Column</th><th>Example</th></tr></thead>
             <tbody>
               <tr><td><code>id:</code></td><td>Deloucas ID</td><td><code>id:567</code></td></tr>
               <tr><td><code>date:</code></td><td>Date</td><td><code>date:2016</code></td></tr>
               <tr><td><code>r:</code></td><td>Ruler</td><td><code>r:Sumu-el</code></td></tr>
               <tr><td><code>y:</code></td><td>Year</td><td><code>y:7</code></td></tr>
               <tr><td><code>m:</code></td><td>Month</td><td><code>m:3</code></td></tr>
               <tr><td><code>d:</code></td><td>Day</td><td><code>d:15</code></td></tr>
               <tr><td><code>gen:</code></td><td>Genre</td><td><code>gen:legal</code></td></tr>
               <tr><td><code>dos:</code></td><td>Dossier</td><td><code>dos:E-Enlil</code></td></tr>
               <tr><td><code>arch:</code></td><td>Archive</td><td><code>arch:Giparu</code></td></tr>
             </tbody>
           </table>`
  },
  {
    targetIds: ["main-table-header", "main-table"],
    title: "Texts",
    body: `<p>This table lists cuneiform texts matching your current filters. <strong style="color:#c9a84c">Click any row to load its details in the panels below.</strong></p>
           <p>The <strong style="color:#c9a84c">header</strong> above the table shows what is currently displayed, e.g. <em>"Texts from the Aha-nirshi dossier from Ur"</em>, along with a count of matching texts. Label and count update as you filter.</p>
           <p>Scroll horizontally inside the table to see all fields.</p>`
  },
  {
    targetId: "id-date-row",
    title: "Text ID & Date",
    body: `<p>When you select a text row, its <strong style="color:#c9a84c">ID</strong> and <strong style="color:#c9a84c">Date</strong> appear here. The date includes the ruler, regnal year, month, and day.</p>
           <p>These boxes always reflect the last <strong>text row</strong> you clicked, even if you change the search filter.</p>`
  },
  {
    targetId: "box-links",
    title: "External Links",
    body: `<p>Links to the selected text's records in <strong style="color:#c9a84c">CDLI</strong> and <strong style="color:#c9a84c">ARCHIBAB</strong> appear here when available.</p>
           <p>Click a link to open the external record in a new tab.</p>`
  },
  {
    targetId: "box-class",
    title: "Genre, Dossier & Archive",
    body: `<p>Shows the <strong style="color:#c9a84c">Genre</strong>, <strong style="color:#c9a84c">Dossier</strong>, and <strong style="color:#c9a84c">Archive</strong> for the selected text.</p>
           <p>Each value is <strong style="color:#c9a84c">clickable</strong>. Clicking it filters the texts table to show records sharing that genre, dossier, or archive.</p>`
  },
  {
    targetIds: ["names-panel-header", "names-table-body"],
    title: "Names Panel",
    body: `<p>Shows all individuals mentioned in the selected text. Click a name row to update the texts table to texts in which that person appears.</p>
           <p>Use the <strong style="color:#c9a84c">search box</strong> at the top of this panel to find a person by name across the entire dataset. It suggests <strong style="color:#c9a84c">matches after 3 characters</strong> and filters both the names list and the texts table when you commit with Enter or by selecting a suggestion.</p>`
  }
];
