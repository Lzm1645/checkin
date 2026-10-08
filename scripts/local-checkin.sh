#!/usr/bin/env bash
# 本机定时签到：从 ~/.config/glados/cookie 读取 cookie，避免 GitHub Actions 被 Cloudflare 拦。
set -euo pipefail
cd "$(dirname "$0")/.."

COOKIE_FILE="${GLADOS_COOKIE_FILE:-$HOME/.config/glados/cookie}"
if [[ -z "${GLADOS:-}" ]]; then
  if [[ ! -f "$COOKIE_FILE" ]]; then
    echo "缺少 cookie：把 GLaDOS 的 Cookie 写到 $COOKIE_FILE，或 export GLADOS=..." >&2
    exit 1
  fi
  GLADOS="$(cat "$COOKIE_FILE")"
fi
export GLADOS
export GLADOS_USER_AGENT="${GLADOS_USER_AGENT:-Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36}"

npm run main
