#!/usr/bin/env bash
# GLaDOS 签到需要 Cloudflare Turnstile 人机验证，脚本无法自动通过。
# 每天定时用已登录的 Edge 配置打开签到弹窗，用户点一次验证即可。
set -euo pipefail
exec /Users/a1645/miniconda3/bin/python3 "$(dirname "$0")/open-checkin-window.py"
