import * as React from 'react';
import { clsx } from 'clsx';

type Variant = 'default' | 'secondary' | 'outline';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        variant === 'default' && 'bg-black text-white hover:bg-neutral-800',
        variant === 'secondary' && 'bg-neutral-100 hover:bg-neutral-200 text-black',
        variant === 'outline' && 'border border-neutral-300 hover:bg-neutral-50',
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';


