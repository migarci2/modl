import * as React from 'react';

interface NeoButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  className?: string;
  disabled?: boolean;
}

export const NeoButton: React.FC<NeoButtonProps> = ({
  children,
  onClick,
  color = 'bg-yellow-400',
  className = '',
  disabled = false,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      ${color} 
      border-2 border-black 
      px-4 py-2 md:px-6 md:py-3 
      font-bold text-black font-mono
      shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] 
      transition-all 
      hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]
      active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
      disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none
      ${className}
    `}
  >
    {children}
  </button>
);

export default NeoButton;
