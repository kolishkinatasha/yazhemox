import { createPortal } from 'react-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { OrderActions } from './ExhibitDialog.jsx'
import { useResearchMonitorLayout } from './ResearchMonitor.jsx'
import { catalogue } from './workshop/workshop-catalog.js'
import { photos } from './workshop/workshop-photos.js'
import { shelfDefaults, shelfFields } from './workshop/shelf-preview.js'
import { exhibitNavigation } from './workshop/exhibit-navigation.js'
import { setSurfaceImage, setSurfacePreview, surfaceControlAt } from './workshop/scene.js'
import { captureSurface } from './workshop/surface-capture.js'
import './ShelfGeneratorBoard.css'

const host = document.getElementById('shelf-generator-display')
const entry = catalogue.generator
const album = photos.generator

function ShelfModel({ dimensions, interactive }) {
  const container = useRef(null)
  const hint = useRef(null)
  const viewer = useRef(null)
  const latest = useRef(dimensions)
  latest.current = dimensions

  useEffect(() => {
    let cancelled = false
    import('./workshop/exhibit-viewer.js').then(({ createExhibitViewer }) => {
      if (cancelled) return
      viewer.current = createExhibitViewer(container.current, hint.current, { texturePreview: true })
      viewer.current.show('generator', latest.current)
    }).catch(() => {
      if (!cancelled) hint.current.textContent = 'Не удалось открыть эскиз'
    })
    return () => {
      cancelled = true
      viewer.current?.destroy()
      viewer.current = null
    }
  }, [])

  useEffect(() => {
    viewer.current?.show('generator', dimensions)
  }, [dimensions])

  return (
    <>
      <div ref={container} className="shelf-generator-model" tabIndex={interactive ? 0 : undefined}
        aria-label="Модель этажерки. Стрелки поворачивают эскиз" />
      <span ref={hint} className="shelf-generator-hint">Подготовка эскиза…</span>
    </>
  )
}

function DimensionField({ field, value, onChange }) {
  const progress = (value - field.min) / (field.max - field.min) * 100
  const units = field.key === 'count' ? '' : ' мм'

  return (
    <label className="shelf-generator-field">
      <span>{field.title}<output>{value}{units}</output></span>
      <span className="shelf-generator-range" style={{ '--range-position': progress + '%' }}>
        <span className="shelf-generator-track" aria-hidden="true" />
        <span className="shelf-generator-knob" aria-hidden="true" />
        <input type="range" aria-label={field.title} min={field.min} max={field.max} step={field.step} value={value}
          onChange={onChange && (event => onChange(field.key, Number(event.target.value)))} readOnly={!onChange} />
      </span>
    </label>
  )
}

function GeneratorContents({ dimensions, onChange, titleRef, onClose, onPhoto, onSketch, photoIndex, movePhoto }) {
  const showingPhoto = photoIndex !== undefined
  const photo = showingPhoto ? album[photoIndex] : null
  const subject = `раскрой этажерки ${dimensions.width} × ${dimensions.height} × ${dimensions.depth} мм, полок — ${dimensions.count}`

  return (
    <>
      <header className="shelf-generator-top">
        {titleRef
          ? <Dialog.Title ref={titleRef} tabIndex={-1}>{entry.title}</Dialog.Title>
          : <h2>{entry.title}</h2>}
        <button type="button" className="shelf-generator-close" onClick={onClose} aria-label="Вернуться в мастерскую">
          <X size={21} aria-hidden="true" />
        </button>
      </header>
      <div className="shelf-generator-layout">
        <section className="shelf-generator-preview-pane" aria-label="Эскиз и фотографии">
          <div className="shelf-generator-tabs" role="group" aria-label="Вид этажерки">
            <button type="button" aria-pressed={!showingPhoto} onClick={onSketch}>Эскиз</button>
            <button type="button" aria-pressed={showingPhoto} onClick={onPhoto}>Фото</button>
          </div>
          {photo ? (
            <>
              <figure className="shelf-generator-photo">
                <img src={`/${photo.src}`} alt={photo.alt} />
              </figure>
              <div className="shelf-generator-photo-controls">
                <button type="button" onClick={() => movePhoto(-1)} aria-label="Предыдущее фото"><ArrowLeft size={17} aria-hidden="true" /></button>
                <span aria-live="polite">{photo.caption} · {photoIndex + 1} из {album.length}</span>
                <button type="button" onClick={() => movePhoto(1)} aria-label="Следующее фото"><ArrowRight size={17} aria-hidden="true" /></button>
              </div>
            </>
          ) : <ShelfModel dimensions={dimensions} interactive={Boolean(onChange)} />}
        </section>

        <section className="shelf-generator-settings" aria-label="Размеры эскиза">
          <div className="shelf-generator-fields">
            {shelfFields.map(field => (
              <DimensionField key={field.key} field={field} value={dimensions[field.key]} onChange={onChange} />
            ))}
          </div>
          <OrderActions subject={subject} label="Обсудить раскрой" />
        </section>
      </div>
    </>
  )
}

export function ShelfGeneratorPreview() {
  const desktop = useResearchMonitorLayout()
  const [screen, setScreen] = useState(null)

  useEffect(() => {
    if (desktop && screen) return captureSurface(screen, canvas => setSurfacePreview('generator', canvas), { preview: true })
  }, [desktop, screen])

  if (!desktop) return null

  return createPortal(
    <div ref={setScreen} className="surface-interface shelf-generator-board shelf-generator-idle" inert="" aria-hidden="true">
      <GeneratorContents dimensions={shelfDefaults} />
    </div>,
    host,
  )
}

export default function ShelfGeneratorBoard({ exhibit }) {
  const { zoom, sceneExhibits } = exhibit
  const [screen, setScreen] = useState(null)
  const [dimensions, setDimensions] = useState(shelfDefaults)
  const [photoIndex, setPhotoIndex] = useState(0)
  const title = useRef(null)
  const opener = useRef(null)

  useEffect(() => {
    if (screen && sceneExhibits) {
      return captureSurface(screen, canvas => setSurfaceImage('generator', canvas), { intermediateFrames: true })
    }
  }, [screen, sceneExhibits])

  function updateDimension(key, value) {
    setDimensions(current => ({ ...current, [key]: value }))
    if (zoom) exhibitNavigation.back()
  }

  return (
    <Dialog.Root open onOpenChange={open => { if (!open) exhibitNavigation.back() }}>
      <Dialog.Portal container={host}>
        <Dialog.Overlay className="shelf-generator-scrim" />
        <Dialog.Content
          ref={setScreen}
          className="surface-interface shelf-generator-board"
          data-scene={sceneExhibits ? 'ready' : sceneExhibits === null ? 'unavailable' : 'loading'}
          aria-describedby={undefined}
          onPointerDownOutside={event => event.preventDefault()}
          onClickCapture={event => {
            if (event.detail === 0 || !host.hasAttribute('data-textured') || event.target.closest('input, canvas')) return
            const control = surfaceControlAt(screen, event.clientX, event.clientY)
            if (control === event.target.closest('a, button')) return
            event.preventDefault()
            event.stopPropagation()
            control?.click()
          }}
          onOpenAutoFocus={event => {
            opener.current = document.activeElement
            event.preventDefault()
            title.current?.focus({ preventScroll: true })
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
          <GeneratorContents
            dimensions={dimensions} onChange={updateDimension} titleRef={title}
            onClose={exhibitNavigation.exit}
            onPhoto={zoom ? undefined : () => exhibitNavigation.navigate('#generator/photo')}
            onSketch={zoom ? exhibitNavigation.back : undefined}
            photoIndex={zoom ? photoIndex : undefined}
            movePhoto={direction => setPhotoIndex(current => (current + direction + album.length) % album.length)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
