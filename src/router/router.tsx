import { createHashRouter } from 'react-router-dom'
import Home from '../pages/Home'
import Vaccines from '../pages/Vaccines'
import DiaryList from '../pages/DiaryList'
import DiaryForm from '../pages/DiaryForm'
import Timeline from '../pages/Timeline'
import GrowthTracker from '../pages/GrowthTracker'
import Settings from '../pages/Settings'

export const router = createHashRouter([
  { path: '/',             element: <Home /> },
  { path: '/vacunas',      element: <Vaccines /> },
  { path: '/diario',       element: <DiaryList /> },
  { path: '/diario/nueva', element: <DiaryForm /> },
  { path: '/timeline',     element: <Timeline /> },
  { path: '/crecimiento',  element: <GrowthTracker /> },
  { path: '/ajustes',      element: <Settings /> },
])
