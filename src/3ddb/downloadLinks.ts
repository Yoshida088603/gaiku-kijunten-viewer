import type {
  DddbConfig,
  DddbDownloadAction,
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
    if (link.external_link_type === "copc") {
      actions.push({
        kind: "copc",
        url: copcViewerUrl(config, props.reg_id),
        label: "COPCビューア",
      });
    } else if (link.external_link) {
      actions.push({
        kind: "external",
        url: link.external_link,
        label:
          link.external_link_type === "archive"
            ? "外部アーカイブ"
            : "外部リンク",
      });
    }
  }

  if (props.external_link && !links.length) {
    if (props.external_link_type === "copc") {
      actions.push({
        kind: "copc",
        url: copcViewerUrl(config, props.reg_id),
        label: "COPCビューア",
      });
    } else {
      actions.push({
        kind: "external",
        url: props.external_link,
        label: "外部リンク",
      });
    }
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
