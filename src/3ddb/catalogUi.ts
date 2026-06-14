import type { DddbCatalogEntry, DddbConfig } from "@/3ddb/types";
import { primaryDownloadAction } from "@/3ddb/downloadLinks";

export interface DddbCatalogUiState {
  wrapHidden: boolean;
  optionCount: number;
  selectedRegId: number | null;
  toggleChecked: boolean;
  statusText: string;
  downloadLabel: string;
}

export class DddbCatalogUi {
  readonly wrap: HTMLElement;
  private select: HTMLSelectElement;
  private downloadBtn: HTMLButtonElement;
  private toggle: HTMLInputElement;
  private statusEl: HTMLElement;
  private disclaimerEl: HTMLElement;
  private entries: DddbCatalogEntry[] = [];
  private onSelectChange: (regId: number | null) => void = () => {};
  private onToggleChange: (visible: boolean) => void = () => {};
  private onDownloadClick: () => void = () => {};
  private config: DddbConfig | null = null;

  constructor(parent: HTMLElement) {
    this.wrap = document.createElement("div");
    this.wrap.id = "ddb-catalog-wrap";
    this.wrap.className = "ddb-catalog-wrap hidden";
    this.wrap.setAttribute("role", "region");
    this.wrap.setAttribute("aria-label", "3DDBデータカタログ");

    const heading = document.createElement("div");
    heading.className = "ddb-catalog-heading";
    heading.textContent = "3DDBデータ";

    this.toggle = document.createElement("input");
    this.toggle.type = "checkbox";
    this.toggle.id = "ddb-toggle";
    this.toggle.checked = true;
    this.toggle.className = "ddb-catalog-toggle";
    const toggleLabel = document.createElement("label");
    toggleLabel.htmlFor = "ddb-toggle";
    toggleLabel.className = "ddb-catalog-toggle-label";
    toggleLabel.textContent = "範囲表示";

    const toggleRow = document.createElement("div");
    toggleRow.className = "ddb-catalog-toggle-row";
    toggleRow.append(this.toggle, toggleLabel);

    this.select = document.createElement("select");
    this.select.id = "ddb-catalog-select";
    this.select.className = "ddb-catalog-select";

    this.downloadBtn = document.createElement("button");
    this.downloadBtn.type = "button";
    this.downloadBtn.id = "ddb-download-btn";
    this.downloadBtn.className = "ddb-catalog-download-btn";
    this.downloadBtn.textContent = "ダウンロード";

    this.statusEl = document.createElement("p");
    this.statusEl.className = "ddb-catalog-status";
    this.statusEl.setAttribute("role", "status");
    this.statusEl.setAttribute("aria-live", "polite");

    this.disclaimerEl = document.createElement("p");
    this.disclaimerEl.className = "ddb-catalog-disclaimer";
    this.disclaimerEl.textContent =
      "3DDB API利用時は産総研の利用規約・免責事項が適用されます。";

    this.wrap.append(
      heading,
      toggleRow,
      this.select,
      this.downloadBtn,
      this.statusEl,
      this.disclaimerEl,
    );
    parent.insertBefore(this.wrap, parent.firstChild);

    this.select.addEventListener("change", () => {
      const regId = this.selectedRegId();
      this.onSelectChange(regId);
      this.updateDownloadButton();
    });

    this.toggle.addEventListener("change", () => {
      this.onToggleChange(this.toggle.checked);
    });

    this.downloadBtn.addEventListener("click", () => this.onDownloadClick());
  }

  bindHandlers(handlers: {
    onSelectChange: (regId: number | null) => void;
    onToggleChange: (visible: boolean) => void;
    onDownloadClick: () => void;
  }): void {
    this.onSelectChange = handlers.onSelectChange;
    this.onToggleChange = handlers.onToggleChange;
    this.onDownloadClick = handlers.onDownloadClick;
  }

  setVisible(visible: boolean): void {
    this.wrap.classList.toggle("hidden", !visible);
  }

  isVisible(): boolean {
    return !this.wrap.classList.contains("hidden");
  }

  setEntries(entries: DddbCatalogEntry[], config: DddbConfig, totalAll?: number): void {
    this.config = config;
    this.entries = entries;
    const prev = this.selectedRegId();
    this.select.replaceChildren();

    if (entries.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "表示範囲にデータがありません";
      this.select.append(opt);
      this.select.disabled = true;
      this.downloadBtn.disabled = true;
      this.statusEl.textContent = "";
      return;
    }

    this.select.disabled = false;
    for (const entry of entries) {
      const opt = document.createElement("option");
      opt.value = String(entry.regId);
      opt.textContent = `[${entry.serviceName}] ${entry.title}`;
      this.select.append(opt);
    }

    const still = entries.find((e) => e.regId === prev);
    if (still) {
      this.select.value = String(prev);
    }

    let status = `${entries.length} 件`;
    if (totalAll != null && totalAll > entries.length) {
      status += `（全 ${totalAll} 件中、上限 ${config.maxFeatures} 件まで表示）`;
    }
    this.statusEl.textContent = status;
    this.updateDownloadButton(config);
    this.onSelectChange(this.selectedRegId());
  }

  setLoading(): void {
    this.select.replaceChildren();
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "読込中…";
    this.select.append(opt);
    this.select.disabled = true;
    this.downloadBtn.disabled = true;
    this.statusEl.textContent = "";
  }

  setError(message: string): void {
    this.select.replaceChildren();
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "取得エラー";
    this.select.append(opt);
    this.select.disabled = true;
    this.downloadBtn.disabled = true;
    this.statusEl.textContent = message;
  }

  selectedRegId(): number | null {
    const v = this.select.value;
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  getUiState(): DddbCatalogUiState {
    const entry = this.entries.find((e) => e.regId === this.selectedRegId());
    const action =
      entry && this.config
        ? primaryDownloadAction(this.config, entry.properties)
        : { kind: "none" as const, label: "ダウンロード不可" };
    return {
      wrapHidden: this.wrap.classList.contains("hidden"),
      optionCount: this.entries.length,
      selectedRegId: this.selectedRegId(),
      toggleChecked: this.toggle.checked,
      statusText: this.statusEl.textContent?.trim() ?? "",
      downloadLabel: this.downloadBtn.textContent?.trim() ?? action.label,
    };
  }

  openSelectedDownload(): void {
    const regId = this.selectedRegId();
    const entry = this.entries.find((e) => e.regId === regId);
    if (!entry || !this.config) return;
    const action = primaryDownloadAction(this.config, entry.properties);
    if (action.kind === "none") return;
    window.open(action.url, "_blank", "noopener,noreferrer");
  }

  private updateDownloadButton(config?: DddbConfig): void {
    const regId = this.selectedRegId();
    const entry = this.entries.find((e) => e.regId === regId);
    const cfg = config ?? this.config;
    if (!entry || !cfg) {
      this.downloadBtn.disabled = true;
      this.downloadBtn.textContent = "ダウンロード";
      return;
    }
    const action = primaryDownloadAction(cfg, entry.properties);
    this.downloadBtn.textContent = action.label;
    this.downloadBtn.disabled = action.kind === "none";
  }
}
