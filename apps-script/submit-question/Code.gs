// PQC "Submit A Question" intake, and the Interview Question Bank's read
// endpoint.
//
// doPost appends one row per submission to a "Responses" sheet and saves
// any uploaded images to a Drive folder, linking back to them from the
// row. The site's form (members-home.html, Submit A Question tab) posts
// JSON here; see js/script.js's QUESTION_FORM_ENDPOINT.
//
// doGet returns all submitted questions as JSON (company, role, question,
// etc., no image links), which members-home.html's Interview Question
// Bank tab fetches to render as flashcards.
//
// Setup:
//   1. Create (or open) the Google Sheet you want responses collected in.
//   2. Extensions > Apps Script. Delete the starter code, paste this file.
//   3. Run the "setup" function once (Run menu > select "setup" > Run) to
//      create the header row and the Drive folder for images. Approve the
//      permissions prompts when asked.
//   4. Deploy > New deployment > type "Web app".
//        Execute as: Me
//        Who has access: Anyone
//      ("Anyone" is required so the public submission form can post here
//      without visitors needing to sign into a Google account.)
//   5. Copy the resulting Web app URL and paste it into js/script.js as
//      the value of QUESTION_FORM_ENDPOINT.
//   6. Whenever you change this file, you must create a new deployment
//      version (Deploy > Manage deployments > edit > New version) for the
//      live URL to pick up the change.
//
// To get the responses as an .xlsx file at any time: open the Sheet,
// File > Download > Microsoft Excel (.xlsx).
//
// Adding "Solution" to an existing sheet: the "setup" function only adds
// the header row once, on a brand-new sheet. If your sheet already has
// data, just type "Solution" into cell I1 yourself (one time).

const SHEET_NAME = "Responses";
const REPORTS_SHEET_NAME = "Reports";
const DRIVE_FOLDER_NAME = "PQC Submitted Question Images";

function setup() {
  const sheet = getSheet_();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Timestamp",
      "Company",
      "Role",
      "Interview Type",
      "Round",
      "Question",
      "Topics",
      "Image Links",
      "Solution",
    ]);
  }
  getOrCreateFolder_();
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  return sheet;
}

function getReportsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(REPORTS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(REPORTS_SHEET_NAME);
    sheet.appendRow(["Timestamp", "Company", "Role", "Question", "Issue"]);
  }
  return sheet;
}

function getOrCreateFolder_() {
  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Admin utility, not used by the public form: finds the row whose
    // Question cell exactly matches data.question and sets its Solution
    // cell, for backfilling solutions onto already-submitted questions.
    if (data.mode === "updateSolution") {
      return respond_(updateSolution_(data.question, data.solution || ""));
    }

    // "Report a mistake" button on the Interview Question Bank flashcards:
    // logs a flagged card to its own Reports sheet for the board to review.
    if (data.mode === "report") {
      getReportsSheet_().appendRow([
        new Date(),
        data.company || "",
        data.role || "",
        data.question || "",
        data.issue || "",
      ]);
      return respond_({ ok: true });
    }

    const imageLinks = (data.images || []).map(function (img) {
      const blob = Utilities.newBlob(
        Utilities.base64Decode(img.data),
        img.mimeType,
        img.name
      );
      const file = getOrCreateFolder_().createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return file.getUrl();
    });

    getSheet_().appendRow([
      new Date(),
      data.company || "",
      data.role || "",
      data.interviewType || "",
      data.round || "",
      data.question || "",
      (data.topics || []).join(", "),
      imageLinks.join(", "),
      data.solution || "",
    ]);

    return respond_({ ok: true });
  } catch (err) {
    return respond_({ ok: false, error: String(err) });
  }
}

function updateSolution_(question, solution) {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  for (let r = 1; r < values.length; r++) {
    if (values[r][5] === question) {
      sheet.getRange(r + 1, 9).setValue(solution); // column I = Solution
      return { ok: true, updated: true };
    }
  }
  return { ok: true, updated: false };
}

function doGet(e) {
  try {
    const rows = getSheet_().getDataRange().getValues().slice(1); // drop header row
    const questions = rows
      .filter(function (row) { return row[5]; }) // has a question
      .map(function (row) {
        return {
          company: row[1],
          role: row[2],
          interviewType: row[3],
          round: row[4],
          question: row[5],
          topics: row[6] ? String(row[6]).split(",").map(function (t) { return t.trim(); }) : [],
          solution: row[8] || "",
        };
      });

    return respond_({ ok: true, questions: questions });
  } catch (err) {
    return respond_({ ok: false, error: String(err) });
  }
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
