# SKN23-4th-2TEAM Docker 배포 및 실행 가이드

이 문서는 웹 서비스 배포 방법과 팀원들이 로컬에서 프로젝트를 실행하는 방법을 안내합니다.

## 1. 팀원 로컬 실행 (개발 환경)

팀원들은 아래 과정을 거치면 로컬에서 전체 서비스를 띄울 수 있습니다.

### 필수 준비물
- `docker`, `docker-compose` 설치
- **SSH Private Key**: 바스티온/RDS 접근용 `.pem` 파일 (보안상 개별 전달)
- **환경 변수 파일 (`.env`)**: 서버 및 API 키 정보 (팀 내에서 디스코드/슬랙 등으로 안전하게 공유받으세요)

### 실행 순서

1. **저장소 클론 및 .env 세팅**
   ```bash
   git clone <repository_url>
   cd SKN23-4th-2TEAM
   
   # 공유받은 .env 파일을 프로젝트 루트에 위치시킵니다.
   ```

2. **Poetry lock 최신화 (최초 1회만)**
   ```bash
   # (선택) 로컬에 poetry 가 설치되어 있다면
   poetry lock
   ```

3. **SSH 인증키 경로 export 및 컨테이너 실행**
   ```bash
   # 팀원의 로컬 PC 환경에 맞게 .pem 파일 경로 지정
   export SSH_PRIVATE_KEY_PATH=/Users/username/path/to/key.pem 
   
   # 전체 스택 빌드 및 백그라운드 기동
   docker compose --env-file .env --env-file .env.docker up -d --build
   ```

### 접속 확인
- Admin UI: `http://localhost:5173`
- Worker UI: `http://localhost:5174`
- Django Admin: `http://localhost:8000/admin/`
- FastAPI Docs: `http://localhost:8001/docs`

---

## 2. 서버 배포 (운영 환경)

운영 서버(AWS EC2, VPS 등) 배포 방법입니다.

### 2.1. 인프라 준비
1. **Ubuntu 22.04 / 24.04** 권장
2. **도커 설치**: `apt update && apt install docker.io docker-compose-v2`
3. **포트 개방 (방화벽)**: `80` (HTTP), `443` (HTTPS)

### 2.2. 운영 모드 `docker-compose.yml` 전략
현재 설정된 `docker-compose.yml`은 **로컬 개발용 (HMR 모드)** 입니다.
운영 배포 시 프론트엔드를 Nginx 단일 서빙(prod) 모드로 변경해야 합니다.

1. `docker-compose.yml` 수정 (또는 `docker-compose.prod.yml` 생성)
   ```yaml
   # frontend 부분 target 변경 및 볼륨 마운트 제거
   frontend-admin:
     # ...
     build:
       target: prod  # <--- dev 에서 prod 로 변경
     ports:
       - "80:80"     # <--- Nginx 포트로 연결
     # volumes:  <--- (주석 처리) 소스 마운트 제거
     networks:
       - app-network
   ```

2. **Nginx 설정 주입**: `nginx/frontend_admin.conf` 에 설정된 프록시가 `prod` 빌드에서 적용됩니다.

### 2.3. 서버 배포 세팅 순서

1. **소스 배포**
   ```bash
   git fetch && git pull origin main
   ```
2. **운영용 .env 세팅 및 키 배치**
   - 서버 내에 `.env` 생성 (로컬과 동일)
   - 서버용 `.pem` 파일 생성 (`chmod 600 key.pem` 필수)

3. **실행**
   ```bash
   export SSH_PRIVATE_KEY_PATH=/absolute/path/to/key.pem
   # prod 환경용 오버라이드 파일이 있다면 "-f docker-compose.prod.yml" 추가
   docker compose --env-file .env --env-file .env.docker up -d --build
   ```

### 2.4. CI/CD 자동화 (권장)
GitHub Actions를 활용하여 `main` 브랜치에 Merge 시 서버로 자동 배포되도록 구성하는 것을 권장합니다.
- `appleboy/ssh-action` 등을 사용하여 서버 접속 후 `docker compose down && docker compose up -d` 를 실행하도록 파이프라인 구성.
