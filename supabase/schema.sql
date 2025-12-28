-- sionautoplay 테이블 생성
CREATE TABLE IF NOT EXISTS sionautoplay (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  video_id TEXT NOT NULL,
  date DATE NOT NULL,
  title TEXT DEFAULT 'Untitled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (날짜별 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_sionautoplay_date ON sionautoplay(date);
CREATE INDEX IF NOT EXISTS idx_sionautoplay_created_at ON sionautoplay(created_at DESC);

-- RLS (Row Level Security) 정책 설정 (필요한 경우)
ALTER TABLE sionautoplay ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽고 쓸 수 있도록 정책 설정 (프로덕션에서는 더 엄격한 정책 권장)
CREATE POLICY "Enable all operations for all users" ON sionautoplay
  FOR ALL
  USING (true)
  WITH CHECK (true);




