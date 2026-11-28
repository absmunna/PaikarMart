import React from 'react';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'soft';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon';

interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonStyleProps {}

export interface ButtonLinkProps
  extends Omit<LinkProps, 'className'>,
    ButtonStyleProps {}

const baseClasses =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-accent)] disabled:cursor-not-allowed disabled:opacity-50';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] shadow-xs hover:bg-[var(--pm-accent-hover)]',
  secondary:
    'border border-[var(--pm-border)] bg-[var(--pm-surface)] text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)]',
  outline:
    'border border-[var(--pm-border)] bg-transparent text-[var(--pm-text)] hover:border-[var(--pm-accent)] hover:text-[var(--pm-accent)]',
  ghost: 'text-[var(--pm-text)] hover:bg-[var(--pm-surface)]',
  soft:
    'border border-[var(--pm-accent-border)] bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] hover:bg-[var(--pm-accent)]/20',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'min-h-8 px-2.5 text-xs',
  sm: 'min-h-9 px-3 text-xs',
  md: 'min-h-10 px-4 text-sm',
  lg: 'min-h-11 px-5 text-sm',
  'icon-sm': 'h-9 w-9 p-0',
  icon: 'h-11 w-11 p-0',
};

const getButtonClasses = (
  variant: ButtonVariant,
  size: ButtonSize,
  className: string
) =>
  `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  className = '',
  ...props
}) => (
  <button
    {...props}
    type={type}
    className={getButtonClasses(variant, size, className)}
  />
);

export const ButtonLink: React.FC<ButtonLinkProps> = ({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}) => (
  <Link
    {...props}
    className={getButtonClasses(variant, size, className)}
  />
);

export interface IconButtonProps
  extends Omit<ButtonProps, 'aria-label' | 'children' | 'size'> {
  label: string;
  size?: 'icon-sm' | 'icon';
  children: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  title = label,
  size = 'icon-sm',
  ...props
}) => (
  <Button
    {...props}
    size={size}
    aria-label={label}
    title={title}
  />
);
