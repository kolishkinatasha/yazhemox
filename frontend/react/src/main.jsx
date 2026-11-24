import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './CatalogTheme.css'
import './workshop/room.css'
import './workshop/catalog-menu.css'
import './workshop/scene.js'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
