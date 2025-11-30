import * as React from 'react';

interface MetricRowProps {
  label: string;
  value: number;
  color?: string;
}

export const MetricRow: React.FC<MetricRowProps> = ({
  label,
  value,
  color = 'bg-green-500',
}) => (
  <div className="w-full">
    <div className="flex justify-between mb-1 text-xs font-bold uppercase">
      <span>{label}</span>
    </div>
    <div className="w-full bg-white border border-black h-3">
      <div
        className={`h-full ${color} transition-all duration-500 ease-out`}
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

export default MetricRow;
