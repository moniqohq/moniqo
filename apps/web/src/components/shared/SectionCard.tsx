import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SectionCardProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  icon?: LucideIcon
  iconColor?: string
  iconBg?: string
  children: React.ReactNode
  className?: string
  noPadding?: boolean
  noHeaderBorder?: boolean
}

export function SectionCard({
  title, description, actions, icon: Icon, iconColor = '#6C3AED', iconBg = 'rgba(108,58,237,0.15)',
  children, className, noPadding, noHeaderBorder,
}: SectionCardProps) {
  return (
    <div className={cn(
      'bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden flex flex-col',
      className,
    )}>
      {(title || actions || Icon) && (
        <div className={cn('flex items-center justify-between px-5 py-4', !noHeaderBorder && 'border-b border-[#1E2B42]')}>
          <div>
            {title && (
              <h2 className="text-[14px] font-semibold text-white">{title}</h2>
            )}
            {description && (
              <p className="text-[12px] text-[#5A6A85] mt-0.5">{description}</p>
            )}
          </div>
          {(actions || Icon) && (
            <div className="flex items-center gap-2">
              {actions}
              {Icon && (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg }}>
                  <Icon size={18} style={{ color: iconColor }} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div className={cn('flex-1', noPadding ? '' : 'p-5')}>
        {children}
      </div>
    </div>
  )
}
