# ── SSH Tunnel Sidecar ──────────────────────────────────────────────────────
# 역할: 바스티온 EC2를 경유해 AWS RDS PostgreSQL에 SSH 포트 포워딩 터널을 유지한다.
# 다른 컨테이너들은 host=ssh-tunnel, port=5432 로 DB에 접근한다.
FROM python:3.12-slim

# 기본 도구 설치 (netcat: 헬스체크용, openssh-client: SSH 연결용)
RUN apt-get update && apt-get install -y --no-install-recommends \
        netcat-openbsd \
        openssh-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성만 먼저 설치 (레이어 캐시 최적화)
RUN pip install --no-cache-dir "sshtunnel==0.4.0" "python-dotenv==1.0.0" "paramiko<3.4.0"

# SSH 터널 실행 스크립트 복사
COPY run_tunnel.py .
COPY docker/ssh-tunnel/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 헬스체크: 터널이 열린 뒤 5432 포트가 LISTEN 상태인지 확인
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD nc -z 0.0.0.0 5432 || exit 1

ENTRYPOINT ["/entrypoint.sh"]
