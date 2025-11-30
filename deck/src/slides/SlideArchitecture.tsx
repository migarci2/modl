import * as React from 'react';
import { GitBranch, Shield, TrendingUp, Activity } from 'lucide-react';
import { NeoCard } from '../components/ui';

export const SlideArchitecture: React.FC = () => (
  <div className="h-full flex flex-col justify-center font-mono px-4">
    <div className="text-center mb-8">
      <h3 className="text-4xl font-black uppercase neo-pop-in inline-block bg-white px-6 py-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        The Architecture
      </h3>
    </div>

    <div className="flex flex-col gap-6 items-center max-w-5xl mx-auto w-full">
      {/* Uniswap */}
      <div className="w-full flex justify-center">
        <div className="bg-gray-900 text-white text-center border-4 border-black p-4 w-64 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
          <h4 className="font-bold text-lg">Uniswap v4</h4>
          <div className="mt-1 text-xs text-gray-400 font-mono">PoolManager</div>
        </div>
      </div>

      <div className="h-8 w-1 bg-black" />

      {/* Aggregator */}
      <NeoCard
        color="bg-yellow-300"
        className="w-full max-w-3xl border-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative"
      >
        <div className="absolute -top-3 -right-3 bg-red-500 text-white px-2 py-1 text-xs font-bold border-2 border-black transform rotate-6">
          SINGLETON
        </div>
        <div className="flex items-center justify-center mb-4 border-b-2 border-black pb-2">
          <GitBranch size={24} className="mr-2" />
          <h4 className="font-black text-2xl">MODLAggregator.sol</h4>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center text-xs font-bold">
          <div className="bg-white p-2 border-2 border-black">
            <div className="text-gray-500 text-[10px] mb-1">STEP 1</div>
            Decode HookData
          </div>
          <div className="bg-white p-2 border-2 border-black">
            <div className="text-gray-500 text-[10px] mb-1">STEP 2</div>
            Enforce Config
          </div>
          <div className="bg-white p-2 border-2 border-black">
            <div className="text-gray-500 text-[10px] mb-1">STEP 3</div>
            Dispatch Loop
          </div>
        </div>
      </NeoCard>

      <div className="h-8 w-1 bg-black" />

      {/* Modules */}
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-200 border-4 border-black p-3 shadow-sm flex flex-col items-center neo-pop-in relative">
          <div className="absolute -top-2 -left-2 bg-black text-white text-[10px] px-1">
            PRIORITY 0
          </div>
          <Shield size={24} className="mb-2" />
          <span className="font-bold text-sm">Whitelist</span>
          <span className="text-[10px] mt-1 opacity-60">Critical: True</span>
        </div>

        <div className="bg-green-200 border-4 border-black p-3 shadow-sm flex flex-col items-center neo-pop-in relative">
          <div className="absolute -top-2 -left-2 bg-black text-white text-[10px] px-1">
            PRIORITY 1
          </div>
          <TrendingUp size={24} className="mb-2" />
          <span className="font-bold text-sm">DynamicFee</span>
          <span className="text-[10px] mt-1 opacity-60">Gas: 50k</span>
        </div>

        <div className="bg-purple-200 border-4 border-black p-3 shadow-sm flex flex-col items-center neo-pop-in relative">
          <div className="absolute -top-2 -left-2 bg-black text-white text-[10px] px-1">
            PRIORITY 2
          </div>
          <Activity size={24} className="mb-2" />
          <span className="font-bold text-sm">EigenOracle</span>
          <span className="text-[10px] mt-1 opacity-60">Critical: False</span>
        </div>
      </div>
    </div>
  </div>
);

export default SlideArchitecture;
