import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export default function AppLayout() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <main className="flex-1 overflow-y-auto pb-16 max-w-lg mx-auto w-full bg-[#fafaf8] min-h-screen">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
