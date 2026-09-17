const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// The 3 closing divs:
//         </div>
//       </div>
//     </div>
//       {/* Horizontally Scrollable Full Navigation Bar (Desktop, Laptop, Tablet & Mobile) */}
const targetDivs = "        </div>\n      </div>\n    </div>\n      {/* Horizontally Scrollable Full Navigation Bar";
const replacementDivs = "        </div>\n      </div>\n      {/* Horizontally Scrollable Full Navigation Bar";

code = code.replace(targetDivs, replacementDivs);

// At the end, we have:
//         </button>
//       </div>
//       </div>
//       {/* Global Time & Market Session Modal */}
const targetEnd = "        </button>\n      </div>\n      </div>\n      {/* Global Time & Market Session Modal */}";
const replacementEnd = "        </button>\n      </div>\n      </div>\n      {/* Global Time & Market Session Modal */}";
// wait, if I have 2 divs here, and I just removed 1 div from the middle, I need an extra div here!
// Let's count them exactly.
