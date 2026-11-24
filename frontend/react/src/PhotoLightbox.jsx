import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import './PhotoLightbox.css'

export default function PhotoLightbox({ photo, index, count, move, onKeyDown, onClose, fallbackAlt }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="photo-lightbox-scrim" onClick={onClose} />
      <Dialog.Content
        className="photo-lightbox"
        aria-describedby={undefined}
        onKeyDown={onKeyDown}
        onOpenAutoFocus={event => {
          event.preventDefault()
          event.target.focus({ preventScroll: true })
        }}
        onPointerDownOutside={event => event.preventDefault()}
        onClick={event => {
          if (!event.target.closest('figure, button, h2')) onClose()
        }}
      >
        <div className="photo-lightbox-top">
          <Dialog.Title aria-live="polite">Снимок {index + 1} из {count}</Dialog.Title>
          <Dialog.Close className="photo-lightbox-close" aria-label="Закрыть просмотр фото">
            <X size={24} aria-hidden="true" />
          </Dialog.Close>
        </div>
        <div className="photo-lightbox-stage">
          <figure className="photo-lightbox-print">
            <img src={`/${photo.src}`} alt={photo.alt || fallbackAlt} />
            {photo.caption && <figcaption>{photo.caption}</figcaption>}
          </figure>
        </div>
        {count > 1 && (
          <div className="photo-lightbox-arrows" role="group" aria-label="Листать фотографии">
            <button type="button" aria-label="Предыдущий снимок" onClick={() => move(-1)}><ArrowLeft size={21} aria-hidden="true" /></button>
            <button type="button" aria-label="Следующий снимок" onClick={() => move(1)}><ArrowRight size={21} aria-hidden="true" /></button>
          </div>
        )}
      </Dialog.Content>
    </Dialog.Portal>
  )
}
