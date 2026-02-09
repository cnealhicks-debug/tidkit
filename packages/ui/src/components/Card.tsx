'use client';

/**
 * TidKit UI - Card Component
 */

import { type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '../utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  className,
  padding = 'md',
  hover = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm',
        paddingStyles[padding],
        hover && 'hover:border-blue-500 hover:shadow-md transition-all cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function CardHeader({
  title,
  description,
  action,
  className,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn('flex items-start justify-between mb-4', className)}
      {...props}
    >
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardContent({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-4 pt-4 border-t border-gray-100', className)}
      {...props}
    >
      {children}
    </div>
  );
}
