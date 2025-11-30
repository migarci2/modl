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
      className={`min-h-screen font-mono text-black transition-colors duration-500 ease-in-out ${slides[currentSlide].theme} flex flex-col`}
    >
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 w-full border-b-4 border-black bg-white/95 backdrop-blur z-50 px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 shadow-sm font-mono">
        {/* Logo + title */}
        <div
          className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => {
            setCurrentSlide(0);
            setIsMenuOpen(false);
          }}
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-black border-2 border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]" />
          <span className="font-black text-xl sm:text-2xl tracking-tighter italic lowercase">
            modl
          </span>
        </div>

        {/* Center: slide position (hidden on very small screens) */}
        <div className="hidden sm:flex flex-1 justify-center">
          <span className="font-bold text-[10px] sm:text-xs bg-gray-200 px-2.5 sm:px-3 py-1 border-2 border-black rounded-none">
            slide {currentSlide + 1} / {slides.length}
          </span>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <NeoButton
            onClick={() => window.open('https://migarci2.github.io/modl/', '_blank')}
            className="text-[11px] py-2 px-3 bg-yellow-200 border-2 border-black"
          >
            Docs
          </NeoButton>
          <NeoButton
            onClick={() => window.open('https://github.com/migarci2/modl', '_blank')}
            className="text-[11px] py-2 px-3 bg-cyan-300 flex items-center border-2 border-black"
          >
            <ExternalLink size={14} className="mr-1" /> GitHub
          </NeoButton>
        </div>

        {/* Mobile slide counter */}
        <span className="flex sm:hidden ml-auto mr-2 text-[10px] font-semibold bg-gray-200 px-2 py-0.5 border-2 border-black">
          {currentSlide + 1}/{slides.length}
        </span>

        {/* Hamburger */}
        <button
          className="md:hidden p-2 border-2 border-black bg-white hover:bg-gray-100 active:translate-y-[1px] transition-colors"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile Menu (full-screen overlay on small screens) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-yellow-50/95 backdrop-blur-sm font-mono pt-16 pb-6 px-4">
          <div className="mb-6 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-tight uppercase">Navigate deck</span>
            <span className="text-[11px] font-semibold bg-gray-200 px-2 py-0.5 border-2 border-black">
              slide {currentSlide + 1} / {slides.length}
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
            {slides.map((slide, index) => (
              <NeoButton
                key={slide.id}
                onClick={() => {
                  setCurrentSlide(index);
                  setIsMenuOpen(false);
                }}
                color={
                  index === currentSlide
                    ? 'bg-black text-white'
                    : 'bg-white'
                }
                className="w-full justify-between text-sm py-2.5 px-3"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex w-5 items-center justify-center text-[11px] font-bold border-2 border-black bg-yellow-100 text-black">
                    {index + 1}
                  </span>
                  <span className="capitalize">{slide.id.replace('-', ' ')}</span>
                </span>
              </NeoButton>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t-2 border-black pt-3">
            <NeoButton
              onClick={() => window.open('https://migarci2.github.io/modl/', '_blank')}
              className="w-full text-xs py-2 bg-yellow-200 border-2 border-black"
            >
              View docs
            </NeoButton>
            <NeoButton
              onClick={() => window.open('https://github.com/migarci2/modl', '_blank')}
              className="w-full text-xs py-2 bg-cyan-300 flex items-center justify-center border-2 border-black"
            >
              <ExternalLink size={14} className="mr-1" /> GitHub
            </NeoButton>
          </div>
        </div>
      )}

      {/* Main Content */}
  <main className="flex-grow flex items-center justify-center w-full h-full px-3 sm:px-4 pt-20 pb-16 md:px-8 max-w-[1800px] mx-auto">
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
