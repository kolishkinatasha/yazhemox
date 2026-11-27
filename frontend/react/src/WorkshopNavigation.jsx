import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  BookOpen, Box, ChevronRight, FlaskConical, Gem, Lamp, Layers,
  Mail, Menu, Printer, Ruler, Table, UserRound,
} from 'lucide-react'
import { catalogue } from './workshop/workshop-catalog.js'
import { exhibitNavigation } from './workshop/exhibit-navigation.js'

const groups = [
  { title: 'Предметы', icon: Box, items: [['portfolio', Table], ['firefly', Lamp], ['pendant', Gem], ['generator', Layers]] },
  { title: 'Печать и макеты', icon: Printer, items: [['printer', Box], ['prototypes', Ruler]] },
  { title: 'Исследования и автор', icon: FlaskConical, items: [['engineering', BookOpen], ['about', UserRound]] },
]

function CatalogGroup({ title, icon: GroupIcon, items, onSelect }) {
  return (
    <section className="catalog-group">
      <h2><GroupIcon aria-hidden="true" />{title}</h2>
      <ul>
        {items.map(([id, ItemIcon]) => (
          <li key={id}>
            <button type="button" onClick={() => onSelect(id)}>
              <ItemIcon aria-hidden="true" />
              <span>{catalogue[id].title}</span>
              <ChevronRight className="catalog-chevron" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function WorkshopNavigation() {
  const [open, setOpen] = useState(false)
  const navigation = useRef(null)
  const browse = useRef(null)
  const catalog = useRef(null)
  const focusFirstItem = useRef(false)

  useLayoutEffect(() => {
    if (open && focusFirstItem.current) catalog.current.querySelector('button').focus()
    focusFirstItem.current = false
  }, [open])

  useEffect(() => {
    if (!open) return

    function handleOutsideClick(event) {
      if (!navigation.current.contains(event.target)) setOpen(false)
    }

    function handleEscape(event) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      setOpen(false)
      browse.current.focus()
    }

    document.addEventListener('click', handleOutsideClick)
    document.addEventListener('keydown', handleEscape, true)
    return () => {
      document.removeEventListener('click', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape, true)
    }
  }, [open])

  function openExhibit(id) {
    setOpen(false)
    if (id !== 'contacts') browse.current.focus()
    exhibitNavigation.open(id)
  }

  return (
    <nav ref={navigation} className="workshop-navigation" aria-label="Разделы мастерской">
      <div className="dock">
        <button
          ref={browse}
          type="button"
          id="browse"
          aria-expanded={open}
          aria-controls="catalog-menu"
          onClick={event => {
            focusFirstItem.current = !open && event.detail === 0
            setOpen(!open)
          }}
        >
          <Menu aria-hidden="true" />Каталог
        </button>
        <button type="button" id="workshop-contacts" onClick={() => openExhibit('contacts')}>
          <Mail aria-hidden="true" />Контакты
        </button>
      </div>
      <div className="catalog-sheet" hidden={!open}>
        <div ref={catalog} id="catalog-menu" role="group" aria-label="Каталог мастерской">
          {groups.map(group => <CatalogGroup key={group.title} {...group} onSelect={openExhibit} />)}
        </div>
      </div>
    </nav>
  )
}
