export function captureSurface(element, renderCanvas, { preview = false, intermediateFrames = false } = {}) {
  const host = element.parentElement
  let stopped = false
  let pending = false
  let frame
  let render
  let busy = false
  let ready = false

  function schedule() {
    pending = true
    if (stopped || !ready || busy || frame) return
    if (preview && !host.style.getPropertyValue('--monitor-width')) return
    if (!preview && host.hasAttribute('data-approaching')) return
    if (element.querySelector('[data-surface-pending]')) return
    if (Array.from(element.querySelectorAll('img')).some(image => !image.complete)) return
    frame = requestAnimationFrame(capture)
  }

  async function capture() {
    frame = undefined
    if (stopped || !pending) return
    pending = false
    busy = true

    try {
      const focused = document.activeElement
      const controls = Array.from(element.querySelectorAll('a, button'))
      const focusIndex = focused?.matches(':focus-visible') ? controls.indexOf(focused) : -1
      const canvas = await render(element, {
        logging: false,
        backgroundColor: null,
        scale: Math.min(devicePixelRatio, 1.5),
        ignoreElements: node => node.id === 'workshop'
          || (node !== element && node.classList.contains('surface-interface')),
        onclone(_document, copy) {
          copy.style.opacity = '1'
          if (focusIndex !== -1) {
            copy.querySelectorAll('a, button')[focusIndex]?.setAttribute('data-monitor-focus', '')
          }
        },
      })
      if (!stopped && (!pending || intermediateFrames)) {
        renderCanvas(canvas)
        element.removeAttribute('data-capture-error')
      }
    } catch (error) {
      showCaptureError(error)
    } finally {
      busy = false
      if (pending) schedule()
    }
  }

  function showCaptureError(error) {
    if (stopped) return
    if (!host.hasAttribute('data-textured')) element.setAttribute('data-capture-error', '')
    console.warn('Не удалось обновить текстуру экспоната', error)
  }

  const content = new MutationObserver(records => {
    if (records.some(record => record.attributeName !== 'data-capture-error')) schedule()
  })
  content.observe(element, { subtree: true, childList: true, characterData: true, attributes: true })
  const placement = new MutationObserver(schedule)
  placement.observe(host, { attributes: true, attributeFilter: ['data-approaching', 'style'] })
  const size = new ResizeObserver(schedule)
  size.observe(element)
  const events = ['scroll', 'load', 'error', 'focusin', 'focusout', 'surface-render']
  for (const event of events) element.addEventListener(event, schedule, true)

  Promise.all([import('html2canvas'), document.fonts.ready]).then(([module]) => {
    render = module.default
    ready = true
    schedule()
  }).catch(showCaptureError)

  return () => {
    stopped = true
    cancelAnimationFrame(frame)
    content.disconnect()
    placement.disconnect()
    size.disconnect()
    for (const event of events) element.removeEventListener(event, schedule, true)
  }
}
