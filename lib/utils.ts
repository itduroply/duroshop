import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, differenceInDays } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy'): string {
  return format(new Date(date), fmt)
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy h:mm a')
}

export function getAgingDays(createdAt: string | Date): number {
  return differenceInDays(new Date(), new Date(createdAt))
}

export function getAgingColor(days: number): string {
  if (days <= 3) return '#27AE60'
  if (days <= 7) return '#E67E22'
  return '#E74C3C'
}

export function getAgingLabel(days: number): string {
  if (days <= 3) return 'On Track'
  if (days <= 7) return 'Delayed'
  return 'Critical'
}

export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.slice(0, length)}...` : str
}

export function generateSKU(name: string): string {
  const prefix = name.replace(/\s+/g, '-').toUpperCase().slice(0, 6)
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${suffix}`
}
