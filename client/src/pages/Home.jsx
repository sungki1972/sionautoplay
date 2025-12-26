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

      const checkYT = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkYT)
          if (playerRef.current) {
            playerRef.current.destroy()
          }
          
          playerRef.current = new window.YT.Player('youtube-player', {
            videoId: video.videoId,
            playerVars: {
              autoplay: 1,
              controls: 1,
              rel: 0,
              modestbranding: 1,
              loop: 1,
              playlist: video.videoId
            },
            events: {
              onReady: (event) => {
                event.target.playVideo()
              },
              onStateChange: (event) => {
                // 동영상이 끝나면 다시 재생
                if (event.data === window.YT.PlayerState.ENDED) {
                  event.target.playVideo()
                }
              }
            }
          })
        }
      }, 100)

      return () => {
        clearInterval(checkYT)
        if (playerRef.current) {
          playerRef.current.destroy()
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


