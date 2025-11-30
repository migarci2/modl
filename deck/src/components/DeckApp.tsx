import * as React from 'react';
import { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Menu, X, ExternalLink } from 'lucide-react';
import { NeoButton } from './ui';
import {
  SlideIntro,
  SlideProblem,
  SlideArchitecture,
  SlideCodeArchitecture,
  SlideDeepDive,
  SlideRecipes,
  SlideCLI,
  SlideRoadmap,
} from '../slides';

interface SlideConfig {
  id: string;
  theme: string;
  component: React.FC;
}

const slides: SlideConfig[] = [
  { id: 'intro', theme: 'bg-yellow-50', component: SlideIntro },
  { id: 'problem', theme: 'bg-red-50', component: SlideProblem },
  { id: 'architecture', theme: 'bg-green-50', component: SlideArchitecture },
  { id: 'code', theme: 'bg-slate-100', component: SlideCodeArchitecture },
  { id: 'deep-dive', theme: 'bg-blue-50', component: SlideDeepDive },
  { id: 'recipes', theme: 'bg-purple-50', component: SlideRecipes },
  { id: 'cli', theme: 'bg-gray-900', component: SlideCLI },
  { id: 'roadmap', theme: 'bg-white', component: SlideRoadmap },
];

export const DeckApp: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) setCurrentSlide((curr) => curr + 1);
  };

  const prevSlide = () => {
    if (currentSlide > 0) setCurrentSlide((curr) => curr - 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  const CurrentSlideComponent = slides[currentSlide].component;

  return (
    <div
      className={`min-h-screen font-mono text-black transition-colors duration-500 ease-in-out ${slides[currentSlide].theme} overflow-hidden flex flex-col`}
    >
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 w-full border-b-4 border-black bg-white z-50 px-4 py-3 flex justify-between items-center shadow-sm font-mono">
        <div
          className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => setCurrentSlide(0)}
        >
          <div className="w-8 h-8 bg-black border-2 border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]" />
          <span className="font-black text-2xl tracking-tighter italic lowercase">
            modl
          </span>
        </div>

        <div className="hidden md:flex gap-4 items-center">
          <span className="font-bold text-xs bg-gray-200 px-3 py-1 border-2 border-black">
            {currentSlide + 1} / {slides.length}
          </span>
          <NeoButton
            onClick={() => window.open('https://github.com/migarci2/modl', '_blank')}
            className="text-xs py-2 px-4 bg-cyan-300 flex items-center"
          >
            <ExternalLink size={14} className="mr-2" /> GitHub
          </NeoButton>
        </div>

        <button
          className="md:hidden p-2 border-2 border-black hover:bg-gray-200"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-yellow-50 z-40 flex flex-col items-center justify-center gap-6 pt-20 font-mono">
          <NeoButton
            onClick={() => {
              setCurrentSlide(0);
              setIsMenuOpen(false);
            }}
            color="bg-white"
            className="w-64"
          >
            Intro
          </NeoButton>
          <NeoButton
            onClick={() => {
              setCurrentSlide(2);
              setIsMenuOpen(false);
            }}
            color="bg-white"
            className="w-64"
          >
            Architecture
          </NeoButton>
          <NeoButton
            onClick={() => {
              setCurrentSlide(3);
              setIsMenuOpen(false);
            }}
            color="bg-white"
            className="w-64"
          >
            Deep Dive
          </NeoButton>
          <NeoButton
            onClick={() => {
              setCurrentSlide(5);
              setIsMenuOpen(false);
            }}
            color="bg-black text-white"
            className="w-64"
          >
            CLI
          </NeoButton>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center w-full h-full px-4 pt-20 pb-16 md:px-8 max-w-[1800px] mx-auto">
        <div
          key={`slide-${currentSlide}`}
          className="w-full h-full flex items-center justify-center"
        >
          <CurrentSlideComponent />
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="fixed bottom-0 left-0 w-full bg-white border-t-4 border-black p-3 flex justify-between items-center z-50">
        <NeoButton
          onClick={prevSlide}
          className={`flex items-center gap-2 py-2 px-4 ${
            currentSlide === 0
              ? 'opacity-50 cursor-not-allowed bg-gray-300'
              : 'bg-white'
          }`}
          disabled={currentSlide === 0}
        >
          <ArrowLeft size={18} /> PREV
        </NeoButton>

        <div className="flex gap-2">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`w-3 h-3 border-2 border-black cursor-pointer transition-all duration-200 ${
                idx === currentSlide
                  ? 'bg-black transform scale-125'
                  : 'bg-white hover:bg-gray-300'
              }`}
              onClick={() => setCurrentSlide(idx)}
            />
          ))}
        </div>

        <NeoButton
          onClick={nextSlide}
          className={`flex items-center gap-2 py-2 px-4 ${
            currentSlide === slides.length - 1
              ? 'opacity-50 cursor-not-allowed bg-gray-300'
              : 'bg-pink-500 text-white'
          }`}
          disabled={currentSlide === slides.length - 1}
        >
          NEXT <ArrowRight size={18} />
        </NeoButton>
      </footer>
    </div>
  );
};

export default DeckApp;
