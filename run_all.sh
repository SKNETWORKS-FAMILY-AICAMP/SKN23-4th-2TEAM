#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

read_env_var() {
    local key="$1"
    local line
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        return 1
    fi

    while IFS= read -r line || [ -n "$line" ]; do
        # strip Windows CR + trailing spaces
        line="$(printf '%s' "$line" | tr -d '\r' | sed 's/[[:space:]]*$//')"
        # skip blank / comment lines
        [ -z "$line" ] && continue
        case "$line" in
            '#'* ) continue ;;
        esac

        # remove inline comments
        line="${line%%#*}"
        [ -z "$line" ] && continue

        # trim spaces around key and equals sign
        if printf '%s\n' "$line" | grep -Eq "^[[:space:]]*${key}[[:space:]]*="; then
            local value="${line#*=}"
            value="$(printf '%s' "$value" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
            value="${value%\"}"
            value="${value#\"}"
            value="${value%\'}"
            value="${value#\'}"
            [ -n "$value" ] && { echo "$value"; return 0; }
        fi
    done < "$SCRIPT_DIR/.env"

    return 1
}

PUBLIC_IP="$(read_env_var PUBLIC_HOST_IP || true)"
PUBLIC_IP_SOURCE="envfile"
if [ -z "${PUBLIC_IP}" ]; then
    PUBLIC_IP="${PUBLIC_HOST_IP:-}"
    PUBLIC_IP_SOURCE="process_env"
fi

if [ -z "${PUBLIC_IP}" ] && command -v curl >/dev/null 2>&1; then
    PUBLIC_IP_SOURCE="instance_meta"
    PUBLIC_IP="$(curl -s --max-time 3 http://169.254.169.254/latest/meta-data/public-ipv4 || true)"
    if [ -z "${PUBLIC_IP}" ] || [ "${PUBLIC_IP}" = "Not found" ] ; then
        PUBLIC_IP_SOURCE="external_fallback"
        PUBLIC_IP="$(curl -s --max-time 3 ifconfig.me || true)"
    fi
fi

if [ -z "${PUBLIC_IP}" ]; then
    PUBLIC_IP="your-ec2-public-ip"
    PUBLIC_IP_SOURCE="final_fallback"
elif printf '%s' "${PUBLIC_IP}" | grep -Eq '^(127\\.|10\\.|172\\.1[6-9]\\.|172\\.2[0-9]\\.|172\\.3[0-1]\\.|192\\.168\\.)'; then
    PUBLIC_IP="your-ec2-public-ip (private IP detected)"
    PUBLIC_IP_SOURCE="private_ip_detected"
fi

echo "[INFO] PUBLIC_HOST_IP loaded (${PUBLIC_IP_SOURCE}): ${PUBLIC_IP}"

cleanup() {
    echo "🛑 Stopping all services..."
    for pid in "$TUNNEL_PID" "$DJANGO_PID" "$FASTAPI_PID" "$ADMIN_PID" "$WORKER_PID"; do
        if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
            kill "${pid}" 2>/dev/null || true
            sleep 1
            kill -9 "${pid}" 2>/dev/null || true
        fi
    done

    for port in 15432 8000 8001 5173 5174; do
        pids=$(lsof -ti tcp:${port} 2>/dev/null || true)
        if [ -n "${pids}" ]; then
            echo " -> kill any process on TCP ${port}: ${pids}"
            echo "${pids}" | xargs -r kill -9
        fi
    done

    pkill -f "run_tunnel.py" 2>/dev/null || true
    pkill -f "manage.py runserver 8000" 2>/dev/null || true
    pkill -f "uvicorn app.main:app --port 8001" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true

    exit 0
}

trap cleanup SIGINT SIGTERM

echo "====================================================="
echo "        SKN23-4th-2TEAM Unified Start Script         "
echo "====================================================="

echo "[0/6] 🚨 Terminating existing zombie/orphan processes..."
lsof -ti:15432 | xargs kill -9 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null
pkill -f run_tunnel.py 2>/dev/null
sleep 2

echo "[0.5/6] 📦 Synchronizing dependencies (Poetry & NPM)..."
poetry install --no-root
echo "-> [NPM] Installing frontend_admin dependencies..."
(cd frontend_admin && npm install)
echo "-> [NPM] Installing frontend_worker dependencies..."
(cd frontend_worker && npm install)
sleep 1

echo "[1/6] 🧹 Clearing Python and Vite caches..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
rm -rf frontend_admin/node_modules/.vite 2>/dev/null
rm -rf frontend_worker/node_modules/.vite 2>/dev/null
sleep 1

echo "[2/6] 🚀 Starting SSH Tunnel (Background)..."
poetry run python run_tunnel.py &
TUNNEL_PID=$!
sleep 6

echo "[2.5/6] 🧠 Pre-heating AI Models & BM25 Cache (Sync)..."
PYTHONPATH=backend_ai poetry run python -c "
import sys
sys.path.append('backend_ai')
from core.reranker import load_reranker_singleton
from core.retriever import refresh_bm25_index
print('-> Downloading/Loading Reranker Cross-Encoder (if needed)...')
load_reranker_singleton()
print('-> Rebuilding BM25 Sparse Index...')
refresh_bm25_index()
print('-> AI Cache Pre-heat Complete.')
"

echo "[3/6] 🚀 Starting Django Backend Hub (Port 8000)..."
(cd backend_hub && poetry run python manage.py runserver 0.0.0.0:8000) &
DJANGO_PID=$!
sleep 4

echo "[4/6] 🚀 Starting FastAPI Worker API (Port 8001)..."
(cd backend_worker_api && poetry run uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload) &
FASTAPI_PID=$!
sleep 4

echo "[5/6] 🚀 Starting Admin Dashboard (Vite)..."
(cd frontend_admin && npm run dev -- --host 0.0.0.0 --port 5173) &
ADMIN_PID=$!
sleep 3

echo "[6/6] 🚀 Starting Worker Dashboard (Vite)..."
(cd frontend_worker && npm run dev -- --host 0.0.0.0 --port 5174) &
WORKER_PID=$!

echo "====================================================="
echo " ✅ All services started successfully!"
if [ -n "${TUNNEL_PID}" ]; then
    echo " - SSH Tunnel: 127.0.0.1:15432"
else
    echo " - SSH Tunnel: skipped"
fi
echo " - Django Hub: http://${PUBLIC_IP}:8000"
echo " - FastAPI   : http://${PUBLIC_IP}:8001"
echo " - Admin UI  : http://${PUBLIC_IP}:5173"
echo " - Worker UI : http://${PUBLIC_IP}:5174"
echo "====================================================="
echo "Press [CTRL+C] to stop all services..."

# Wait for all background processes
wait
