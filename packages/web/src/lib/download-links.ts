import { requiresLocalApp, type WritingMode } from "./writing-mode.js";

export interface DownloadLinks {
  macosDownloadUrl: string;
  githubReleasesUrl: string;
  repositoryUrl: string;
  localSetupUrl: string;
}

const DEFAULT_REPO = "https://github.com/Rillus/inscriva";

export function downloadLinks(): DownloadLinks {
  return {
    macosDownloadUrl: import.meta.env.VITE_MACOS_DOWNLOAD_URL ?? "",
    githubReleasesUrl:
      import.meta.env.VITE_GITHUB_RELEASES_URL ??
      `${DEFAULT_REPO}/releases/latest`,
    repositoryUrl: import.meta.env.VITE_REPOSITORY_URL ?? DEFAULT_REPO,
    localSetupUrl:
      import.meta.env.VITE_LOCAL_SETUP_URL ??
      `${DEFAULT_REPO}#quick-start-browser--dev-bridge`,
  };
}

export function macosDownloadHref(links: DownloadLinks = downloadLinks()): string {
  return links.macosDownloadUrl.trim() || links.githubReleasesUrl;
}

export { requiresLocalApp };

export function recommendAppOverWebsite(mode: WritingMode): boolean {
  return requiresLocalApp(mode);
}
