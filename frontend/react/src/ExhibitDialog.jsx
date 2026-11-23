import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { Box, ChevronDown, ChevronLeft, ChevronRight, Expand, Images, Mail, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import './ExhibitDialog.css'

const photos = [
  {
    src: '/legacy/media/photos/table-blue.webp',
    alt: 'Стол Hyperline с синим паракордом',
    caption: 'Hyperline с синим паракордом',
  },
  {
    src: '/legacy/media/photos/table-green.webp',
    alt: 'Высокая версия стола в зелёном цвете',
    caption: 'Высокая версия в зелёном',
  },
  {
    src: '/legacy/media/photos/table-edge.webp',
    alt: 'Крупный план шнуровки края стола',
    caption: 'Как шнур огибает край',
  },
]

export default function ExhibitDialog({ exhibitId, entry, photos: incomingPhotos = [], open, onOpenChange }) {
  const [mode, setMode] = useState('photo')
  const [photoIndex, setPhotoIndex] = useState(0)
  const [variant, setVariant] = useState('ratio')
  const modelHostRef = useRef(null)
  const modelHintRef = useRef(null)
  const viewerRef = useRef(null)

  const variants = {
    ratio: { name: 'RATIO', color: 'Голубой паракорд', size: 'Высота 40 см · верх Ø70 см · основание Ø50 см', price: '60 000 ₽', photo: 0 },
    axis: { name: 'AXIS', color: 'Зелёный паракорд', size: 'Высота 50 см · диаметр 50 см', price: '50 000 ₽', photo: 1 },
  }
  const selected = variants[variant]

  const photo = photos[photoIndex]

  const movePhoto = (direction) => {
    setPhotoIndex((index) => (index + direction + photos.length) % photos.length)
  }

  const switchMode = (nextMode) => {
    if (nextMode === mode) return
    if (mode === 'model') {
      viewerRef.current?.hide()
      viewerRef.current = null
    }
    setMode(nextMode)
  }

  useEffect(() => {
    if (!open || mode !== 'model' || !modelHostRef.current || !modelHintRef.current) return

    const host = modelHostRef.current
    let cancelled = false
    const viewerUrl = '/legacy/exhibit-viewer.js'
    import(/* @vite-ignore */ viewerUrl).then(({ createExhibitViewer }) => {
      if (cancelled || !host.isConnected) return
      viewerRef.current = createExhibitViewer(host, modelHintRef.current)
      viewerRef.current.show('table')
    }).catch((error) => {
      if (modelHintRef.current) modelHintRef.current.textContent = 'Не удалось открыть 3D-модель'
      console.warn(error)
    })

    return () => {
      cancelled = true
      viewerRef.current?.hide()
      viewerRef.current = null
    }
  }, [open, mode])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="exhibit-overlay" />
        <Dialog.Content className="exhibit-dialog">
          <header className="exhibit-header">
            <Dialog.Title className="exhibit-brand">
              ЯЖЕМОХ <span>/ Мебель</span>
            </Dialog.Title>
            <Dialog.Close className="exhibit-close" aria-label="Вернуться в мастерскую">
              <span>В мастерскую</span>
              <X size={18} strokeWidth={1.8} />
            </Dialog.Close>
          </header>

          <div className="exhibit-layout">
            <section className="exhibit-media" aria-label="Изображения предмета">
              <div className="exhibit-tabs" role="tablist" aria-label="Способ просмотра">
                <button type="button" role="tab" aria-selected={mode === 'photo'} className={mode === 'photo' ? 'active' : ''} onClick={() => switchMode('photo')}>
                  <Images size={15} /> Фотографии
                </button>
                <button type="button" role="tab" aria-selected={mode === 'model'} className={mode === 'model' ? 'active' : ''} onClick={() => switchMode('model')}>
                  <Box size={15} /> 3D-модель
                </button>
              </div>

              {mode === 'photo' ? (
                <div className="exhibit-photo-stage">
                  <div className="exhibit-print">
                    <button className="exhibit-photo" type="button" aria-label="Увеличить снимок">
                      <img src={photo.src} alt={photo.alt} />
                      <span className="exhibit-expand"><Expand size={14} /></span>
                    </button>
                    <p>{photo.caption}</p>
                  </div>
                </div>
              ) : (
                <div className="exhibit-model-stage">
                  <div ref={modelHostRef} className="exhibit-model-host" tabIndex={0} aria-label="Вращаемая 3D-модель стола" />
                  <span ref={modelHintRef} className="exhibit-model-hint" role="status" />
                </div>
              )}

              <footer className="exhibit-media-footer">
                {mode === 'photo' ? (
                  <>
                    <span>Снимок {photoIndex + 1} из {photos.length}</span>
                    <div>
                      <button type="button" onClick={() => movePhoto(-1)} aria-label="Предыдущее фото"><ChevronLeft size={18} /></button>
                      <button type="button" onClick={() => movePhoto(1)} aria-label="Следующее фото"><ChevronRight size={18} /></button>
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
            </section>

            <article className="exhibit-copy">
              <span className="exhibit-category">Мебель · Серия Hyperline</span>
              <Dialog.Description asChild>
                <div>
                  <h2>Столы Hyperline</h2>
                  <p className="exhibit-intro">Две плоскости из берёзовой фанеры, титановый стержень и натянутый паракорд. Узор под столешницей меняется — стоит посмотреть на стол сбоку.</p>
                </div>
              </Dialog.Description>

              <section className="exhibit-section">
                <h3>Вариант стола</h3>
                <label>Конфигурация</label>
                <Select.Root value={variant} onValueChange={(next) => { setVariant(next); setPhotoIndex(variants[next].photo) }}>
                  <Select.Trigger className="exhibit-select-trigger" aria-label="Конфигурация">
                    <Select.Value />
                    <Select.Icon><ChevronDown size={16} /></Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="exhibit-select-content" position="popper" sideOffset={6}>
                      <Select.Viewport>
                        <Select.Item className="exhibit-select-item" value="ratio">
                          <Select.ItemText>RATIO · Голубой паракорд</Select.ItemText>
                          <Select.ItemIndicator>✓</Select.ItemIndicator>
                        </Select.Item>
                        <Select.Item className="exhibit-select-item" value="axis">
                          <Select.ItemText>AXIS · Зелёный паракорд</Select.ItemText>
                          <Select.ItemIndicator>✓</Select.ItemIndicator>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
                <p className="exhibit-size">{selected.size}</p>
              </section>

              <div className="exhibit-order">
                <div>
                  <span>Стоимость</span>
                  <strong>{selected.price}</strong>
                  <small>Изготовление за 3 недели</small>
                </div>
                <div className="exhibit-actions">
                  <a className="exhibit-primary" href="https://t.me/chubatov_iv" target="_blank" rel="noreferrer">Заказать {selected.name}</a>
                  <a className="exhibit-mail" href="mailto:chubatovz@gmail.com"><Mail size={15} /> На почту</a>
                </div>
              </div>

              <section className="exhibit-section">
                <h3>Как держится стол</h3>
                <p>Центральный стержень работает на сжатие, шнур по периметру — на растяжение. Плетение стягивает столешницу с основанием. В соединениях нет клея и крепежа.</p>
              </section>

              <section className="exhibit-section">
                <h3>Дальше в серии</h3>
                <p>В концепте кресла Hyperline плетение переходит с подстолья на сиденье и спинку. Натянутые линии образуют две пересекающиеся поверхности.</p>
              </section>
            </article>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
