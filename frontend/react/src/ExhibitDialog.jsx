import * as Dialog from '@radix-ui/react-dialog'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Box, ChevronLeft, ChevronRight, Expand, Images, Mail } from 'lucide-react'
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { email, tables, telegram } from './workshop/workshop-catalog.js'
import './ExhibitDialog.css'

function ResourceLink({ link, action = false, primaryContact = false, onNavigate }) {
  const internal = link.href.startsWith('#')
  const external = !link.download && /^(https?:|media\/)/.test(link.href)
  const href = link.href.startsWith('media/') ? `/${link.href}` : link.href
  const Icon = link.download ? ArrowDown : internal || !external ? ArrowRight : ArrowUpRight

  return (
    <a
      className={action ? 'resource action-link' : primaryContact ? 'resource contact-primary' : 'resource'}
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      download={link.download || undefined}
      onClick={internal ? (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        onNavigate(href)
      } : undefined}
    >
      <span><strong>{link.title}</strong>{link.meta && <small>{link.meta}</small>}</span>
      <Icon className="resource-icon" size={18} aria-hidden="true" />
    </a>
  )
}

function OrderActions({ subject, label }) {
  const message = `Здравствуйте, Иван! Меня интересует ${subject}.`
  const mail = new URLSearchParams({ subject: `ЯЖЕМОХ · ${subject}`, body: message })
  return (
    <div className="exhibit-actions">
      <a className="exhibit-primary" href={`${telegram}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">{label}</a>
      <a className="exhibit-mail" href={`mailto:${email}?${mail.toString().replaceAll('+', '%20')}`}><Mail size={15} aria-hidden="true" /> На почту</a>
    </div>
  )
}

export default function ExhibitDialog({ exhibitId, entry, photos = [], research, researchSection, parentTitle, backLabel, returningFrom, shelf, sceneExhibits, zoom, onExit, onBack, onNavigate, onZoom }) {
  const [mode, setMode] = useState(zoom || (photos.length && !shelf) ? 'photo' : 'model')
  const [photoIndex, setPhotoIndex] = useState(0)
  const previousResearch = useRef(null)
  const [dimensions, setDimensions] = useState(shelf?.defaults)
  const dimensionsRef = useRef(dimensions)
  const [tableIndex, setTableIndex] = useState(0)
  const layoutRef = useRef(null)
  const touchStart = useRef(null)
  const [modelHost, setModelHost] = useState(null)
  const sceneExhibitsRef = useRef(sceneExhibits)
  const modelHintRef = useRef(null)
  const viewerRef = useRef(null)

  const gallery = Array.isArray(photos) ? photos : []
  const activePhoto = gallery[photoIndex] ?? gallery[0]
  const isTable = exhibitId === 'portfolio'
  const [photoRatio, setPhotoRatio] = useState(2 / 3)
  const activeTable = tables[tableIndex]
  const researchPage = research?.navigation.find((item) => item.id === researchSection)
  const isContacts = exhibitId === 'contacts'
  const isPurchasable = isTable || Boolean(entry?.order)

  useLayoutEffect(() => {
    const previous = previousResearch.current
    previousResearch.current = researchSection
    if (!researchSection && !previous) return
    const layout = layoutRef.current
    layout?.scrollTo(0, 0)
    layout?.querySelector('.exhibit-copy')?.scrollTo(0, 0)
    const target = layout?.querySelector(researchSection ? '.research-title' : `[data-section="${previous}"]`)
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'nearest' })
  }, [researchSection])

  useEffect(() => {
    if (zoom) setMode('photo')
  }, [zoom])

  useEffect(() => {
    sceneExhibitsRef.current = sceneExhibits
    if (sceneExhibits !== undefined) viewerRef.current?.setExhibits(sceneExhibits)
  }, [sceneExhibits])

  useEffect(() => {
    if (mode !== 'model' || !entry?.model || !modelHost) return

    const host = modelHost
    let cancelled = false
    import('./workshop/exhibit-viewer.js').then(({ createExhibitViewer }) => {
      if (cancelled || !host.isConnected) return
      viewerRef.current = createExhibitViewer(host, modelHintRef.current)
      if (sceneExhibitsRef.current !== undefined) viewerRef.current.setExhibits(sceneExhibitsRef.current)
      viewerRef.current.show(entry.model, dimensionsRef.current)
      if (sceneExhibitsRef.current === null) viewerRef.current.setExhibits(null)
    }).catch((error) => {
      if (modelHintRef.current) modelHintRef.current.textContent = 'Не удалось открыть 3D-модель'
      console.warn(error)
    })

    return () => {
      cancelled = true
      viewerRef.current?.destroy()
      viewerRef.current = null
    }
  }, [mode, entry?.model, modelHost])

  if (!entry) return null

  const selectPhoto = (index) => {
    setPhotoIndex(index)
    if (isTable) {
      const matchingTable = tables.findIndex((table) => table.photo === index)
      if (matchingTable !== -1) setTableIndex(matchingTable)
    }
  }

  const movePhoto = (direction) => {
    if (gallery.length > 1) selectPhoto((photoIndex + direction + gallery.length) % gallery.length)
  }

  const handlePhotoKeys = (event) => {
    if (gallery.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    movePhoto(event.key === 'ArrowLeft' ? -1 : 1)
  }

  const switchMode = (nextMode) => {
    if (nextMode === mode) return
    if (mode === 'model') {
      viewerRef.current?.destroy()
      viewerRef.current = null
    }
    setMode(nextMode)
  }

  const orderSubject = isTable ? `стол Hyperline ${activeTable.name}` : entry.order

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onBack() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="exhibit-overlay" />
        <Dialog.Content
          className="exhibit-dialog"
          data-entry={exhibitId}
          {...(!entry.intro || researchPage ? { 'aria-describedby': undefined } : {})}
          onOpenAutoFocus={(event) => {
            const target = Array.from(layoutRef.current?.querySelectorAll('a') || []).find((link) => link.hash === returningFrom)
            if (!target) return
            event.preventDefault()
            target.focus({ preventScroll: true })
            target.scrollIntoView({ block: 'nearest' })
          }}
        >
          <header className="exhibit-header">
            <Dialog.Title className="exhibit-heading">{entry.title}</Dialog.Title>
            <button type="button" className="exhibit-exit" onClick={onExit}>
              <ArrowLeft size={18} aria-hidden="true" /> В мастерскую
            </button>
          </header>

          <div className="exhibit-layout" ref={layoutRef}>
            <section className="exhibit-media" aria-label="Изображения и 3D-модель" onKeyDown={mode === 'photo' ? handlePhotoKeys : undefined}>
              {gallery.length > 0 && (
                <div className="exhibit-tabs" role="group" aria-label="Способ просмотра">
                  <button type="button" aria-pressed={mode === 'photo'} className={mode === 'photo' ? 'active' : ''} onClick={() => switchMode('photo')}>
                    <Images size={15} aria-hidden="true" /> {exhibitId === 'engineering' ? 'Иллюстрации' : 'Фотографии'}
                  </button>
                  {entry.model && <button type="button" aria-pressed={mode === 'model'} className={mode === 'model' ? 'active' : ''} onClick={() => switchMode('model')}><Box size={15} aria-hidden="true" /> 3D-модель</button>}
                </div>
              )}

              {mode === 'photo' && gallery.length > 0 ? (
                <div
                  className="exhibit-photo-stage"
                  style={{ '--photo-ratio': photoRatio }}
                  onTouchStart={(event) => { touchStart.current = event.touches.length === 1 ? event.touches[0] : null }}
                  onTouchCancel={() => { touchStart.current = null }}
                  onTouchEnd={(event) => {
                    const start = touchStart.current
                    touchStart.current = null
                    if (!start) return
                    const dx = event.changedTouches[0].clientX - start.clientX
                    const dy = event.changedTouches[0].clientY - start.clientY
                    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) movePhoto(dx < 0 ? 1 : -1)
                  }}
                >
                  <div className="exhibit-print" data-print-position={photoIndex % 4}>
                    <Dialog.Root open={zoom} onOpenChange={(open) => open ? onZoom() : onBack()}>
                      <Dialog.Trigger className="exhibit-photo" aria-label="Увеличить снимок">
                        <img src={`/${activePhoto.src}`} alt={activePhoto.alt || entry.title} onLoad={({ currentTarget }) => {
                          if (currentTarget.naturalHeight) setPhotoRatio(currentTarget.naturalWidth / currentTarget.naturalHeight)
                        }} />
                        <span className="exhibit-expand"><Expand size={16} aria-hidden="true" /></span>
                      </Dialog.Trigger>
                      <Dialog.Portal>
                        <Dialog.Overlay className="exhibit-overlay exhibit-lightbox-overlay" />
                        <Dialog.Content className="exhibit-dialog exhibit-lightbox" aria-describedby={undefined} onKeyDown={handlePhotoKeys}>
                          <div className="exhibit-lightbox-bar">
                            <Dialog.Title className="exhibit-lightbox-title">Снимок {photoIndex + 1} из {gallery.length}</Dialog.Title>
                          </div>
                          <img src={`/${activePhoto.src}`} alt={activePhoto.alt || entry.title} />
                          <div className="exhibit-lightbox-bar">
                            <button hidden={gallery.length < 2} type="button" aria-label="Предыдущий снимок" onClick={() => movePhoto(-1)}><ChevronLeft size={20} /></button>
                            <div className="exhibit-lightbox-caption">
                              <p aria-live="polite">{activePhoto.caption}</p>
                              <Dialog.Close className="exhibit-back"><ArrowLeft size={18} aria-hidden="true" /> К описанию</Dialog.Close>
                            </div>
                            <button hidden={gallery.length < 2} type="button" aria-label="Следующий снимок" onClick={() => movePhoto(1)}><ChevronRight size={20} /></button>
                          </div>
                        </Dialog.Content>
                      </Dialog.Portal>
                    </Dialog.Root>
                    {activePhoto.caption && <p>{activePhoto.caption}</p>}
                  </div>
                </div>
              ) : entry.model ? (
                <div className="exhibit-model-stage">
                  <div ref={setModelHost} className="exhibit-model-host" tabIndex={0} aria-label={`Вращаемая 3D-модель: ${entry.modelLabel || entry.title}`} />
                </div>
              ) : (
                null
              )}

              {(mode === 'photo' ? gallery.length > 0 : entry.model) && (
                <div className="exhibit-media-footer">
                  {mode === 'photo' ? (
                    <>
                      <span className="photo-position" aria-live="polite">{exhibitId === 'engineering' ? 'Иллюстрация' : 'Снимок'} {photoIndex + 1} из {gallery.length}</span>
                      {gallery.length > 1 && (
                        <div className="photo-thumbs" role="group" aria-label={exhibitId === 'engineering' ? 'Иллюстрации' : 'Фотографии'}>
                          {gallery.map((photo, index) => (
                            <button type="button" key={photo.src} aria-label={photo.caption || photo.alt} aria-pressed={index === photoIndex} onClick={() => selectPhoto(index)}>
                              <img src={`/${photo.src}`} alt="" />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <span ref={modelHintRef} className="exhibit-model-hint" role="status" />
                      <div>
                        <button type="button" onClick={() => viewerRef.current?.magnify(.88)} aria-label="Отдалить">−</button>
                        <button type="button" onClick={() => viewerRef.current?.magnify(1.14)} aria-label="Приблизить">+</button>
                        <button type="button" onClick={() => viewerRef.current?.reset()} aria-label="Сбросить вид">Сброс</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>

            <article key={exhibitId} className="exhibit-copy" tabIndex={0} aria-label="Описание">
              {(researchPage || parentTitle) && (
                <div className="exhibit-return">
                  <button type="button" className="exhibit-back" onClick={onBack} aria-label={researchPage ? undefined : `${backLabel}: ${parentTitle}`}>
                    <ArrowLeft size={18} aria-hidden="true" /> {backLabel}
                  </button>
                </div>
              )}
              {entry.intro && !researchPage && !isPurchasable && !research && !shelf && (
                <Dialog.Description className="exhibit-intro">{entry.intro}</Dialog.Description>
              )}

              {isTable && (
                <section className="exhibit-variants">
                  <fieldset className="variant-field">
                    <legend>Выберите вариант</legend>
                    <div className="variant-options">
                      {tables.map((table, index) => (
                        <label className="variant-option" key={table.name}>
                          <input type="radio" name="exhibit-table-variant" checked={tableIndex === index} onChange={() => {
                            setTableIndex(index)
                            setPhotoIndex(table.photo)
                            switchMode('photo')
                          }} />
                          <strong>{table.name}</strong>
                          <span className="variant-color">{table.color}</span>
                          <span className="variant-price">{table.price}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <p className="exhibit-size">{activeTable.size}</p>
                </section>
              )}

              {(isTable || entry.price || entry.order) && (
                <div className="exhibit-order">
                  <div>{entry.price && <><span>Стоимость</span><strong>{entry.price}</strong></>}{entry.lead && <small>{entry.lead}</small>}{isTable && <small>Изготовление за 3 недели</small>}</div>
                  {orderSubject && (
                    <OrderActions subject={orderSubject} label={isTable ? `Заказать ${activeTable.name} в Telegram` : 'Обсудить заказ в Telegram'} />
                  )}
                </div>
              )}

              {shelf && dimensions && (
                <section className="exhibit-section resource-group">
                  <h3>Размеры эскиза</h3>
                  {shelf.fields.map((field) => (
                    <div className="config-field" key={field.key}>
                      <label htmlFor={`shelf-${field.key}`}>{field.title}</label>
                      <output htmlFor={`shelf-${field.key}`}>{dimensions[field.key]}{field.key !== 'count' && ' мм'}</output>
                      <input id={`shelf-${field.key}`} type="range" min={field.min} max={field.max} step={field.step} value={dimensions[field.key]} onChange={(event) => {
                        const next = { ...dimensions, [field.key]: Number(event.target.value) }
                        dimensionsRef.current = next
                        setDimensions(next)
                        if (mode === 'model') viewerRef.current?.show(entry.model, next)
                        else switchMode('model')
                      }} />
                    </div>
                  ))}
                  <OrderActions
                    subject={`раскрой этажерки ${dimensions.width} × ${dimensions.height} × ${dimensions.depth} мм, полок — ${dimensions.count}`}
                    label="Обсудить раскрой в Telegram"
                  />
                </section>
              )}

              {entry.specs?.length > 0 && <dl className="object-specs">{entry.specs.map(([label, value]) => <Fragment key={label}><dt>{label}</dt><dd>{value}</dd></Fragment>)}</dl>}

              {exhibitId === 'prototypes' && entry.links?.[0] && (
                <ResourceLink link={entry.links[0]} action onNavigate={onNavigate} />
              )}

              {research && (researchPage ? (
                <>
                  <h3 className="research-title" tabIndex={-1}>{researchPage.title}</h3>
                  {researchPage.id === 'sections' ? research.sections.map((section) => (
                    <section className="exhibit-section" key={section.title}><h3>{section.title}</h3><p>{section.text}</p></section>
                  )) : (
                    <div className="resource-list">{research[researchPage.id].map((link) => <ResourceLink key={link.href} link={link} />)}</div>
                  )}
                </>
              ) : (
                <nav className="research-nav" aria-label="Разделы научной работы">
                  {research.navigation.map((item) => (
                    <button className="resource research-option" type="button" key={item.id} data-section={item.id} onClick={() => onNavigate(`#engineering/${item.id}`)}>
                      <span><strong>{item.title}</strong><small>{item.description}</small></span>
                      <ArrowRight className="resource-icon" size={18} aria-hidden="true" />
                    </button>
                  ))}
                </nav>
              ))}

              {entry.intro && !researchPage && (isPurchasable || research || shelf) && (
                <Dialog.Description className="exhibit-intro exhibit-context">{entry.intro}</Dialog.Description>
              )}

              {!research && entry.sections?.map((section) => (
                <section className={section.action ? 'exhibit-section resource-group' : 'exhibit-section'} key={section.title}>
                  <h3>{section.title}</h3>
                  {section.action && <ResourceLink link={section.action} action />}
                  <p>{section.text}</p>
                </section>
              ))}

              {isContacts && (
                <div className="contact-directory">
                  <section className="exhibit-section">
                    <h3>Связаться с Иваном</h3>
                    <div className="resource-list">
                      {entry.links.map((link, index) => <ResourceLink key={link.href} link={link} primaryContact={index === 0} />)}
                    </div>
                  </section>
                  <section className="exhibit-section">
                    <h3>Работы и обновления</h3>
                    <div className="resource-list">
                      {entry.socialLinks.map((link) => <ResourceLink key={link.href} link={link} />)}
                    </div>
                  </section>
                </div>
              )}

              {!isContacts && entry.links?.length > 0 && exhibitId !== 'prototypes' && (
                <div className="resource-list">
                  {entry.links.map((link) => <ResourceLink key={link.href} link={link} onNavigate={onNavigate} />)}
                </div>
              )}

            </article>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
