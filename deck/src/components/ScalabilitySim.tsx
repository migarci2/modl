import * as React from 'react';
import { useState } from 'react';
import { Box, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MetricRow } from './ui';

interface Module {
  id: string | number;
  name: string;
  cost: number;
}

export const ScalabilitySim: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([
    { id: 'kyc', name: 'KYC', cost: 10 },
  ]);

  const addModule = (name: string) => {
    if (modules.length < 6) {
      setModules([...modules, { id: Date.now(), name, cost: 10 }]);
    }
  };

  const reset = () => setModules([{ id: 'kyc', name: 'KYC', cost: 10 }]);

  const n = modules.length;

  // Monolith: Complexity grows quadratically
  const monoComplexity = Math.min(n * n * 5, 100);
  // MODL: Complexity grows linearly
  const modlComplexity = Math.min(n * 10, 40);

  // Audit costs
  const monoAudit = Math.min(n * 20, 100);
  const modlAudit = 15;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full font-mono">
      {/* Controls */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="bg-gray-100 border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h4 className="font-black uppercase text-sm mb-3 border-b-2 border-black pb-1">
            Add Functionality
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => addModule('Fees')}
              disabled={n >= 6}
              className="bg-green-200 border-2 border-black p-2 text-[10px] font-bold hover:bg-green-300 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              <Plus size={12} className="mr-1" /> Fees
            </button>
            <button
              onClick={() => addModule('Limits')}
              disabled={n >= 6}
              className="bg-yellow-200 border-2 border-black p-2 text-[10px] font-bold hover:bg-yellow-300 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              <Plus size={12} className="mr-1" /> Limits
            </button>
            <button
              onClick={() => addModule('Fhenix')}
              disabled={n >= 6}
              className="bg-purple-200 border-2 border-black p-2 text-[10px] font-bold hover:bg-purple-300 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              <Plus size={12} className="mr-1" /> Fhenix
            </button>
            <button
              onClick={() => addModule('Eigen')}
              disabled={n >= 6}
              className="bg-blue-200 border-2 border-black p-2 text-[10px] font-bold hover:bg-blue-300 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              <Plus size={12} className="mr-1" /> Eigen
            </button>
          </div>
          <button
            onClick={reset}
            className="w-full mt-4 bg-red-500 text-white border-2 border-black p-2 text-xs font-bold hover:bg-red-600"
          >
            RESET STACK
          </button>
        </div>

        <div className="flex-grow border-2 border-black bg-white p-4 custom-scroll overflow-y-auto max-h-[200px] lg:max-h-none">
          <div className="text-xs font-bold mb-2 text-gray-500">
            ACTIVE MODULES ({n})
          </div>
          {modules.map((m, i) => (
            <div
              key={m.id}
              className="mb-2 p-2 border border-black bg-gray-50 text-xs flex items-center"
            >
              <Box size={12} className="mr-2" /> {m.name} Module
            </div>
          ))}
        </div>
      </div>

      {/* Comparison */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* Monolith */}
        <div className="border-2 border-black p-4 bg-red-50">
          <div className="flex justify-between items-center mb-4">
            <h5 className="font-black text-lg flex items-center">
              <AlertTriangle className="mr-2 text-red-600" /> Monolithic Hook
            </h5>
            <span className="text-xs font-bold bg-red-200 px-2 border border-black">
              Re-Audit Required
            </span>
          </div>
          <div className="space-y-4">
            <MetricRow label="Complexity" value={monoComplexity} color="bg-red-500" />
            <MetricRow label="Audit Cost" value={monoAudit} color="bg-red-500" />
            <div className="text-[10px] text-right font-bold text-red-800 mt-2">
              *Exponential risk with each feature
            </div>
          </div>
        </div>

        {/* MODL */}
        <div className="border-2 border-black p-4 bg-green-50">
          <div className="flex justify-between items-center mb-4">
            <h5 className="font-black text-lg flex items-center">
              <CheckCircle2 className="mr-2 text-green-600" /> MODL Architecture
            </h5>
            <span className="text-xs font-bold bg-green-200 px-2 border border-black">
              Isolated Safety
            </span>
          </div>
          <div className="space-y-4">
            <MetricRow label="Complexity" value={modlComplexity} color="bg-green-500" />
            <MetricRow label="Audit Cost" value={modlAudit} color="bg-green-500" />
            <div className="text-[10px] text-right font-bold text-green-800 mt-2">
              *Linear scaling. Audit once, reuse forever.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScalabilitySim;
