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
  const flagArgs = new Set(["publish"]);

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
  const archiveFileId = config.latest_archive_file_id || await findFileByName(auth, config.drive_folder_id, archiveName);
  const archive = await uploadFileResumable(auth, {
    filePath: archivePath,
    fileName: archiveName,
    mimeType: "application/zip",
    folderId: config.drive_folder_id,
    existingFileId: archiveFileId,
  });

  await ensureAnyoneReader(auth, archive.id);

  const manifest = readJson(manifestPath, "CONFIG_ERROR", "publish manifest");
  manifest.download_url = directDownloadUrl(archive);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const manifestFileId = config.latest_manifest_file_id || await findFileByName(auth, config.drive_folder_id, manifestName);
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

  requireFile(archivePath, "ZIP_ERROR", "ZIP archive");
  requireFile(configPath, "CONFIG_ERROR", "Local config");

  const config = readJson(configPath, "CONFIG_ERROR", "local config");
  if (!config.drive_folder_id || typeof config.drive_folder_id !== "string") {
    printError("CONFIG_ERROR", `drive_folder_id is required in ${configPath}`);
    process.exit(2);
  }

  const auth = await authorize(repoRoot, config);
  if (publish) {
    requireFile(manifestPath, "CONFIG_ERROR", "Publish manifest");
    try {
      const publishResult = await publishTeamData(auth, archivePath, manifestPath, config, {
        archiveName: args["archive-name"],
        manifestName: args["manifest-name"],
      });

      const logPath = writeUploadLog(logDir, archivePath, {
        id: publishResult.archive.id,
        name: publishResult.archive.name,
        size: publishResult.archive.size,
        webViewLink: publishResult.archive.webViewLink,
        manifest_file_id: publishResult.manifest.id,
        manifest_name: publishResult.manifest.name,
        manifest_url: publishResult.manifestDownloadUrl,
      });

      console.log("[INFO] Google Drive team Data publish complete.");
      console.log(`[INFO] Archive File ID: ${publishResult.archive.id}`);
      console.log(`[INFO] Archive name: ${publishResult.archive.name}`);
      console.log(`[INFO] Archive size: ${publishResult.archive.size}`);
      console.log(`[INFO] Archive link: ${publishResult.archive.webViewLink || directDownloadUrl(publishResult.archive)}`);
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
