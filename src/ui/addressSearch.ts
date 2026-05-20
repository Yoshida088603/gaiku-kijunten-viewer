import type { Map } from "maplibre-gl";

import type { MapConfig } from "@/data/types";
import {
  DEFAULT_GSI_ADDRESS_SEARCH_URL,
  searchGsiAddress,
  type GsiAddressHit,
} from "@/geocode/gsiAddressSearch";

export function initAddressSearch(
  root: HTMLElement,
  map: Map,
  mapConfig: MapConfig,
): void {
  const form = root.querySelector<HTMLFormElement>("#address-search-form");
  const input = root.querySelector<HTMLInputElement>("#address-search-input");
  const submitBtn = root.querySelector<HTMLButtonElement>("#address-search-submit");
  const statusEl = root.querySelector<HTMLElement>("#address-search-status");
  const resultsWrap = root.querySelector<HTMLElement>("#address-search-results");
  const selectEl = root.querySelector<HTMLSelectElement>("#address-search-select");
  const goBtn = root.querySelector<HTMLButtonElement>("#address-search-go");

  if (!form || !input || !submitBtn || !statusEl || !resultsWrap || !selectEl || !goBtn) {
    throw new Error("Address search DOM elements missing");
  }

  const formEl = form;
  const inputEl = input;
  const submitEl = submitBtn;
  const status = statusEl;
  const resultsEl = resultsWrap;
  const select = selectEl;
  const goEl = goBtn;

  const apiUrl = mapConfig.gsiAddressSearchUrl ?? DEFAULT_GSI_ADDRESS_SEARCH_URL;
  const searchZoom = mapConfig.detailMinZoom + 0.5;

  let hits: GsiAddressHit[] = [];
  let searching = false;

  function setStatus(message: string, isError = false): void {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function hideResults(): void {
    resultsEl.classList.add("hidden");
    select.replaceChildren();
    hits = [];
  }

  function fillSelect(items: GsiAddressHit[]): void {
    select.replaceChildren();
    for (let i = 0; i < items.length; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = items[i].title;
      select.appendChild(opt);
    }
  }

  function showResults(items: GsiAddressHit[]): void {
    hits = items;
    fillSelect(items);
    resultsEl.classList.remove("hidden");
  }

  function selectedHit(): GsiAddressHit | null {
    const idx = Number(select.value);
    if (!Number.isInteger(idx) || idx < 0 || idx >= hits.length) return null;
    return hits[idx] ?? null;
  }

  function flyToHit(hit: GsiAddressHit): void {
    map.easeTo({
      center: [hit.lng, hit.lat],
      zoom: searchZoom,
      duration: 800,
    });
    setStatus(`「${hit.title}」へ移動しました`);
  }

  function setBusy(busy: boolean): void {
    searching = busy;
    inputEl.disabled = busy;
    submitEl.disabled = busy;
    goEl.disabled = busy || hits.length === 0;
  }

  async function runSearch(): Promise<void> {
    if (searching) return;
    hideResults();
    setBusy(true);
    setStatus("検索中…");

    try {
      const results = await searchGsiAddress(inputEl.value, apiUrl);
      if (results.length === 0) {
        setStatus("該当する住所が見つかりませんでした");
        return;
      }
      if (results.length === 1) {
        flyToHit(results[0]);
        return;
      }
      showResults(results);
      setStatus(`${results.length} 件見つかりました。候補を選んで「移動」を押してください`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(msg, true);
    } finally {
      setBusy(false);
      goEl.disabled = hits.length === 0;
    }
  }

  formEl.addEventListener("submit", (ev) => {
    ev.preventDefault();
    void runSearch();
  });

  goEl.addEventListener("click", () => {
    const hit = selectedHit();
    if (!hit) return;
    flyToHit(hit);
  });

  select.addEventListener("change", () => {
    const hit = selectedHit();
    if (hit) {
      setStatus(`選択: ${hit.title}`);
    }
  });
}
