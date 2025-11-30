import * as React from 'react';
import { X, Shield, TrendingUp, Activity, AlertTriangle } from 'lucide-react';
import { NeoCard } from '../components/ui';

export const SlideProblem: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center h-full font-mono">
    <div className="neo-pop-in">
      <h3 className="text-4xl md:text-5xl font-black mb-6 uppercase leading-tight">
        The "Singleton" Problem
      </h3>
      <p className="text-lg mb-6 font-bold bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        Uniswap v4 limits each pool to exactly{' '}
        <span className="text-red-600 underline decoration-4">ONE</span> hook
        address.
      </p>
      <div className="space-y-4 text-sm md:text-base">
        <div className="flex items-center p-3 border-l-4 border-red-500 bg-red-100">
          <X size={20} className="mr-3 text-red-600" />
          <span>Want KYC Compliance?</span>
        </div>
        <div className="flex items-center p-3 border-l-4 border-red-500 bg-red-100">
          <X size={20} className="mr-3 text-red-600" />
          <span>Want Dynamic Fees?</span>
        </div>
        <div className="flex items-center p-3 border-l-4 border-red-500 bg-red-100">
          <X size={20} className="mr-3 text-red-600" />
          <span>Want Limit Orders?</span>
        </div>
      </div>
      <div className="mt-6 font-bold text-red-600 flex items-center">
        <AlertTriangle className="mr-2" /> Result: You force a Monolith.
      </div>
    </div>

    <div className="flex flex-col justify-center items-center h-full relative space-y-8">
      <div className="relative w-3/4">
        <div className="bg-gray-200 border-4 border-gray-400 p-6 text-center opacity-60">
          <h4 className="font-bold text-gray-500 mb-2">MonolithicHook.sol</h4>
          <div className="space-y-1 opacity-30">
            <div className="h-2 bg-gray-400 w-full" />
            <div className="h-2 bg-gray-400 w-full" />
            <div className="h-2 bg-gray-400 w-full" />
          </div>
          <div className="mt-2 text-xs font-bold text-red-500">RIGID & UNSAFE</div>
        </div>
      </div>

      <div className="z-10">
        <div className="bg-black text-white font-black text-xl px-6 py-2 border-4 border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] rounded-full">
          VS
        </div>
      </div>

      <NeoCard
        color="bg-yellow-300"
        className="text-center border-4 z-0 scale-105 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-3/4"
      >
        <h4 className="font-black text-xl mb-2">modl Aggregator</h4>
        <div className="flex justify-center gap-2 mt-4">
          <div className="w-8 h-8 bg-blue-400 border-2 border-black flex items-center justify-center">
            <Shield size={12} />
          </div>
          <div className="w-8 h-8 bg-green-400 border-2 border-black flex items-center justify-center">
            <TrendingUp size={12} />
          </div>
          <div className="w-8 h-8 bg-purple-400 border-2 border-black flex items-center justify-center">
            <Activity size={12} />
          </div>
        </div>
        <div className="mt-4 text-xs font-bold">MODULAR & SAFE</div>
      </NeoCard>
    </div>
  </div>
);

export default SlideProblem;
