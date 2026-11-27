import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Mail, Menu, X } from 'lucide-react'
import { catalogue } from './workshop/workshop-catalog.js'
import { exhibitNavigation } from './workshop/exhibit-navigation.js'
import { hintRoomObject } from './workshop/scene.js'
import './WorkshopNavigation.css'

// Entries reuse the room lettering, so every name can be found next to its object.
const groups = [
  { title: 'На заказ', items: [
    ['portfolio', 'столы из фанеры и паракорда'],
    ['firefly', 'светильник с оптоволокном'],
    ['pendant', '«Шухов», титан'],
  ] },
  { title: 'Своими руками', items: [
    ['generator', 'генератор этажерок'],
    ['printer', 'модели и файлы'],
    ['prototypes', 'пробы и наработки'],
  ] },
  { title: 'Об Иване', items: [
    ['engineering', 'диссертация и статьи'],
    ['about', 'кто делает эти вещи'],
  ] },
]

// Keep in sync with the media query that collapses the strip in WorkshopNavigation.css.
const compactLayout = '(max-width: 999px)'

function hintOnPointer(id) {
  return event => {
    if (event.pointerType !== 'touch') hintRoomObject(id)
  }
}

function clearHint() {
  hintRoomObject(null)
}

// Keyboard focus shows the object too; a mouse click already did that on hover.
function hintOnFocus(id) {
  return event => {
    if (event.currentTarget.matches(':focus-visible')) hintRoomObject(id)
  }
}

function IndexGroups({ idPrefix, detailed, onSelect }) {
  return groups.map(({ title, items }, index) => (
    <section key={title} className="room-index-group" aria-labelledby={`${idPrefix}-${index}`}>
      <h2 id={`${idPrefix}-${index}`}>{title}</h2>
      <ul>
        {items.map(([id, note]) => (
          <li key={id}>
            <button
              type="button"
              className="room-index-link"
              data-exhibit={id}
              onPointerEnter={detailed ? undefined : hintOnPointer(id)}
              onPointerLeave={detailed ? undefined : clearHint}
              onFocus={detailed ? undefined : hintOnFocus(id)}
              onBlur={detailed ? undefined : clearHint}
              onClick={() => onSelect(id)}
            >
              <span>{catalogue[id].label}</span>
              {detailed && <small>{note}</small>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  ))
}

function ContactButton({ onSelect, hint = false }) {
  return (
    <button
      type="button"
      className="room-index-contact"
      data-exhibit="contacts"
      onPointerEnter={hint ? hintOnPointer('contacts') : undefined}
      onPointerLeave={hint ? clearHint : undefined}
      onFocus={hint ? hintOnFocus('contacts') : undefined}
      onBlur={hint ? clearHint : undefined}
      onClick={() => onSelect('contacts')}
    >
      <Mail aria-hidden="true" /><span>Связаться</span>
    </button>
  )
}

export default function WorkshopNavigation() {
  const [open, setOpen] = useState(false)
  const toggle = useRef(null)
  const sheet = useRef(null)

  useLayoutEffect(() => {
    if (open) sheet.current.querySelector('button.room-index-link')?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const compact = matchMedia(compactLayout)

    function handleKeys(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        setOpen(false)
        toggle.current.focus()
        return
      }
      if (event.key !== 'Tab') return
      const controls = sheet.current.querySelectorAll('button')
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    function closeOnWideScreen() {
      if (!compact.matches) setOpen(false)
    }

    document.addEventListener('keydown', handleKeys, true)
    compact.addEventListener('change', closeOnWideScreen)
    return () => {
      document.removeEventListener('keydown', handleKeys, true)
      compact.removeEventListener('change', closeOnWideScreen)
    }
  }, [open])

  function openExhibit(id) {
    clearHint()
    exhibitNavigation.open(id)
  }

  function openFromSheet(id) {
    setOpen(false)
    // The exhibit dialog returns focus to the element focused before it opened.
    if (id !== 'contacts') toggle.current.focus()
    openExhibit(id)
  }

  function closeSheet() {
    setOpen(false)
    toggle.current.focus()
  }

  return (
    <nav className="room-index" aria-label="Разделы мастерской">
      <span className="room-index-shade" aria-hidden="true" />

      <div className="room-index-strip">
        <IndexGroups idPrefix="room-index-strip" onSelect={openExhibit} />
        <ContactButton onSelect={openExhibit} hint />
      </div>

      <div className="room-index-compact">
        <button
          ref={toggle}
          type="button"
          className="room-index-toggle"
          aria-expanded={open}
          aria-controls="room-index-sheet"
          onClick={() => setOpen(true)}
        >
          <Menu aria-hidden="true" /><span>Разделы</span>
        </button>
        <ContactButton onSelect={openExhibit} />
      </div>

      <div
        ref={sheet}
        id="room-index-sheet"
        className="room-index-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Разделы мастерской"
        hidden={!open}
      >
        <button type="button" className="room-index-close" aria-label="Закрыть разделы" onClick={closeSheet}>
          <X aria-hidden="true" />
        </button>
        <div className="room-index-sheet-groups">
          <IndexGroups idPrefix="room-index-sheet" detailed onSelect={openFromSheet} />
        </div>
        <ContactButton onSelect={openFromSheet} />
      </div>
    </nav>
  )
}
