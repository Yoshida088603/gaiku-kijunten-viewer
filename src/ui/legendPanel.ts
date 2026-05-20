/** 右上ハンバーガーで凡例パネルを開閉する */
export function initLegendPanelToggle(shell: HTMLElement, toggle: HTMLButtonElement): void {

  const setExpanded = (expanded: boolean): void => {
    shell.classList.toggle("is-collapsed", !expanded);
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    toggle.setAttribute("aria-label", expanded ? "凡例を閉じる" : "凡例を開く");
  };

  const compactLayout = window.matchMedia("(max-width: 600px)");
  setExpanded(!compactLayout.matches);

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    setExpanded(!expanded);
  });
}
