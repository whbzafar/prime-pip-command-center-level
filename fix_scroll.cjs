const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

const oldScrollEffect = `  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Collapse when scrolling down past a small threshold
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsHeaderCollapsed(true);
      } 
      // Expand when scrolling up
      else if (currentScrollY < lastScrollY) {
        setIsHeaderCollapsed(false);
      }
      
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);`;

const newScrollEffect = `  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Only collapse when scrolled past the top threshold
      if (currentScrollY > 50) {
        setIsHeaderCollapsed(true);
      } 
      // Only expand when at the very top to prevent layout jumping/blinking
      else {
        setIsHeaderCollapsed(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);`;

code = code.replace(oldScrollEffect, newScrollEffect);

// Also remove `const toggleHeader` since it's unused (I might have added it back earlier when reverting)
const toggleRegex = /const toggleHeader = \(\) => \{\s*setIsHeaderCollapsed\(\(prev\) => !prev\);\s*\};\s*/;
code = code.replace(toggleRegex, '');

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
