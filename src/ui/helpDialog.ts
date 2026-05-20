import type { SiteConfig } from "@/data/types";

function renderHelpBody(site: SiteConfig): string {
  const { help } = site;
  const sections = help.sections
    .map(
      (sec) =>
        `<section class="help-section"><h3>${escapeHtml(sec.heading)}</h3><ul>${sec.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`,
    )
    .join("");

  const links = `<p class="help-links">
    <a href="${escapeAttr(help.dataSourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(help.dataSourceLabel)}</a>
    ·
    <a href="${escapeAttr(help.repoUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(help.repoLabel)}</a>
  </p>`;

  return sections + links;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(url: string): string {
  return url.replace(/"/g, "&quot;");
}

export function applySiteBranding(site: SiteConfig): void {
  document.title = site.title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", site.description);
  const titleEl = document.getElementById("panel-title");
  if (titleEl) titleEl.textContent = site.title;
  const noticeEl = document.getElementById("panel-notice");
  if (noticeEl) {
    const text = site.panelNotice?.trim() ?? "";
    noticeEl.textContent = text;
    noticeEl.hidden = text.length === 0;
  }
}

export function initHelpDialog(
  dialog: HTMLDialogElement,
  openBtn: HTMLButtonElement,
  closeBtn: HTMLButtonElement,
  bodyEl: HTMLElement,
  site: SiteConfig,
): void {
  bodyEl.innerHTML = renderHelpBody(site);

  const open = (): void => {
    if (!dialog.open) dialog.showModal();
  };
  const close = (): void => {
    if (dialog.open) dialog.close();
  };

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });
}
