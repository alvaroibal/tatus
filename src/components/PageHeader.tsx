interface Props {
  title: string
  right?: React.ReactNode
}

export function PageHeader({ title, right }: Props) {
  return (
    <div className="flex items-center justify-between px-5 pt-12 pb-4">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {right && <div>{right}</div>}
    </div>
  )
}
