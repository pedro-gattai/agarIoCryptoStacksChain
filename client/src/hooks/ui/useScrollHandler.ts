import { useState, useEffect, useCallback } from 'react';

interface ScrollSection {
  id: string;
  offset?: number; // Additional offset for detection
}

export const useScrollHandler = (sections: string[] | ScrollSection[], offsetThreshold = 100) => {
  const [activeSection, setActiveSection] = useState(sections[0] || '');

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + offsetThreshold;
      
      const sectionIds = typeof sections[0] === 'string' 
        ? sections as string[]
        : (sections as ScrollSection[]).map(s => s.id);

      for (const sectionId of sectionIds) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          const sectionOffset = typeof sections[0] === 'object' 
            ? (sections as ScrollSection[]).find(s => s.id === sectionId)?.offset || 0
            : 0;
          
          const adjustedOffsetTop = offsetTop + sectionOffset;
          
          if (scrollPosition >= adjustedOffsetTop && 
              scrollPosition < adjustedOffsetTop + offsetHeight) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections, offsetThreshold]);

  const isActive = useCallback((sectionId: string) => {
    return activeSection === sectionId;
  }, [activeSection]);

  return {
    activeSection,
    scrollToSection,
    isActive
  };
};