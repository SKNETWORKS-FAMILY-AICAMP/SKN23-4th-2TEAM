import os
import time
from pathlib import Path
from sshtunnel import SSHTunnelForwarder
from dotenv import load_dotenv

load_dotenv()


def _to_bool(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_first(*keys: str):
    for key in keys:
        v = os.getenv(key)
        if v is not None and str(v).strip():
            return str(v).strip()
    return None

def main():
    if not _to_bool(os.getenv("SSH_TUNNEL_ENABLED")):
        print("ℹ️ SSH_TUNNEL_ENABLED is not enabled. Skipping SSH tunnel startup.")
        return

    print("🚀 SSH Tunnel background process starting...")
    ssh_host = env_first("SSH_HOST", "BASTION_HOST")
    
    if not ssh_host:
        print("⚠️ SSH_HOST not found in environment. Exiting background tunnel.")
        return

    ssh_user = env_first("SSH_USER", "BASTION_USER")
    ssh_key_path = env_first("SSH_PRIVATE_KEY_PATH", "SSH_KEY_PATH")
    
    target_host = env_first("DB_HOST", "PGHOST")
    target_port = int(env_first("DB_PORT") or "5432")
    

    local_port = int(env_first("SSH_LOCAL_BIND_PORT") or "15432")

    # SSH_LOCAL_BIND_HOST:
    #   - 로컬 실행: 127.0.0.1 (기본값)
    #   - Docker 사이드카: 0.0.0.0 (.env.docker 에서 주입)
    #     → 0.0.0.0 이어야 같은 네트워크의 다른 컨테이너가 ssh-tunnel:5432 로 접근 가능
    local_bind_host = env_first("SSH_LOCAL_BIND_HOST") or "127.0.0.1"

    server = SSHTunnelForwarder(
        (ssh_host, int(env_first("SSH_PORT") or "22")),
        ssh_username=ssh_user,
        ssh_pkey=str(Path(ssh_key_path).expanduser()) if ssh_key_path else None,
        remote_bind_address=(target_host, target_port),
        local_bind_address=(local_bind_host, local_port),
        set_keepalive=30.0
    )
    
    try:
        server.start()
        print(f"✅ SSH Tunnel established: 127.0.0.1:{server.local_bind_port} -> {target_host}:{target_port}")
        print("⏳ Keeping tunnel alive in background...")
        while True:
            time.sleep(60)
    except Exception as e:
        print(f"❌ Failed to start SSH Tunnel: {e}")
    finally:
        server.stop()
        print("🛑 SSH Tunnel closed.")

if __name__ == "__main__":
    main()
