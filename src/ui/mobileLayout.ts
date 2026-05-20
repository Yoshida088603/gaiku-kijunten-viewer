/** スマホ向けレイアウト: ページスクロール・キーボード・キャッシュされた旧 viewport 対策 */

export const LAYOUT_FIX_VERSION = "v5";

export const VIEWPORT_CONTENT =
  "width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";

const BOTTOM_BASE_PX = 12;

export function isTouchUi(): boolean {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

/**
 * キャッシュされた旧 index.html の viewport（resizes-content 等）を起動時に上書きする。
 * @returns 修正が必要だった場合 true
 */
export function ensureMobileViewport(): boolean {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return false;
  const before = meta.getAttribute("content") ?? "";
  const needsPatch =
    before !== VIEWPORT_CONTENT || before.includes("interactive-widget=resizes-content");
  if (needsPatch) {
    meta.setAttribute("content", VIEWPORT_CONTENT);
  }
  document.documentElement.dataset.layoutFix = LAYOUT_FIX_VERSION;
  return needsPatch;
}

function keyboardBottomInset(): number {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

export function lockPageScroll(): void {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function initMobileBottomChrome(
  downloadWrap: HTMLElement,
  contactFooter: HTMLElement | null,
): void {
  if (!isTouchUi()) return;

  document.documentElement.classList.add("touch-ui");
  lockPageScroll();

  const targets = [downloadWrap, contactFooter].filter(
    (el): el is HTMLElement => el !== null,
  );

  function applyBottom(): void {
    const inset = keyboardBottomInset();
    for (const el of targets) {
      el.style.bottom = `${BOTTOM_BASE_PX + inset}px`;
    }
    lockPageScroll();
  }

  applyBottom();
  window.visualViewport?.addEventListener("resize", applyBottom);
  window.visualViewport?.addEventListener("scroll", applyBottom);
  window.addEventListener("orientationchange", applyBottom);
}

export function bindMobileFormInputs(
  input: HTMLInputElement,
  select: HTMLSelectElement,
): void {
  if (!isTouchUi()) return;

  const onFocus = (): void => {
    lockPageScroll();
    requestAnimationFrame(lockPageScroll);
  };
  const onBlur = (): void => {
    lockPageScroll();
    requestAnimationFrame(lockPageScroll);
  };

  input.addEventListener("focus", onFocus);
  input.addEventListener("blur", onBlur);
  select.addEventListener("focus", onFocus);
  select.addEventListener("blur", onBlur);
}
