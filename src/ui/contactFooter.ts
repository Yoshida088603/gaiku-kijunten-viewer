import type { SiteConfig, SiteContactConfig } from "@/data/types";

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

function renderContactHtml(contact: SiteContactConfig): string {
  const xLink = `<a href="${escapeAttr(contact.xUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(contact.xLabel)}</a>`;
  const mlitLink = `<a href="${escapeAttr(contact.mlitUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(contact.mlitLabel)}</a>`;

  return `<p class="contact-footer-line">${escapeHtml(contact.viewerLine)} ${xLink}</p>
<p class="contact-footer-line">${escapeHtml(contact.dataLine)} ${mlitLink}</p>`;
}

export function applyContactFooter(site: SiteConfig): void {
  const el = document.getElementById("contact-footer");
  if (!el) return;

  const contact = site.contact;
  if (!contact?.xUrl?.trim() || !contact?.mlitUrl?.trim()) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }

  el.innerHTML = renderContactHtml(contact);
  el.hidden = false;
}
