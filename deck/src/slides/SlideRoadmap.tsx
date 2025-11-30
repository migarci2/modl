import * as React from 'react';
import { Rocket, CheckCircle2, Loader } from 'lucide-react';
import { NeoCard, Badge } from '../components/ui';

export const SlideRoadmap: React.FC = () => (
  <div className="h-full font-mono flex flex-col justify-center">
    <h3 className="text-4xl font-black mb-10 uppercase neo-pop-in flex items-center justify-center">
      <Rocket size={40} className="mr-3 text-pink-500" /> Project Status
    </h3>

    <div className="space-y-6 max-w-3xl mx-auto w-full">
      {/* Core Architecture */}
      <div className="relative pl-8 border-l-4 border-black neo-pop-in">
        <div className="absolute -left-[1.15rem] top-0 w-8 h-8 bg-green-400 border-2 border-black rounded-full flex items-center justify-center text-black">
          <CheckCircle2 size={18} />
        </div>
        <NeoCard color="bg-green-50" className="py-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-black uppercase">Core Architecture</h4>
            <Badge text="DONE" color="bg-green-300" />
          </div>
          <p className="text-xs mt-1 opacity-80">
            MODLAggregator, Hook routing, Gas limits, Criticality flags.
          </p>
        </NeoCard>
      </div>

      {/* Advanced Modules */}
      <div className="relative pl-8 border-l-4 border-black neo-pop-in">
        <div className="absolute -left-[1.15rem] top-0 w-8 h-8 bg-green-400 border-2 border-black rounded-full flex items-center justify-center text-black">
          <CheckCircle2 size={18} />
        </div>
        <NeoCard color="bg-green-50" className="py-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-black uppercase">Advanced Modules</h4>
            <Badge text="DONE" color="bg-green-300" />
          </div>
          <p className="text-xs mt-1 opacity-80">
            EigenLayer Oracle/Tasks & Fhenix Privacy modules implemented.
          </p>
        </NeoCard>
      </div>

      {/* Tooling */}
      <div className="relative pl-8 border-l-4 border-dashed border-gray-400 neo-pop-in">
        <div className="absolute -left-[1.15rem] top-0 w-8 h-8 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center text-black animate-pulse">
          <Loader size={18} className="animate-spin" />
        </div>
        <NeoCard color="bg-yellow-100" className="py-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-black uppercase">Tooling & Adoption</h4>
            <Badge text="IN PROGRESS" color="bg-yellow-300" />
          </div>
          <p className="text-xs mt-1 opacity-80">
            @modl-dev/cli live. Next: Module Registry & Auto-Converters.
          </p>
        </NeoCard>
      </div>
    </div>
  </div>
);

export default SlideRoadmap;
