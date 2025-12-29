import React, { useState, useEffect, useRef } from 'react'
import './Home.css'

function Home() {
  const [video, setVideo] = useState(null)
  const [upcomingVideos, setUpcomingVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const playerRef = useRef(null)

  useEffect(() => {
    fetchCurrentVideo()
    fetchUpcomingVideos()

    // 오전 11시에 자동으로 다음 동영상으로 전환하기 위한 주기적 체크
    const checkAndUpdateVideo = () => {
      const now = new Date()
      const nowKST = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC + 9시간
      const currentHour = nowKST.getUTCHours()
      const currentMinute = nowKST.getUTCMinutes()

      // 오전 11시 정각에 동영상 갱신
      if (currentHour === 11 && currentMinute === 0) {
        console.log('11시 정각 - 동영상 갱신')
        fetchCurrentVideo()
        fetchUpcomingVideos()
      }
    }

    // 매 분마다 시간 체크 (오전 11시 감지용)
    const intervalId = setInterval(checkAndUpdateVideo, 60000) // 1분마다 체크

    // 오전 11시까지 남은 시간 계산하여 타이머 설정
    const setNextUpdateTimer = () => {
      const now = new Date()
      const nowKST = new Date(now.getTime() + (9 * 60 * 60 * 1000))
      const currentHour = nowKST.getUTCHours()
      const currentMinute = nowKST.getUTCMinutes()

      // 오전 11시 이전이면 11시까지 남은 시간 계산
      if (currentHour < 11) {
        const minutesUntil11 = (11 - currentHour) * 60 - currentMinute
        const millisecondsUntil11 = minutesUntil11 * 60 * 1000

        setTimeout(() => {
          console.log('오전 11시 도달 - 동영상 갱신')
          fetchCurrentVideo()
          fetchUpcomingVideos()
        }, millisecondsUntil11)
      }
    }

    setNextUpdateTimer()

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  const fetchCurrentVideo = async () => {
    try {
      const response = await fetch('/api/videos/current')
      if (response.ok) {
        const data = await response.json()
        setVideo(prevVideo => {
          // 동영상이 변경되었는지 확인
          if (!prevVideo || prevVideo.id !== data.id) {
            console.log('동영상 변경됨:', data.title)
            return data
          }
          return data // 동일한 동영상이어도 업데이트 (날짜 정보 등)
        })
      } else {
        setVideo(null)
      }
    } catch (error) {
      console.error('Error fetching video:', error)
      setVideo(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchUpcomingVideos = async () => {
    try {
      const response = await fetch('/api/videos/upcoming')
      if (response.ok) {
        const data = await response.json()
        setUpcomingVideos(data)
      } else {
        setUpcomingVideos([])
      }
    } catch (error) {
      console.error('Error fetching upcoming videos:', error)
      setUpcomingVideos([])
    }
  }

  const playVideo = (selectedVideo) => {
    setVideo(selectedVideo)
  }

  useEffect(() => {
    if (video && video.videoId) {
      // YouTube IFrame API 로드
      if (!window.YT) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        const firstScriptTag = document.getElementsByTagName('script')[0]
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
      }

      // YouTube API가 로드될 때까지 대기
      const initializePlayer = () => {
        if (!window.YT || !window.YT.Player) {
          return false
        }

        // 기존 플레이어가 있으면 제거
        if (playerRef.current) {
          try {
            playerRef.current.destroy()
          } catch (e) {
            console.log('Error destroying player:', e)
          }
        }
        
        playerRef.current = new window.YT.Player('youtube-player', {
          videoId: video.videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            loop: 1, // 반복 재생 활성화
            playlist: video.videoId // loop와 함께 사용해야 반복 재생이 작동함
          },
          events: {
            onReady: (event) => {
              console.log('YouTube player ready, starting autoplay')
              event.target.playVideo()
            },
            onStateChange: (event) => {
              // 동영상이 끝나면 다시 재생 (추가 안전장치)
              if (event.data === window.YT.PlayerState.ENDED) {
                console.log('Video ended, restarting playback')
                setTimeout(() => {
                  event.target.playVideo()
                }, 100)
              }
              // 재생 중일 때
              if (event.data === window.YT.PlayerState.PLAYING) {
                console.log('Video is playing')
              }
            },
            onError: (event) => {
              console.error('YouTube player error:', event.data)
            }
          }
        })
        return true
      }

      // YouTube API 로드 확인
      let checkYT = null
      
      if (window.YT && window.YT.Player) {
        initializePlayer()
      } else {
        // YouTube API 로드 대기
        checkYT = setInterval(() => {
          if (initializePlayer()) {
            clearInterval(checkYT)
            checkYT = null
          }
        }, 100)

        // YouTube API 전역 콜백 설정
        window.onYouTubeIframeAPIReady = () => {
          if (checkYT) {
            clearInterval(checkYT)
            checkYT = null
          }
          initializePlayer()
        }
      }

      // cleanup 함수
      return () => {
        if (checkYT) {
          clearInterval(checkYT)
        }
        if (playerRef.current) {
          try {
            playerRef.current.destroy()
          } catch (e) {
            console.log('Error destroying player on cleanup:', e)
          }
        }
      }
    }
  }, [video])

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading">로딩 중...</div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="home-container">
        <div className="no-video">
          <h2>재생할 동영상이 없습니다.</h2>
          <p>관리자 페이지에서 동영상을 추가해주세요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="home-container">
      {video && (
        <div className="main-content">
          <div className="video-info">
            <h2>{video.title}</h2>
            <p>재생 날짜: {new Date(video.date).toLocaleDateString('ko-KR')}</p>
          </div>
          <div className="video-wrapper">
            <div id="youtube-player"></div>
          </div>
        </div>
      )}

      {upcomingVideos.length > 0 && (
        <div className="upcoming-videos">
          <h3>예정된 동영상</h3>
          <div className="upcoming-list">
            {upcomingVideos.map((upcomingVideo) => (
              <div
                key={upcomingVideo.id}
                className="upcoming-item"
                onClick={() => playVideo(upcomingVideo)}
              >
                <div className="upcoming-thumbnail">
                  <img
                    src={`https://img.youtube.com/vi/${upcomingVideo.videoId}/mqdefault.jpg`}
                    alt={upcomingVideo.title}
                  />
                  <div className="play-overlay">▶</div>
                </div>
                <div className="upcoming-info">
                  <h4>{upcomingVideo.title}</h4>
                  <p>{new Date(upcomingVideo.date).toLocaleDateString('ko-KR')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Home


