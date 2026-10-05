import { t } from "./i18n.js";

export function validarUrl(urlRaw: string): { valida: boolean; urlLimpia: string; error?: string } {
  const urlTrimmed = urlRaw.trim();

  if (!urlTrimmed) {
    return { valida: false, urlLimpia: "", error: t("urlEmpty") };
  }

  try {
    const parsed = new URL(urlTrimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valida: false, urlLimpia: "", error: t("urlProtocol") };
    }
    return { valida: true, urlLimpia: parsed.toString() };
  } catch {
    return { valida: false, urlLimpia: "", error: t("urlFormat") };
  }
}

export function esPlaylistYoutube(url: string): boolean {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  const esYoutube =
    hostname === "youtu.be" ||
    hostname.endsWith(".youtu.be") ||
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com");

  return esYoutube && (parsed.pathname.replace(/\/+$/, "") === "/playlist" || parsed.searchParams.has("list"));
}