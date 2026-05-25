import { cn } from '@/lib/utils'

interface SectionCardProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function SectionCard({
  title, description, actions, children, className, noPadding,
}: SectionCardProps) {
  return (
    <div className={cn(
      'bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden',
      className,
    )}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2B42]">
          <div>
            {title && (
              <h2 className="text-[14px] font-semibold text-white">{title}</h2>
            )}
            {description && (
              <p className="text-[12px] text-[#5A6A85] mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  )
}
