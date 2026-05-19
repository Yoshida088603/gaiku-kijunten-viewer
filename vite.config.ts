import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

function parseRange(
  rangeHeader: string | undefined,
  size: number,
): { start: number; end: number } | "unsatisfiable" | null {
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

function serve20Data(): Plugin {
  const dataRoot = path.resolve(__dirname, "20-data");
  return {
    name: "serve-20-data",
    configureServer(server) {
      server.middlewares.use("/data", (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
        const filePath = path.join(dataRoot, rel);
        if (!filePath.startsWith(dataRoot)) {
          res.statusCode = 403;
          res.end();
          return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          next();
          return;
        }
        const stat = fs.statSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const types: Record<string, string> = {
          ".json": "application/json; charset=utf-8",
          ".pmtiles": "application/octet-stream",
        };
        const headers: Record<string, string> = {
          "Content-Type": types[ext] ?? "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Range",
          "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
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
      });
    },
  };
}

export default defineConfig({
  base: "/gaiku-kijunten-viewer/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [serve20Data()],
});
