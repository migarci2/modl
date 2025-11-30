import * as React from 'react';
import { ScalabilitySim } from '../components/ScalabilitySim';

export const SlideDeepDive: React.FC = () => (
  <div className="h-full w-full flex flex-col font-mono px-4">
    <h3 className="text-4xl md:text-5xl font-black uppercase mb-6 neo-pop-in text-center">
      Deep Dive: Scalability
    </h3>
    <p className="text-center text-sm md:text-base text-gray-600 font-bold mb-6 neo-pop-in delay-100">
      Compare complexity growth: Monolithic hooks vs MODL's modular approach
    </p>
    <div className="flex-grow min-h-0">
      <ScalabilitySim />
    </div>
  </div>
);

export default SlideDeepDive;
