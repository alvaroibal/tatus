import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 overflow-y-auto pb-16 max-w-lg mx-auto w-full bg-white min-h-screen">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
