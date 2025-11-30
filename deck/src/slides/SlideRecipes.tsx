import * as React from 'react';
import { 
  Shield, TrendingUp, EyeOff, Activity, Lock, Zap, 
  Clock, Users, BarChart3, Wallet, Eye,
  ArrowLeftRight, Database, Globe, Key, Layers
} from 'lucide-react';

const modules = [
  { name: 'Whitelist', icon: <Shield size={14} />, color: 'bg-blue-200' },
  { name: 'DynamicFee', icon: <TrendingUp size={14} />, color: 'bg-green-200' },
  { name: 'FhenixCreds', icon: <EyeOff size={14} />, color: 'bg-purple-200' },
  { name: 'FhenixAsync', icon: <Lock size={14} />, color: 'bg-purple-300' },
  { name: 'EigenOracle', icon: <Activity size={14} />, color: 'bg-indigo-200' },
  { name: 'EigenFee', icon: <BarChart3 size={14} />, color: 'bg-indigo-300' },
  { name: 'LimitOrder', icon: <ArrowLeftRight size={14} />, color: 'bg-yellow-200' },
  { name: 'TWAP', icon: <Clock size={14} />, color: 'bg-orange-200' },
  { name: 'Vault', icon: <Wallet size={14} />, color: 'bg-pink-200' },
  { name: 'Oracle', icon: <Database size={14} />, color: 'bg-cyan-200' },
  { name: 'Governance', icon: <Users size={14} />, color: 'bg-red-200' },
  { name: 'MEVShield', icon: <Zap size={14} />, color: 'bg-amber-200' },
  { name: 'MultiSig', icon: <Key size={14} />, color: 'bg-teal-200' },
  { name: 'Bridge', icon: <Globe size={14} />, color: 'bg-emerald-200' },
  { name: 'AuditLog', icon: <Eye size={14} />, color: 'bg-slate-200' },
  { name: 'Layer', icon: <Layers size={14} />, color: 'bg-violet-200' },
];

const combinations = [
  { m1: 0, m2: 1, result: 'KYC + Dynamic Fees', tag: 'Compliance', tagColor: 'bg-blue-400' },
  { m1: 2, m2: 11, result: 'Private MEV Protection', tag: 'Privacy', tagColor: 'bg-purple-400' },
  { m1: 4, m2: 1, result: 'Oracle-Fed Fees', tag: 'DeFi', tagColor: 'bg-green-400' },
  { m1: 10, m2: 0, result: 'DAO-Gated Pools', tag: 'DAO', tagColor: 'bg-red-400' },
  { m1: 7, m2: 6, result: 'TWAP Limit Orders', tag: 'Trading', tagColor: 'bg-yellow-400' },
  { m1: 12, m2: 8, result: 'MultiSig Vaults', tag: 'Security', tagColor: 'bg-teal-400' },
  { m1: 13, m2: 1, result: 'Cross-Chain Fees', tag: 'Interop', tagColor: 'bg-emerald-400' },
  { m1: 3, m2: 6, result: 'Encrypted Orders', tag: 'FHE', tagColor: 'bg-violet-400' },
  { m1: 5, m2: 8, result: 'Restaking Vaults', tag: 'EigenLayer', tagColor: 'bg-indigo-400' },
  { m1: 14, m2: 0, result: 'Audit Compliance', tag: 'Enterprise', tagColor: 'bg-slate-400' },
  { m1: 8, m2: 9, result: 'Auto-Rebalancing', tag: 'Yield', tagColor: 'bg-pink-400' },
  { m1: 2, m2: 0, result: 'Private KYC', tag: 'Privacy+', tagColor: 'bg-fuchsia-400' },
  { m1: 11, m2: 7, result: 'MEV-Safe TWAP', tag: 'Trading', tagColor: 'bg-amber-400' },
  { m1: 4, m2: 11, result: 'Oracle MEV Shield', tag: 'Security', tagColor: 'bg-cyan-400' },
  { m1: 15, m2: 1, result: 'Layered Fees', tag: 'Advanced', tagColor: 'bg-gray-400' },
  { m1: 3, m2: 10, result: 'Private Governance', tag: 'DAO+', tagColor: 'bg-rose-400' },
];

const CombinationCard: React.FC<{ combo: typeof combinations[0] }> = ({ combo }) => (
  <div className="flex-shrink-0 w-64 p-3 border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mx-2">
    <div className="flex items-center gap-1 mb-2">
      <div className={`${modules[combo.m1].color} p-1.5 border border-black flex items-center gap-1`}>
        {modules[combo.m1].icon}
        <span className="text-[8px] font-bold">{modules[combo.m1].name}</span>
      </div>
      <span className="text-sm font-black">+</span>
      <div className={`${modules[combo.m2].color} p-1.5 border border-black flex items-center gap-1`}>
        {modules[combo.m2].icon}
        <span className="text-[8px] font-bold">{modules[combo.m2].name}</span>
      </div>
    </div>
    <div className="border-t border-black pt-1">
      <div className="font-bold text-xs">{combo.result}</div>
      <span className={`${combo.tagColor} text-[8px] font-bold px-1.5 py-0.5 border border-black inline-block mt-1`}>
        {combo.tag}
      </span>
    </div>
  </div>
);

// Marquee row component - truly infinite smooth scroll with two identical tracks
const MarqueeRow: React.FC<{ items: typeof combinations; reverse?: boolean; speed?: number }> = ({ 
  items, 
  reverse = false,
  speed = 30
}) => {
  return (
    <div className="relative flex overflow-hidden py-1">
      {/* First track */}
      <div 
        className={`flex shrink-0 ${reverse ? 'animate-scroll-right' : 'animate-scroll-left'}`}
        style={{ animationDuration: `${speed}s` }}
      >
        {items.map((combo, idx) => (
          <CombinationCard key={`a-${idx}`} combo={combo} />
        ))}
      </div>
      {/* Second track - identical copy for seamless loop */}
      <div 
        className={`flex shrink-0 ${reverse ? 'animate-scroll-right' : 'animate-scroll-left'}`}
        style={{ animationDuration: `${speed}s` }}
      >
        {items.map((combo, idx) => (
          <CombinationCard key={`b-${idx}`} combo={combo} />
        ))}
      </div>
    </div>
  );
};

export const SlideRecipes: React.FC = () => {
  const row1 = combinations.slice(0, 8);
  const row2 = combinations.slice(8, 16);

  return (
    <div className="h-full flex flex-col font-mono overflow-hidden">
      <div className="neo-pop-in text-center mb-2 shrink-0">
        <h3 className="text-3xl md:text-4xl font-black mb-1 uppercase">
          Infinite Combinations
        </h3>
        <p className="text-xs md:text-sm text-gray-600 font-bold">
          Mix & Match modules to create unique pool behaviors
        </p>
      </div>

      {/* Marquee Rows */}
      <div className="flex-1 flex flex-col justify-center overflow-hidden relative min-h-0">
        <MarqueeRow items={row1} speed={35} />
        <MarqueeRow items={row2} reverse speed={40} />
        
        {/* Gradient overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-purple-50 to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-purple-50 to-transparent pointer-events-none z-10" />
      </div>

      {/* Bottom section */}
      <div className="shrink-0 mt-2">
        <div className="grid grid-cols-2 gap-3 neo-pop-in delay-200">
          <div className="bg-blue-100 border-2 border-black p-2 text-center">
            <div className="text-xl md:text-2xl font-black">{modules.length}</div>
            <div className="text-[9px] font-bold uppercase">Base Modules</div>
          </div>
          <div className="bg-pink-100 border-2 border-black p-2 text-center">
            <div className="text-xl md:text-2xl font-black">∞</div>
            <div className="text-[9px] font-bold uppercase">Custom Modules</div>
          </div>
        </div>
        
        <div className="mt-2 text-center neo-pop-in delay-300">
          <p className="text-xs md:text-sm font-bold text-gray-700 bg-white border-2 border-black px-3 py-1.5 inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Combine as many modules as your pool needs
          </p>
        </div>
      </div>
    </div>
  );
};

export default SlideRecipes;
