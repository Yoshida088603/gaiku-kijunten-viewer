import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIEWER_ROOT = path.resolve(__dirname, "..");
const DIST_ROOT = path.join(VIEWER_ROOT, "dist");
const BASE_PATH = "/gaiku-kijunten-viewer";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".pmtiles": "application/octet-stream",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function parsePort(argv) {
  const env = process.env.PORT;
  if (env && /^\d+$/.test(env)) return Number(env);
  const i = argv.indexOf("--port");
  if (i >= 0 && argv[i + 1] && /^\d+$/.test(argv[i + 1])) {
    return Number(argv[i + 1]);
  }
  return 8765;
}

function normalizeUrlPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const cleaned = decoded.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  if (cleaned.length > 1 && cleaned.endsWith("/")) {
    return cleaned.slice(0, -1);
  }
  return cleaned || "/";
}

function resolveDistFile(urlPath) {
  const normalized = normalizeUrlPath(urlPath);
  let rel = normalized;

  if (rel === "/" || rel === "") {
    return { redirect: `${BASE_PATH}/` };
  }

  if (rel === BASE_PATH) {
    rel = "/index.html";
  } else if (rel.startsWith(`${BASE_PATH}/`)) {
    rel = rel.slice(BASE_PATH.length) || "/";
  } else {
    return { notFound: true };
  }

  if (rel.endsWith("/")) {
    rel = `${rel}index.html`;
  }

  const filePath = path.resolve(DIST_ROOT, `.${rel}`);
  const distResolved = path.resolve(DIST_ROOT);
  if (!filePath.startsWith(distResolved + path.sep) && filePath !== distResolved) {
    return { forbidden: true };
  }
  return { filePath };
}

function parseRange(rangeHeader, size) {
  if (!rangeHeader?.startsWith("bytes=")) return null;
  const spec = rangeHeader.slice(6).trim();
  const [startStr, endStr] = spec.split("-");
  let start = startStr === "" ? NaN : Number(startStr);
  let end = endStr === "" ? NaN : Number(endStr);

  if (Number.isNaN(start) && Number.isNaN(end)) return null;

  if (Number.isNaN(start)) {
    const suffix = end;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else if (Number.isNaN(end)) {
    end = size - 1;
  }

  if (start < 0 || end < start || start >= size) return "unsatisfiable";
  end = Math.min(end, size - 1);
  return { start, end };
}

function sendFile(req, res, filePath) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    res.writeHead(404, corsHeaders());
    res.end("Not Found");
    return;
  }

  if (stat.isDirectory()) {
    const indexPath = path.join(filePath, "index.html");
    if (fs.existsSync(indexPath)) {
      sendFile(req, res, indexPath);
    } else {
      res.writeHead(404, corsHeaders());
      res.end("Not Found");
    }
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";
  const headers = {
    ...corsHeaders(),
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
  };

  const range = parseRange(req.headers.range, stat.size);
  if (range === "unsatisfiable") {
    res.writeHead(416, {
      ...headers,
      "Content-Range": `bytes */${stat.size}`,
    });
    res.end();
    return;
  }

  if (range) {
    const { start, end } = range;
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      ...headers,
      "Content-Length": String(chunkSize),
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  if (req.method === "HEAD") {
    res.writeHead(200, { ...headers, "Content-Length": String(stat.size) });
    res.end();
    return;
  }

  res.writeHead(200, { ...headers, "Content-Length": String(stat.size) });
  fs.createReadStream(filePath).pipe(res);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
  };
}

function main() {
  if (!fs.existsSync(DIST_ROOT)) {
    console.error(`dist not found: ${DIST_ROOT}`);
    console.error("Run: npm run build");
    process.exit(1);
  }

  const port = parsePort(process.argv.slice(2));
  const server = http.createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }

    const urlPath = normalizeUrlPath(req.url ?? "/");

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, corsHeaders());
      res.end("Method Not Allowed");
      return;
    }

    if (urlPath === "/" || urlPath === "") {
      res.writeHead(302, { Location: `${BASE_PATH}/` });
      res.end();
      return;
    }

    const resolved = resolveDistFile(urlPath);
    if (resolved.redirect) {
      res.writeHead(302, { Location: resolved.redirect });
      res.end();
      return;
    }
    if (resolved.notFound || resolved.forbidden) {
      res.writeHead(resolved.forbidden ? 403 : 404, corsHeaders());
      res.end(resolved.forbidden ? "Forbidden" : "Not Found");
      return;
    }

    sendFile(req, res, resolved.filePath);
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}${BASE_PATH}/`;
    console.log(`Serving ${DIST_ROOT}`);
    console.log(`Open ${url}`);
  });
}

main();
