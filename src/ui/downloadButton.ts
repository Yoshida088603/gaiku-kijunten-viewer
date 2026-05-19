import { csvFilename, downloadCsv, featuresToCsv } from "@/lib/csvExport";
import type { KijyuntenFeatureProps } from "@/data/types";

export type DownloadUiState = "hidden" | "locked" | "empty" | "ready";

export interface DownloadUiOptions {
  zoom?: number;
  minZoom?: number;
  count?: number;
}

export class DownloadButtonController {
  constructor(
    private wrap: HTMLElement,
    private btn: HTMLButtonElement,
    private hint: HTMLElement,
    private getRowsInView: () => KijyuntenFeatureProps[],
    private csvColumns: string[],
  ) {
    this.btn.addEventListener("click", () => this.onDownload());
  }

  setState(state: DownloadUiState, opts: DownloadUiOptions = {}): void {
    this.hint.classList.remove("is-locked");

    if (state === "hidden") {
      this.wrap.classList.add("hidden");
      return;
    }

    this.wrap.classList.remove("hidden");

    if (state === "locked") {
      this.btn.disabled = true;
      const z = opts.zoom ?? 0;
      const minZ = opts.minZoom ?? 17;
      this.hint.classList.add("is-locked");
      this.hint.textContent = `z${minZ}以上に拡大してください（現在 z${Math.round(z)}）`;
      return;
    }

    if (state === "empty") {
      this.btn.disabled = true;
      this.hint.textContent = "表示範囲に点がありません";
      return;
    }

    const n = opts.count ?? this.getRowsInView().length;
    this.btn.disabled = n === 0;
    this.hint.textContent =
      n > 0 ? `表示範囲の ${n} 点をダウンロード` : "表示範囲に点がありません";
  }

  private onDownload(): void {
    const rows = this.getRowsInView();
    if (rows.length === 0) return;
    const csv = featuresToCsv(rows, this.csvColumns);
    downloadCsv(csv, csvFilename());
  }
}
