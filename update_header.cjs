const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// 1. Update the state comment and add the useEffect scroll listener
const oldStateCode = `  // Header collapse is manual only. Page scrolling must never change this state.
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(false);`;

const newStateCode = `  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(false);

  // Dynamic header collapse on scroll
  useEffect(() => {
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

code = code.replace(oldStateCode, newStateCode);

// 2. Make the header sticky
code = code.replace(
  '<header className="border-b border-slate-800/80 bg-[#0B0F19]/95 backdrop-blur">',
  '<header className="sticky top-0 z-[100] border-b border-slate-800/80 bg-[#0B0F19]/95 backdrop-blur transition-all duration-300 ease-in-out">'
);

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
