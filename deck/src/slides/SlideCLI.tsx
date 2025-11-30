import * as React from 'react';
import { Terminal, Workflow } from 'lucide-react';

export const SlideCLI: React.FC = () => (
  <div className="h-full flex flex-col justify-center items-center font-mono text-white">
    <h3 className="text-4xl font-black mb-8 uppercase text-center neo-pop-in text-green-400 border-b-4 border-green-400 pb-2">
      <Terminal size={32} className="inline mr-3 mb-1" /> Developer Experience
    </h3>

    <div className="w-full max-w-3xl bg-black border-4 border-gray-700 p-6 shadow-[8px_8px_0px_0px_#4ade80] neo-pop-in relative">
      {/* Terminal Window Controls */}
      <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
      </div>

      <div className="space-y-6 text-sm md:text-base font-mono">
        {/* Step 1 */}
        <div>
          <div className="flex items-center text-gray-400 mb-1 text-xs">
            # 1. Install CLI
          </div>
          <div className="flex">
            <span className="text-green-400 mr-2">➜</span>
            <span>npm install -g @modl-dev/cli</span>
          </div>
        </div>

        {/* Step 2 */}
        <div>
          <div className="flex items-center text-gray-400 mb-1 text-xs">
            # 2. Init Project
          </div>
          <div className="flex">
            <span className="text-green-400 mr-2">➜</span>
            <span>modl init</span>
          </div>
        </div>

        {/* Step 3 */}
        <div>
          <div className="flex items-center text-gray-400 mb-1 text-xs">
            # 3. Scaffold from Template
          </div>
          <div className="flex">
            <span className="text-green-400 mr-2">➜</span>
            <span>modl module:new FhenixWall -t fhenix-credentials</span>
          </div>
          <div className="text-gray-500 text-xs mt-1 pl-6">
            Created <code>src/modules/FhenixWall.sol</code> <br />
            Created <code>test/modules/FhenixWall.t.sol</code>
          </div>
        </div>
      </div>
    </div>

    <div className="mt-12 bg-gray-800 p-4 border-l-4 border-purple-500 max-w-2xl shadow-lg">
      <p className="text-xs text-gray-400 font-bold mb-2">LONG TERM VISION:</p>
      <p className="text-sm font-bold text-white flex items-start">
        <Workflow className="mr-2 flex-shrink-0 text-purple-400" />
        "We are building AST-based automation to instantly convert existing
        monolithic hooks into modular MODL components."
      </p>
    </div>
  </div>
);

export default SlideCLI;
