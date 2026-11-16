// PQC Resume Upload.
//
// doPost accepts a member's resume (PDF or DOCX, sent base64-encoded)
// along with their name and email, and saves it into a shared Google
// Drive folder. If that email already has a resume in the folder, the
// old one is trashed first, so uploading a new resume replaces the old
// one instead of piling up duplicates. members-home.html's Resume
// Upload tab posts to this.
//
// Setup:
//   1. In script.google.com, create a new standalone project (this one
//      doesn't need to be bound to a Sheet).
//   2. Paste this file in as Code.gs.
//   3. Create (or pick) the shared Drive folder members' resumes should
//      land in, and set FOLDER_ID below to its ID (the long ID in its
//      Drive URL: drive.google.com/drive/folders/<FOLDER_ID>).
//   4. Deploy > New deployment > type "Web app".
//        Execute as: Me
//        Who has access: Anyone
//      ("Anyone" is required so the site can post to it without visitors
//      needing to sign into a Google account -- same trade-off as the
//      site's other forms. There's no real login system here, so this
//      endpoint trusts whatever email a visitor types in; it's meant to
//      deter accidents, not a malicious visitor who already knows
//      someone else's email.)
//   5. Copy the resulting Web app URL and paste it into js/script.js as
//      the value of RESUME_UPLOAD_ENDPOINT.
//   6. Whenever you change this file, you must create a new deployment
//      version (Deploy > Manage deployments > edit > New version) for the
//      live URL to pick up the change.

const FOLDER_ID = "1c6QXUAVNodDkQOXOe7K8ffXNDSBEALhF";

const ALLOWED_MIME_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const name = (data.name || "").trim();
    const email = (data.email || "").trim().toLowerCase();
    const mimeType = data.mimeType;
    const fileData = data.fileData;

    if (!email) return respond_({ ok: false, error: "Missing email." });
    if (!fileData) return respond_({ ok: false, error: "Missing file." });

    const ext = ALLOWED_MIME_TYPES[mimeType];
    if (!ext) return respond_({ ok: false, error: "Only PDF or DOCX files are accepted." });

    const folder = DriveApp.getFolderById(FOLDER_ID);

    // Each resume is named "<email> - <name>.<ext>", so a re-upload can
    // find and trash whatever this email uploaded before -- even if the
    // member's name or the file's original name changed since then.
    const prefix = `${email} - `;
    const existing = folder.getFiles();
    while (existing.hasNext()) {
      const file = existing.next();
      if (file.getName().toLowerCase().indexOf(prefix) === 0) {
        file.setTrashed(true);
      }
    }

    const bytes = Utilities.base64Decode(fileData);
    const safeName = (name || "Resume").replace(/[\\/:*?"<>|]/g, "_");
    const fileName = `${email} - ${safeName}.${ext}`;
    folder.createFile(Utilities.newBlob(bytes, mimeType, fileName));

    return respond_({ ok: true });
  } catch (err) {
    return respond_({ ok: false, error: String(err) });
  }
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
