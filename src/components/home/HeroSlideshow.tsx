import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HERO_SLIDES } from '../../data';

const AUTOPLAY_TIME = 6000; // 6 seconds

const HeroSlideshow: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % HERO_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  // Set up autoplay timer
  useEffect(() => {
    if (!isPaused) {
      autoplayTimerRef.current = setInterval(nextSlide, AUTOPLAY_TIME);
    }
    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [isPaused, nextSlide]);

  // Touch Swipe Handlers for mobile responsiveness
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  return (
    <section
      className="relative w-full h-[85vh] min-h-[600px] overflow-hidden bg-black select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Styles for keyframes progress animation */}
      <style>{`
        @keyframes slideProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-slide-progress {
          animation: slideProgress ${AUTOPLAY_TIME}ms linear forwards;
        }
        .animate-slide-progress-paused {
          animation-play-state: paused;
        }
      `}</style>

      {/* Slides Wrapper */}
      <div className="relative w-full h-full">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === currentIndex;

          // Compute alignment classes
          let alignContainerClass = 'items-start text-left max-w-xl';
          if (slide.align === 'center') {
            alignContainerClass = 'items-center text-center max-w-2xl mx-auto';
          } else if (slide.align === 'right') {
            alignContainerClass = 'items-end text-right max-w-xl ml-auto';
          }

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full flex items-center transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
            >
              {/* Background Image with Ken Burns Zoom Effect */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className={`w-full h-full object-cover object-center transition-transform duration-[8000ms] ease-out ${isActive ? 'scale-105' : 'scale-100'
                    }`}
                />
                {/* Gradient Overlays based on text alignment to improve readability */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20`} />
                {slide.align === 'left' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden md:block" />
                )}
                {slide.align === 'left' && (
                  <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-transparent to-transparent hidden md:block" />
                )}
              </div>

              {/* Slide Content */}
              <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
                <div className={`flex flex-col transition-all duration-1000 ${alignContainerClass}`}>
                  {/* Subtitle */}
                  <span
                    className={`text-sm md:text-base font-semibold tracking-widest text-yellow-400 uppercase mb-3 transition-all duration-700 delay-100 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                      }`}
                  >
                    {slide.title}
                  </span>

                  {/* Title */}
                  <h1
                    className={`text-4xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 tracking-tight leading-tight transition-all duration-700 delay-300 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                      }`}
                  >
                    {slide.title}
                  </h1>

                  {/* Description */}
                  <p
                    className={`text-base sm:text-lg md:text-xl text-gray-200 mb-6 sm:mb-8 leading-relaxed max-w-lg transition-all duration-700 delay-500 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                      }`}
                  >
                    {slide.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows - Glassmorphic styling */}
      <button
        onClick={prevSlide}
        aria-label="Previous Slide"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 active:scale-95 transition-all duration-200 opacity-0 md:opacity-100 group-hover:opacity-100 cursor-pointer"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
      <button
        onClick={nextSlide}
        aria-label="Next Slide"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 active:scale-95 transition-all duration-200 opacity-0 md:opacity-100 group-hover:opacity-100 cursor-pointer"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/* Indicators and Autoplay Progress Controls */}
      <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center items-center gap-3">
        {HERO_SLIDES.map((_, index) => {
          const isActive = index === currentIndex;
          return (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
              className="group/indicator relative p-2 focus:outline-none cursor-pointer"
            >
              {isActive ? (
                // Active pill with custom CSS transition progress bar inside
                <div className="w-12 h-1.5 rounded-full bg-white/30 overflow-hidden relative">
                  <div
                    key={currentIndex} // Reset animation on active slide change
                    className={`absolute top-0 left-0 h-full bg-yellow-400 animate-slide-progress ${isPaused ? 'animate-slide-progress-paused' : ''
                      }`}
                  />
                </div>
              ) : (
                // Inactive dot
                <div className="w-3 h-1.5 rounded-full bg-white/40 transition-all duration-300 group-hover/indicator:bg-white/70 group-hover/indicator:scale-110" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default HeroSlideshow;
