import React, { useState, useEffect } from 'react'
import './Admin.css'

function Admin() {
  const [videos, setVideos] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingVideo, setEditingVideo] = useState(null)
  const [formData, setFormData] = useState({
    url: '',
    date: '',
    title: ''
  })

  useEffect(() => {
    fetchVideos()
  }, [currentPage])

  const fetchVideos = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/videos/paginated?page=${currentPage}&limit=5`)
      if (response.ok) {
        const data = await response.json()
        setVideos(data.videos)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error fetching videos:', error)
      alert('동영상 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.url || !formData.date) {
      alert('URL과 날짜를 입력해주세요.')
      return
    }

    try {
      const url = editingVideo 
        ? `/api/videos/${editingVideo.id}`
        : '/api/videos'
      
      const method = editingVideo ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowModal(false)
        setEditingVideo(null)
        setFormData({ url: '', date: '', title: '' })
        fetchVideos()
      } else {
        const error = await response.json()
        console.error('Server error:', error)
        alert(`오류: ${error.error || '알 수 없는 오류가 발생했습니다.'}\n\nURL: ${formData.url}\n상태 코드: ${response.status}`)
      }
    } catch (error) {
      console.error('Error saving video:', error)
      alert('동영상을 저장하는 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (video) => {
    setEditingVideo(video)
    setFormData({
      url: video.url,
      date: video.date.split('T')[0], // 날짜 형식 변환
      title: video.title
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/videos/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchVideos()
      } else {
        alert('동영상을 삭제하는 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting video:', error)
      alert('동영상을 삭제하는 중 오류가 발생했습니다.')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingVideo(null)
    setFormData({ url: '', date: '', title: '' })
  }

  const handleNewVideo = () => {
    setEditingVideo(null)
    setFormData({ url: '', date: '', title: '' })
    setShowModal(true)
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>YouTube 동영상 관리</h1>
        <button className="btn btn-primary" onClick={handleNewVideo}>
          새 동영상 추가
        </button>
      </div>

      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : (
        <>
          <div className="videos-table">
            <table>
              <thead>
                <tr>
                  <th>제목</th>
                  <th>URL</th>
                  <th>날짜</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {videos.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="no-data">
                      등록된 동영상이 없습니다.
                    </td>
                  </tr>
                ) : (
                  videos.map(video => (
                    <tr key={video.id}>
                      <td>{video.title}</td>
                      <td>
                        <a 
                          href={video.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="video-url"
                        >
                          {video.url}
                        </a>
                      </td>
                      <td>{new Date(video.date).toLocaleDateString('ko-KR')}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn btn-edit"
                            onClick={() => handleEdit(video)}
                          >
                            수정
                          </button>
                          <button 
                            className="btn btn-delete"
                            onClick={() => handleDelete(video.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className="btn btn-page"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                이전
              </button>
              <span className="page-info">
                {currentPage} / {totalPages}
              </span>
              <button 
                className="btn btn-page"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingVideo ? '동영상 수정' : '새 동영상 추가'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="title">제목</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="동영상 제목 (선택사항)"
                />
              </div>
              <div className="form-group">
                <label htmlFor="url">YouTube URL *</label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="date">재생 날짜 *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-cancel" onClick={handleCloseModal}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingVideo ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin




