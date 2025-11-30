import * as React from 'react';
import { Code2, Layers, Zap, Shield } from 'lucide-react';

const CodeBlock: React.FC<{ title: string; code: string }> = ({
  title,
  code,
}) => (
  <div className="bg-gray-900 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex-1 flex flex-col">
    <div className="bg-gray-800 px-3 py-1 border-b border-gray-700 flex items-center gap-2">
      <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <div className="w-2 h-2 rounded-full bg-yellow-500" />
        <div className="w-2 h-2 rounded-full bg-green-500" />
      </div>
      <span className="text-[10px] text-gray-400 font-bold">{title}</span>
    </div>
    <pre className="p-3 text-[9px] md:text-[10px] leading-relaxed overflow-x-auto text-gray-100 flex-1">
      <code dangerouslySetInnerHTML={{ __html: code }} />
    </pre>
  </div>
);

export const SlideCodeArchitecture: React.FC = () => {
  const aggregatorCode = `<span class="text-purple-400">contract</span> <span class="text-yellow-300">MODLAggregator</span> <span class="text-purple-400">is</span> BaseHook, Ownable {
    <span class="text-gray-500">// Pre-computed module indices per hook</span>
    <span class="text-purple-400">mapping</span>(<span class="text-blue-300">uint16</span> hookFlag => <span class="text-blue-300">uint16[]</span>) <span class="text-green-300">_modulesPerHook</span>;
    
    <span class="text-gray-500">// Packed struct: 31 bytes = 1 storage slot</span>
    <span class="text-purple-400">struct</span> <span class="text-yellow-300">ModuleConfig</span> {
        IMODLModule module;     <span class="text-gray-500">// 20 bytes</span>
        <span class="text-blue-300">uint16</span> hooksBitmap;     <span class="text-gray-500">// 2 bytes</span>
        <span class="text-blue-300">bool</span> critical;          <span class="text-gray-500">// 1 byte</span>
        <span class="text-blue-300">uint32</span> priority;        <span class="text-gray-500">// 4 bytes</span>
        <span class="text-blue-300">uint32</span> gasLimit;        <span class="text-gray-500">// 4 bytes</span>
    }
}`;

  const moduleCode = `<span class="text-purple-400">interface</span> <span class="text-yellow-300">IMODLModule</span> {
    <span class="text-gray-500">// Each module implements lifecycle hooks</span>
    <span class="text-purple-400">function</span> <span class="text-green-300">beforeSwap</span>(...) <span class="text-purple-400">external</span>
        <span class="text-purple-400">returns</span> (BeforeSwapResult <span class="text-purple-400">memory</span>);
    
    <span class="text-purple-400">function</span> <span class="text-green-300">afterSwap</span>(...) <span class="text-purple-400">external</span>
        <span class="text-purple-400">returns</span> (AfterSwapResult <span class="text-purple-400">memory</span>);
    
    <span class="text-gray-500">// Modules can return deltas + new fees</span>
    <span class="text-purple-400">struct</span> <span class="text-yellow-300">BeforeSwapResult</span> {
        <span class="text-blue-300">bool</span> hasDelta;
        BeforeSwapDelta delta;
        <span class="text-blue-300">bool</span> hasNewFee;
        <span class="text-blue-300">uint24</span> newFee;
    }
}`;

  const executionCode = `<span class="text-gray-500">// Gas-optimized execution loop</span>
<span class="text-purple-400">function</span> <span class="text-green-300">_executeBeforeSwap</span>(...) {
    <span class="text-blue-300">uint16[]</span> <span class="text-purple-400">storage</span> indices = 
        _modulesPerHook[<span class="text-yellow-300">_HOOK_BEFORE_SWAP</span>];
    
    <span class="text-purple-400">for</span> (<span class="text-blue-300">uint256</span> i; i < indices.length;) {
        ModuleConfig <span class="text-purple-400">storage</span> cfg = _modules[indices[i]];
        
        <span class="text-gray-500">// External call with gas limit</span>
        (<span class="text-blue-300">bool</span> ok, <span class="text-blue-300">bytes</span> <span class="text-purple-400">memory</span> ret) = 
            <span class="text-purple-400">address</span>(cfg.module).<span class="text-green-300">call</span>{gas: cfg.gasLimit}(
                <span class="text-purple-400">abi</span>.encodeCall(...)
            );
        
        <span class="text-purple-400">unchecked</span> { ++i; } <span class="text-gray-500">// Gas savings</span>
    }
}`;

  return (
    <div className="h-full flex flex-col font-mono px-2">
      <div className="neo-pop-in text-center mb-4">
        <h3 className="text-3xl md:text-4xl font-black uppercase flex items-center justify-center gap-3">
          <Code2 size={32} className="text-blue-600" />
          Under the Hood
        </h3>
        <p className="text-xs md:text-sm text-gray-600 font-bold mt-1">
          Clean architecture meets gas efficiency
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow">
        {/* Aggregator */}
        <div className="neo-pop-in delay-100 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-yellow-400 p-1 border-2 border-black">
              <Layers size={16} />
            </div>
            <span className="font-black text-sm uppercase">MODLAggregator</span>
          </div>
          <CodeBlock title="MODLAggregator.sol" code={aggregatorCode} />
          <div className="mt-2 text-[10px] bg-yellow-100 border-2 border-black p-2">
            <strong>Core Contract:</strong> Fans out hook callbacks to registered modules. 
            Packed structs save ~40% gas on storage operations.
          </div>
        </div>

        {/* Interface */}
        <div className="neo-pop-in delay-200 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-green-400 p-1 border-2 border-black">
              <Shield size={16} />
            </div>
            <span className="font-black text-sm uppercase">IMODLModule</span>
          </div>
          <CodeBlock title="IMODLModule.sol" code={moduleCode} />
          <div className="mt-2 text-[10px] bg-green-100 border-2 border-black p-2">
            <strong>Module Interface:</strong> Every module implements this. 
            Can return token deltas and override swap fees dynamically.
          </div>
        </div>

        {/* Execution */}
        <div className="neo-pop-in delay-300 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-pink-400 p-1 border-2 border-black">
              <Zap size={16} />
            </div>
            <span className="font-black text-sm uppercase">Execution</span>
          </div>
          <CodeBlock title="Execution Loop" code={executionCode} />
          <div className="mt-2 text-[10px] bg-pink-100 border-2 border-black p-2">
            <strong>Gas Optimized:</strong> Pre-computed indices, unchecked loops, 
            and per-module gas limits prevent griefing.
          </div>
        </div>
      </div>

      {/* Bottom highlight */}
      <div className="mt-4 bg-black text-white p-3 border-2 border-black neo-pop-in delay-400 text-center">
        <span className="text-xs md:text-sm font-bold">
          <span className="text-green-400">✓</span> External calls for isolation &nbsp;|&nbsp; 
          <span className="text-green-400">✓</span> Priority-based ordering &nbsp;|&nbsp; 
          <span className="text-green-400">✓</span> Critical vs non-critical modules &nbsp;|&nbsp;
          <span className="text-green-400">✓</span> Custom routing support
        </span>
      </div>
    </div>
  );
};

export default SlideCodeArchitecture;
