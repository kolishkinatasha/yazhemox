import { createPortal } from 'react-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useResearchMonitorLayout } from './ResearchMonitor.jsx'
import { catalogue } from './workshop/workshop-catalog.js'
import { photos } from './workshop/workshop-photos.js'
import { drawCork } from './workshop/workshop-materials.js'
import { exhibitNavigation } from './workshop/exhibit-navigation.js'
import { surfaceControlAt, setSurfaceImage, setSurfacePreview } from './workshop/scene.js'
import { captureSurface } from './workshop/surface-capture.js'
import './AuthorBoard.css'

const entry = catalogue.about
const [researchLink, contactLink] = entry.links
const album = photos.about
const host = document.getElementById('author-board-display')
let corkBackground

function corkStyle() {
  if (!corkBackground) {
    const canvas = document.createElement('canvas')
    canvas.width = 896
    canvas.height = 560
    drawCork(canvas.getContext('2d'), canvas.width, canvas.height)
    corkBackground = { backgroundImage: `url(${canvas.toDataURL()})` }
  }
  return corkBackground
}

function readPins(screen) {
  if (screen.querySelector('.author-photo-view')) return []
  const surface = screen.getBoundingClientRect()
  const positions = []
  for (const marker of screen.querySelectorAll('[data-board-pin]')) {
    const pin = marker.getBoundingClientRect()
    positions[Number(marker.dataset.boardPin)] = {
      x: (pin.left + pin.width / 2 - surface.left) / surface.width,
      y: (pin.top + pin.height / 2 - surface.top) / surface.height,
    }
  }
  return positions
}

function PinMarker({ index }) {
  return <span className="author-pin-marker" data-board-pin={index} aria-hidden="true" />
}

function BoardPhoto({ photo, className, onClick, pin }) {
  return (
    <figure className={`author-pin author-photo ${className}`}>
      <PinMarker index={pin} />
      <button type="button" onClick={onClick} aria-label={`Увеличить фото «${photo.caption}»`}>
        <img src={`/${photo.src}`} alt={photo.alt} />
      </button>
    </figure>
  )
}

function BoardLink({ link, onNavigate, className, children }) {
  return (
    <a href={link.href} className={className} onClick={onNavigate && (event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      onNavigate(link.href)
    })}>
      {children}
    </a>
  )
}

function BoardContents({ titleRef, onPhoto, onNavigate, onClose }) {
  return (
    <>
      <div className="author-board-left">
        <BoardPhoto className="author-portrait" photo={album[0]} pin={0} onClick={onPhoto && (() => onPhoto(0))} />
        <BoardLink link={contactLink} onNavigate={onNavigate} className="author-pin author-logo-note">
          <PinMarker index={5} />
          <img src="/media/ui/yazhemoh-mark.svg" width="720" height="528" alt="ЯЖЕМОХ" />
          <span>Связаться <ArrowUpRight size={13} aria-hidden="true" /></span>
        </BoardLink>
      </div>
      <article className="author-pin author-intro">
        <PinMarker index={1} />
        {titleRef
          ? <Dialog.Title ref={titleRef} tabIndex={-1}>{entry.title}</Dialog.Title>
          : <h2>{entry.title}</h2>}
        <p>{entry.intro}</p>
        <BoardLink link={researchLink} onNavigate={onNavigate} className="author-note-link">
          Научные работы <ArrowUpRight size={15} aria-hidden="true" />
        </BoardLink>
      </article>
      <article className="author-pin author-name-note">
        <PinMarker index={2} />
        <h3>{entry.sections[0].title}</h3>
        <p>{entry.sections[0].text}</p>
      </article>
      <BoardPhoto className="author-work-picture" photo={album[1]} pin={3} onClick={onPhoto && (() => onPhoto(1))} />
      <article className="author-pin author-work-note">
        <PinMarker index={4} />
        <h3>{entry.sections[1].title}</h3>
        <p>{entry.sections[1].text}</p>
      </article>
      <button className="author-board-close" type="button" onClick={onClose} aria-label="Вернуться в мастерскую">
        <X size={20} aria-hidden="true" />
      </button>
    </>
  )
}

export function AuthorBoardPreview() {
  const desktop = useResearchMonitorLayout()
  const [screen, setScreen] = useState(null)

  useEffect(() => {
    if (desktop && screen) return captureSurface(screen, canvas => setSurfacePreview('about', canvas, readPins(screen)), { preview: true })
  }, [desktop, screen])

  if (!desktop) return null

  return createPortal(
    <div ref={setScreen} className="surface-interface author-board author-board-preview" style={corkStyle()} inert="" aria-hidden="true">
      <div className="author-board-pins"><BoardContents /></div>
    </div>,
    host,
  )
}

export default function AuthorBoard({ exhibit }) {
  const { zoom, sceneExhibits } = exhibit
  const [screen, setScreen] = useState(null)
  const [index, setIndex] = useState(0)
  const title = useRef(null)
  const zoomClose = useRef(null)
  const opener = useRef(null)
  const hovered = useRef(null)

  useEffect(() => {
    if (screen && sceneExhibits) return captureSurface(screen, canvas => setSurfaceImage('about', canvas, readPins(screen)))
  }, [screen, sceneExhibits])

  useLayoutEffect(() => {
    if (zoom) zoomClose.current?.focus({ preventScroll: true })
    else title.current?.focus({ preventScroll: true })
  }, [zoom])

  function setHover(control) {
    if (hovered.current === control) return
    hovered.current?.removeAttribute('data-board-hover')
    hovered.current = control
    control?.setAttribute('data-board-hover', '')
  }

  function openPhoto(nextIndex) {
    setIndex(nextIndex)
    exhibitNavigation.navigate('#about/photo')
  }

  function movePhoto(direction) {
    setIndex(current => (current + direction + album.length) % album.length)
  }

  return (
    <Dialog.Root open onOpenChange={open => { if (!open) exhibitNavigation.back() }}>
      <Dialog.Portal container={host}>
        <Dialog.Overlay className="author-board-scrim" />
        <Dialog.Content
          ref={setScreen}
          className="surface-interface author-board"
          style={corkStyle()}
          data-scene={sceneExhibits ? 'ready' : sceneExhibits === null ? 'unavailable' : 'loading'}
          aria-describedby={undefined}
          onPointerDownOutside={event => event.preventDefault()}
          onPointerMove={event => {
            if (event.pointerType === 'mouse' && host.hasAttribute('data-textured')) {
              setHover(surfaceControlAt(screen, event.clientX, event.clientY))
            }
          }}
          onPointerLeave={() => setHover(null)}
          onClickCapture={event => {
            if (event.detail === 0 || !host.hasAttribute('data-textured')) return
            const control = surfaceControlAt(screen, event.clientX, event.clientY)
            if (control === event.target.closest('a, button')) return
            event.preventDefault()
            event.stopPropagation()
            control?.click()
          }}
          onOpenAutoFocus={event => {
            opener.current = document.activeElement
            event.preventDefault()
            const target = zoom ? zoomClose.current : title.current
            target?.focus({ preventScroll: true })
          }}
          onCloseAutoFocus={event => {
            event.preventDefault()
            if (location.hash) return
            const previous = opener.current
            const target = previous instanceof HTMLElement && previous !== document.body && previous.getClientRects().length
              ? previous
              : document.getElementById('browse')
            target?.focus({ preventScroll: true })
          }}
        >
          <div className="author-board-pins" inert={zoom ? '' : undefined} aria-hidden={zoom || undefined}>
            <BoardContents titleRef={zoom ? undefined : title} onPhoto={openPhoto} onNavigate={exhibitNavigation.navigate} onClose={exhibitNavigation.exit} />
          </div>
          {zoom && (
            <div className="author-photo-view" onKeyDown={event => {
              if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
                event.preventDefault()
                movePhoto(event.key === 'ArrowLeft' ? -1 : 1)
              }
            }}>
              <Dialog.Title className="author-photo-title">{album[index].caption}</Dialog.Title>
              <div className="author-photo-stage"><img src={`/${album[index].src}`} alt={album[index].alt} /></div>
              <div className="author-photo-actions">
                <button type="button" onClick={() => movePhoto(-1)} aria-label="Предыдущее фото"><ArrowLeft size={20} aria-hidden="true" /></button>
                <span aria-live="polite">{index + 1} из {album.length}</span>
                <button type="button" onClick={() => movePhoto(1)} aria-label="Следующее фото"><ArrowRight size={20} aria-hidden="true" /></button>
              </div>
              <button ref={zoomClose} className="author-board-close" type="button" onClick={exhibitNavigation.back} aria-label="Закрыть фото"><X size={20} aria-hidden="true" /></button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
