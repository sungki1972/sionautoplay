# YouTube Scheduler

날짜별로 YouTube 동영상을 자동 재생하는 웹 애플리케이션입니다.

## 기능

- **메인 페이지**: 현재 날짜 기준으로 설정된 YouTube 동영상을 자동 재생
- **관리자 페이지**: YouTube 동영상 URL과 재생 날짜를 관리 (CRUD)
- **페이지네이션**: 관리자 페이지에서 동영상 목록을 5개씩 표시
- **Supabase 데이터베이스**: 영구적인 데이터 저장

## 사전 준비

### 1. Supabase 테이블 생성

Supabase 대시보드의 SQL Editor에서 다음 SQL을 실행하세요:

```sql
-- supabase/schema.sql 파일 참고
CREATE TABLE IF NOT EXISTS sionautoplay (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  video_id TEXT NOT NULL,
  date DATE NOT NULL,
  title TEXT DEFAULT 'Untitled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sionautoplay_date ON sionautoplay(date);
CREATE INDEX IF NOT EXISTS idx_sionautoplay_created_at ON sionautoplay(created_at DESC);

ALTER TABLE sionautoplay ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for all users" ON sionautoplay
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 Supabase 키를 설정하세요:

```
SUPABASE_KEY=your_supabase_anon_key_here
```

또는 Railway 배포 시 환경 변수로 `SUPABASE_KEY`를 설정하세요.

## 설치 및 실행

### 1. 의존성 설치

```bash
npm run install-all
```

### 2. 개발 서버 실행

```bash
npm run dev
```

이 명령어는 백엔드 서버(포트 3001)와 프론트엔드 개발 서버(포트 3000)를 동시에 실행합니다.

### 3. 브라우저에서 접속

- 메인 페이지: http://localhost:3000
- 관리자 페이지: http://localhost:3000/admin

## 프로젝트 구조

```
.
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx   # 메인 페이지 (동영상 재생)
│   │   │   └── Admin.jsx  # 관리자 페이지 (CRUD)
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/                 # Express 백엔드
│   ├── index.js           # API 서버
│   └── supabase.js        # Supabase 클라이언트 설정
├── supabase/
│   └── schema.sql         # 데이터베이스 스키마
└── package.json
```

## API 엔드포인트

- `GET /api/videos` - 모든 동영상 조회
- `GET /api/videos/current` - 현재 날짜 기준 재생할 동영상 조회
- `GET /api/videos/paginated?page=1&limit=5` - 페이지네이션된 동영상 목록
- `POST /api/videos` - 새 동영상 추가
- `PUT /api/videos/:id` - 동영상 수정
- `DELETE /api/videos/:id` - 동영상 삭제

## 사용 방법

1. 관리자 페이지에서 YouTube 동영상 URL과 재생 날짜를 입력하여 동영상을 추가합니다.
2. 메인 페이지는 현재 날짜 기준으로 해당 날짜까지 유효한 동영상을 자동으로 재생합니다.
3. 예를 들어, 오늘이 2025-12-26이고 2025-12-28 날짜로 지정한 동영상이 있으면, 2025-12-28까지 해당 동영상이 재생됩니다.

## Railway 배포

Railway에 배포할 때는 환경 변수 `SUPABASE_KEY`를 설정해야 합니다. 자세한 내용은 `DEPLOY.md`를 참고하세요.

