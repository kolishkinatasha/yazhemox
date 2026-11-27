import { createPortal } from 'react-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { Camera, Megaphone, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useResearchMonitorLayout } from './ResearchMonitor.jsx'
import { catalogue } from './workshop/workshop-catalog.js'
import { exhibitNavigation } from './workshop/exhibit-navigation.js'
import { surfaceControlAt, setSurfaceImage, setSurfacePreview } from './workshop/scene.js'
import { captureSurface } from './workshop/surface-capture.js'
import './ContactCard.css'

const entry = catalogue.contacts
const host = document.getElementById('contact-card-display')
const directLinks = entry.links.slice(1)
const socialLinks = [
  { ...entry.links[0], label: 'Написать Ивану в Telegram', icon: Send },
  { ...entry.socialLinks[0], label: 'Канал ЯЖЕМОХ в Telegram', icon: Megaphone },
  { ...entry.socialLinks[1], label: 'ЯЖЕМОХ в Instagram', icon: Camera },
]

function CardContents({ onClose, titleRef }) {
  return (
    <>
      <div className="contact-card-identity">
        <img src="/media/ui/yazhemoh-mark.svg" alt="ЯЖЕМОХ" width="720" height="528" />
      </div>
      <div className="contact-card-copy">
        {onClose
          ? <Dialog.Title ref={titleRef} tabIndex={-1}>Иван Чубатов</Dialog.Title>
          : <h2>Иван Чубатов</h2>}
        <div className="contact-card-links" aria-label="Телефон и почта">
          {directLinks.map(({ href, title }) => <a key={href} href={href}>{title}</a>)}
        </div>
      </div>
      <footer className="contact-card-footer">
        <p>Мастерская · Москва</p>
        <nav className="contact-card-social" aria-label="Социальные сети">
          {socialLinks.map(({ href, label, icon: Icon }) => (
            <a key={href} href={href} target="_blank" rel="noreferrer" aria-label={label}>
              <Icon size={19} aria-hidden="true" />
              <span className="contact-card-tooltip" aria-hidden="true">{label}</span>
            </a>
          ))}
        </nav>
      </footer>
      <button className="contact-card-close" type="button" onClick={onClose}
        aria-label="Вернуться в мастерскую" title="Вернуться в мастерскую">
        <X size={20} aria-hidden="true" />
      </button>
    </>
  )
}

export function ContactCardPreview() {
  const desktop = useResearchMonitorLayout()
  const [screen, setScreen] = useState(null)

  useEffect(() => {
    if (desktop && screen) return captureSurface(screen, canvas => setSurfacePreview('contacts', canvas), { preview: true })
  }, [desktop, screen])

  if (!desktop) return null

  return createPortal(
    <div className="surface-interface contact-card contact-card-preview" ref={setScreen} inert="" aria-hidden="true">
      <CardContents />
    </div>,
    host,
  )
}

export default function ContactCard({ exhibits }) {
  const [screen, setScreen] = useState(null)
  const heading = useRef(null)
  const opener = useRef(null)
  const hover = useRef(null)

  useEffect(() => {
    if (screen && exhibits) return captureSurface(screen, canvas => setSurfaceImage('contacts', canvas))
  }, [screen, exhibits])

  function highlight(control) {
    if (hover.current === control) return
    hover.current?.removeAttribute('data-card-hover')
    hover.current = control
    control?.setAttribute('data-card-hover', '')
  }

  return (
    <Dialog.Root open onOpenChange={open => { if (!open) exhibitNavigation.back() }}>
      <Dialog.Portal container={host}>
        <Dialog.Overlay className="contact-card-scrim" />
        <Dialog.Content
          ref={setScreen}
          className="surface-interface contact-card"
          data-scene={exhibits ? 'ready' : exhibits === null ? 'unavailable' : 'loading'}
          aria-describedby={undefined}
          onPointerDownOutside={event => event.preventDefault()}
          onPointerMove={event => {
            if (event.pointerType === 'mouse' && host.hasAttribute('data-textured')) {
              highlight(surfaceControlAt(screen, event.clientX, event.clientY))
            }
          }}
          onPointerLeave={() => highlight(null)}
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
            heading.current.focus({ preventScroll: true })
          }}
          onCloseAutoFocus={event => {
            event.preventDefault()
            if (location.hash) return
            const previous = opener.current
            const target = previous instanceof HTMLElement && previous !== document.body && previous.getClientRects().length
              ? previous
              : document.getElementById('workshop-contacts')
            target?.focus({ preventScroll: true })
          }}
        >
          <CardContents onClose={exhibitNavigation.exit} titleRef={heading} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
