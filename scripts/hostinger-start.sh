#!/usr/bin/env bash
# Runs the app on Hostinger's Node.js hosting using the `output: standalone`
# build. `next start` is NOT used here — Hostinger's Node app manager expects
# a single script it can run directly, and standalone's server.js is smaller
# and self-contained (no need to `npm install` in production).
#
# Usage: bash scripts/hostinger-start.sh
set -euo pipefail

cd "$(dirname "$0")/.."

# 1. Build (runs `prisma generate && next build`, see package.json).
#    Cố ý KHÔNG đụng tới database ở bước này: môi trường build thường không
#    nối được vào MySQL, mà `prisma db push` lỗi là cả lệnh build dừng luôn.
#    Đổi schema thì chạy `npm run db:push` riêng, xem HOSTINGER.md.
npm run build

# 2. `output: standalone` does not copy public/ or .next/static — copy them
#    into the standalone folder so server.js can serve them itself.
cp -r public .next/standalone/
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/

# 3. Run the minimal server. Hostinger's Node app manager should point its
#    "startup file" at this same command (or at .next/standalone/server.js
#    directly, after running steps 1-2 once during deploy).
PORT="${PORT:-3000}" HOSTNAME="${HOSTNAME:-0.0.0.0}" node .next/standalone/server.js
