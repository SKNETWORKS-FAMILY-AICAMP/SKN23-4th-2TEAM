#!/bin/sh
# ── entrypoint.sh (ssh-tunnel sidecar) ─────────────────────────────────────
set -e

KEY_SRC="${SSH_PRIVATE_KEY_PATH:-/run/secrets/ssh_key}"

if [ ! -f "${KEY_SRC}" ]; then
    echo "❌ SSH private key not found at: ${KEY_SRC}" >&2
    echo "   Hint: Check the volumes mount in docker-compose.yml" >&2
    exit 1
fi

# :ro 마운트된 파일은 chmod 불가 → /tmp 로 복사 후 600 설정
TMP_KEY="/tmp/ssh_key"
cp "${KEY_SRC}" "${TMP_KEY}"
chmod 600 "${TMP_KEY}"
export SSH_PRIVATE_KEY_PATH="${TMP_KEY}"
echo "✅ SSH key ready at ${TMP_KEY} (mode 600)"

echo "🚀 Starting SSH Tunnel..."
exec python run_tunnel.py
