const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
// Railway에서 영구 저장을 위해 /tmp 대신 프로젝트 루트의 data 디렉토리 사용
const DATA_FILE = path.join(__dirname, 'data', 'videos.json');

// 미들웨어
app.use(cors());
app.use(bodyParser.json());

// data 디렉토리 확인 및 생성
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Data directory created:', dataDir);
}

// JSON 파일 초기화 (존재하지 않는 경우)
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]), 'utf8');
  console.log('Data file initialized:', DATA_FILE);
} else {
  console.log('Data file exists:', DATA_FILE);
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log(`Loaded ${data.length} videos from storage`);
  } catch (error) {
    console.error('Error reading data file:', error);
  }
}

// YouTube URL에서 비디오 ID 추출
function extractVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

// 모든 동영상 조회
app.get('/api/videos', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 날짜별 동영상 조회 (현재 날짜 기준으로 플레이할 동영상)
app.get('/api/videos/current', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // 오늘 이전 날짜로 설정된 동영상 중 가장 가까운 미래 날짜의 동영상 찾기
    const validVideos = data.filter(video => {
      const videoDate = new Date(video.date);
      videoDate.setHours(0, 0, 0, 0);
      return videoDate >= now;
    });
    
    if (validVideos.length === 0) {
      return res.json(null);
    }
    
    // 날짜순으로 정렬하고 가장 가까운 미래 날짜의 동영상 반환
    validVideos.sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json(validVideos[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 페이지네이션된 동영상 조회
app.get('/api/videos/paginated', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    
    // 날짜순으로 정렬 (최신순)
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = data.slice(startIndex, endIndex);
    const totalPages = Math.ceil(data.length / limit);
    
    res.json({
      videos: paginatedData,
      pagination: {
        page,
        limit,
        total: data.length,
        totalPages
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 동영상 생성
app.post('/api/videos', (req, res) => {
  try {
    const { url, date, title } = req.body;
    
    if (!url || !date) {
      return res.status(400).json({ error: 'URL and date are required' });
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const newVideo = {
      id: Date.now().toString(),
      url,
      videoId,
      date,
      title: title || 'Untitled',
      createdAt: new Date().toISOString()
    };
    
    data.push(newVideo);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Video created: ${newVideo.id} - ${newVideo.title} (Total: ${data.length})`);
    res.json(newVideo);
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: error.message });
  }
});

// 동영상 수정
app.put('/api/videos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { url, date, title } = req.body;
    
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const index = data.findIndex(v => v.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    if (url) {
      const videoId = extractVideoId(url);
      if (!videoId) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
      }
      data[index].url = url;
      data[index].videoId = videoId;
    }
    
    if (date) data[index].date = date;
    if (title) data[index].title = title;
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Video updated: ${id} - ${data[index].title}`);
    res.json(data[index]);
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: error.message });
  }
});

// 동영상 삭제
app.delete('/api/videos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const filteredData = data.filter(v => v.id !== id);
    
    if (filteredData.length === data.length) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(filteredData, null, 2), 'utf8');
    console.log(`Video deleted: ${id} (Total: ${filteredData.length})`);
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: error.message });
  }
});

// 단일 동영상 조회
app.get('/api/videos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const video = data.find(v => v.id === id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 헬스 체크 및 저장소 상태 확인
app.get('/api/health', (req, res) => {
  try {
    const fileExists = fs.existsSync(DATA_FILE);
    let videoCount = 0;
    let fileSize = 0;
    
    if (fileExists) {
      const stats = fs.statSync(DATA_FILE);
      fileSize = stats.size;
      try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        videoCount = Array.isArray(data) ? data.length : 0;
      } catch (error) {
        console.error('Error reading data file in health check:', error);
      }
    }
    
    res.json({
      status: 'ok',
      dataFile: {
        path: DATA_FILE,
        exists: fileExists,
        size: fileSize,
        videoCount: videoCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message 
    });
  }
});

// 정적 파일 제공 (프로덕션) - API 라우트 이후에 배치
app.use(express.static(path.join(__dirname, '../client/dist')));

// React Router를 위한 fallback (프로덕션) - 모든 라우트 마지막에 배치
app.get('*', (req, res) => {
  // API 요청은 위에서 처리되므로 여기까지 오지 않음
  // 그 외 모든 요청은 index.html로 전달 (React Router가 처리)
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Data file location: ${DATA_FILE}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

