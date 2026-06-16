import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface TouchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function TouchButton({ children, className = '', type = 'button', ...props }: TouchButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-lg px-3 text-sm font-medium',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
