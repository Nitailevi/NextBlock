#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
AI_DIR="$ROOT_DIR/ai-service"
FRONTEND_DIR="$ROOT_DIR/frontend"

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${AI_PID:-}" ]]; then
    kill "$AI_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

cd "$BACKEND_DIR"
npm start &
BACKEND_PID=$!

cd "$AI_DIR"
npm start &
AI_PID=$!

cd "$FRONTEND_DIR"
npm run dev
