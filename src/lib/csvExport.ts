import type { KijyuntenFeatureProps } from "@/data/types";

function formatCell(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (key === "x" || key === "y" || key === "z") {
    const n = Number(value);
    if (Number.isFinite(n)) return n.toFixed(3);
    return String(value);
  }
  return String(value);
}

function escapeCsvField(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** 数学座標系（北=x, 東=y）→ 測量座標系（東=x, 北=y）へ値だけ入替 */
function cellValue(row: KijyuntenFeatureProps, col: string): unknown {
  if (col === "x") return row.y;
  if (col === "y") return row.x;
  return row[col as keyof KijyuntenFeatureProps];
}

export function featuresToCsv(
  rows: KijyuntenFeatureProps[],
  columns: string[],
): string {
  const header = columns.join(",");
  const body = rows.map((row) =>
    columns
      .map((col) => escapeCsvField(formatCell(col, cellValue(row, col))))
      .join(","),
  );
  return [header, ...body].join("\r\n");
}

export function downloadCsv(content: string, filename: string): void {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function csvFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `kijyunten_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.csv`;
}
