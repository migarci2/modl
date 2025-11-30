import * as React from 'react';

interface NeoCardProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  interactive?: boolean;
  onClick?: () => void;
}

export const NeoCard: React.FC<NeoCardProps> = ({
  children,
  className = '',
  color = 'bg-white',
  interactive = false,
  onClick,
}) => (
  <div
    onClick={interactive ? onClick : undefined}
    className={`
      ${color} 
      border-2 border-black 
      p-4 md:p-6 
      shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] 
      ${interactive ? 'neo-card-interactive' : ''}
      ${className}
    `}
  >
    {children}
  </div>
);

export default NeoCard;
