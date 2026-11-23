#!/usr/bin/env bash
# 本机定时签到：从 ~/.config/glados/cookie 读取 cookie，避免 GitHub Actions 被 Cloudflare 拦。
set -euo pipefail
cd "$(dirname "$0")/.."

COOKIE_FILE="${GLADOS_COOKIE_FILE:-$HOME/.config/glados/cookie}"
if [[ -z "${GLADOS:-}" ]]; then
  if [[ -f "$COOKIE_FILE" ]]; then
    GLADOS="$(cat "$COOKIE_FILE")"
  else
    # 未提供 cookie 时，尝试从本机 Edge 的登录态里解出来（登录过一次即可）
    GLADOS="$(python3 "$(dirname "$0")/edge-cookie.py")" || {
      echo "没有可用的 GLaDOS 会话：请在 Edge 里登录 glados.rocks，或把 cookie 写到 $COOKIE_FILE" >&2
      exit 1
    }
  fi
fi
export GLADOS
export GLADOS_USER_AGENT="${GLADOS_USER_AGENT:-Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36}"

npm run main
