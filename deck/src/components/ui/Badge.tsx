import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

interface BadgeProps {
  text: string;
  color?: string;
  icon?: LucideIcon;
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  color = 'bg-pink-400',
  icon: Icon,
}) => (
  <span
    className={`
      ${color} 
      border-2 border-black 
      px-3 py-1 
      text-xs md:text-sm font-bold uppercase tracking-wider font-mono
      inline-flex items-center mr-2 mb-2
    `}
  >
    {Icon && <Icon size={14} className="mr-2" />}
    {text}
  </span>
);

export default Badge;
