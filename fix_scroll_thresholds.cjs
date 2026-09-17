const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

const oldScrollLogic = `useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 50) {
        setIsHeaderCollapsed(true);
      } else {
        setIsHeaderCollapsed(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);`;

const newScrollLogic = `useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Use hysteresis (different thresholds) to prevent layout thrashing and blinking!
      // The collapsible header is around 250px tall. 
      // If we collapse it at 50px, scrollY drops below 0 and it instantly expands again (blinking).
      // By waiting until scrollY > 400 to collapse, and expanding only when scrollY < 50, we eliminate the loop.
      if (currentScrollY > 400 && !isHeaderCollapsed) {
        setIsHeaderCollapsed(true);
      } else if (currentScrollY < 50 && isHeaderCollapsed) {
        setIsHeaderCollapsed(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHeaderCollapsed]);`;

code = code.replace(oldScrollLogic, newScrollLogic);
fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
