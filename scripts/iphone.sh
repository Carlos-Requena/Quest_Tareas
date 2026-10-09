#!/usr/bin/env bash
# Compila Quests para iOS (release firmada) y la instala en el iPhone, por cable o por Wi-Fi.
# Uso: pnpm iphone [--sin-compilar] [--no-abrir] [--dispositivo <UDID>] [--prueba]
# Procedimiento y trampas: docs/runbooks/compilar-ios.md.

set -euo pipefail

BUNDLE_ID="com.requenadonacarlos.quests"
IPA="src-tauri/gen/apple/build/arm64/Quests.ipa"

compilar=1
abrir=1
prueba=0
udid="${IPHONE_UDID:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sin-compilar) compilar=0 ;;
    --no-abrir) abrir=0 ;;
    --prueba) prueba=1 ;;
    --dispositivo) udid="${2:?Falta el UDID tras --dispositivo}"; shift ;;
    -h|--help) sed -n '2,4p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Opción desconocida: $1 (mira --help)" >&2; exit 2 ;;
  esac
  shift
done

cd "$(dirname "$0")/.."

paso() { printf '\n\033[1;33m▸ %s\033[0m\n' "$*"; }
falla() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
corre() { if [[ $prueba == 1 ]]; then echo "  (prueba) $*"; else "$@"; fi; }

# El Rust de Homebrew no compila para iOS: el de rustup va delante (compilar-ios.md, «Dos Rust en el Mac»).
export PATH="$HOME/.cargo/bin:$PATH"

command -v xcrun >/dev/null || falla "Falta Xcode (xcrun)."
command -v pnpm >/dev/null || falla "Falta pnpm."
if [[ $compilar == 1 ]]; then
  rustup target list --installed 2>/dev/null | grep -q '^aarch64-apple-ios$' \
    || falla "Falta el destino de iOS en Rust: rustup target add aarch64-apple-ios aarch64-apple-ios-sim"
fi

# ── El iPhone: el indicado, o el primero real emparejado y disponible (por cable o Wi-Fi) ──
paso "Buscando el iPhone"
lista="$(mktemp -t quests-dispositivos)"
trap 'rm -f "$lista"' EXIT
xcrun devicectl list devices --quiet --json-output "$lista" >/dev/null 2>&1 || falla "devicectl no pudo listar los dispositivos."
elegido="$(node -e '
  const fs = require("fs");
  const [file, wanted] = process.argv.slice(1);
  const devs = (JSON.parse(fs.readFileSync(file, "utf8")).result?.devices ?? []).map((d) => ({
    udid: d.hardwareProperties?.udid ?? d.identifier,
    name: d.deviceProperties?.name ?? "iPhone",
    real: d.hardwareProperties?.reality === "physical",
    phone: (d.hardwareProperties?.deviceType ?? "iPhone") === "iPhone",
    paired: d.connectionProperties?.pairingState === "paired",
    ready: d.connectionProperties?.tunnelState !== "unavailable",
  }));
  const d = wanted ? devs.find((x) => x.udid === wanted) : devs.find((x) => x.real && x.phone && x.paired && x.ready);
  if (d) console.log(`${d.udid}\t${d.name}`);
' "$lista" "$udid")"
[[ -n "$elegido" ]] || falla "No encuentro ningún iPhone emparejado y disponible. Conéctalo por cable (o en la misma Wi-Fi), desbloquéalo y comprueba con: xcrun devicectl list devices"
udid="${elegido%%$'\t'*}"
nombre="${elegido#*$'\t'}"
echo "  $nombre ($udid)"

# ── Compilar ──
if [[ $compilar == 1 ]]; then
  rama="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  commit="$(git rev-parse --short HEAD 2>/dev/null || echo '?')"
  cambios=""
  [[ -n "$(git status --porcelain 2>/dev/null)" ]] && cambios=" + cambios sin commit"
  paso "Compilando la release firmada ($rama @ $commit$cambios). Tarda unos minutos"
  corre pnpm tauri ios build --export-method debugging
fi
[[ $prueba == 1 || -f "$IPA" ]] || falla "No está $IPA. Compila sin --sin-compilar."

# ── Instalar y abrir ──
paso "Instalando en $nombre"
corre xcrun devicectl device install app --device "$udid" "$IPA"

if [[ $abrir == 1 ]]; then
  paso "Abriendo Quests"
  # Con el iPhone bloqueado no se puede abrir: no es un error de la instalación.
  if [[ $prueba == 1 ]]; then
    corre xcrun devicectl device process launch --device "$udid" "$BUNDLE_ID"
  else
    xcrun devicectl device process launch --device "$udid" "$BUNDLE_ID" >/dev/null 2>&1 \
      || echo "  No se pudo abrir (¿iPhone bloqueado?). Ábrela desde su icono."
  fi
fi

[[ $prueba == 1 ]] && { printf '\n\033[1;32m✓ Prueba hecha: no se ha compilado ni instalado nada.\033[0m\n'; exit 0; }
printf '\n\033[1;32m✓ Quests instalada en %s.\033[0m Con un Apple ID gratuito, la firma caduca a los 7 días: vuelve a ejecutar pnpm iphone.\n' "$nombre"
