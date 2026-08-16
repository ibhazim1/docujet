/**
 * Lead tracker — Google Sheets backend.
 *
 * This file is not part of the Next.js build. Paste it into the Apps Script
 * project bound to the leads spreadsheet; the Next app talks to it over HTTPS.
 *
 * Why this rather than a service account: Google Cloud organisations commonly
 * enforce `iam.disableServiceAccountKeyCreation`, which blocks downloadable
 * JSON keys outright. A bound Apps Script needs no Cloud project at all — it
 * runs as you, on your own spreadsheet, so no key exists to be blocked and no
 * Drive sharing rule has to be relaxed.
 *
 * It adapts to the sheet rather than the other way round: columns are located
 * by header name, several spellings are accepted per field, and a status
 * column is written back in the vocabulary it already uses. An existing lead
 * table needs no restructuring.
 *
 * ---------------------------------------------------------------------------
 * SETUP
 *
 * 1. Open the spreadsheet → Extensions → Apps Script.
 * 2. Replace Code.gs with this file. Save.
 * 3. Project Settings (gear) → Script properties → Add script property:
 *        CRM_SHEET_SECRET = <a long random string>
 *    Generate one with:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * 4. Deploy → New deployment → type "Web app":
 *        Execute as:      Me
 *        Who has access:  Anyone
 *    "Anyone" means anyone who knows the URL can *reach* the script; every
 *    request is still rejected unless it carries the secret above. Restricting
 *    it further requires an OAuth token the server does not have.
 * 5. Authorise when prompted, then copy the /exec URL.
 * 6. Put both values in the Next app's .env:
 *        CRM_SHEET_ENDPOINT=https://script.google.com/macros/s/.../exec
 *        CRM_SHEET_SECRET=<the same string>
 *    If the tab is not called "Leads", add its name too:
 *        CRM_SHEET_TAB=Data
 * 7. npm run crm:doctor   — confirms the connection and prints the column map
 *
 * `npm run crm:seed` is only for laying out an EMPTY tab with demo data. It
 * clears columns A:N. An existing lead table does not need it and must not be
 * pointed at it.
 *
 * After editing this file: Deploy → Manage deployments → pencil → Version:
 * "New version" → Deploy. Without a new version the old code keeps serving.
 * ---------------------------------------------------------------------------
 *
 * SETTINGS TAB (admin "Settings" page)
 *
 * This deployment also backs the admin Settings page's config store — same
 * script, same deployment, same CRM_SHEET_SECRET, so there is only ever one
 * Apps Script project and one secret to manage. To enable it:
 *
 * 1. Add a tab named "Settings" (or whatever SETTINGS_SHEET_TAB names) with
 *    a header row: key, value, updatedAt. One row per setting, e.g.
 *    "business.phone" | "..." | "2026-08-16T00:00:00.000Z".
 * 2. The Next app already has CRM_SHEET_ENDPOINT/CRM_SHEET_SECRET set from
 *    the steps above — no separate env vars are needed for Settings.
 *
 * See `readSettings`/`writeSettings` below for the read/write half.
 * ---------------------------------------------------------------------------
 */

/**
 * Tab holding the lead book, used when the caller names none.
 *
 * The Next app sends the tab with every request (from CRM_SHEET_TAB), so
 * renaming a tab is a .env change and needs no redeploy. This is only the
 * fallback for a bare request.
 */
var DEFAULT_TAB = 'Leads';

/**
 * Accepted header spellings per field, lowercased, best first.
 *
 * Mirrors COLUMN_ALIASES in src/lib/crm/columns.ts — change one, change the
 * other. The first entry of each is what the seed action writes.
 */
var COLUMN_ALIASES = {
  id: ['id', 'lead id', 'leadid', 'lead_id', 'ref'],
  name: ['name', 'lead', 'lead name', 'full name', 'contact'],
  title: ['title', 'job title', 'position', 'role'],
  email: ['email', 'e-mail', 'email address'],
  phone: ['phone', 'phone number', 'mobile', 'contact number'],
  source: ['source', 'channel', 'lead source'],
  stage: ['stage', 'lifecycle', 'lifecycle stage'],
  created_at: ['created_at', 'date', 'captured', 'created', 'created date'],
  interest: ['interest', 'product interest', 'stated interest'],
  chat_topic: ['chat_topic', 'chat topic', 'question', 'chatbot question'],
  cited: ['cited', 'citations', 'faq', 'kb entries'],
  notes: ['notes', 'note', 'comments', 'remarks'],
  lost: ['lost', 'status', 'state']
};

var FIELDS = ['id', 'name', 'title', 'email', 'phone', 'source',
  'stage', 'created_at', 'interest', 'chat_topic', 'cited', 'notes', 'lost'];

/** Header row written by the seed action. */
var COLUMNS = FIELDS.map(function (f) { return COLUMN_ALIASES[f][0]; });

function doGet(e) {
  return handle(e.parameter || {});
}

function doPost(e) {
  var payload = {};
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'Body was not JSON.' });
  }
  return handle(payload);
}

function handle(payload) {
  var secret = PropertiesService.getScriptProperties().getProperty('CRM_SHEET_SECRET');
  if (!secret) {
    return json({ ok: false, error: 'CRM_SHEET_SECRET script property is not set.' });
  }
  // Constant-length compare is overkill here, but a plain !== leaks length via
  // timing on a public endpoint, and the fix costs one line.
  if (typeof payload.secret !== 'string' || !equals(payload.secret, secret)) {
    return json({ ok: false, error: 'Rejected: wrong or missing secret.' });
  }

  try {
    switch (payload.action) {
      case 'list':
        return json({ ok: true, values: read(payload.tab) });
      case 'setStage':
        return json(withLock(function () { return setStage(payload); }));
      case 'setFields':
        return json(withLock(function () { return setFields(payload); }));
      case 'seed':
        return json(withLock(function () { return seed(payload); }));
      case 'ping':
        return json({ ok: true });
      case 'getSettings':
        return json({ ok: true, values: readSettings(payload) });
      case 'setSettings':
        return json(withLock(function () { return writeSettings(payload); }));
      default:
        return json({ ok: false, error: 'Unknown action: ' + payload.action });
    }
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// ---------------------------------------------------------------------------
// Column resolution
// ---------------------------------------------------------------------------

/**
 * Locates each field in a header row.
 *
 * A column is never claimed twice, so a sheet carrying both "Status" and
 * "Lost" gives the field to whichever appears first rather than silently
 * preferring one. Returns -1 for fields the sheet does not have.
 */
function resolveColumns(header) {
  var normalised = header.map(function (cell) {
    return String(cell).trim().toLowerCase();
  });
  var taken = {};
  var index = {};
  var matched = {};

  FIELDS.forEach(function (field) {
    var found = -1;
    var aliases = COLUMN_ALIASES[field];
    for (var i = 0; i < aliases.length; i++) {
      var at = normalised.indexOf(aliases[i]);
      if (at !== -1 && !taken[at]) {
        found = at;
        break;
      }
    }
    index[field] = found;
    matched[field] = found === -1 ? '' : String(header[found]).trim();
    if (found !== -1) taken[found] = true;
  });

  return { index: index, matched: matched };
}

/**
 * The two words a status column should be written back with.
 *
 * Writing TRUE into a column whose dropdown only permits Active/Lost is
 * rejected by Sheets outright, so the vocabulary follows the header the sheet
 * actually uses.
 */
function lostVocabulary(matchedHeader) {
  var header = String(matchedHeader).trim().toLowerCase();
  if (header === 'status' || header === 'state') {
    return { lost: 'Lost', open: 'Active' };
  }
  return { lost: 'TRUE', open: 'FALSE' };
}

// ---------------------------------------------------------------------------

function sheet(name) {
  var tab = name || DEFAULT_TAB;
  var sh = SpreadsheetApp.getActive().getSheetByName(tab);
  if (!sh) {
    // Naming the tabs that do exist turns "no tab named X" from a guess into
    // an answer.
    var present = SpreadsheetApp.getActive().getSheets().map(function (s) {
      return s.getName();
    });
    throw new Error(
      'This spreadsheet has no tab named "' + tab + '". Tabs present: ' + present.join(', ') +
      '. Set CRM_SHEET_TAB in .env to one of those.'
    );
  }
  return sh;
}

/**
 * Every used cell as a display string.
 *
 * Display values rather than raw values on purpose: a checkbox column reads
 * "TRUE"/"FALSE" and a date cell reads what the user sees, so the client
 * parses one consistent shape. The range is the sheet's own data range, not a
 * fixed width, so a table wider or narrower than the canonical fourteen
 * columns comes back whole.
 */
function read(tab) {
  var sh = sheet(tab);
  if (sh.getLastRow() < 1 || sh.getLastColumn() < 1) return [];
  return sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getDisplayValues();
}

/**
 * Records a stage change.
 *
 * `stage` is always a lifecycle position, never the terminal state — closing a
 * lead sets the status column and leaves the stage alone, so reopening it
 * later restores it to where it actually was.
 *
 * Both target columns are resolved from the header here, at write time, and so
 * is the row: rows can be sorted or inserted in the sheet between a page
 * render and an edit, and a stale position would silently change the wrong
 * cell of the wrong lead.
 */
function setStage(payload) {
  var sh = sheet(payload.tab);
  var last = sh.getLastRow();
  if (last < 2) return { ok: false, error: 'The sheet has no data rows.' };

  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  var columns = resolveColumns(header);

  if (columns.index.id === -1) {
    return { ok: false, error: 'No id column found. Header reads: ' + header.join(', ') };
  }
  if (columns.index.stage === -1) {
    return { ok: false, error: 'No stage column found. Header reads: ' + header.join(', ') };
  }

  var idColumn = columns.index.id + 1;
  var ids = sh.getRange(2, idColumn, last - 1, 1).getDisplayValues();

  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() !== String(payload.id).trim()) continue;

    var row = i + 2;
    sh.getRange(row, columns.index.stage + 1).setValue(payload.stage);

    if (columns.index.lost !== -1) {
      var words = lostVocabulary(columns.matched.lost);
      sh.getRange(row, columns.index.lost + 1)
        .setValue(payload.lost ? words.lost : words.open);
    }

    SpreadsheetApp.flush();
    return { ok: true, row: row };
  }

  return { ok: false, error: 'No row for ' + payload.id };
}

/**
 * Writes arbitrary editable fields onto one lead's row.
 *
 * `payload.fields` is a field -> value map, e.g. { name: "...", phone: "..." }.
 * Fields the sheet has no column for are reported back as skipped rather than
 * silently dropped: a rep who edits a note on a sheet with no notes column
 * should be told, not left believing it saved.
 *
 * `id`, `stage` and `lost` are refused here. The id is the row's identity, and
 * the other two are the lifecycle pair that `setStage` exists to keep
 * consistent — letting a free-text edit set either would let a lead be closed
 * without its stage being preserved.
 */
var UNEDITABLE = { id: true, stage: true, lost: true };

function setFields(payload) {
  var fields = payload.fields || {};
  var sh = sheet(payload.tab);
  var last = sh.getLastRow();
  if (last < 2) return { ok: false, error: 'The sheet has no data rows.' };

  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  var columns = resolveColumns(header);
  if (columns.index.id === -1) {
    return { ok: false, error: 'No id column found. Header reads: ' + header.join(', ') };
  }

  var ids = sh.getRange(2, columns.index.id + 1, last - 1, 1).getDisplayValues();
  var row = -1;
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(payload.id).trim()) {
      row = i + 2;
      break;
    }
  }
  if (row === -1) return { ok: false, error: 'No row for ' + payload.id };

  var written = [];
  var skipped = [];
  Object.keys(fields).forEach(function (field) {
    if (UNEDITABLE[field]) {
      skipped.push(field);
      return;
    }
    var at = columns.index[field];
    if (at === undefined || at === -1) {
      skipped.push(field);
      return;
    }
    sh.getRange(row, at + 1).setValue(String(fields[field]));
    written.push(field);
  });

  SpreadsheetApp.flush();

  if (written.length === 0) {
    return {
      ok: false,
      error: 'This sheet has no column for ' + skipped.join(', ') +
        '. Add one to the header row to make it editable.'
    };
  }
  return { ok: true, row: row, written: written, skipped: skipped };
}

/**
 * Lays out an EMPTY tab: clears columns A:N and writes the header plus rows.
 *
 * Validation rules and number formats are cleared alongside the content. A tab
 * that previously held a different table keeps its old dropdowns after a plain
 * clearContent(), and the first value they reject aborts the write — leaving
 * the tab already emptied. Clearing them first means the operation succeeds or
 * fails before anything is destroyed.
 *
 * The range is then forced to plain text so a date-formatted column cannot come
 * back from getDisplayValues() in some other notation than it went in.
 */
function seed(payload) {
  var rows = payload.rows || [];
  var sh = sheet(payload.tab);
  var target = sh.getRange(1, 1, Math.max(sh.getMaxRows(), 1), COLUMNS.length);

  target.clearDataValidations();
  target.clearContent();
  target.setNumberFormat('@');

  var values = [COLUMNS].concat(rows);
  sh.getRange(1, 1, values.length, COLUMNS.length).setValues(values);
  sh.setFrozenRows(1);
  SpreadsheetApp.flush();

  return { ok: true, count: rows.length };
}

// ---------------------------------------------------------------------------
// Settings — the admin Settings page's config store.
//
// A different tab (typically "Settings"), key/value rows rather than the
// Leads columns above: key | value | updatedAt, one row per setting. Shares
// this same script/deployment/secret rather than a separate one, since the
// authorization boundary (whoever holds CRM_SHEET_SECRET) is identical
// either way.
// ---------------------------------------------------------------------------

/** Every settings row as [key, value] pairs, skipping the header and any blank key. */
function readSettings(payload) {
  var sh = sheet(payload.tab);
  var last = sh.getLastRow();
  if (last < 2) return [];

  var rows = sh.getRange(2, 1, last - 1, 2).getDisplayValues();
  var values = [];
  for (var i = 0; i < rows.length; i++) {
    var key = String(rows[i][0]).trim();
    if (key === '') continue;
    values.push([key, String(rows[i][1])]);
  }
  return values;
}

/**
 * Upserts only the keys present in `payload.entries`.
 *
 * A key this call doesn't mention is left untouched — this is what lets the
 * app omit a secret field an admin left blank without wiping the value
 * already stored for it.
 */
function writeSettings(payload) {
  var entries = payload.entries || {};
  var sh = sheet(payload.tab);
  var last = sh.getLastRow();

  var rowForKey = {};
  if (last >= 2) {
    var keys = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
    for (var i = 0; i < keys.length; i++) {
      var key = String(keys[i][0]).trim();
      if (key !== '') rowForKey[key] = i + 2;
    }
  }

  var now = new Date().toISOString();
  Object.keys(entries).forEach(function (key) {
    var value = entries[key];
    var row = rowForKey[key];
    if (row) {
      sh.getRange(row, 2, 1, 2).setValues([[value, now]]);
    } else {
      sh.appendRow([key, value, now]);
    }
  });

  SpreadsheetApp.flush();
  return { ok: true };
}

// ---------------------------------------------------------------------------

/** Serialises a write so two simultaneous edits cannot interleave. */
function withLock(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return { ok: false, error: 'The sheet is busy. Try again.' };
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/** Length-independent string compare. */
function equals(a, b) {
  var diff = a.length ^ b.length;
  for (var i = 0; i < a.length && i < b.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
