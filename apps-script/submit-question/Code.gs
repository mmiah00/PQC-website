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

const SHEET_NAME = "Responses";
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

function getOrCreateFolder_() {
  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

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
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
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
        };
      });

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, questions: questions })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
