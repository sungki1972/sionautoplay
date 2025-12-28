# Railway 배포 가이드

## 배포 전 확인사항

1. **데이터 저장소**: 현재 프로젝트는 JSON 파일(`server/data/videos.json`)을 사용하여 데이터를 저장합니다.
   - Railway에서는 파일 시스템이 영구적이지 않을 수 있으므로, 프로젝트 재시작 시 데이터가 사라질 수 있습니다.
   - 프로덕션 환경에서는 데이터베이스(PostgreSQL, MongoDB 등) 사용을 권장합니다.

## Railway 배포 단계

### 1. Railway 프로젝트 생성

1. [Railway](https://railway.app)에 로그인
2. "New Project" 클릭
3. "Deploy from GitHub repo" 선택하거나 "Empty Project" 선택 후 GitHub 연결

### 2. 환경 설정

Railway는 자동으로 다음을 감지합니다:
- `package.json`의 `start` 스크립트 사용
- `PORT` 환경 변수 자동 할당

### 3. 배포 확인

배포 후 다음을 확인하세요:

1. **헬스 체크**: `https://your-app.railway.app/api/health`
   - 데이터 파일 경로
   - 저장된 동영상 개수
   - 파일 크기

2. **데이터 저장 테스트**:
   - 관리자 페이지(`/admin`)에서 동영상 추가
   - 동영상이 정상적으로 추가되는지 확인
   - 페이지 새로고침 후 데이터가 유지되는지 확인

### 4. 로그 확인

Railway 대시보드에서 로그를 확인하여 다음 메시지들을 확인할 수 있습니다:
- `Data directory created:` - 데이터 디렉토리 생성
- `Data file initialized:` - 데이터 파일 초기화
- `Loaded X videos from storage` - 저장된 동영상 로드
- `Video created:` - 동영상 생성
- `Video updated:` - 동영상 수정
- `Video deleted:` - 동영상 삭제

## 데이터 저장 문제 해결

만약 데이터가 저장되지 않거나 사라지는 경우:

1. **로그 확인**: Railway 대시보드에서 서버 로그 확인
2. **헬스 체크**: `/api/health` 엔드포인트로 데이터 파일 상태 확인
3. **파일 경로**: 로그에서 `Data file location:` 확인

## 주의사항

⚠️ **중요**: Railway의 무료 플랜에서는 파일 시스템이 임시적일 수 있습니다. 프로젝트가 재시작되면 데이터가 사라질 수 있으므로, 프로덕션 환경에서는 다음을 고려하세요:

1. **Railway PostgreSQL 플러그인 사용**
2. **Railway 볼륨 추가** (유료 플랜)
3. **외부 데이터베이스 사용** (MongoDB Atlas, Supabase 등)

## 환경 변수

현재 필요한 환경 변수:
- `PORT`: Railway가 자동으로 할당 (명시적 설정 불필요)

## 빌드 및 시작 명령어

Railway는 자동으로 다음을 실행합니다:
- `npm install` (의존성 설치)
- `npm run build` (프론트엔드 빌드)
- `npm start` 또는 `node server/index.js` (서버 시작)




