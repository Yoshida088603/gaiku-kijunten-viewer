import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

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
        const ext = path.extname(filePath).toLowerCase();
        const types: Record<string, string> = {
          ".json": "application/json; charset=utf-8",
          ".pmtiles": "application/octet-stream",
        };
        res.setHeader("Content-Type", types[ext] ?? "application/octet-stream");
        res.setHeader("Access-Control-Allow-Origin", "*");
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
