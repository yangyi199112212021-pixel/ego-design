const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const uploadDir = path.join(root, "assets", "uploads");
const mobileDir = path.join(root, "assets", "mobile");
const port = Number(process.env.PORT || 8000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime"
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  return path.join(root, normalized === "/" ? "index.html" : normalized);
}

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

function readJsonBody(request, maxSize, callback) {
  const chunks = [];
  let size = 0;
  request.on("data", (chunk) => {
    size += chunk.length;
    if (size > maxSize) {
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });
  request.on("end", () => {
    try {
      callback(null, JSON.parse(Buffer.concat(chunks).toString("utf8")));
    } catch (error) {
      callback(error);
    }
  });
}

function extensionForType(type) {
  if (type.includes("png")) return ".png";
  if (type.includes("jpeg") || type.includes("jpg")) return ".jpg";
  if (type.includes("webp")) return ".webp";
  if (type.includes("svg")) return ".svg";
  if (type.includes("mp4")) return ".mp4";
  if (type.includes("webm")) return ".webm";
  if (type.includes("quicktime") || type.includes("mov")) return ".mov";
  return ".bin";
}

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(mobileDir, { recursive: true });

const server = http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/upload") {
    readJsonBody(request, 120 * 1024 * 1024, (error, body) => {
      try {
        if (error) {
          sendJson(response, 400, { error: "Invalid upload data." });
          return;
        }
        const match = String(body.dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          sendJson(response, 400, { error: "Invalid upload data." });
          return;
        }
        const extension = extensionForType(match[1]);
        const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
        const filePath = path.join(uploadDir, name);
        fs.writeFileSync(filePath, Buffer.from(match[2], "base64"));
        sendJson(response, 200, { path: `assets/uploads/${name}` });
      } catch (uploadError) {
        sendJson(response, 500, { error: "Upload failed." });
      }
    });
    return;
  }

  if (request.method === "POST" && request.url === "/upload-mobile") {
    readJsonBody(request, 20 * 1024 * 1024, (error, body) => {
      try {
        if (error) {
          sendJson(response, 400, { error: "Invalid mobile upload data." });
          return;
        }
        const originalPath = String(body.originalPath || "");
        if (!originalPath.startsWith("assets/")) {
          sendJson(response, 400, { error: "Invalid original path." });
          return;
        }
        const match = String(body.dataUrl || "").match(/^data:image\/jpeg;base64,(.+)$/);
        if (!match) {
          sendJson(response, 400, { error: "Invalid mobile upload data." });
          return;
        }
        const baseName = path.basename(originalPath, path.extname(originalPath)).replace(/[^a-zA-Z0-9._-]/g, "_");
        const name = `${baseName}-mobile.jpg`;
        fs.writeFileSync(path.join(mobileDir, name), Buffer.from(match[1], "base64"));
        sendJson(response, 200, { path: `assets/mobile/${name}` });
      } catch (uploadError) {
        sendJson(response, 500, { error: "Mobile upload failed." });
      }
    });
    return;
  }

  if (request.method === "POST" && request.url === "/save-data") {
    readJsonBody(request, 8 * 1024 * 1024, (error, body) => {
      if (error || !body || typeof body !== "object" || Array.isArray(body)) {
        sendJson(response, 400, { error: "Invalid portfolio data." });
        return;
      }
      const content = `window.PORTFOLIO_DEFAULT_DATA = ${JSON.stringify(body, null, 2)};\n`;
      fs.writeFile(path.join(root, "site-data.js"), content, "utf8", (writeError) => {
        if (writeError) {
          sendJson(response, 500, { error: "Could not save portfolio data." });
          return;
        }
        sendJson(response, 200, { ok: true });
      });
    });
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405);
    response.end();
    return;
  }

  const filePath = safePath(request.url);
  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end();
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    if (request.method === "HEAD") {
      response.end();
    } else {
      response.end(contents);
    }
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Portfolio admin running at http://127.0.0.1:${port}/admin.html`);
});
