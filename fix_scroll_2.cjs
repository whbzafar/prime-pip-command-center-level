const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

const regex = /useEffect\(\(\) => \{\s*let lastScrollY = window\.scrollY;[\s\S]*?\}, \[\]\);/;

const newScrollEffect = `useEffect(() => {
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

code = code.replace(regex, newScrollEffect);
fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
