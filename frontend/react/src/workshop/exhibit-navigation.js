import { catalogue } from './workshop-catalog.js'
import { photos } from './workshop-photos.js'
import { research } from './workshop-research.js'
import { shelfDefaults, shelfFields } from './shelf-preview.js'

const researchPhotos = [
  { src: 'media/research/mesh-before.webp', caption: 'Сетка для расчёта эксперимента', alt: 'Конечно-элементная сетка испытательной камеры из автореферата, рисунок 7' },
  { src: 'media/research/mesh-after.webp', caption: 'После двенадцатого этапа нагнетания', alt: 'Деформированная конечно-элементная сетка из автореферата, рисунок 9' },
]

const listeners = new Set()
let snapshot = null
let sceneExhibits
let previousParentHash = ''
let exiting = false

function publish(next) {
  snapshot = next
  for (const listener of listeners) listener()
}

function syncRoute() {
  if (exiting) {
    exiting = false
    if (location.hash) history.replaceState(null, '', location.pathname + location.search)
  }

  const hash = location.hash
  const [id, ...segments] = hash.slice(1).split('/')
  const returningFrom = previousParentHash === hash && snapshot && snapshot.id !== id ? '#' + snapshot.id : null
  previousParentHash = history.state?.exhibitParent || ''
  if (!Object.hasOwn(catalogue, id)) {
    if (snapshot) publish(null)
    return
  }

  const entry = catalogue[id]
  const isResearch = id === 'engineering'
  const gallery = isResearch ? researchPhotos : photos[entry.album] || []
  const section = isResearch ? research.navigation.find(item => segments.includes(item.id))?.id ?? null : null
  const parentId = previousParentHash.slice(1).split('/')[0]
  const parentTitle = parentId !== id && Object.hasOwn(catalogue, parentId) ? catalogue[parentId].title : null
  const backLabel = section ? 'К научной работе' : ({ about: 'Об авторе', prototypes: 'К макетам' }[parentId] || 'Назад')

  publish({
    id, hash, entry, section, parentTitle, backLabel, returningFrom, sceneExhibits,
    photos: gallery,
    zoom: segments.includes('photo') && gallery.length > 0,
    research: isResearch ? research : null,
    shelf: id === 'generator' ? { fields: shelfFields, defaults: shelfDefaults } : null,
  })
}

function navigate(hash) {
  if (hash === location.hash || !Object.hasOwn(catalogue, hash.slice(1).split('/')[0])) return
  history.pushState({
    exhibitDepth: (history.state?.exhibitDepth || 0) + 1,
    exhibitParent: snapshot ? location.hash : '',
  }, '', hash)
  syncRoute()
}

function exit() {
  if (exiting) return
  const depth = history.state?.exhibitDepth || 0
  if (depth) {
    exiting = true
    history.go(-depth)
  } else {
    history.replaceState(null, '', location.pathname + location.search)
    syncRoute()
  }
}

function back() {
  const segments = location.hash.split('/')
  if (history.state?.exhibitParent) history.back()
  else if (segments.length > 1) {
    history.replaceState(null, '', segments.slice(0, -1).join('/'))
    syncRoute()
  } else exit()
}

window.addEventListener('hashchange', syncRoute)
syncRoute()

export const exhibitNavigation = {
  getSnapshot: () => snapshot,
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  open(id) { navigate('#' + id) },
  navigate,
  back,
  exit,
  setSceneExhibits(exhibits) {
    sceneExhibits = exhibits
    if (snapshot) publish({ ...snapshot, sceneExhibits })
  },
}

export function bindExhibitMenu() {
  const menu = document.querySelector('#catalog-menu')
  const browse = document.querySelector('#browse')

  function setOpen(open) {
    menu.hidden = !open
    browse.setAttribute('aria-expanded', String(open))
  }

  const groups = [
    ['Предметы на заказ', ['portfolio', 'firefly', 'pendant', 'generator']],
    ['Печать и макеты', ['printer', 'prototypes']],
    ['Исследования и автор', ['engineering', 'about', 'contacts']],
  ]

  function makeButton(id) {
    const entry = catalogue[id]
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.open = id
    const preview = (id === 'engineering' ? researchPhotos : photos[entry.album])?.[0]
    if (preview) {
      const image = document.createElement('img')
      image.className = 'catalog-preview'
      image.src = '/' + preview.src
      image.alt = ''
      image.width = 38
      image.height = 38
      image.loading = 'lazy'
      button.append(image)
    }
    const title = document.createElement('span')
    title.textContent = entry.title
    button.append(title)
    return button
  }

  for (const [title, ids] of groups) {
    const section = document.createElement('section')
    section.className = 'catalog-group'
    const heading = document.createElement('h2')
    heading.textContent = title
    section.append(heading, ...ids.map(makeButton))
    menu.append(section)
  }

  browse.addEventListener('click', () => {
    setOpen(menu.hidden)
    if (!menu.hidden) menu.querySelector('button')?.focus()
  })
  document.querySelector('#workshop').addEventListener('click', event => {
    const button = event.target.closest('button[data-open]')
    if (!button) return
    if (menu.contains(button)) browse.focus()
    setOpen(false)
    exhibitNavigation.open(button.dataset.open)
  })
  document.addEventListener('click', event => {
    if (!menu.contains(event.target) && !browse.contains(event.target)) setOpen(false)
  })
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      event.preventDefault()
      event.stopImmediatePropagation()
      setOpen(false)
      browse.focus()
    }
  }, true)
}
