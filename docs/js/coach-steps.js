// ── Coach Mark Step Definitions ───────────────────────────
// Edit this file to update tour content without touching any logic.

const COACH_STEPS = [
  {
    targetId: "city-toggle",
    title: "Filter by Site",
    body: `<p>Use <strong style="color:#c9a84c">Nippur</strong>, <strong style="color:#c9a84c">All</strong>, or <strong style="color:#c9a84c">Ur</strong> to restrict every table and search to a single excavation site. The active city is highlighted in gold.</p>
           <p>Changing the city filter updates the texts table, detail panels, and the names panel simultaneously.</p>`
  },
  {
    targetId: "bottom-controls",
    title: "Search Across All Fields",
    body: `<p>Type any term and press <strong style="color:#c9a84c">Enter</strong> to search across every column at once — free text matches anything in any field.</p>
           <p>You can also target a specific column using a <strong style="color:#c9a84c">prefix:</strong> syntax:</p>
           <table class="coach-prefix-table">
             <thead><tr><th>Prefix</th><th>Column</th><th>Example</th></tr></thead>
             <tbody>
               <tr><td><code>id:</code></td><td>Deloucas ID</td><td><code>id:NIPPUR-1</code></td></tr>
               <tr><td><code>d:</code></td><td>Date</td><td><code>d:AS7</code></td></tr>
               <tr><td><code>r:</code></td><td>Ruler</td><td><code>r:Amar-Suen</code></td></tr>
               <tr><td><code>y:</code></td><td>Year</td><td><code>y:7</code></td></tr>
               <tr><td><code>m:</code></td><td>Month</td><td><code>m:3</code></td></tr>
               <tr><td><code>day:</code></td><td>Day</td><td><code>day:15</code></td></tr>
               <tr><td><code>dos:</code></td><td>Dossier</td><td><code>dos:Garshana</code></td></tr>
               <tr><td><code>arc:</code></td><td>Archive</td><td><code>arc:Drehem</code></td></tr>
               <tr><td><code>gen:</code></td><td>Genre</td><td><code>gen:legal</code></td></tr>
               <tr><td><code>loc:</code></td><td>Locus</td><td><code>loc:153</code></td></tr>
               <tr><td><code>cdli:</code></td><td>CDLI Name</td><td><code>cdli:P123456</code></td></tr>
               <tr><td><code>arch:</code></td><td>ARCHIBAB Name</td><td><code>arch:A1234</code></td></tr>
             </tbody>
           </table>
           <p style="margin-top:10px">Prefixes can be combined with free text, e.g. <code style="background:#3d3d3d;color:#f0c060;padding:1px 5px;border-radius:3px;font-size:11px">gen:administrative Nippur</code>.</p>`
  },
  {
    targetIds: ["main-table-header", "main-table"],
    title: "Texts Table",
    body: `<p>This table lists all cuneiform texts matching your current filters. <strong style="color:#c9a84c">Click any row to load its details in the panels below.</strong></p>
           <p>The <strong style="color:#c9a84c">header</strong> above the table shows what is currently displayed — e.g. <em>"Texts from the Aha-nirshi dossier from Ur"</em> — along with a count of matching texts. Both the label and count update live as you filter.</p>
           <p>Scroll horizontally inside the table to see all fields.</p>`
  },
  {
    targetId: "id-date-row",
    title: "Deloucas ID & Date",
    body: `<p>When you select a text row, its <strong style="color:#c9a84c">ID</strong> and <strong style="color:#c9a84c">Date</strong> appear here. The date includes the ruler, regnal year, month, and day.</p>
           <p>These boxes always reflect the last row you clicked, even if you subsequently change the search filter.</p>`
  },
  {
    targetId: "box-links",
    title: "External Database Links",
    body: `<p>Links to the selected text's records in <strong style="color:#c9a84c">CDLI</strong> and <strong style="color:#c9a84c">ARCHIBAB</strong> appear here when available.</p>
           <p>Click a link to open the external record in a new tab.</p>`
  },
  {
    targetId: "box-class",
    title: "Genre, Dossier & Archive",
    body: `<p>Shows the <strong style="color:#c9a84c">Genre</strong>, <strong style="color:#c9a84c">Dossier</strong>, and <strong style="color:#c9a84c">Archive</strong> for the selected text.</p>
           <p>Each value is <strong style="color:#c9a84c">clickable</strong>. Clicking it immediately filters the texts table to show all records sharing that genre, dossier, or archive.</p>`
  },
  {
    targetIds: ["names-panel-header", "names-table-body"],
    title: "Names Panel",
    body: `<p>Shows all people mentioned in the selected text. Click a name row to filter the texts table to all texts in which that person appears.</p>
           <p>Use the <strong style="color:#c9a84c">search box</strong> at the top of this panel to find a person by name across the entire dataset. It suggests <strong style="color:#c9a84c">matches after 3 characters</strong> and filters both the names list and the texts table when you commit with Enter or by selecting a suggestion.</p>`
  }
];
