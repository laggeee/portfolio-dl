#!/usr/bin/env bash
# Baixa um ícone do Game-icons.net para assets/icons/.
#
#   ./baixar.sh lorc/battle-axe class-guerreiro
#
# Depois de baixar, rode ../../tools/sprite.py para regerar os <symbol>
# embutidos no index.html e no arena.html.
#
# Procure o nome exato em https://game-icons.net — o caminho no repositório
# é <autor>/<nome>.svg, sem subpastas.
set -euo pipefail
[ $# -eq 2 ] || { echo "uso: $0 <autor>/<icone> <nome-local>"; exit 1; }
curl -fsS --max-time 20 \
  -o "$(dirname "$0")/$2.svg" \
  "https://raw.githubusercontent.com/game-icons/icons/master/$1.svg"
echo "baixado: $2.svg  (lembre de creditar o autor em CREDITOS.md)"
