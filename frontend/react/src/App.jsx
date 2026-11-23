import { useEffect, useRef, useState } from 'react'
import UniversalExhibitDialog from './UniversalExhibitDialog.jsx'
import './App.css'

function App() {
  const frameRef = useRef(null)
  const [exhibitOpen, setExhibitOpen] = useState(false)
  const [exhibitId, setExhibitId] = useState(null)
  const [exhibitEntry, setExhibitEntry] = useState(null)
  const [exhibitPhotos, setExhibitPhotos] = useState([])

  useEffect(() => {
    const receiveMessage = (event) => {
      if (event.data?.type !== 'yazhemoh:exhibit-open') return
      setExhibitId(event.data.id)
      setExhibitEntry(event.data.entry || null)
      setExhibitPhotos(Array.isArray(event.data.photos) ? event.data.photos : [])
      setExhibitOpen(true)
    }
    window.addEventListener('message', receiveMessage)
    return () => window.removeEventListener('message', receiveMessage)
  }, [])

  const closeExhibit = (open) => {
    setExhibitOpen(open)
    if (!open) frameRef.current?.contentWindow?.postMessage({ type: 'yazhemoh:exhibit-close' }, '*')
  }

  return (
    <main className="legacy-shell">
      <iframe
        ref={frameRef}
        title="ЯЖЕМОХ — мастерская"
        src="/legacy/index.html"
        className="legacy-frame"
      />
      <UniversalExhibitDialog exhibitId={exhibitId} entry={exhibitEntry} photos={exhibitPhotos} open={exhibitOpen} onOpenChange={closeExhibit} />
    </main>
  )
}

export default App
