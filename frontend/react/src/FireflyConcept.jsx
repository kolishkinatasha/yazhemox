import { roomIndexControl } from './workshop/exhibit-navigation.js'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowDown, ArrowLeft, ArrowRight, Expand, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { OrderActions, ResourceLink } from './ExhibitDialog.jsx'
import PhotoLightbox from './PhotoLightbox.jsx'
import './FireflyConcept.css'

function Model({ entry }) {
  const host = useRef(null)
  const hint = useRef(null)
  const viewer = useRef(null)

  useEffect(() => {
    let cancelled = false
    import('./workshop/exhibit-viewer.js').then(({ createExhibitViewer }) => {
      if (cancelled) return
      viewer.current = createExhibitViewer(host.current, hint.current)
      viewer.current.show(entry.model)
    }).catch(() => {
      if (!cancelled) hint.current.textContent = 'Не удалось открыть 3D-модель'
    })
    return () => {
      cancelled = true
      viewer.current?.destroy()
      viewer.current = null
    }
  }, [entry.model])

  return (
    <>
      <div className="firefly-model-frame">
        <div className="firefly-model" ref={host} tabIndex={0} aria-label={`Вращаемая 3D-модель: ${entry.modelLabel}`} />
      </div>
      <div className="firefly-media-note">
        <span ref={hint} role="status">Загружаем 3D-модель</span>
        <div className="firefly-arrows">
          <button type="button" aria-label="Отдалить" onClick={() => viewer.current?.magnify(.88)}><Minus size={17} /></button>
          <button type="button" aria-label="Приблизить" onClick={() => viewer.current?.magnify(1.14)}><Plus size={17} /></button>
          <button type="button" aria-label="Сбросить вид" onClick={() => viewer.current?.reset()}><RotateCcw size={16} /></button>
        </div>
      </div>
    </>
  )
}

export default function FireflyConcept({ concept, entry, photos, zoom, onBack, onExit, onZoom }) {
  const [mode, setMode] = useState('photo')
  const [index, setIndex] = useState(concept === 'album' ? 2 : 0)
  const opener = useRef(null)
  const details = useRef(null)
  const photo = photos[index]
  const move = direction => setIndex(current => (current + direction + photos.length) % photos.length)
  const handleArrows = event => {
    if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault()
      event.stopPropagation()
      move(event.key === 'ArrowLeft' ? -1 : 1)
    }
  }
  const arrows = (
    <div className="firefly-arrows">
      <button type="button" aria-label="Предыдущий снимок" onClick={() => move(-1)}><ArrowLeft size={19} /></button>
      <button type="button" aria-label="Следующий снимок" onClick={() => move(1)}><ArrowRight size={19} /></button>
    </div>
  )

  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onBack() }}>
      <Dialog.Portal>
        <Dialog.Overlay className={`firefly-scrim firefly-scrim--${concept}`} onClick={onBack} />
        <Dialog.Content
          className={concept === 'album' ? 'firefly-concept workshop-paper' : 'firefly-concept'}
          data-concept={concept}
          onPointerDownOutside={event => event.preventDefault()}
          onOpenAutoFocus={event => {
            event.preventDefault()
            opener.current = document.activeElement
            event.target.focus({ preventScroll: true })
          }}
          onCloseAutoFocus={event => {
            event.preventDefault()
            const target = opener.current instanceof HTMLElement && opener.current.getClientRects().length && opener.current !== document.body
              ? opener.current
              : roomIndexControl('firefly')
            target?.focus({ preventScroll: true })
          }}
        >
          {concept === 'album' ? (
            <button className="firefly-album-close" type="button" onClick={onExit} aria-label="Вернуться в мастерскую">
              <X size={23} aria-hidden="true" />
            </button>
          ) : <header className="firefly-top">
            <button className="firefly-return" type="button" onClick={onExit}>
              <ArrowLeft size={18} aria-hidden="true" /> В мастерскую
            </button>
          </header>}
          <div className="firefly-layout">
            <section className="firefly-media" aria-label="Фотографии и 3D-модель">
              <div className="firefly-modes" role="group" aria-label="Способ просмотра">
                <button type="button" aria-pressed={mode === 'photo' || zoom} onClick={() => setMode('photo')}>Фото</button>
                <button type="button" aria-pressed={mode === 'model' && !zoom} onClick={() => setMode('model')}>3D-модель</button>
              </div>
              {mode === 'model' && !zoom ? <Model entry={entry} /> : (
                <div className="firefly-gallery" onKeyDown={handleArrows}>
                  <Dialog.Root open={zoom} onOpenChange={open => open ? onZoom() : onBack()}>
                    <div className="firefly-print" data-print={index} data-landscape={photo.landscape || undefined}>
                      <Dialog.Trigger className="firefly-photo" data-photo={index} aria-label="Увеличить снимок">
                        <img src={`/${photo.src}`} alt={photo.alt} />
                        <span><Expand size={18} aria-hidden="true" /></span>
                      </Dialog.Trigger>
                      {concept === 'album' && <p className="firefly-written-caption" aria-live="polite">{photo.caption}</p>}
                    </div>
                    <PhotoLightbox photo={photo} index={index} count={photos.length} move={move} onKeyDown={handleArrows} onClose={onBack} fallbackAlt={entry.title} />
                  </Dialog.Root>
                  {concept === 'shelf' && (
                    <div className="firefly-contact-strip" role="group" aria-label="Выбрать снимок">
                      {photos.map((item, position) => (
                        <button type="button" key={item.src} aria-label={item.caption} aria-pressed={index === position} onClick={() => setIndex(position)}>
                          <img src={`/${item.src}`} alt="" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="firefly-media-note">
                    <span aria-live="polite"><b>{index + 1}/{photos.length}</b> {concept !== 'album' && photo.caption}</span>
                    {arrows}
                  </div>
                </div>
              )}
            </section>
            <div className="firefly-copy">
              <div className="firefly-heading">
                <p className="firefly-kicker">{entry.category}</p>
                <Dialog.Title>{entry.title}</Dialog.Title>
                <Dialog.Description>{entry.intro}</Dialog.Description>
              </div>
              <div className="firefly-order">
                <div className="firefly-price"><strong>{entry.price}</strong><span>{entry.lead}</span></div>
                <OrderActions subject={entry.order} label="Заказать в Telegram" />
                {concept !== 'album' && <button type="button" className="firefly-more" onClick={() => {
                  details.current.focus({ preventScroll: true })
                  details.current.scrollIntoView({ block: 'start' })
                }}>Об устройстве <ArrowDown size={15} aria-hidden="true" /></button>}
              </div>
              <div className="firefly-details">
                <section>
                  <h2 ref={details} tabIndex={-1}>Характеристики</h2>
                  <dl>{entry.specs.map(([label, value]) => (
                    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                  ))}</dl>
                </section>
                <div className="firefly-story">
                  {entry.sections.map(section => (
                    <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>
                  ))}
                  {entry.links.map(link => <ResourceLink key={link.href} link={link} />)}
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
