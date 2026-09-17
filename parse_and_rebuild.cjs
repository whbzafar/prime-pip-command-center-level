const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// 1. Find the slim top bar block
const slimTopBarStart = code.indexOf('{/* Persistent Slim Top Bar: Active Category, Notification Bell & Manual Chevron Toggle */}');
const slimTopBarEnd = code.indexOf('{/* Horizontally Scrollable Full Navigation Bar (Desktop, Laptop, Tablet & Mobile) */}');
let slimTopBarStr = code.substring(slimTopBarStart, slimTopBarEnd);
code = code.replace(slimTopBarStr, ''); // Remove it from its original place

// Modify the slim top bar to be relative/flex-child instead of fixed
slimTopBarStr = slimTopBarStr.replace('fixed top-0 left-0 right-0 h-14', 'w-full h-14 shrink-0 relative');

// 2. We need to modify `<header>` to be flex col
const headerStartRegex = /<header className="[^"]*">/;
code = code.replace(headerStartRegex, '<header className="sticky top-0 z-[100] border-b border-slate-800/80 bg-[#0B0F19]/95 backdrop-blur flex flex-col transition-all duration-300 ease-in-out">');

// 3. We insert the slim top bar right inside the <header>
code = code.replace('<header className="sticky top-0 z-[100] border-b border-slate-800/80 bg-[#0B0F19]/95 backdrop-blur flex flex-col transition-all duration-300 ease-in-out">', 
'<header className="sticky top-0 z-[100] border-b border-slate-800/80 bg-[#0B0F19]/95 backdrop-blur flex flex-col transition-all duration-300 ease-in-out">\n      ' + slimTopBarStr);

// 4. We remove the `style={{ paddingTop: !isHeaderCollapsed ? '3.5rem' : '0' }}` from header-collapsible
code = code.replace(/style={{ paddingTop: !isHeaderCollapsed \? '3\.5rem' : '0' }}/, '');

// 5. Currently, `header-collapsible` closes BEFORE the slim top bar (which we removed)
// So there are 3 `</div>` tags closing the inner flex row, the container, and `header-collapsible`.
// Since we removed the slim top bar, the `</div>`s look like:
//         </div>
//       </div>
//     </div>
//       {/* Horizontally Scrollable Full Navigation Bar (Desktop, Laptop, Tablet & Mobile) */}
// We want `header-collapsible` to wrap the Horizontally Scrollable Full Navigation Bar as well.
// So we should remove the 3rd `</div>` and place it at the very end before `</header>`.
const closingDivs = `        </div>\n      </div>\n    </div>\n      {/* Horizontally Scrollable Full Navigation Bar`;
const newClosingDivs = `        </div>\n      </div>\n      {/* Horizontally Scrollable Full Navigation Bar`;
code = code.replace(closingDivs, newClosingDivs);

code = code.replace(/    <\/header>/, '      </div>\n    </header>'); // Add the missing closing div for header-collapsible

fs.writeFileSync('src/components/Header.tsx.final', code, 'utf8');
