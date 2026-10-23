// PQC Member Gate -- live "your email is your password" check against the
// mailing list sign-up Sheet, so new sign-ups work as passwords right
// away with no manual regeneration or redeploy needed.
//
// members.html's inline gate script calls this with ?hash=<sha256 of the
// lowercased, trimmed email the visitor typed in>. This script hashes
// every email in the sheet the same way and reports only whether one
// matches -- it never sends the actual email list back to the browser,
// unlike the old approach of baking a static hash list into the page.
//
// Setup:
//   1. Open the mailing list's response Sheet (the one the "Join Mailing
//      List" Google Form feeds -- Form > Responses > the green Sheets
//      icon, or open the Sheet directly).
//   2. Extensions > Apps Script. Delete the starter code, paste this file.
//   3. Deploy > New deployment > type "Web app".
//        Execute as: Me
//        Who has access: Anyone
//      ("Anyone" is required so the gate can check a password without the
//      visitor needing to sign into a Google account.)
//   4. Copy the resulting Web app URL and paste it into members.html as
//      the value of MEMBERS_GATE_ENDPOINT (in the inline gate script near
//      the bottom of the file).
//   5. Whenever you edit this file, you must create a new deployment
//      version (Deploy > Manage deployments > edit > New version) for the
//      live URL to pick up the change.
//
// This reads the FIRST sheet/tab of whichever spreadsheet it's bound to.
// It looks for a column whose header contains "email" (case-insensitive,
// e.g. the Form's auto-generated "Email Address" column); if it can't
// find one, it falls back to checking every cell in each row for an
// "@"-containing value.

function doGet(e) {
  try {
    var hash = ((e.parameter && e.parameter.hash) || "").toLowerCase();
    if (!hash) {
      return respond_({ ok: false, error: "missing hash" });
    }
    return respond_({ ok: true, valid: isKnownEmailHash_(hash) });
  } catch (err) {
    return respond_({ ok: false, error: String(err) });
  }
}

function isKnownEmailHash_(hash) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return false;

  var header = values[0];
  var emailCol = -1;
  for (var c = 0; c < header.length; c++) {
    if (String(header[c]).toLowerCase().indexOf("email") !== -1) {
      emailCol = c;
      break;
    }
  }

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var candidates = [];
    if (emailCol !== -1) {
      candidates.push(row[emailCol]);
    } else {
      for (var c2 = 0; c2 < row.length; c2++) {
        if (String(row[c2]).indexOf("@") !== -1) candidates.push(row[c2]);
      }
    }

    for (var i = 0; i < candidates.length; i++) {
      var email = String(candidates[i] || "").trim().toLowerCase();
      if (email && sha256Hex_(email) === hash) return true;
    }
  }
  return false;
}

function sha256Hex_(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes
    .map(function (b) {
      var v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? "0" + v : v;
    })
    .join("");
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
