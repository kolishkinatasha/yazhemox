import { useSyncExternalStore } from 'react'
import ExhibitDialog from './ExhibitDialog.jsx'
import { exhibitNavigation } from './workshop/exhibit-navigation.js'

export default function App() {
  const exhibit = useSyncExternalStore(exhibitNavigation.subscribe, exhibitNavigation.getSnapshot)

  return exhibit && (
    <ExhibitDialog
      key={exhibit.id}
      exhibitId={exhibit.id}
      entry={exhibit.entry}
      photos={exhibit.photos}
      research={exhibit.research}
      researchSection={exhibit.section}
      parentTitle={exhibit.parentTitle}
      backLabel={exhibit.backLabel}
      returningFrom={exhibit.returningFrom}
      shelf={exhibit.shelf}
      sceneExhibits={exhibit.sceneExhibits}
      zoom={exhibit.zoom}
      onExit={exhibitNavigation.exit}
      onBack={exhibitNavigation.back}
      onNavigate={exhibitNavigation.navigate}
      onZoom={() => exhibitNavigation.navigate(exhibit.hash + '/photo')}
    />
  )
}
