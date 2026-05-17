import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "20-data");
const dest = path.join(root, "dist", "data");

function copyRecursive(from, to) {
  if (!fs.existsSync(from)) {
    console.warn(`skip missing: ${from}`);
    return;
  }
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    const sf = path.join(from, name);
    const dt = path.join(to, name);
    if (fs.statSync(sf).isDirectory()) {
      copyRecursive(sf, dt);
    } else {
      fs.copyFileSync(sf, dt);
    }
  }
}

copyRecursive(src, dest);
console.log(`copied ${src} -> ${dest}`);
