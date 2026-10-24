import { lazy, Suspense } from 'react'

// Recharts y el resumen anual pesan: se cargan solo al abrirlos
const GrowthTracker = lazy(() => import('../pages/GrowthTracker'))
const YearReview = lazy(() => import('../pages/YearReview'))

export function GrowthTrackerPage() {
  return <Suspense fallback={null}><GrowthTracker /></Suspense>
}

export function YearReviewPage() {
  return <Suspense fallback={null}><YearReview /></Suspense>
}
