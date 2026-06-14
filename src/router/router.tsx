import { createHashRouter } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Onboarding from '../pages/Onboarding'
import Home from '../pages/Home'
import Vaccines from '../pages/Vaccines'
import DiaryList from '../pages/DiaryList'
import DiaryForm from '../pages/DiaryForm'
import Timeline from '../pages/Timeline'
import GrowthTracker from '../pages/GrowthTracker'
import LetterList from '../pages/LetterList'
import LetterForm from '../pages/LetterForm'
import Settings from '../pages/Settings'

export const router = createHashRouter([
  { path: '/onboarding', element: <Onboarding /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true,            element: <Home /> },
      { path: 'vacunas',        element: <Vaccines /> },
      { path: 'diario',         element: <DiaryList /> },
      { path: 'diario/nueva',   element: <DiaryForm /> },
      { path: 'diario/:id',     element: <DiaryForm /> },
      { path: 'timeline',       element: <Timeline /> },
      { path: 'crecimiento',    element: <GrowthTracker /> },
      { path: 'cartas',         element: <LetterList /> },
      { path: 'cartas/nueva',   element: <LetterForm /> },
      { path: 'cartas/:id',     element: <LetterForm /> },
      { path: 'ajustes',        element: <Settings /> },
    ],
  },
])
