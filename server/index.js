const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const supabase = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors());
app.use(bodyParser.json());

// Supabase 연결 확인
supabase.from('sionautoplay').select('count').limit(1)
  .then(() => {
    console.log('Supabase connected successfully');
  })
  .catch((error) => {
    console.error('Supabase connection error:', error.message);
  });

// YouTube URL에서 비디오 ID 추출
function extractVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

// 모든 동영상 조회
app.get('/api/videos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sionautoplay')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // 데이터베이스 스키마를 API 응답 형식에 맞게 변환
    const videos = data.map(video => ({
      id: video.id,
      url: video.url,
      videoId: video.video_id,
      date: video.date,
      title: video.title,
      createdAt: video.created_at
    }));
    
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// 날짜별 동영상 조회 (현재 날짜 기준으로 플레이할 동영상)
app.get('/api/videos/current', async (req, res) => {
  try {
    // 한국 시간(KST, UTC+9) 기준 현재 시간
    const now = new Date();
    // 한국 시간으로 변환 (UTC + 9시간)
    const nowKST = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    
    // 한국 시간의 년, 월, 일, 시 추출
    const year = nowKST.getUTCFullYear();
    const month = String(nowKST.getUTCMonth() + 1).padStart(2, '0');
    const day = String(nowKST.getUTCDate()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`; // YYYY-MM-DD 형식
    const currentHour = nowKST.getUTCHours(); // 한국 시간의 시 (0-23)
    
    // 모든 동영상 조회 (날짜순 정렬)
    const { data: allVideos, error: fetchError } = await supabase
      .from('sionautoplay')
      .select('*')
      .order('date', { ascending: true });
    
    if (fetchError) throw fetchError;
    
    if (!allVideos || allVideos.length === 0) {
      return res.json(null);
    }
    
    // 한국 시간 기준으로 현재 재생할 동영상 찾기
    let selectedVideo = null;
    
    for (const video of allVideos) {
      const videoDate = video.date; // YYYY-MM-DD 형식
      
      // 오늘 날짜인 경우
      if (videoDate === currentDate) {
        // 오전 11시 이전이면 오늘 동영상 재생
        if (currentHour < 11) {
          selectedVideo = video;
          break;
        }
        // 오전 11시 이후면 다음 동영상으로 넘어감 (계속 반복)
        continue;
      }
      
      // 미래 날짜인 경우 재생
      if (videoDate > currentDate) {
        selectedVideo = video;
        break;
      }
    }
    
    if (!selectedVideo) {
      return res.json(null);
    }
    
    // 데이터베이스 스키마를 API 응답 형식에 맞게 변환
    res.json({
      id: selectedVideo.id,
      url: selectedVideo.url,
      videoId: selectedVideo.video_id,
      date: selectedVideo.date,
      title: selectedVideo.title,
      createdAt: selectedVideo.created_at
    });
  } catch (error) {
    console.error('Error fetching current video:', error);
    res.status(500).json({ error: error.message });
  }
});

// 페이지네이션된 동영상 조회
app.get('/api/videos/paginated', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    // 전체 개수 조회
    const { count, error: countError } = await supabase
      .from('sionautoplay')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    // 페이지네이션된 데이터 조회
    const { data, error } = await supabase
      .from('sionautoplay')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    // 데이터베이스 스키마를 API 응답 형식에 맞게 변환
    const videos = data.map(video => ({
      id: video.id,
      url: video.url,
      videoId: video.video_id,
      date: video.date,
      title: video.title,
      createdAt: video.created_at
    }));
    
    const totalPages = Math.ceil((count || 0) / limit);
    
    res.json({
      videos,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching paginated videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// 동영상 생성
app.post('/api/videos', async (req, res) => {
  try {
    const { url, date, title } = req.body;
    
    if (!url || !date) {
      return res.status(400).json({ error: 'URL and date are required' });
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    const newVideo = {
      id: Date.now().toString(),
      url,
      video_id: videoId,
      date,
      title: title || 'Untitled'
    };
    
    const { data, error } = await supabase
      .from('sionautoplay')
      .insert([newVideo])
      .select()
      .single();
    
    if (error) throw error;
    
    // 응답 형식에 맞게 변환
    const responseVideo = {
      id: data.id,
      url: data.url,
      videoId: data.video_id,
      date: data.date,
      title: data.title,
      createdAt: data.created_at
    };
    
    console.log(`Video created: ${responseVideo.id} - ${responseVideo.title}`);
    res.json(responseVideo);
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: error.message });
  }
});

// 동영상 수정
app.put('/api/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { url, date, title } = req.body;
    
    const updateData = {};
    
    if (url) {
      const videoId = extractVideoId(url);
      if (!videoId) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
      }
      updateData.url = url;
      updateData.video_id = videoId;
    }
    
    if (date) updateData.date = date;
    if (title) updateData.title = title;
    
    const { data, error } = await supabase
      .from('sionautoplay')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Video not found' });
      }
      throw error;
    }
    
    // 응답 형식에 맞게 변환
    const responseVideo = {
      id: data.id,
      url: data.url,
      videoId: data.video_id,
      date: data.date,
      title: data.title,
      createdAt: data.created_at
    };
    
    console.log(`Video updated: ${id} - ${responseVideo.title}`);
    res.json(responseVideo);
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: error.message });
  }
});

// 동영상 삭제
app.delete('/api/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('sionautoplay')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // 삭제된 행이 있는지 확인하기 위해 조회
    const { data } = await supabase
      .from('sionautoplay')
      .select('id', { count: 'exact', head: true });
    
    console.log(`Video deleted: ${id}`);
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: error.message });
  }
});

// 단일 동영상 조회
app.get('/api/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('sionautoplay')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Video not found' });
      }
      throw error;
    }
    
    // 응답 형식에 맞게 변환
    const video = {
      id: data.id,
      url: data.url,
      videoId: data.video_id,
      date: data.date,
      title: data.title,
      createdAt: data.created_at
    };
    
    res.json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: error.message });
  }
});

// 헬스 체크 및 저장소 상태 확인
app.get('/api/health', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('sionautoplay')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    res.json({
      status: 'ok',
      database: {
        connected: true,
        table: 'sionautoplay',
        videoCount: count || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      error: error.message,
      database: {
        connected: false
      }
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
  console.log(`Database: Supabase (sionautoplay table)`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

