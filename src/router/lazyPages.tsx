import { lazy } from 'react'

// Inicio y bienvenida van en el paquete inicial. El resto se descarga al abrirlo
// (el service worker las precachea igualmente, así que offline sigue funcionando).
// El <Suspense> vive en AppLayout. Van en este archivo y no en router.tsx
// para que Fast Refresh siga funcionando (solo exporta componentes).
export const Vaccines = lazy(() => import('../pages/Vaccines'))
export const DiaryList = lazy(() => import('../pages/DiaryList'))
export const DiaryForm = lazy(() => import('../pages/DiaryForm'))
export const Timeline = lazy(() => import('../pages/Timeline'))
export const GrowthTracker = lazy(() => import('../pages/GrowthTracker'))
export const LetterList = lazy(() => import('../pages/LetterList'))
export const LetterForm = lazy(() => import('../pages/LetterForm'))
export const Settings = lazy(() => import('../pages/Settings'))
export const YearReview = lazy(() => import('../pages/YearReview'))
export const ToolsHub = lazy(() => import('../pages/tools/ToolsHub'))
export const CareLog = lazy(() => import('../pages/tools/CareLog'))
export const Contractions = lazy(() => import('../pages/tools/Contractions'))
export const Kicks = lazy(() => import('../pages/tools/Kicks'))
export const DueDate = lazy(() => import('../pages/tools/DueDate'))
export const Fertility = lazy(() => import('../pages/tools/Fertility'))
export const Dose = lazy(() => import('../pages/tools/Dose'))
export const Appointments = lazy(() => import('../pages/tools/Appointments'))
export const ChecklistIndex = lazy(() => import('../pages/tools/Checklists').then(m => ({ default: m.ChecklistIndex })))
export const ChecklistDetail = lazy(() => import('../pages/tools/Checklists').then(m => ({ default: m.ChecklistDetail })))
export const GuideList = lazy(() => import('../pages/guides/GuideList'))
export const GuideDetail = lazy(() => import('../pages/guides/GuideDetail'))
export const Emergency = lazy(() => import('../pages/Emergency'))
export const MedicalCardPage = lazy(() => import('../pages/MedicalCardPage'))
export const Milestones = lazy(() => import('../pages/tools/Milestones'))
export const Foods = lazy(() => import('../pages/tools/Foods'))
export const Summary = lazy(() => import('../pages/tools/Summary'))
