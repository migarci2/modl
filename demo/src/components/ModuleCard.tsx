import { ArrowUpRight, CheckCircle2, Info, Zap } from 'lucide-react';
import type { ModuleSpec } from '../data/modules';
import { NeoCard } from './NeoCard';
import { NeoButton } from './NeoButton';

type ModuleCardProps = {
  module: ModuleSpec;
  selected: boolean;
  onToggle: (id: string) => void;
};

const statusBg: Record<ModuleSpec['status'], string> = {
  'battle-tested': 'bg-green-100',
  beta: 'bg-yellow-100',
  experimental: 'bg-orange-100',
};

export function ModuleCard({ module, selected, onToggle }: ModuleCardProps) {
  return (
    <NeoCard
      interactive
      className={`flex flex-col gap-3 h-full ${statusBg[module.status]}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="section-label">module</span>
            <span className="text-[10px] font-bold uppercase text-gray-500">v{module.version}</span>
          </div>
          <h3 className="text-lg font-black leading-tight">{module.name}</h3>
        </div>
        <NeoButton
          onClick={() => onToggle(module.id)}
          color={selected ? 'bg-black text-white' : 'bg-white'}
          className="flex items-center gap-1 shrink-0"
        >
          {selected ? <CheckCircle2 size={14} /> : <Zap size={14} />}
          {selected ? 'Added' : 'Add'}
        </NeoButton>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 leading-relaxed">{module.description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] font-bold uppercase bg-gray-200 px-1.5 py-0.5 border border-black">
          {module.status}
        </span>
        <span className="text-[10px] font-bold uppercase bg-gray-200 px-1.5 py-0.5 border border-black">
          risk: {module.risk}
        </span>
        {module.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-[10px] font-bold uppercase bg-white px-1.5 py-0.5 border border-black">
            {tag}
          </span>
        ))}
      </div>

      {/* Gas stats - simplified */}
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="bg-white p-2 border border-black">
          <span className="font-bold uppercase">Swap</span>
          <p className="font-bold">{module.gas.perSwap?.toLocaleString() ?? '—'}</p>
        </div>
        <div className="bg-white p-2 border border-black">
          <span className="font-bold uppercase">Liq</span>
          <p className="font-bold">{module.gas.perLiquidity?.toLocaleString() ?? '—'}</p>
        </div>
        <div className="bg-white p-2 border border-black">
          <span className="font-bold uppercase">Cap</span>
          <p className="font-bold">{module.gas.gasBudget?.toLocaleString() ?? '∞'}</p>
        </div>
      </div>

      {/* Hooks - simplified */}
      <div className="flex flex-wrap gap-1 mt-auto">
        {module.hooks.map((hook) => (
          <span key={hook} className="text-[9px] font-bold uppercase bg-black text-white px-1.5 py-0.5">
            {hook}
          </span>
        ))}
      </div>

      {/* Warning */}
      {module.warning && (
        <div className="flex items-start gap-2 text-[10px] bg-black text-white p-2 border border-black">
          <Info size={12} className="shrink-0 mt-0.5" />
          <p>{module.warning}</p>
        </div>
      )}

      {/* Docs link */}
      {module.docs && (
        <a href={module.docs} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold underline flex items-center gap-1">
          <ArrowUpRight size={12} /> Docs
        </a>
      )}
    </NeoCard>
  );
}

export default ModuleCard;
