// PQC Recruiting Guide file listing.
//
// doGet recursively lists a given Google Drive folder's files AND
// subfolders (and their files, and so on) and returns it as a JSON tree:
// { id, name, files: [...], folders: [...] }. Each file's metadata is id,
// name, mimeType, size, modified date, a preview URL (for the in-page
// viewer), and a download URL where one makes sense. members-home.html's
// Recruiting Guide tab fetches this to build the file gallery and preview
// modal, letting members browse into subfolders.
//
// Setup:
//   1. In script.google.com, create a new standalone project (this one
//      doesn't need to be bound to a Sheet).
//   2. Paste this file in as Code.gs.
//   3. Set FOLDER_ID below to the Recruiting Guide folder's ID (the long
//      ID in its Drive URL: drive.google.com/drive/folders/<FOLDER_ID>).
//   4. Deploy > New deployment > type "Web app".
//        Execute as: Me
//        Who has access: Anyone
//      ("Anyone" is required so the site can list the folder without
//      visitors needing to sign into a Google account. This only lets
//      people see each file's name/type/size and preview/download it --
//      exactly like clicking the shareable link to that file today.)
//   5. Copy the resulting Web app URL and paste it into js/script.js as
//      the value of RECRUITING_GUIDE_ENDPOINT.
//   6. Whenever you change this file, you must create a new deployment
//      version (Deploy > Manage deployments > edit > New version) for the
//      live URL to pick up the change.
//
// Important: each file in the folder must be shared as "Anyone with the
// link" (Viewer) for its preview/download to actually load for site
// visitors -- this script can always list file names regardless (it runs
// as you, the folder's owner), but the visitor's own browser loads the
// preview/download directly from Drive, under their own (often
// anonymous) identity, which needs that same link-sharing permission.

const FOLDER_ID = "1_dt-_UggFM14RgD9K089_WWNLfv-HZCC";

const GOOGLE_NATIVE_PREVIEW = {
  "application/vnd.google-apps.document": "document",
  "application/vnd.google-apps.spreadsheet": "spreadsheets",
  "application/vnd.google-apps.presentation": "presentation",
};

function doGet(e) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    return respond_({ ok: true, folder: listFolder_(folder) });
  } catch (err) {
    return respond_({ ok: false, error: String(err) });
  }
}

// Recursively describes a folder: its own files, plus each subfolder
// (recursed the same way), so the site can show nested folders instead of
// only the files directly inside the top-level Recruiting Guide folder.
function listFolder_(folder) {
  const fileIterator = folder.getFiles();
  const files = [];
  while (fileIterator.hasNext()) {
    files.push(fileToJson_(fileIterator.next()));
  }
  files.sort(byName_);

  const folderIterator = folder.getFolders();
  const folders = [];
  while (folderIterator.hasNext()) {
    folders.push(listFolder_(folderIterator.next()));
  }
  folders.sort(byName_);

  return { id: folder.getId(), name: folder.getName(), files: files, folders: folders };
}

function fileToJson_(file) {
  const mimeType = file.getMimeType();
  const id = file.getId();
  const nativeKind = GOOGLE_NATIVE_PREVIEW[mimeType];

  return {
    id: id,
    name: file.getName(),
    mimeType: mimeType,
    size: file.getSize(),
    modified: file.getLastUpdated(),
    previewUrl: nativeKind
      ? "https://docs.google.com/" + nativeKind + "/d/" + id + "/preview"
      : "https://drive.google.com/file/d/" + id + "/preview",
    // Native Google Docs/Sheets/Slides don't have a single-format
    // download URL, so for those we just link to the file itself.
    downloadUrl: nativeKind
      ? file.getUrl()
      : "https://drive.google.com/uc?export=download&id=" + id,
  };
}

function byName_(a, b) {
  return a.name.localeCompare(b.name);
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
