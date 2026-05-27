import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col mb-6', className)}>
      <h1 className="text-[22px] font-semibold text-white tracking-tight">{title}</h1>
      {(description || actions) && (
        <div className="flex items-center justify-between mt-0.5">
          {description && <p className="text-[13px] text-[#5A6A85]">{description}</p>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
    </div>
  )
}
