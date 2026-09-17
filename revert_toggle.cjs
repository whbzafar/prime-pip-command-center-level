const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

const toggleBtnHtml = `
          {/* Manual Chevron Toggle Button (Inverts upward/downward arrow) */}
          <button
            type="button"
            id="header-collapse-chevron-toggle-btn"
            onClick={toggleHeader}
            title={!isHeaderCollapsed ? 'Collapse upper header section' : 'Expand upper header section'}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-400 transition cursor-pointer"
            aria-expanded={!isHeaderCollapsed}
            aria-label={!isHeaderCollapsed ? 'Collapse header' : 'Expand header'}
          >
            {!isHeaderCollapsed ? (
              <>
                <ChevronUp className="w-4 h-4 text-amber-400 transition-transform duration-200" />
                <span className="text-[10px] font-mono-code text-slate-400 hidden sm:inline">COLLAPSE</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 text-amber-400 transition-transform duration-200" />
                <span className="text-[10px] font-mono-code text-amber-400 hidden sm:inline">EXPAND</span>
              </>
            )}
          </button>
`;

code = code.replace(
  '          </button>\n                  </div>',
  '          </button>\n' + toggleBtnHtml + '        </div>'
);

const toggleFunc = `
  const toggleHeader = () => {
    setIsHeaderCollapsed((prev) => !prev);
  };
`;

code = code.replace(
  '  useEffect(() => {\n    let lastScrollY = window.scrollY;',
  toggleFunc + '\n  useEffect(() => {\n    let lastScrollY = window.scrollY;'
);

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
