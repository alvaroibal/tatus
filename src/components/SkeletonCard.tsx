export function SkeletonCard() {
  return (
    <div className="animate-pulse p-5 space-y-6">
      <div>
        <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
        <div className="h-6 bg-gray-200 rounded w-48" />
      </div>
      {['w-3/4', 'w-1/2', 'w-2/3'].map((w, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 bg-gray-100 rounded w-16" />
          <div className={`h-4 bg-gray-200 rounded ${w}`} />
          <div className="h-4 bg-gray-200 rounded w-2/5" />
        </div>
      ))}
      <div className="bg-blue-50 rounded-2xl p-4 space-y-2">
        <div className="h-3 bg-blue-100 rounded w-28" />
        <div className="h-4 bg-blue-100 rounded w-4/5" />
        <div className="h-4 bg-blue-100 rounded w-3/5" />
      </div>
    </div>
  )
}
