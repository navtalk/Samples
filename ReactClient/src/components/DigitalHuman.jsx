import { useCallback, useEffect } from 'react'
import { marked } from 'marked'
import Prism from 'prismjs'
import { initDigtalHumanHistoryData, initDigtalHumanRealtimeButton } from '../lib/realtime'

const staticImageSrc = 'https://api.navtalk.ai/uploadFiles/navtalk.Alex.png'
const bgImageSrc = 'https://gd-hbimg.huaban.com/67869c1b642e1accb9378fb4af28a6f5729bd35530722-xfzjYw_fw1200'

if (typeof window !== 'undefined') {
  window.marked = marked
  window.Prism = Prism
}

function DigitalHuman() {
  const onRealtimeClick = useCallback(() => {
    const btn = document.getElementById('btnRealtime')
    if (!btn) return
  }, [])

  useEffect(() => {
    async function setup() {
      await initDigtalHumanHistoryData()
      await initDigtalHumanRealtimeButton()
    }
    setup()
  }, [])

  return (
    <div className="real-time-container">
      <div className="ah-agent-header">
        <div className="ah-btn-group"></div>
      </div>

      <div className="ah-character-box">
        <div
          className="ah-character-avatar"
          style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}
        >
          <img
            id="character-static-image"
            src={staticImageSrc}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'translate(-50%, -50%)'
            }}
          />
          <video
            id="character-avatar-video"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'translate(-50%, -50%)',
              display: 'none'
            }}
          ></video>
        </div>
      </div>

      <div className="ah-character-bg">
        <img
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          src={bgImageSrc}
          alt=""
        />
      </div>

      <button
        className="ah-btn ah-btn-icon btn-character-call"
        id="btnRealtime"
        onClick={onRealtimeClick}
      >
        <svg className="ah-icon" width="22" height="22" viewBox="0 0 22 22" fill="#fff" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.0001 15.58C17.0001 13.176 16.1281 14.378 14.8186 15.689C13.8371 16.672 11.4371 14.651 9.41862 12.575C7.34612 10.4995 5.32862 8.04101 6.31012 7.16701C7.67362 5.80201 8.81912 4.98201 6.41912 1.97751C4.01912 -1.02649 2.38262 1.26751 1.07412 2.57851C-0.453385 4.10851 0.964616 9.78901 6.58262 15.4155C12.2006 20.9875 17.8731 22.4625 19.4006 20.933C20.7096 19.622 23.0551 17.983 20.0006 15.5795L20.0001 15.58Z" />
        </svg>
      </button>

      <div className="ah-character-chat">
        <div className="scroller"></div>
        <div className="character-chat-item item-user" style={{ display: 'none' }}></div>
        <div className="character-chat-item item-character" style={{ display: 'none' }}></div>
      </div>
    </div>
  )
}

export default DigitalHuman
