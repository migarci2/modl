import type { PropsWithChildren } from 'react';

type NeoCardProps = {
  className?: string;
  interactive?: boolean;
};

export function NeoCard({
  className = '',
  interactive = false,
  children,
}: PropsWithChildren<NeoCardProps>) {
  return (
    <div
      className={`
        border-2 border-black bg-white p-4
        ${interactive ? 'neo-card interactive' : ''}
        ${className}
      `}
      style={{ boxShadow: '4px 4px 0px rgba(0,0,0,1)' }}
    >
      {children}
    </div>
  );
}

export default NeoCard;
