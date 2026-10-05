import { spawn } from "node:child_process";
import path from "node:path";
import { BINARIES, BIN_DIR, getDownloadDir } from "./config.js";
import { t } from "./i18n.js";

export type OpcionDescarga = "video_max" | "video_1080" | "video_720" | "audio_mp3" | "info" | "reproducir";

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
};

function dibujarBarra(porcentajeStr: string, totalStr: string, velocidadStr: string, etaStr: string): void {
  const limpioPorc = parseFloat(porcentajeStr.replace("%", "").trim()) || 0;
  const anchoBarra = 24;
  const completado = Math.round((limpioPorc / 100) * anchoBarra);
  const restante = anchoBarra - completado;

  const barra = `${C.cyan}█`.repeat(completado) + `${C.gray}░`.repeat(Math.max(0, restante)) + `${C.reset}`;
  const linea = `  [${barra}] ${C.bold}${porcentajeStr.trim().padStart(6)}${C.reset} | ${C.yellow}${velocidadStr.trim()}${C.reset} | ${totalStr.trim()} | ETA: ${C.green}${etaStr.trim()}${C.reset}`;

  process.stdout.write(`\r\x1b[K${linea}`);
}

export function ejecutarOperacion(url: string, opcion: OpcionDescarga, esPlaylist: boolean = false): Promise<number> {
  return new Promise((resolve) => {
    let comando = BINARIES.ytdlp;

    // Si es playlist, crea una subcarpeta con el nombre de la lista y numera los archivos
    const outputTemplate = esPlaylist
      ? path.join(getDownloadDir(), "%(playlist_title,playlist)s", "%(playlist_index)02d - %(title)s.%(ext)s")
      : path.join(getDownloadDir(), "%(title)s.%(ext)s");

    const baseArgs = [
      "--ffmpeg-location", BIN_DIR,
      "--no-warnings",
      "--no-check-certificates",
      "--newline",
      esPlaylist ? "--yes-playlist" : "--no-playlist",
      "--progress-template", "KK_PROG:%(progress._percent_str)s|%(progress._total_bytes_estimate_str,progress._total_bytes_str)s|%(progress._speed_str)s|%(progress._eta_str)s",
      "-o", outputTemplate,
    ];

    let formatoArgs: string[] = [];

    switch (opcion) {
      case "video_max":
        formatoArgs = ["-f", "bv*+ba/b", "--merge-output-format", "mp4"];
        break;

      case "video_1080":
        formatoArgs = ["-f", "bv*[height<=1080]+ba/b[height<=1080]", "--merge-output-format", "mp4"];
        break;

      case "video_720":
        formatoArgs = ["-f", "bv*[height<=720]+ba/b[height<=720]", "--merge-output-format", "mp4"];
        break;

      case "audio_mp3":
        formatoArgs = ["-x", "--audio-format", "mp3", "--audio-quality", "0"];
        break;

      case "info":
        formatoArgs = [
          "--skip-download",
          "--print", `${t("infoTitle")}: %(title)s`,
          "--print", `${t("infoChannel")}: %(uploader)s`,
          "--print", `${t("infoDuration")}: %(duration_string)s`,
          "--print", `${t("infoResolution")}: %(resolution)s`,
        ];
        break;

      case "reproducir":
        formatoArgs = ["-f", "b", "-g"];
        break;
    }

    if (opcion === "reproducir") {
      process.stdout.write(`  ${C.gray}${t("connectingStream")}${C.reset}\n`);
      const getUrl = spawn(comando, ["-f", "b", "-g", "--no-warnings", url], { windowsHide: true });
      let streamUrl = "";

      getUrl.stdout.on("data", (d) => (streamUrl += d.toString()));
      getUrl.on("close", (code) => {
        if (code !== 0 || !streamUrl.trim()) {
          resolve(1);
          return;
        }
        process.stdout.write(`  ${C.green}${t("playingStream")}${C.reset}\n`);
        const play = spawn(BINARIES.ffplay, ["-autoexit", "-nodisp", streamUrl.trim()], {
          stdio: "ignore",
          windowsHide: false,
        });
        play.on("close", (c) => resolve(c ?? 0));
      });
      return;
    }

    const argsFinales = [...baseArgs, ...formatoArgs, url];
    const child = spawn(comando, argsFinales, { windowsHide: true });

    let errorBuffer = "";

    process.stdout.write(
      esPlaylist
        ? `  ${C.cyan}${C.bold}[PLAYLIST]${C.reset} ${C.gray}${t("playlistAnalyzing")}${C.reset}\n`
        : `  ${C.gray}${t("connecting")}${C.reset}\n`
    );

    child.stdout.on("data", (data: Buffer) => {
      const lineas = data.toString().split("\n");

      for (const linea of lineas) {
        const limpia = linea.trim();

        if (limpia.startsWith("KK_PROG:")) {
          const contenido = limpia.replace("KK_PROG:", "");
          const [porc, total, vel, eta] = contenido.split("|");
          dibujarBarra(porc || "0%", total || "N/A", vel || "0B/s", eta || "--:--");
        } else if (limpia.startsWith("[download] Downloading item") || limpia.startsWith("[download] Downloading video")) {
          process.stdout.write(`\n\n  ${C.cyan}${C.bold}${limpia}${C.reset}\n`);
        } else if (limpia.includes("[ExtractAudio]") || limpia.includes("Destination:")) {
          process.stdout.write(`\n  ${C.yellow}${t("processingAudio")}${C.reset}`);
        } else if (limpia.includes("[Merger]")) {
          process.stdout.write(`\n  ${C.yellow}${t("merging")}${C.reset}`);
        } else if (opcion === "info" && limpia && !limpia.includes("KK_PROG")) {
          console.log(`  ${C.bold}${C.cyan}${limpia}${C.reset}`);
        }
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      const errStr = data.toString();
      if (!errStr.includes("WARNING") && !errStr.includes("Deprecation")) {
        errorBuffer += errStr;
      }
    });

    child.on("close", (code) => {
      process.stdout.write("\n");
      if (code !== 0 && errorBuffer.trim()) {
        console.error(`\n  ${errorBuffer.trim()}`);
      }
      resolve(code ?? 0);
    });

    child.on("error", (err) => {
      console.error(`\n  ${t("startProcessError", { error: err.message })}`);
      resolve(1);
    });
  });
}