import type { PropsWithChildren, MouseEventHandler } from 'react';

type NeoButtonProps = {
	onClick?: MouseEventHandler<HTMLButtonElement>;
	color?: string;
	className?: string;
	disabled?: boolean;
	type?: 'button' | 'submit' | 'reset';
};

export function NeoButton({
	children,
	onClick,
	color = 'bg-white',
	className = '',
	disabled = false,
	type = 'button',
}: PropsWithChildren<NeoButtonProps>) {
	return (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled}
			className={`
        ${color}
        border-2 border-black
        px-3 py-1.5
        font-bold text-black font-mono text-xs
        transition-all duration-75
        hover:translate-x-[-1px] hover:translate-y-[-1px]
        active:translate-x-[1px] active:translate-y-[1px]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${className}
      `}
			style={{
				boxShadow: disabled ? 'none' : '3px 3px 0px rgba(0,0,0,1)',
			}}
		>
			{children}
		</button>
	);
}

export default NeoButton;
