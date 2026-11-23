import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { Box, ChevronDown, ChevronLeft, ChevronRight, Expand, Images, Mail, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import './ExhibitDialog.css'

const tables = [
  { name: 'RATIO', color: 'Голубой паракорд', size: 'Высота 40 см · верх Ø70 см · основание Ø50 см', price: '60 000 ₽', photo: 0 },
  { name: 'AXIS', color: 'Зелёный паракорд', size: 'Высота 50 см · диаметр 50 см', price: '50 000 ₽', photo: 1 },
]

function normalUrl(url) {
  if (!url) return '#'
  if (url.startsWith('#')) return `#${url.slice(1)}`
  if (/^(https?:|mailto:|tel:|media\/)/.test(url)) return url
  return `/legacy/${url}`
}

export default function UniversalExhibitDialog({ exhibitId, entry, photos = [], open, onOpenChange }) {
  const [mode, setMode] = useState('photo')
  const [photoIndex, setPhotoIndex] = useState(0)
  const [tableIndex, setTableIndex] = useState(0)
  const modelHostRef = useRef(null)
  const modelHintRef = useRef(null)
  const viewerRef = useRef(null)

  const gallery = Array.isArray(photos) ? photos : []
  const activePhoto = gallery[photoIndex]
  const isTable = exhibitId === 'portfolio'
  const activeTable = tables[tableIndex]

  useEffect(() => {
    setPhotoIndex(0)
    setTableIndex(0)
    setMode(gallery.length ? 'photo' : 'model')
  }, [exhibitId, open])

  useEffect(() => {
    if (!open || mode !== 'model' || !entry?.model || !modelHostRef.current) return

    const host = modelHostRef.current
    let cancelled = false
    const viewerUrl = '/legacy/exhibit-viewer.js'
    import(/* @vite-ignore */ viewerUrl).then(({ createExhibitViewer }) => {
      if (cancelled || !host.isConnected) return
      viewerRef.current = createExhibitViewer(host, modelHintRef.current)
      viewerRef.current.show(entry.model, isTable ? undefined : undefined)
    }).catch((error) => {
      if (modelHintRef.current) modelHintRef.current.textContent = 'Не удалось открыть 3D-модель'
      console.warn(error)
    })

    return () => {
      cancelled = true
      viewerRef.current?.hide()
      viewerRef.current = null
    }
  }, [open, mode, exhibitId, entry])

  if (!entry) return null

  const movePhoto = (direction) => {
    if (!gallery.length) return
    setPhotoIndex((index) => (index + direction + gallery.length) % gallery.length)
  }

  const switchMode = (nextMode) => {
    if (nextMode === mode) return
    if (mode === 'model') {
      viewerRef.current?.hide()
      viewerRef.current = null
    }
    setMode(nextMode)
  }

  const orderSubject = entry.order || entry.title

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="exhibit-overlay" />
        <Dialog.Content className="exhibit-dialog">
          <header className="exhibit-header">
            <Dialog.Title className="exhibit-brand">ЯЖЕМОХ <span>/ {entry.category}</span></Dialog.Title>
            <Dialog.Close className="exhibit-close" aria-label="Вернуться в мастерскую">
              <span>В мастерскую</span><X size={18} strokeWidth={1.8} />
            </Dialog.Close>
          </header>

          <div className="exhibit-layout">
            <section className="exhibit-media" aria-label="Изображения и 3D-модель">
              {gallery.length > 0 && (
                <div className="exhibit-tabs" role="tablist" aria-label="Способ просмотра">
                  <button type="button" role="tab" aria-selected={mode === 'photo'} className={mode === 'photo' ? 'active' : ''} onClick={() => switchMode('photo')}>
                    <Images size={15} /> {exhibitId === 'engineering' ? 'Иллюстрации' : 'Фотографии'}
                  </button>
                  {entry.model && <button type="button" role="tab" aria-selected={mode === 'model'} className={mode === 'model' ? 'active' : ''} onClick={() => switchMode('model')}><Box size={15} /> 3D-модель</button>}
                </div>
              )}

              {mode === 'photo' && gallery.length > 0 ? (
                <div className="exhibit-photo-stage">
                  <div className="exhibit-print">
                    <button className="exhibit-photo" type="button" aria-label="Увеличить снимок">
                      <img src={`/legacy/${activePhoto.src}`} alt={activePhoto.alt || entry.title} />
                      <span className="exhibit-expand"><Expand size={14} /></span>
                    </button>
                    {activePhoto.caption && <p>{activePhoto.caption}</p>}
                  </div>
                </div>
              ) : entry.model ? (
                <div className="exhibit-model-stage">
                  <div ref={modelHostRef} className="exhibit-model-host" tabIndex={0} aria-label={`Вращаемая 3D-модель: ${entry.modelLabel || entry.title}`} />
                  <span ref={modelHintRef} className="exhibit-model-hint" role="status" />
                </div>
              ) : (
                <div className="exhibit-empty-media"><span>{entry.category}</span><p>{entry.title}</p></div>
              )}

              {gallery.length > 0 && (
                <footer className="exhibit-media-footer">
                  {mode === 'photo' ? (
                    <>
                      <span>{exhibitId === 'engineering' ? 'Иллюстрация' : 'Снимок'} {photoIndex + 1} из {gallery.length}</span>
                      <div>
                        <button type="button" onClick={() => movePhoto(-1)} aria-label="Предыдущий"><ChevronLeft size={18} /></button>
                        <button type="button" onClick={() => movePhoto(1)} aria-label="Следующий"><ChevronRight size={18} /></button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span>Интерактивная модель</span>
                      <div>
                        <button type="button" onClick={() => viewerRef.current?.magnify(.88)} aria-label="Отдалить">−</button>
                        <button type="button" onClick={() => viewerRef.current?.magnify(1.14)} aria-label="Приблизить">+</button>
                        <button type="button" onClick={() => viewerRef.current?.reset()} aria-label="Сбросить вид">Сброс</button>
                      </div>
                    </>
                  )}
                </footer>
              )}
            </section>

            <article className="exhibit-copy">
              <span className="exhibit-category">{entry.category}</span>
              <Dialog.Description asChild>
                <div>
                  <h2>{entry.title}</h2>
                  {entry.intro && <p className="exhibit-intro">{entry.intro}</p>}
                </div>
              </Dialog.Description>

              {isTable && (
                <section className="exhibit-section">
                  <h3>Вариант стола</h3>
                  <label>Конфигурация</label>
                  <Select.Root value={String(tableIndex)} onValueChange={(next) => { const index = Number(next); setTableIndex(index); setPhotoIndex(tables[index].photo) }}>
                    <Select.Trigger className="exhibit-select-trigger" aria-label="Конфигурация"><Select.Value>{tables[tableIndex].name} · {tables[tableIndex].color}</Select.Value><Select.Icon><ChevronDown size={16} /></Select.Icon></Select.Trigger>
                    <Select.Portal><Select.Content className="exhibit-select-content" position="popper" sideOffset={6}><Select.Viewport>{tables.map((table, index) => <Select.Item className="exhibit-select-item" value={String(index)} key={table.name}><Select.ItemText>{table.name} · {table.color}</Select.ItemText><Select.ItemIndicator>✓</Select.ItemIndicator></Select.Item>)}</Select.Viewport></Select.Content></Select.Portal>
                  </Select.Root>
                  <p className="exhibit-size">{activeTable.size}</p>
                </section>
              )}

              {(isTable || entry.price || entry.order) && (
                <div className="exhibit-order">
                  <div>{(isTable || entry.price) && <><span>Стоимость</span><strong>{isTable ? activeTable.price : entry.price}</strong></>}{entry.lead && <small>{entry.lead}</small>}{isTable && <small>Изготовление за 3 недели</small>}</div>
                  {(isTable || entry.order) && <div className="exhibit-actions"><a className="exhibit-primary" href={`https://t.me/chubatov_iv?text=${encodeURIComponent(`Здравствуйте, Иван! Меня интересует ${isTable ? `стол Hyperline ${activeTable.name}` : orderSubject}.`)}`} target="_blank" rel="noreferrer">{isTable ? `Заказать ${activeTable.name}` : 'Обсудить заказ'}</a><a className="exhibit-mail" href={`mailto:chubatovz@gmail.com?subject=${encodeURIComponent(`ЯЖЕМОХ · ${isTable ? `стол Hyperline ${activeTable.name}` : orderSubject}`)}`}><Mail size={15} /> На почту</a></div>}
                </div>
              )}

              {entry.specs?.length > 0 && <dl className="object-specs">{entry.specs.map(([label, value]) => <><dt>{label}</dt><dd>{value}</dd></>)}</dl>}

              {entry.sections?.map((section) => <section className="exhibit-section" key={section.title}><h3>{section.title}</h3><p>{section.text}</p></section>)}

              {exhibitId === 'engineering' && <section className="exhibit-section"><h3>Диссертация и автореферат</h3><div className="resource-list"><a className="resource" href="/legacy/media/research/chubatov-abstract-2021.pdf" target="_blank" rel="noreferrer"><strong>Автореферат диссертации</strong><small>НИУ МГСУ · 2021 · 30 страниц · PDF</small></a><a className="resource" href="/legacy/media/research/chubatov-thesis-2021.pdf" target="_blank" rel="noreferrer"><strong>Полный текст диссертации</strong><small>2021 · 150 страниц · PDF</small></a></div></section>}

              {entry.links?.length > 0 && <div className="resource-list">{entry.links.map((link) => <a className="resource" href={normalUrl(link.href)} key={link.title} target={link.href?.startsWith('http') || link.href?.startsWith('media/') ? '_blank' : undefined} rel="noreferrer" download={link.download || undefined}><strong>{link.title}</strong>{link.meta && <small>{link.meta}</small>}</a>)}</div>}
            </article>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
