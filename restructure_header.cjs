const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// 1. Change the `<header>` element
code = code.replace(
  '<header className="sticky top-0 z-[100] border-b border-slate-800/80 bg-[#0B0F19]/95 backdrop-blur transition-all duration-300 ease-in-out">',
  '<header className="sticky top-0 z-[100] border-b border-slate-800/80 bg-[#0B0F19]/95 backdrop-blur flex flex-col">'
);

// 2. Extract the Persistent Slim Top Bar
const slimTopBarRegex = /{\/\* Persistent Slim Top Bar[\s\S]*?(?={\/\* Horizontally Scrollable Full Navigation Bar)/;
const matchSlim = code.match(slimTopBarRegex);

if (matchSlim) {
  let slimTopBar = matchSlim[0];
  
  // Change its classes from `fixed top-0 left-0 right-0` to `w-full relative`
  slimTopBar = slimTopBar.replace('fixed top-0 left-0 right-0 h-14', 'w-full h-14 shrink-0');
  
  // Remove it from its current position
  code = code.replace(slimTopBar, '');
  
  // Insert it at the top, right inside `<header ...>`
  code = code.replace(
    '<header className="sticky top-0 z-[100] border-b border-slate-800/80 bg-[#0B0F19]/95 backdrop-blur flex flex-col">',
    '<header className="sticky top-0 z-[100] border-b border-slate-800/80 bg-[#0B0F19]/95 backdrop-blur flex flex-col">\n      ' + slimTopBar
  );
} else {
  console.log("Could not find Persistent Slim Top Bar");
}

// 3. Update the collapsible div inline style
// We don't need paddingTop anymore
const collapsibleDivRegex = /style={{ paddingTop: !isHeaderCollapsed \? '3\.5rem' : '0' }}/;
code = code.replace(collapsibleDivRegex, '');

// 4. Move the closing tag of `header-collapsible` below the `Horizontally Scrollable Full Navigation Bar`
// The `header-collapsible` closing tag is currently located just before the slim top bar (which we removed).
// Wait, currently `header-collapsible` ends with:
//         </div>
//       </div>
//     </div>
// Then there was the slim top bar. Now there is the `Horizontally Scrollable Full Navigation Bar`.
// The end of `Horizontally Scrollable Full Navigation Bar` is just before `</header>`.
// So we can remove the 3 closing `</div>` tags from where they were, and place ONE closing `</div>` just before `</header>`, but wait!
// The 3 closing `</div>` tags were closing:
// <div className="flex items-center gap-2.5">
// <div className="px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
// <div className="header-collapsible ...">
// So we just need to move the LAST `</div>` to be after the `Horizontally Scrollable Full Navigation Bar`.

fs.writeFileSync('src/components/Header.tsx.temp', code, 'utf8');
