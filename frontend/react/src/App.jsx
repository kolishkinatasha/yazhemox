import { lazy, Suspense, useSyncExternalStore } from 'react'
import ExhibitDialog from './ExhibitDialog.jsx'
import { exhibitNavigation } from './workshop/exhibit-navigation.js'

const FireflyConcept = lazy(() => import('./FireflyConcept.jsx'))
const concept = new URLSearchParams(location.search).get('concept') || 'album'

export default function App() {
  const exhibit = useSyncExternalStore(exhibitNavigation.subscribe, exhibitNavigation.getSnapshot)

  if (exhibit?.id === 'firefly' && ['shelf', 'album', 'night'].includes(concept)) {
    return (
      <Suspense fallback={null}>
        <FireflyConcept
          concept={concept}
          entry={exhibit.entry}
          photos={exhibit.photos}
          zoom={exhibit.zoom}
          onBack={exhibitNavigation.back}
          onExit={exhibitNavigation.exit}
          onZoom={() => exhibitNavigation.navigate(exhibit.hash + '/photo')}
        />
      </Suspense>
    )
  }

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
