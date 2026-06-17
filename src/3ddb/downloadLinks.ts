import type {
  DddbConfig,
  DddbDownloadAction,
  DddbExternalLink,
  DddbFeatureProperties,
} from "@/3ddb/types";

function zipUrl(config: DddbConfig, regId: number): string {
  const base = config.apiBaseUrl.replace(/\/api\/v1\/?$/, "");
  return `${base}/api/v1/zipdata/${regId}`;
}

function copcViewerUrl(config: DddbConfig, regId: number): string {
  const base = config.copcViewerBaseUrl.replace(/\/?$/, "/");
  const url = new URL(base);
  url.searchParams.set("reg_id", String(regId));
  return url.toString();
}

function externalLinkLabel(linkType: string): string {
  return linkType === "archive" ? "外部アーカイブ" : "外部リンク";
}

function pushLinkAction(
  actions: DddbDownloadAction[],
  config: DddbConfig,
  regId: number,
  url: string,
  linkType: string,
): void {
  if (linkType === "copc") {
    actions.push({
      kind: "copc",
      url: copcViewerUrl(config, regId),
      label: "COPCビューア",
    });
    return;
  }
  if (url) {
    actions.push({
      kind: "external",
      url,
      label: externalLinkLabel(linkType),
    });
  }
}

function pushExternalLink(
  actions: DddbDownloadAction[],
  config: DddbConfig,
  regId: number,
  link: DddbExternalLink,
): void {
  pushLinkAction(
    actions,
    config,
    regId,
    link.external_link,
    link.external_link_type,
  );
}

export function resolveDownloadActions(
  config: DddbConfig,
  props: DddbFeatureProperties,
): DddbDownloadAction[] {
  const actions: DddbDownloadAction[] = [];

  if (props.downloadable) {
    actions.push({
      kind: "zip",
      url: zipUrl(config, props.reg_id),
      label: "ZIPダウンロード",
    });
  }

  const links = props.external_links ?? [];
  for (const link of links) {
    pushExternalLink(actions, config, props.reg_id, link);
  }

  if (props.external_link && !links.length) {
    pushLinkAction(
      actions,
      config,
      props.reg_id,
      props.external_link,
      props.external_link_type ?? "",
    );
  }

  if (actions.length === 0) {
    actions.push({ kind: "none", label: "ダウンロード不可" });
  }

  return actions;
}

export function primaryDownloadAction(
  config: DddbConfig,
  props: DddbFeatureProperties,
): DddbDownloadAction {
  const actions = resolveDownloadActions(config, props);
  const zip = actions.find((a) => a.kind === "zip");
  if (zip) return zip;
  const copc = actions.find((a) => a.kind === "copc");
  if (copc) return copc;
  const ext = actions.find((a) => a.kind === "external");
  if (ext) return ext;
  return actions[0];
}
