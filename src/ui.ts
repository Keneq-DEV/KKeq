import * as readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { BIN_DIR, getConfiguredDownloadDir } from "./config.js";
import { t } from "./i18n.js";

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  bgCyan: "\x1b[46m\x1b[30m\x1b[1m",
};

export interface OpcionMenu {
  id: string;
  label: string;
  desc: string;
}

export class TerminalUI {
  private limpiar(): void {
    output.write("\x1b[2J\x1b[0;0H");
  }

  dibujarHeader(): void {
    this.limpiar();
    output.write(`${C.cyan}${C.bold}`);
    output.write("  ╔══════════════════════════════════════════════════════════════╗\n");
    output.write(`  ║${t("header").padStart(36).padEnd(62)}║\n`);
    output.write("  ║                                                              ║\n");
    output.write("  ╚══════════════════════════════════════════════════════════════╝\n");
    output.write(`${C.reset}`);
    output.write(`  ${C.gray}${t("engine")}: ${C.dim}${BIN_DIR}${C.reset}\n`);
    const downloadDir = getConfiguredDownloadDir();
    output.write(`  ${C.gray}${t("destination")}: ${C.green}${C.bold}${downloadDir ?? t("destinationNotSet")}${C.reset}\n`);
    output.write(`  ${C.gray}──────────────────────────────────────────────────────────────${C.reset}\n\n`);
  }

  async pedirUrl(): Promise<string> {
    const rl = readline.createInterface({ input, output });
    output.write(`  ${C.bold}${C.cyan}${t("inputHeading")}${C.reset}\n`);
    const respuesta = await new Promise<string>((resolve) => {
      rl.question(`  ${C.yellow}${t("inputPrompt")}${C.reset} `, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });
    return respuesta;
  }

  async pedirUrlPlaylist(): Promise<string> {
    const rl = readline.createInterface({ input, output });
    output.write(`\n  ${C.bold}${C.cyan}${t("playlistHeading")}${C.reset}\n`);
    const respuesta = await new Promise<string>((resolve) => {
      rl.question(`  ${C.yellow}${t("playlistPrompt")}${C.reset} `, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });
    return respuesta;
  }

  async pedirNuevaRuta(): Promise<string> {
    const rl = readline.createInterface({ input, output });
    output.write(`\n  ${C.bold}${C.cyan}${t("destinationHeading")}${C.reset}\n`);
    const respuesta = await new Promise<string>((resolve) => {
      rl.question(`  ${C.yellow}${t("destinationPrompt")}${C.reset} `, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });
    return respuesta;
  }

  async menuInteractivo(opciones: OpcionMenu[], titulo?: string): Promise<string> {
    let indexSeleccionado = 0;

    return new Promise((resolve) => {
      const render = () => {
        this.dibujarHeader();
        output.write(`  ${C.bold}${titulo ?? t("chooseFormat")}${C.reset}\n\n`);

        opciones.forEach((opc, i) => {
          if (i === indexSeleccionado) {
            output.write(`  ${C.bgCyan} > ${opc.label.padEnd(30)} ${C.reset}  ${C.dim}${opc.desc}${C.reset}\n`);
          } else {
            output.write(`    ${C.bold}${opc.label.padEnd(30)}${C.reset}  ${C.gray}${opc.desc}${C.reset}\n`);
          }
        });

        output.write(`\n  ${C.gray}${t("navigation")}${C.reset}\n`);
      };

      if (input.isTTY) {
        input.setRawMode(true);
      }
      input.resume();
      input.setEncoding("utf8");

      render();

      const onKeypress = (key: string) => {
        if (key === "\u0003") {
          if (input.isTTY) input.setRawMode(false);
          output.write(`\n\n${t("exiting")}\n`);
          process.exit(0);
        }

        if (key === "\u001b[A") {
          indexSeleccionado = indexSeleccionado > 0 ? indexSeleccionado - 1 : opciones.length - 1;
          render();
        } else if (key === "\u001b[B") {
          indexSeleccionado = indexSeleccionado < opciones.length - 1 ? indexSeleccionado + 1 : 0;
          render();
        } else if (key === "\r" || key === "\n") {
          input.removeListener("data", onKeypress);
          if (input.isTTY) input.setRawMode(false);
          resolve(opciones[indexSeleccionado].id);
        }
      };

      input.on("data", onKeypress);
    });
  }

  async pausar(): Promise<void> {
    output.write(`\n  ${C.gray}${t("pause")}${C.reset}`);
    if (input.isTTY) input.setRawMode(true);
    input.resume();
    await new Promise<void>((resolve) => {
      input.once("data", () => {
        if (input.isTTY) input.setRawMode(false);
        resolve();
      });
    });
  }

  mostrarExito(msg: string): void {
    output.write(`\n  ${C.green}${C.bold}[OK]${C.reset} ${C.green}${msg}${C.reset}\n`);
  }

  mostrarError(msg: string): void {
    output.write(`\n  ${C.red}${C.bold}[ERROR]${C.reset} ${C.red}${msg}${C.reset}\n`);
  }
}