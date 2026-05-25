import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const OAUTH_PORT_START = 53682;
const OAUTH_PORT_END = 53720;

function printError(code, message) {
  console.error(`[${code}] ${message}`);
}

function parseArgs(argv) {
  const args = {};
  const flagArgs = new Set(["publish", "list-backups", "rollback", "list-archives", "cleanup-archive"]);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    if (flagArgs.has(key)) {
      args[key] = true;
      continue;
    }

    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    args[key] = value;
    i += 1;
  }

  return args;
}

function requireFile(filePath, code, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    printError(code, `${label} not found: ${filePath}`);
    process.exit(code === "AUTH_ERROR" ? 5 : 2);
  }
}

function readJson(filePath, code, label) {
  try {
    const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch (error) {
    printError(code, `Failed to read ${label}: ${error.message}`);
    process.exit(code === "AUTH_ERROR" ? 5 : 2);
  }
}

function readJsonText(text, label) {
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`Failed to read ${label}: ${error.message}`);
  }
}

function openBrowser(url) {
  const platform = os.platform();

  if (platform === "win32") {
    spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

function getOAuthClientInfo(rawClient) {
  const info = rawClient.installed || rawClient.web;
  if (!info?.client_id) {
    throw new Error("OAuth client JSON must contain installed.client_id or web.client_id.");
  }

  return {
    clientId: info.client_id,
    clientSecret: info.client_secret || "",
  };
}

async function waitForOAuthCode(authUrl, redirectUri) {
  return await new Promise((resolve, reject) => {
    const callbackUrl = new URL(redirectUri);
    const callbackPort = Number(callbackUrl.port);

    const server = http.createServer((req, res) => {
      try {
        const requestUrl = new URL(req.url || "/", redirectUri);

        if (requestUrl.pathname !== "/oauth2callback") {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Not found");
          return;
        }

        const error = requestUrl.searchParams.get("error");
        if (error) {
          res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Google Drive authorization was rejected. You can close this tab.");
          reject(new Error(`Authorization rejected: ${error}`));
          server.close();
          return;
        }

        const code = requestUrl.searchParams.get("code");
        if (!code) {
          res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Authorization code was missing. You can close this tab.");
          reject(new Error("Authorization code was missing."));
          server.close();
          return;
        }

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Google Drive authorization complete. You can close this tab.");
        resolve(code);
        server.close();
      } catch (error) {
        reject(error);
        server.close();
      }
    });

    server.once("error", reject);
    server.listen(callbackPort, "127.0.0.1", () => {
      console.log(`[INFO] OAuth callback server: ${redirectUri}`);
      console.log("[INFO] Opening Google authorization page in your browser.");
      console.log("[INFO] If the browser does not open, visit this URL:");
      console.log(authUrl);
      openBrowser(authUrl);
    });
  });
}

async function authorize(repoRoot, config) {
  const localRoot = path.join(repoRoot, "_Local", "GoogleDriveDataUpload");
  const oauthClientPath = path.resolve(repoRoot, config.oauth_client_path || path.join(localRoot, "oauth_client.json"));
  const tokenPath = path.resolve(repoRoot, config.token_path || path.join(localRoot, "token.json"));

  requireFile(oauthClientPath, "AUTH_ERROR", "OAuth client JSON");

  const rawClient = readJson(oauthClientPath, "AUTH_ERROR", "OAuth client JSON");
  let clientInfo;

  try {
    clientInfo = getOAuthClientInfo(rawClient);
  } catch (error) {
    printError("AUTH_ERROR", error.message);
    process.exit(5);
  }

  const defaultRedirectUri = `http://127.0.0.1:${OAUTH_PORT_START}/oauth2callback`;
  const tokenClient = new google.auth.OAuth2(clientInfo.clientId, clientInfo.clientSecret, defaultRedirectUri);

  if (fs.existsSync(tokenPath)) {
    const token = readJson(tokenPath, "AUTH_ERROR", "OAuth token JSON");
    tokenClient.setCredentials(token);
    return tokenClient;
  }

  for (let port = OAUTH_PORT_START; port <= OAUTH_PORT_END; port += 1) {
    const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
    const oAuth2Client = new google.auth.OAuth2(clientInfo.clientId, clientInfo.clientSecret, redirectUri);
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      response_type: "code",
      scope: SCOPES,
    });

    try {
      const code = await waitForOAuthCode(authUrl, redirectUri);
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
      fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
      fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2), "utf8");
      console.log(`[INFO] OAuth token saved: ${tokenPath}`);
      return oAuth2Client;
    } catch (error) {
      if (error.code === "EADDRINUSE") {
        console.log(`[INFO] OAuth callback port is busy: ${port}. Trying next port.`);
        continue;
      }

      printError("AUTH_ERROR", error.message);
      process.exit(5);
    }
  }

  printError("AUTH_ERROR", `No available OAuth callback port in range ${OAUTH_PORT_START}-${OAUTH_PORT_END}.`);
  process.exit(5);
}

async function getAccessToken(auth) {
  const token = await auth.getAccessToken();
  if (typeof token === "string") {
    return token;
  }

  if (token?.token) {
    return token.token;
  }

  throw new Error("Failed to acquire Google OAuth access token.");
}

async function requestWithBody(url, options, body) {
  return await new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      const chunks = [];

      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });

    req.on("error", reject);

    if (body?.pipe) {
      body.on("error", reject);
      body.pipe(req);
      return;
    }

    if (body) {
      req.end(body);
      return;
    }

    req.end();
  });
}

function parseUploadResponse(response) {
  if (response.statusCode >= 200 && response.statusCode < 300) {
    try {
      return JSON.parse(response.body);
    } catch (error) {
      throw new Error(`Google Drive returned invalid JSON: ${error.message}`);
    }
  }

  let detail = response.body;
  try {
    detail = JSON.parse(response.body)?.error?.message || response.body;
  } catch {
    // Keep the raw response body.
  }

  throw new Error(`Google Drive upload failed with HTTP ${response.statusCode}: ${detail}`);
}

function parseDriveResponse(response, operation) {
  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.body;
  }

  let detail = response.body;
  try {
    detail = JSON.parse(response.body)?.error?.message || response.body;
  } catch {
    // Keep the raw response body.
  }

  throw new Error(`Google Drive ${operation} failed with HTTP ${response.statusCode}: ${detail}`);
}

async function uploadArchive(auth, archivePath, config) {
  return await uploadFileResumable(auth, {
    filePath: archivePath,
    fileName: path.basename(archivePath),
    mimeType: "application/zip",
    folderId: config.drive_folder_id,
    existingFileId: null,
  });
}

async function uploadFileResumable(auth, options) {
  const stat = fs.statSync(options.filePath);
  const accessToken = await getAccessToken(auth);

  const metadata = JSON.stringify({
    name: options.fileName,
    ...(options.existingFileId ? {} : { parents: [options.folderId] }),
  });

  const uploadUrlBase = options.existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(options.existingFileId)}`
    : "https://www.googleapis.com/upload/drive/v3/files";
  const createUrl = new URL(uploadUrlBase);
  createUrl.searchParams.set("uploadType", "resumable");
  createUrl.searchParams.set("supportsAllDrives", "true");
  createUrl.searchParams.set("fields", "id,name,size,webViewLink,webContentLink");

  let session;

  try {
    session = await requestWithBody(
      createUrl,
      {
        method: options.existingFileId ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "Content-Length": Buffer.byteLength(metadata),
          "X-Upload-Content-Type": options.mimeType,
          "X-Upload-Content-Length": stat.size,
        },
      },
      metadata,
    );
  } catch (error) {
    printError("UPLOAD_ERROR", error.message);
    process.exit(6);
  }

  if (session.statusCode < 200 || session.statusCode >= 300 || !session.headers.location) {
    const detail = session.body || "Missing resumable upload session location.";
    printError("UPLOAD_ERROR", `Failed to start resumable upload session: ${detail}`);
    process.exit(6);
  }

  const uploadUrl = session.headers.location;

  try {
    const uploadResponse = await requestWithBody(
      uploadUrl,
      {
        method: "PUT",
        headers: {
          "Content-Type": options.mimeType,
          "Content-Length": stat.size,
        },
      },
      fs.createReadStream(options.filePath),
    );

    const file = parseUploadResponse(uploadResponse);

    return {
      id: file.id,
      name: file.name || options.fileName,
      size: file.size || String(stat.size),
      webViewLink: file.webViewLink || "",
      webContentLink: file.webContentLink || "",
    };
  } catch (error) {
    printError("UPLOAD_ERROR", error.message);
    process.exit(6);
  }
}

function escapeDriveQueryString(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function safeFileToken(value) {
  return String(value || "unknown").replace(/[\\/:*?"<>|\s]+/g, "_");
}

function manifestBackupPrefix(manifestName) {
  return manifestName.replace(/\.json$/i, "") + "_Backup_";
}

function publishArchiveName(config) {
  return config.publish_archive_name || "PlayGround_Data_Latest.zip";
}

function archiveNamePrefix(config) {
  return config.archive_name_prefix || "PlayGround_Data";
}

function isCleanableArchiveName(name, config) {
  if (!name || !name.endsWith(".zip")) {
    return false;
  }

  if (name === publishArchiveName(config)) {
    return false;
  }

  return name.startsWith(`${archiveNamePrefix(config)}_`);
}

async function findFileByName(auth, folderId, name) {
  const drive = google.drive({ version: "v3", auth });
  const q = `'${escapeDriveQueryString(folderId)}' in parents and name = '${escapeDriveQueryString(name)}' and trashed = false`;
  const response = await drive.files.list({
    q,
    spaces: "drive",
    fields: "files(id,name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    pageSize: 10,
  });

  return response.data.files?.[0]?.id || null;
}

async function listFilesByNamePrefix(auth, folderId, prefix) {
  const drive = google.drive({ version: "v3", auth });
  const q = `'${escapeDriveQueryString(folderId)}' in parents and name contains '${escapeDriveQueryString(prefix)}' and trashed = false`;
  const response = await drive.files.list({
    q,
    spaces: "drive",
    fields: "files(id,name,size,modifiedTime,webViewLink)",
    orderBy: "modifiedTime desc",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    pageSize: 50,
  });

  return response.data.files || [];
}

async function getDriveFileMetadata(auth, fileId) {
  const drive = google.drive({ version: "v3", auth });
  const response = await drive.files.get({
    fileId,
    fields: "id,name,mimeType,size,modifiedTime,parents,trashed,webViewLink",
    supportsAllDrives: true,
  });

  return response.data;
}

async function deleteDriveFile(auth, fileId) {
  const drive = google.drive({ version: "v3", auth });
  await drive.files.delete({
    fileId,
    supportsAllDrives: true,
  });
}

async function downloadDriveFileText(auth, fileId, label) {
  const accessToken = await getAccessToken(auth);
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("alt", "media");
  url.searchParams.set("supportsAllDrives", "true");

  const response = await requestWithBody(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseDriveResponse(response, `download ${label}`);
}

async function ensureAnyoneReader(auth, fileId) {
  const drive = google.drive({ version: "v3", auth });
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        type: "anyone",
        role: "reader",
      },
      supportsAllDrives: true,
    });
  } catch (error) {
    const reason = error?.response?.data?.error?.errors?.[0]?.reason;
    if (reason === "alreadyExists") {
      return;
    }

    throw error;
  }
}

function directDownloadUrl(file) {
  return file.webContentLink || `https://drive.usercontent.google.com/download?id=${encodeURIComponent(file.id)}&export=download`;
}

async function publishTeamData(auth, archivePath, manifestPath, config, names) {
  const archiveName = names.archiveName || path.basename(archivePath);
  const manifestName = names.manifestName || path.basename(manifestPath);
  const existingVersionedArchiveId = await findFileByName(auth, config.drive_folder_id, archiveName);
  if (existingVersionedArchiveId) {
    throw new Error(`Versioned archive already exists in Google Drive: ${archiveName}`);
  }

  const archive = await uploadFileResumable(auth, {
    filePath: archivePath,
    fileName: archiveName,
    mimeType: "application/zip",
    folderId: config.drive_folder_id,
    existingFileId: null,
  });

  await ensureAnyoneReader(auth, archive.id);

  const manifest = readJson(manifestPath, "CONFIG_ERROR", "publish manifest");
  const manifestFileId = config.latest_manifest_file_id || await findFileByName(auth, config.drive_folder_id, manifestName);
  let backupManifest = null;

  if (manifestFileId) {
    const currentManifestText = await downloadDriveFileText(auth, manifestFileId, "latest manifest");
    const currentManifest = readJsonText(currentManifestText, "latest manifest backup source");

    const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "_");
    const backupManifestName = `${manifestBackupPrefix(manifestName)}${safeFileToken(currentManifest.data_version)}_${timestamp}.json`;
    const backupManifestPath = path.join(path.dirname(manifestPath), backupManifestName);
    fs.writeFileSync(backupManifestPath, currentManifestText.endsWith("\n") ? currentManifestText : `${currentManifestText}\n`, "utf8");

    backupManifest = await uploadFileResumable(auth, {
      filePath: backupManifestPath,
      fileName: backupManifestName,
      mimeType: "application/json",
      folderId: config.drive_folder_id,
      existingFileId: null,
    });
    await ensureAnyoneReader(auth, backupManifest.id);
  }

  manifest.download_url = directDownloadUrl(archive);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const publishedManifest = await uploadFileResumable(auth, {
    filePath: manifestPath,
    fileName: manifestName,
    mimeType: "application/json",
    folderId: config.drive_folder_id,
    existingFileId: manifestFileId,
  });

  await ensureAnyoneReader(auth, publishedManifest.id);

  return {
    archive,
    manifest: publishedManifest,
    manifestDownloadUrl: directDownloadUrl(publishedManifest),
    backupManifest,
    dataVersion: manifest.data_version || "",
    archiveDownloadUrl: directDownloadUrl(archive),
  };
}

async function listBackupManifests(auth, config, manifestName) {
  const backups = await listFilesByNamePrefix(auth, config.drive_folder_id, manifestBackupPrefix(manifestName));
  if (backups.length === 0) {
    console.log("[INFO] No manifest backups found.");
    return;
  }

  console.log("[INFO] Manifest backups:");
  for (const file of backups) {
    console.log(`- ${file.id} | ${file.name} | ${file.modifiedTime || "modifiedTime unknown"} | ${file.size || "size unknown"} bytes`);
  }
}

async function listVersionedArchives(auth, config) {
  const archives = (await listFilesByNamePrefix(auth, config.drive_folder_id, `${archiveNamePrefix(config)}_`))
    .filter((file) => isCleanableArchiveName(file.name, config));
  if (archives.length === 0) {
    console.log("[INFO] No cleanable versioned archives found.");
    return;
  }

  console.log("[INFO] Cleanable versioned archives:");
  for (const file of archives) {
    console.log(`- ${file.id} | ${file.name} | ${file.modifiedTime || "modifiedTime unknown"} | ${file.size || "size unknown"} bytes`);
  }
}

async function cleanupVersionedArchive(auth, config, archiveFileId) {
  const file = await getDriveFileMetadata(auth, archiveFileId);
  if (file.trashed) {
    throw new Error(`Archive is already trashed: ${archiveFileId}`);
  }

  if (!isCleanableArchiveName(file.name, config)) {
    throw new Error(`Refusing to delete non-versioned or protected archive: ${file.name || archiveFileId}`);
  }

  if (Array.isArray(file.parents) && !file.parents.includes(config.drive_folder_id)) {
    throw new Error(`Refusing to delete archive outside configured Drive folder: ${file.name || archiveFileId}`);
  }

  await deleteDriveFile(auth, archiveFileId);
  return file;
}

async function rollbackLatestManifest(auth, config, backupManifestId, manifestName) {
  const manifestFileId = config.latest_manifest_file_id || await findFileByName(auth, config.drive_folder_id, manifestName);
  if (!manifestFileId) {
    throw new Error(`Latest manifest does not exist in Google Drive: ${manifestName}`);
  }

  const backupManifestText = await downloadDriveFileText(auth, backupManifestId, "backup manifest");
  const backupManifest = readJsonText(backupManifestText, "backup manifest");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playground-data-rollback-"));
  const rollbackPath = path.join(tempDir, manifestName);
  fs.writeFileSync(rollbackPath, `${JSON.stringify(backupManifest, null, 2)}\n`, "utf8");

  const restoredManifest = await uploadFileResumable(auth, {
    filePath: rollbackPath,
    fileName: manifestName,
    mimeType: "application/json",
    folderId: config.drive_folder_id,
    existingFileId: manifestFileId,
  });
  await ensureAnyoneReader(auth, restoredManifest.id);

  return {
    manifest: restoredManifest,
    manifestDownloadUrl: directDownloadUrl(restoredManifest),
    dataVersion: backupManifest.data_version || "",
    archiveName: backupManifest.archive_name || "",
  };
}

function writeUploadLog(logDir, archivePath, result) {
  fs.mkdirSync(logDir, { recursive: true });
  const timestamp = new Date().toISOString();
  const safeTimestamp = timestamp.replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "_");
  const logPath = path.join(logDir, `upload_${safeTimestamp}.json`);
  const payload = {
    timestamp,
    archive_name: path.basename(archivePath),
    file_id: result.id,
    file_name: result.name,
    size: result.size,
    web_view_link: result.webViewLink,
    manifest_file_id: result.manifest_file_id,
    manifest_name: result.manifest_name,
    manifest_url: result.manifest_url,
    data_version: result.data_version,
    archive_download_url: result.archive_download_url,
    backup_manifest_file_id: result.backup_manifest_file_id,
    backup_manifest_name: result.backup_manifest_name,
  };

  fs.writeFileSync(logPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return logPath;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    printError("ARG_ERROR", error.message);
    process.exit(1);
  }

  const repoRoot = path.resolve(args["repo-root"] || ".");
  const archivePath = path.resolve(args.archive || "");
  const manifestPath = args.manifest ? path.resolve(args.manifest) : "";
  const configPath = path.resolve(args.config || path.join(repoRoot, "_Local", "GoogleDriveDataUpload", "config.local.json"));
  const logDir = path.resolve(args["log-dir"] || path.join(repoRoot, "_Temp", "GoogleDriveDataUpload", "logs"));
  const publish = args.publish === true;
  const listBackups = args["list-backups"] === true;
  const rollback = args.rollback === true;
  const listArchives = args["list-archives"] === true;
  const cleanupArchive = args["cleanup-archive"] === true;

  const controlOperationCount = [listBackups, rollback, listArchives, cleanupArchive].filter(Boolean).length;
  if (controlOperationCount > 1) {
    printError("ARG_ERROR", "--list-backups, --rollback, --list-archives, and --cleanup-archive cannot be used together.");
    process.exit(1);
  }

  requireFile(configPath, "CONFIG_ERROR", "Local config");

  const config = readJson(configPath, "CONFIG_ERROR", "local config");
  if (!config.drive_folder_id || typeof config.drive_folder_id !== "string") {
    printError("CONFIG_ERROR", `drive_folder_id is required in ${configPath}`);
    process.exit(2);
  }

  const auth = await authorize(repoRoot, config);
  const manifestName = args["manifest-name"] || config.publish_manifest_name || "PlayGround_Data_Manifest.json";

  if (listBackups) {
    await listBackupManifests(auth, config, manifestName);
    return;
  }

  if (rollback) {
    if (!args["backup-manifest-id"]) {
      printError("ARG_ERROR", "Missing value for --backup-manifest-id");
      process.exit(1);
    }

    try {
      const rollbackResult = await rollbackLatestManifest(auth, config, args["backup-manifest-id"], manifestName);
      console.log("[INFO] Google Drive latest manifest rollback complete.");
      console.log(`[INFO] Restored data version: ${rollbackResult.dataVersion || "(unknown)"}`);
      console.log(`[INFO] Restored archive: ${rollbackResult.archiveName || "(unknown)"}`);
      console.log(`[INFO] Manifest File ID: ${rollbackResult.manifest.id}`);
      console.log(`[INFO] Manifest URL: ${rollbackResult.manifestDownloadUrl}`);
      return;
    } catch (error) {
      const detail = error?.response?.data?.error?.message || error.message;
      printError("ROLLBACK_ERROR", detail);
      process.exit(7);
    }
  }

  if (listArchives) {
    await listVersionedArchives(auth, config);
    return;
  }

  if (cleanupArchive) {
    if (!args["archive-file-id"]) {
      printError("ARG_ERROR", "Missing value for --archive-file-id");
      process.exit(1);
    }

    try {
      const deleted = await cleanupVersionedArchive(auth, config, args["archive-file-id"]);
      console.log("[INFO] Google Drive versioned archive cleanup complete.");
      console.log(`[INFO] Deleted archive: ${deleted.name}`);
      console.log(`[INFO] Deleted archive File ID: ${deleted.id}`);
      return;
    } catch (error) {
      const detail = error?.response?.data?.error?.message || error.message;
      printError("CLEANUP_ERROR", detail);
      process.exit(7);
    }
  }

  requireFile(archivePath, "ZIP_ERROR", "ZIP archive");

  if (publish) {
    requireFile(manifestPath, "CONFIG_ERROR", "Publish manifest");
    try {
      const publishResult = await publishTeamData(auth, archivePath, manifestPath, config, {
        archiveName: args["archive-name"],
        manifestName,
      });

      const logPath = writeUploadLog(logDir, archivePath, {
        id: publishResult.archive.id,
        name: publishResult.archive.name,
        size: publishResult.archive.size,
        webViewLink: publishResult.archive.webViewLink,
        manifest_file_id: publishResult.manifest.id,
        manifest_name: publishResult.manifest.name,
        manifest_url: publishResult.manifestDownloadUrl,
        data_version: publishResult.dataVersion,
        archive_download_url: publishResult.archiveDownloadUrl,
        backup_manifest_file_id: publishResult.backupManifest?.id || "",
        backup_manifest_name: publishResult.backupManifest?.name || "",
      });

      console.log("[INFO] Google Drive team Data publish complete.");
      console.log(`[INFO] Archive File ID: ${publishResult.archive.id}`);
      console.log(`[INFO] Archive name: ${publishResult.archive.name}`);
      console.log(`[INFO] Archive size: ${publishResult.archive.size}`);
      console.log(`[INFO] Archive link: ${publishResult.archive.webViewLink || directDownloadUrl(publishResult.archive)}`);
      if (publishResult.backupManifest) {
        console.log(`[INFO] Backup Manifest File ID: ${publishResult.backupManifest.id}`);
        console.log(`[INFO] Backup Manifest name: ${publishResult.backupManifest.name}`);
      } else {
        console.log("[INFO] Backup Manifest: skipped because latest manifest did not exist.");
      }
      console.log(`[INFO] Manifest File ID: ${publishResult.manifest.id}`);
      console.log(`[INFO] Manifest URL: ${publishResult.manifestDownloadUrl}`);
      console.log(`[INFO] Log: ${logPath}`);
      return;
    } catch (error) {
      const detail = error?.response?.data?.error?.message || error.message;
      printError("UPLOAD_ERROR", detail);
      process.exit(6);
    }
  }

  const result = await uploadArchive(auth, archivePath, config);
  const logPath = writeUploadLog(logDir, archivePath, result);

  console.log("[INFO] Google Drive upload complete.");
  console.log(`[INFO] File ID: ${result.id}`);
  console.log(`[INFO] File name: ${result.name}`);
  console.log(`[INFO] Size: ${result.size}`);
  if (result.webViewLink) {
    console.log(`[INFO] Link: ${result.webViewLink}`);
  }
  console.log(`[INFO] Log: ${logPath}`);
}

main().catch((error) => {
  printError("UNEXPECTED_ERROR", error.message);
  process.exit(1);
});
