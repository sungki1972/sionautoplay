import React, { useState, useEffect, useRef } from 'react'
import './Home.css'

function Home() {
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const playerRef = useRef(null)

  useEffect(() => {
    fetchCurrentVideo()
  }, [])

  const fetchCurrentVideo = async () => {
    try {
      const response = await fetch('/api/videos/current')
      if (response.ok) {
        const data = await response.json()
        setVideo(data)
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
      <div className="video-info">
        <h2>{video.title}</h2>
        <p>재생 날짜: {new Date(video.date).toLocaleDateString('ko-KR')}</p>
      </div>
      <div className="video-wrapper">
        <div id="youtube-player"></div>
      </div>
    </div>
  )
}

export default Home


