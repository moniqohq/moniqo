import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col", className)}>
      <h1 className="text-[22px] font-semibold tracking-tight text-white">{title}</h1>
      {(description || actions) && (
        <div className="mt-0.5 flex items-center justify-between">
          {description && <p className="text-[13px] text-[#5A6A85]">{description}</p>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
    </div>
  );
}
