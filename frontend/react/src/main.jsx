import { StrictMode } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import './CatalogTheme.css'
import './WorkshopPaper.css'
import './workshop/room.css'
import './workshop/catalog-menu.css'
import './workshop/scene.js'
import App from './App.jsx'
import ExhibitDialog from './ExhibitDialog.jsx'
import { catalogue } from './workshop/workshop-catalog.js'
import { photos } from './workshop/workshop-photos.js'
import { ShelfGeneratorPreview } from './ShelfGeneratorBoard.jsx'
import { AuthorBoardPreview } from './AuthorBoard.jsx'
import { ContactCardPreview } from './ContactCard.jsx'
import { ResearchMonitorPreview, useResearchMonitorLayout } from './ResearchMonitor.jsx'
import WorkshopNavigation from './WorkshopNavigation.jsx'

function HyperlinePosterPreview() {
  const desktop = useResearchMonitorLayout()
  if (!desktop) return null
  return <ExhibitDialog preview exhibitId="portfolio" entry={catalogue.portfolio} photos={photos.table}
    surfaceHost={document.getElementById('hyperline-poster-display')} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {createPortal(<WorkshopNavigation />, document.getElementById('workshop-navigation'))}
    <ResearchMonitorPreview />
    <HyperlinePosterPreview />
    <ContactCardPreview />
    <AuthorBoardPreview />
    <ShelfGeneratorPreview />
    <App />
  </StrictMode>,
)
