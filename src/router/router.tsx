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
import YearReview from '../pages/YearReview'
import ToolsHub from '../pages/tools/ToolsHub'
import CareLog from '../pages/tools/CareLog'
import Contractions from '../pages/tools/Contractions'
import Kicks from '../pages/tools/Kicks'
import DueDate from '../pages/tools/DueDate'
import Fertility from '../pages/tools/Fertility'
import Dose from '../pages/tools/Dose'
import Appointments from '../pages/tools/Appointments'
import { ChecklistDetail, ChecklistIndex } from '../pages/tools/Checklists'
import GuideList from '../pages/guides/GuideList'
import GuideDetail from '../pages/guides/GuideDetail'

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
      { path: 'year-review',    element: <YearReview /> },
      { path: 'herramientas',                element: <ToolsHub /> },
      { path: 'herramientas/registro',       element: <CareLog /> },
      { path: 'herramientas/contracciones',  element: <Contractions /> },
      { path: 'herramientas/patadas',        element: <Kicks /> },
      { path: 'herramientas/fecha-parto',    element: <DueDate /> },
      { path: 'herramientas/fertilidad',     element: <Fertility /> },
      { path: 'herramientas/dosis',          element: <Dose /> },
      { path: 'herramientas/citas',          element: <Appointments /> },
      { path: 'herramientas/checklist',      element: <ChecklistIndex /> },
      { path: 'herramientas/checklist/:id',  element: <ChecklistDetail /> },
      { path: 'guia',           element: <GuideList /> },
      { path: 'guia/:id',       element: <GuideDetail /> },
    ],
  },
])
