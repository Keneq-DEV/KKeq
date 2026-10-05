import path from "node:path";
import fs from "node:fs";

export const BIN_DIR = path.join(process.cwd(), "lib");

export const BINARIES = {
  ytdlp: path.join(BIN_DIR, "yt-dlp.exe"),
  ffmpeg: path.join(BIN_DIR, "ffmpeg.exe"),
  ffplay: path.join(BIN_DIR, "ffplay.exe"),
  ffprobe: path.join(BIN_DIR, "ffprobe.exe"),
};

const CONFIG_FILE = path.join(process.cwd(), "config.json");

export function getDownloadDir(): string {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (data.downloadDir && typeof data.downloadDir === "string") {
        return data.downloadDir;
      }
    }
  } catch {
    // Si falla, usa la carpeta por defecto
  }
  return path.join(process.cwd(), "downloads");
}

export function getConfiguredDownloadDir(): string | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }
    const data: unknown = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    if (
      data &&
      typeof data === "object" &&
      "downloadDir" in data &&
      typeof data.downloadDir === "string" &&
      data.downloadDir.trim().length > 0
    ) {
      return data.downloadDir;
    }
  } catch {
    return null;
  }
  return null;
}

export type Language = "es" | "en" | "ru" | "zh";

export function getLanguage(): Language {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      if (data.lang === "es" || data.lang === "en" || data.lang === "ru" || data.lang === "zh") {
        return data.lang;
      }
    }
  } catch {
    // Use Spanish if the configuration cannot be read.
  }
  return "es";
}

export function setDownloadDir(nuevoPath: string): { ok: boolean; rutaFinal: string; error?: string } {
  try {
    const rutaLimpia = nuevoPath.trim().replace(/^["']|["']$/g, "");
    const rutaAbsoluta = path.resolve(rutaLimpia);

    if (!fs.existsSync(rutaAbsoluta)) {
      fs.mkdirSync(rutaAbsoluta, { recursive: true });
    }

    let config: Record<string, unknown> = {};
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed: unknown = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        config = parsed as Record<string, unknown>;
      }
    }
    config.downloadDir = rutaAbsoluta;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
    return { ok: true, rutaFinal: rutaAbsoluta };
  } catch (err: any) {
    return { ok: false, rutaFinal: "", error: err.message };
  }
}

export function verificarBinarios(): { ok: boolean; faltantes: string[] } {
  const faltantes: string[] = [];

  for (const [nombre, ruta] of Object.entries(BINARIES)) {
    if (!fs.existsSync(ruta)) {
      faltantes.push(`${nombre} (${ruta})`);
    }
  }

  const dirDescarga = getDownloadDir();
  if (!fs.existsSync(dirDescarga)) {
    fs.mkdirSync(dirDescarga, { recursive: true });
  }

  return {
    ok: faltantes.length === 0,
    faltantes,
  };
}