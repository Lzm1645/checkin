#!/usr/bin/env bash
# GLaDOS 的签到现在要求 Cloudflare Turnstile 人机验证，脚本无法自动通过。
# 每天定时在真实浏览器里打开签到页，点一下「验证你是真人」即可。
set -euo pipefail
URL="https://glados.rocks/console/points"
if [[ -d "/Applications/Microsoft Edge.app" ]]; then
  open -a "Microsoft Edge" "$URL"
else
  open "$URL"
fi
