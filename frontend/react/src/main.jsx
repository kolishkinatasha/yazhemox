import { StrictMode } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import './CatalogTheme.css'
import './WorkshopPaper.css'
import './workshop/room.css'
import './workshop/catalog-menu.css'
import './workshop/scene.js'
import App from './App.jsx'
import { ShelfGeneratorPreview } from './ShelfGeneratorBoard.jsx'
import { AuthorBoardPreview } from './AuthorBoard.jsx'
import { ContactCardPreview } from './ContactCard.jsx'
import { ResearchMonitorPreview } from './ResearchMonitor.jsx'
import WorkshopNavigation from './WorkshopNavigation.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {createPortal(<WorkshopNavigation />, document.getElementById('workshop-navigation'))}
    <ResearchMonitorPreview />
    <ContactCardPreview />
    <AuthorBoardPreview />
    <ShelfGeneratorPreview />
    <App />
  </StrictMode>,
)
