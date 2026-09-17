const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

const replacement = `            >
              {displayScore}
            </span>
          </div>

          {currentUser && onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="flex items-center gap-1 p-1 rounded text-slate-400 hover:text-amber-400 transition cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
          )}

          {onOpenBackupModal && (
            <button
              id="header-backup-data-btn"
              onClick={onOpenBackupModal}
              title="Backup & Restore Journal Data"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 text-[11px] font-mono-code transition cursor-pointer"`;

code = code.replace(`            >
              {displayScore}
            </span>
            <button
              id="header-backup-data-btn"
              onClick={onOpenBackupModal}
              title="Backup & Restore Journal Data"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 text-[11px] font-mono-code transition cursor-pointer"`, replacement);

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
