import { verificarBinarios, setDownloadDir } from "./config.js";
import { esPlaylistYoutube, validarUrl } from "./validator.js";
import { ejecutarOperacion, OpcionDescarga } from "./downloader.js";
import { TerminalUI, OpcionMenu } from "./ui.js";
import { t } from "./i18n.js";

const OPCIONES_MENU: OpcionMenu[] = [
  { id: "video_max", label: t("menuVideoMax"), desc: t("descVideoMax") },
  { id: "video_1080", label: t("menuVideo1080"), desc: t("descVideo1080") },
  { id: "video_720", label: t("menuVideo720"), desc: t("descVideo720") },
  { id: "audio_mp3", label: t("menuAudio"), desc: t("descAudio") },
  { id: "info", label: t("menuInfo"), desc: t("descInfo") },
  { id: "reproducir", label: t("menuPlay"), desc: t("descPlay") },
  { id: "cambiar_destino", label: t("menuChangeFolder"), desc: t("descChangeFolder") },
  { id: "salir", label: t("menuExit"), desc: t("descExit") },
];

const OPCIONES_PLAYLIST: OpcionMenu[] = [
  { id: "audio_mp3", label: t("menuPlaylistAudio"), desc: t("descPlaylistAudio") },
  { id: "video_max", label: t("menuPlaylistVideo"), desc: t("descPlaylistVideo") },
  { id: "video_720", label: t("menuPlaylist720"), desc: t("descPlaylist720") },
  { id: "salir", label: t("menuCancel"), desc: t("descCancel") },
];

async function descargarPlaylistYoutube(ui: TerminalUI, url: string): Promise<void> {
  const formato = await ui.menuInteractivo(OPCIONES_PLAYLIST, t("playlistFormat"));
  if (formato === "salir") return;

  ui.dibujarHeader();
  console.log(`  ${t("playlistProcessing", { url }).replace(url, `\x1b[36m${url}\x1b[0m`)}\n`);

  const codigo = await ejecutarOperacion(url, formato as OpcionDescarga, true);
  if (codigo === 0) {
    ui.mostrarExito(t("playlistSuccess"));
  } else {
    ui.mostrarError(t("operationCode", { code: String(codigo) }));
  }

  await ui.pausar();
}

async function main() {
  const ui = new TerminalUI();

  const status = verificarBinarios();
  if (!status.ok) {
    ui.dibujarHeader();
    ui.mostrarError(t("missingBinaries", { path: `${process.cwd()}\\lib` }));
    for (const f of status.faltantes) {
      console.log(`    - ${f}`);
    }
    process.exit(1);
  }

  while (true) {
    ui.dibujarHeader();

    const urlRaw = await ui.pedirUrl();
    if (!urlRaw) continue;

    // Atajo [C]: Configurar carpeta
    if (urlRaw.toLowerCase() === "c" || urlRaw.toLowerCase() === "config") {
      const nuevaRuta = await ui.pedirNuevaRuta();
      if (nuevaRuta) {
        const res = setDownloadDir(nuevaRuta);
        if (res.ok) {
          ui.mostrarExito(t("configFolderSaved", { path: res.rutaFinal }));
        } else {
          ui.mostrarError(res.error ?? t("changeFolderError"));
        }
      }
      await ui.pausar();
      continue;
    }

    // Atajo [P]: Descargar Playlist de sitios que no se detectan automaticamente
    if (urlRaw.toLowerCase() === "p" || urlRaw.toLowerCase() === "playlist") {
      const playlistUrl = await ui.pedirUrlPlaylist();
      const validacionPl = validarUrl(playlistUrl);
      if (!validacionPl.valida) {
        ui.mostrarError(validacionPl.error ?? t("invalidPlaylistUrl"));
        await ui.pausar();
        continue;
      }

      await descargarPlaylistYoutube(ui, validacionPl.urlLimpia);
      continue;
    }

    // Modo normal: Video / Audio individual
    const validacion = validarUrl(urlRaw);
    if (!validacion.valida) {
      ui.mostrarError(validacion.error ?? t("invalidUrl"));
      await ui.pausar();
      continue;
    }

    if (esPlaylistYoutube(validacion.urlLimpia)) {
      await descargarPlaylistYoutube(ui, validacion.urlLimpia);
      continue;
    }

    const seleccionId = await ui.menuInteractivo(OPCIONES_MENU);

    if (seleccionId === "salir") {
      ui.dibujarHeader();
      console.log(`  ${t("sessionEnded")}\n`);
      process.exit(0);
    }

    if (seleccionId === "cambiar_destino") {
      const nuevaRuta = await ui.pedirNuevaRuta();
      if (nuevaRuta) {
        const res = setDownloadDir(nuevaRuta);
        if (res.ok) {
          ui.mostrarExito(t("configFolderSaved", { path: res.rutaFinal }));
        } else {
          ui.mostrarError(res.error ?? t("changeFolderError"));
        }
      }
      await ui.pausar();
      continue;
    }

    ui.dibujarHeader();
    console.log(`  ${t("processing", { url: `\x1b[36m${validacion.urlLimpia}\x1b[0m` })}\n`);

    const codigo = await ejecutarOperacion(validacion.urlLimpia, seleccionId as OpcionDescarga, false);

    if (codigo === 0) {
      ui.mostrarExito(t("downloadSuccess"));
    } else {
      ui.mostrarError(t("downloadFailed", { code: String(codigo) }));
    }

    await ui.pausar();
  }
}

main().catch((err) => {
  console.error(`\n${t("criticalError")}`, err);
  process.exit(1);
});