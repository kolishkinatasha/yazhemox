import { createPortal } from 'react-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, FileText, Layers, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { exhibitNavigation, researchMonitorLayout, researchPhotos, roomIndexControl } from './workshop/exhibit-navigation.js'
import { captureSurface } from './workshop/surface-capture.js'
import { surfaceControlAt, setSurfaceImage, setSurfacePreview } from './workshop/scene.js'
import { catalogue } from './workshop/workshop-catalog.js'
import { research as researchData } from './workshop/workshop-research.js'
import './ResearchMonitor.css'

const icons = { documents: FileText, publications: BookOpen, sections: Layers }

function subscribeMonitorLayout(listener) {
  researchMonitorLayout.addEventListener('change', listener)
  return () => researchMonitorLayout.removeEventListener('change', listener)
}

export function useResearchMonitorLayout() {
  return useSyncExternalStore(subscribeMonitorLayout, () => researchMonitorLayout.matches)
}

function ResearchMenu({ research, onSelect }) {
  return (
    <nav className="research-monitor-grid" aria-label="Разделы научной работы">
      {research.navigation.map(item => {
        const Icon = icons[item.id]
        return (
          <button type="button" key={item.id} data-section={item.id}
            onClick={onSelect ? () => onSelect(item.id) : undefined}>
            <Icon size={19} aria-hidden="true" />
            <span>{item.title}<small>{item.description}</small></span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        )
      })}
    </nav>
  )
}

function ResearchIllustrations({ photos, index = 0, onMove }) {
  const photo = photos[index]
  return (
    <section className="research-monitor-gallery" aria-label="Иллюстрации к исследованию"
      onKeyDown={event => {
        if (onMove && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
          event.preventDefault()
          event.stopPropagation()
          onMove(event.key === 'ArrowLeft' ? -1 : 1)
        }
      }}>
      <h2>Иллюстрации</h2>
      <figure className="research-monitor-figure">
        <div className="research-monitor-image">
          <img src={`/${photo.src}`} alt={photo.alt} />
        </div>
        <figcaption>
          <button type="button" onClick={onMove ? () => onMove(-1) : undefined} aria-label="Предыдущая иллюстрация"><ArrowLeft size={18} aria-hidden="true" /></button>
          <span aria-live="polite">{photo.caption} · {index + 1} из {photos.length}</span>
          <button type="button" onClick={onMove ? () => onMove(1) : undefined} aria-label="Следующая иллюстрация"><ArrowRight size={18} aria-hidden="true" /></button>
        </figcaption>
      </figure>
    </section>
  )
}

function MonitorLabel() {
  return <span><Layers size={16} aria-hidden="true" /> Исследования</span>
}

function CloseMonitorButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Вернуться в мастерскую" title="Вернуться в мастерскую">
      <X size={20} aria-hidden="true" />
    </button>
  )
}

export function ResearchMonitorPreview() {
  const showPreview = useResearchMonitorLayout()
  const [screen, setScreen] = useState(null)

  useEffect(() => {
    if (showPreview && screen) return captureSurface(screen, canvas => setSurfacePreview('engineering', canvas), { preview: true })
  }, [showPreview, screen])

  if (!showPreview) return null

  return createPortal(
    <div ref={setScreen} className="surface-interface research-monitor research-monitor-preview" inert="" aria-hidden="true">
      <header className="research-monitor-bar"><MonitorLabel /><CloseMonitorButton /></header>
      <div className="research-monitor-columns">
        <ResearchIllustrations photos={researchPhotos} />
        <div className="research-monitor-scroll">
          <h2>{catalogue.engineering.title}</h2>
          <p className="research-monitor-intro">{catalogue.engineering.intro}</p>
          <ResearchMenu research={researchData} />
        </div>
      </div>
    </div>,
    document.getElementById('research-screen'),
  )
}

export default function ResearchMonitor({ exhibit }) {
  const { entry, research, section, photos, zoom, parentTitle, backLabel, sceneExhibits } = exhibit
  const page = research.navigation.find(item => item.id === section)
  const title = page?.title || entry.title
  const [index, setIndex] = useState(0)
  const [screen, setScreen] = useState(null)
  const hover = useRef(null)
  const scroller = useRef(null)
  const heading = useRef(null)
  const previousSection = useRef(null)
  const opener = useRef(null)
  const host = document.getElementById('research-screen')

  useLayoutEffect(() => {
    const previous = previousSection.current
    previousSection.current = section
    if (scroller.current) scroller.current.scrollTop = 0
    const menuButton = !section && previous
      ? scroller.current?.querySelector(`[data-section="${previous}"]`)
      : null
    if (menuButton) {
      menuButton.focus({ preventScroll: true })
      menuButton.scrollIntoView({ block: 'nearest' })
    } else {
      heading.current?.focus({ preventScroll: true })
    }
  }, [section, zoom])

  useEffect(() => {
    if (screen && sceneExhibits) return captureSurface(screen, canvas => setSurfaceImage('engineering', canvas))
  }, [screen, sceneExhibits])

  function setHover(control) {
    if (hover.current === control) return
    hover.current?.removeAttribute('data-monitor-hover')
    hover.current = control
    control?.setAttribute('data-monitor-hover', '')
  }

  function movePhoto(direction) {
    setIndex(previous => (previous + direction + photos.length) % photos.length)
  }

  return (
    <Dialog.Root open onOpenChange={open => { if (!open) exhibitNavigation.back() }}>
      <Dialog.Portal container={host}>
        <Dialog.Overlay className="research-monitor-scrim" />
        <Dialog.Content
          ref={setScreen}
          className="surface-interface research-monitor"
          data-scene={sceneExhibits ? 'ready' : sceneExhibits === null ? 'unavailable' : 'loading'}
          aria-describedby={undefined}
          onPointerDownOutside={event => event.preventDefault()}
          onPointerMove={event => {
            if (event.pointerType === 'mouse' && host.hasAttribute('data-textured')) setHover(surfaceControlAt(screen, event.clientX, event.clientY))
          }}
          onPointerLeave={() => setHover(null)}
          onClickCapture={event => {
            if (event.detail === 0 || !host.hasAttribute('data-textured')) return
            const control = surfaceControlAt(screen, event.clientX, event.clientY)
            if (control === event.target.closest('button, a')) return
            event.preventDefault()
            event.stopPropagation()
            control?.click()
          }}
          onOpenAutoFocus={event => {
            opener.current = document.activeElement
            event.preventDefault()
            heading.current.focus({ preventScroll: true })
          }}
          onCloseAutoFocus={event => {
            event.preventDefault()
            if (location.hash) return
            const previous = opener.current
            const target = previous instanceof HTMLElement && previous !== document.body && previous.getClientRects().length
              ? previous
              : roomIndexControl('engineering')
            target?.focus({ preventScroll: true })
          }}
          onKeyDown={event => {
            if (zoom && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
              event.preventDefault()
              movePhoto(event.key === 'ArrowLeft' ? -1 : 1)
            }
          }}
        >
          <header className="research-monitor-bar">
            {(page || zoom || parentTitle) ? (
              <button type="button" onClick={exhibitNavigation.back}>
                <ArrowLeft size={17} aria-hidden="true" />
                {zoom ? 'Назад' : backLabel}
              </button>
            ) : <MonitorLabel />}
            <CloseMonitorButton onClick={exhibitNavigation.exit} />
          </header>

          <div className="research-monitor-columns">
            <ResearchIllustrations photos={photos} index={index} onMove={movePhoto} />
            <div className="research-monitor-scroll" ref={scroller}>
              <Dialog.Title ref={heading} tabIndex={-1}>{title}</Dialog.Title>
              {page ? (page.id === 'sections' ? research.sections.map(item => (
                <section className="research-monitor-section" key={item.title}><h2>{item.title}</h2><p>{item.text}</p></section>
              )) : (
                <ul className="research-monitor-list">
                  {research[page.id].map(link => (
                    <li key={link.href}>
                      <a href={link.href.startsWith('media/') ? `/${link.href}` : link.href} target="_blank" rel="noreferrer">
                        <span>{link.title}<small>{link.meta}</small></span>
                        <ArrowUpRight size={17} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              )) : (
                <>
                  <p className="research-monitor-intro">{entry.intro}</p>
                  <ResearchMenu research={research} onSelect={id => exhibitNavigation.navigate(`#engineering/${id}`)} />
                </>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
