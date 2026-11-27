import { catalogue } from './workshop-catalog.js'
import { photos } from './workshop-photos.js'
import { research } from './workshop-research.js'
import { shelfDefaults, shelfFields } from './shelf-preview.js'

export const researchPhotos = [
  { src: 'media/research/mesh-before.webp', caption: 'Сетка для расчёта эксперимента', alt: 'Конечно-элементная сетка испытательной камеры из автореферата, рисунок 7' },
  { src: 'media/research/mesh-after.webp', caption: 'После двенадцатого этапа нагнетания', alt: 'Деформированная конечно-элементная сетка из автореферата, рисунок 9' },
]

export const researchMonitorLayout = matchMedia('(min-width: 760px) and (min-height: 420px)')

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
    zoom: id !== 'about' && segments.includes('photo') && gallery.length > 0,
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

export function roomIndexControl(exhibitId) {
  const index = document.querySelector('.room-index')
  if (!index) return null
  const entries = [...index.querySelectorAll('.room-index-strip [data-exhibit], .room-index-compact [data-exhibit]')]
  return entries.find(button => button.dataset.exhibit === exhibitId && button.getClientRects().length)
    ?? index.querySelector('.room-index-toggle')
}

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
