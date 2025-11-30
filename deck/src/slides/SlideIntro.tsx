import * as React from 'react';
import { GitBranch, Terminal, Flame } from 'lucide-react';
import { Badge } from '../components/ui';

export const SlideIntro: React.FC = () => (
  <div className="flex flex-col items-start justify-center h-full space-y-6 font-mono pl-4 md:pl-0">
    <div className="w-full bg-black text-white border-y-4 border-black py-2 mb-4 absolute top-24 left-0 text-center font-bold text-xs md:text-sm tracking-widest">
      ATRIUM UNISWAP HOOKATHON /// REPO: MIGARCI2/MODL
    </div>

    <div className="neo-pop-in mt-24 relative">
      <h1 className="text-8xl md:text-[10rem] font-black lowercase tracking-tighter text-black leading-none">
        modl
      </h1>
      <div className="absolute -top-4 -right-12 md:-right-24 bg-green-400 text-black font-bold px-2 py-1 text-xs md:text-lg border-2 border-black transform rotate-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        v0.1.0
      </div>
    </div>

    <h2 className="neo-pop-in text-xl md:text-3xl font-bold bg-pink-400 px-4 py-2 inline-block border-4 border-black transform -rotate-1">
      Modular On-Chain Dynamic Logic
    </h2>

    <p className="neo-pop-in text-lg md:text-xl max-w-2xl border-l-8 border-black pl-6 bg-white p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      A robust <strong>Hook Aggregator</strong> for Uniswap v4 that enables
      composable, gas-aware, and routed logic modules.
    </p>

    <div className="flex flex-wrap gap-3 mt-4 neo-pop-in">
      <Badge text="MODLAggregator.sol" color="bg-blue-300" icon={GitBranch} />
      <Badge text="@modl-dev/cli" color="bg-purple-300" icon={Terminal} />
      <Badge text="Gas Optimized" color="bg-green-300" icon={Flame} />
    </div>
  </div>
);

export default SlideIntro;
