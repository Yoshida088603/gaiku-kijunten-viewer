import { csvFilename, downloadCsv, featuresToCsv } from "@/lib/csvExport";
import type { KijyuntenFeatureProps } from "@/data/types";
import type { SelectionStore } from "@/map/selection";

export type DownloadUiState = "hidden" | "disabled" | "active";

export class DownloadButtonController {
  constructor(
    private wrap: HTMLElement,
    private btn: HTMLButtonElement,
    private hint: HTMLElement,
    private selection: SelectionStore,
    private csvColumns: string[],
  ) {
    this.btn.addEventListener("click", () => this.onDownload());
    this.selection.onChange(() => this.syncFromSelection());
  }

  setState(state: DownloadUiState): void {
    if (state === "hidden") {
      this.wrap.classList.add("hidden");
      return;
    }
    this.wrap.classList.remove("hidden");
    if (state === "disabled") {
      this.btn.disabled = true;
      this.hint.textContent = "地図上の点をクリックして選択";
    } else {
      this.btn.disabled = false;
      const n = this.selection.size;
      this.hint.textContent = n > 0 ? `${n}点を選択中` : "";
    }
  }

  private syncFromSelection(): void {
    if (this.wrap.classList.contains("hidden")) return;
    if (this.selection.size > 0) {
      this.btn.disabled = false;
      this.hint.textContent = `${this.selection.size}点を選択中`;
    } else {
      this.btn.disabled = true;
      this.hint.textContent = "地図上の点をクリックして選択";
    }
  }

  private onDownload(): void {
    const rows: KijyuntenFeatureProps[] = this.selection.getRows();
    if (rows.length === 0) return;
    const csv = featuresToCsv(rows, this.csvColumns);
    downloadCsv(csv, csvFilename());
  }
}
