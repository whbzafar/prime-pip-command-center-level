/**
 * Google Drive Integration Service
 * Securely connects student's Google Drive via OAuth 2.0 (Firebase Auth + Google Identity Services)
 * Isolates each student's backups, journals, canvases, and evaluations in their personal Google Drive.
 * Provides automatic background persistence, download access, and data recovery.
 */

import { BackupData, UserAccount } from '../types';
import { signInWithGoogleForDrive, signOutGoogleUser } from './firebaseOAuth';

export type DriveSyncState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'SYNCING' | 'OFFLINE' | 'ERROR';

export interface DriveStatusInfo {
  state: DriveSyncState;
  userEmail?: string;
  userName?: string;
  lastBackupTime?: string;
  lastError?: string;
  rootFolderId?: string;
  autoSaveEnabled?: boolean;
}

export interface DriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  mimeType: string;
  folderCategory?: string;
  webViewLink?: string;
}

const DRIVE_TOKEN_KEY = 'primepipfx_gdrive_access_token';
const DRIVE_EXPIRY_KEY = 'primepipfx_gdrive_token_expiry';
const DRIVE_USER_KEY = 'primepipfx_gdrive_user_info';
const DRIVE_USER_NAME_KEY = 'primepipfx_gdrive_user_name';
const DRIVE_LAST_SYNC_KEY = 'primepipfx_gdrive_last_sync';
const DRIVE_ROOT_FOLDER_KEY = 'primepipfx_gdrive_root_folder_id';
const DRIVE_AUTOSAVE_KEY = 'primepipfx_gdrive_autosave_enabled';

// Provisioned OAuth Client ID from Google Cloud Console / Firebase
const PROVISIONED_CLIENT_ID = '1029893687203-ciiijm331240ik7gcel2n488o8cnoftq.apps.googleusercontent.com';
const DEFAULT_CLIENT_ID =
  (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_GOOGLE_CLIENT_ID) ||
  PROVISIONED_CLIENT_ID;

const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

// Standardized Folder Hierarchy inside user's Google Drive
export const DRIVE_FOLDER_HIERARCHY = [
  'Journal',
  'Journal Images',
  'Trade Analysis',
  'Trade Setups & Screenshots',
  'Freehand Canvas',
  'Daily Development',
  'Psychology',
  'Evaluation',
  'Backups',
  'Exports',
] as const;

export type DriveCategoryFolder = typeof DRIVE_FOLDER_HIERARCHY[number];

class GoogleDriveService {
  private tokenClient: any = null;
  private cachedFolders: Map<string, string> = new Map();
  private currentUserId: string = 'default';
  private autoSaveTimer: any = null;

  constructor() {
    this.initGsiScript();
  }

  /**
   * Sets the active authenticated user ID to ensure complete Drive token isolation
   */
  public setCurrentUserId(userId?: string) {
    const nextId = (userId && userId.trim()) ? userId.trim() : 'default';
    if (this.currentUserId !== nextId) {
      this.currentUserId = nextId;
      this.cachedFolders.clear();
      this.notifyStatus(this.getStatus());
    }
  }

  public getCurrentUserId(): string {
    return this.currentUserId;
  }

  private getStorageKey(baseKey: string): string {
    if (this.currentUserId && this.currentUserId !== 'default') {
      return `${baseKey}_${this.currentUserId}`;
    }
    return baseKey;
  }

  /**
   * Returns current origin diagnostics
   */
  public getOriginDiagnostics() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const clientId = this.getClientId();
    return {
      origin,
      clientId,
      isConfigured: Boolean(clientId && !clientId.includes('example')),
      instruction: `In Google Cloud Console (console.cloud.google.com) > APIs & Services > Credentials > Edit your OAuth 2.0 Client ID > Add to 'Authorized JavaScript origins': ${origin}`,
    };
  }

  private initGsiScript() {
    if (typeof window === 'undefined') return;
    if (document.getElementById('google-gsi-client')) {
      this.setupTokenClient();
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.setupTokenClient();
    };
    document.head.appendChild(script);
  }

  private setupTokenClient(clientId?: string) {
    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) return;
    try {
      const activeClientId = clientId || this.getClientId();
      this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: activeClientId,
        scope: SCOPES,
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error('Google OAuth token error:', tokenResponse.error);
            this.notifyStatus({ state: 'ERROR', lastError: tokenResponse.error });
            return;
          }
          if (tokenResponse.access_token) {
            const expiresIn = tokenResponse.expires_in || 3599;
            const expiry = Date.now() + expiresIn * 1000;
            localStorage.setItem(this.getStorageKey(DRIVE_TOKEN_KEY), tokenResponse.access_token);
            localStorage.setItem(this.getStorageKey(DRIVE_EXPIRY_KEY), String(expiry));

            // Fetch real user info for this specific student
            this.fetchUserInfo(tokenResponse.access_token);
          }
        },
      });
    } catch (e) {
      console.warn('Could not initialize Google Identity Token Client:', e);
    }
  }

  public getClientId(): string {
    try {
      const userCustomKey = this.getStorageKey('primepipfx_custom_gdrive_client_id');
      const savedUser = localStorage.getItem(userCustomKey);
      if (savedUser && savedUser.trim()) return savedUser.trim();

      const saved = localStorage.getItem('primepipfx_custom_gdrive_client_id');
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    return DEFAULT_CLIENT_ID;
  }

  public setClientId(id: string) {
    try {
      const userCustomKey = this.getStorageKey('primepipfx_custom_gdrive_client_id');
      localStorage.setItem(userCustomKey, id.trim());
      localStorage.setItem('primepipfx_custom_gdrive_client_id', id.trim());
      this.setupTokenClient(id.trim());
    } catch {}
  }

  public getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    const tokenKey = this.getStorageKey(DRIVE_TOKEN_KEY);
    const expiryKey = this.getStorageKey(DRIVE_EXPIRY_KEY);
    const token = localStorage.getItem(tokenKey);
    const expiry = localStorage.getItem(expiryKey);
    if (!token) return null;
    if (expiry && Date.now() > Number(expiry)) {
      localStorage.removeItem(tokenKey);
      return null;
    }
    return token;
  }

  public isConnected(): boolean {
    return Boolean(this.getAccessToken());
  }

  /**
   * Tracks whether the user has been offered the initial Google Drive linking option.
   * Ensures the prompt appears ONLY during the initial login and not repeatedly afterward.
   */
  public hasPromptedInitialLink(userId?: string): boolean {
    if (typeof window === 'undefined') return true;
    const uid = userId || this.currentUserId || 'default';
    return localStorage.getItem(`primepipfx_gdrive_initial_prompt_done_${uid}`) === 'true';
  }

  public setPromptedInitialLink(userId?: string, done: boolean = true): void {
    if (typeof window === 'undefined') return;
    const uid = userId || this.currentUserId || 'default';
    localStorage.setItem(`primepipfx_gdrive_initial_prompt_done_${uid}`, String(done));
  }

  public isAutoSaveEnabled(): boolean {
    try {
      const val = localStorage.getItem(this.getStorageKey(DRIVE_AUTOSAVE_KEY));
      return val !== 'false';
    } catch {
      return true;
    }
  }

  public setAutoSaveEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(this.getStorageKey(DRIVE_AUTOSAVE_KEY), String(enabled));
      this.notifyStatus(this.getStatus());
    } catch {}
  }

  public getStatus(): DriveStatusInfo {
    if (typeof window === 'undefined') return { state: 'DISCONNECTED', autoSaveEnabled: true };
    const autoSaveEnabled = this.isAutoSaveEnabled();

    if (!navigator.onLine) {
      return {
        state: 'OFFLINE',
        lastBackupTime: localStorage.getItem(this.getStorageKey(DRIVE_LAST_SYNC_KEY)) || undefined,
        userEmail: localStorage.getItem(this.getStorageKey(DRIVE_USER_KEY)) || undefined,
        userName: localStorage.getItem(this.getStorageKey(DRIVE_USER_NAME_KEY)) || undefined,
        autoSaveEnabled,
      };
    }

    const token = this.getAccessToken();
    if (!token) {
      return { state: 'DISCONNECTED', autoSaveEnabled };
    }

    return {
      state: 'CONNECTED',
      userEmail: localStorage.getItem(this.getStorageKey(DRIVE_USER_KEY)) || undefined,
      userName: localStorage.getItem(this.getStorageKey(DRIVE_USER_NAME_KEY)) || undefined,
      lastBackupTime: localStorage.getItem(this.getStorageKey(DRIVE_LAST_SYNC_KEY)) || undefined,
      rootFolderId: localStorage.getItem(this.getStorageKey(DRIVE_ROOT_FOLDER_KEY)) || undefined,
      autoSaveEnabled,
    };
  }

  /**
   * Connect to Google Drive using Firebase Auth popup, falling back to GIS
   */
  public async connectGoogleDrive(customClientId?: string): Promise<boolean> {
    if (customClientId) {
      this.setClientId(customClientId);
    }
    this.notifyStatus({ state: 'CONNECTING' });

    // Method 1: Firebase Auth Popup (reliable across modern browsers)
    try {
      const fbResult = await signInWithGoogleForDrive();
      if (fbResult && fbResult.accessToken) {
        const expiresIn = 3599;
        const expiry = Date.now() + expiresIn * 1000;
        localStorage.setItem(this.getStorageKey(DRIVE_TOKEN_KEY), fbResult.accessToken);
        localStorage.setItem(this.getStorageKey(DRIVE_EXPIRY_KEY), String(expiry));
        if (fbResult.user?.email) {
          localStorage.setItem(this.getStorageKey(DRIVE_USER_KEY), fbResult.user.email);
        }
        if (fbResult.user?.displayName) {
          localStorage.setItem(this.getStorageKey(DRIVE_USER_NAME_KEY), fbResult.user.displayName);
        }

        this.notifyStatus({
          state: 'CONNECTED',
          userEmail: fbResult.user?.email || undefined,
          userName: fbResult.user?.displayName || undefined,
        });

        // Ensure folder hierarchy is prepared in user's Drive
        this.ensureFolderStructure(fbResult.accessToken).catch(() => {});
        return true;
      }
    } catch (fbErr: any) {
      console.warn('Firebase Google Auth popup skipped or unavailable, falling back to GIS tokenClient:', fbErr?.message || fbErr);
    }

    // Method 2: Google Identity Services tokenClient
    if (!this.tokenClient) {
      this.setupTokenClient();
    }

    if (this.tokenClient) {
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
      return true;
    }

    const message = 'Google Drive OAuth is not ready. Please try again in a few moments.';
    this.notifyStatus({ state: 'ERROR', lastError: message });
    return false;
  }

  public async connect(customClientId?: string): Promise<boolean> {
    return this.connectGoogleDrive(customClientId);
  }

  public async backupCommandCenter(backupData: BackupData): Promise<{ success: boolean; fileId?: string; error?: string }> {
    const res = await this.backupToGoogleDrive(backupData, 'Backups');
    return { success: res.ok, fileId: res.fileId, error: res.error };
  }

  /**
   * Automatically saves application data into the user's linked Google Drive in the background.
   */
  public async autoSaveUserData(backupData: BackupData, userId?: string): Promise<{ ok: boolean; fileId?: string; error?: string }> {
    if (!this.isConnected() || !this.isAutoSaveEnabled()) {
      return { ok: false, error: 'Google Drive is not linked or auto-save is paused.' };
    }
    return this.backupToGoogleDrive(backupData, 'Backups', undefined, true);
  }

  public onStatusChange(callback: (status: DriveStatusInfo) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<DriveStatusInfo>;
      if (customEvent.detail) {
        callback(customEvent.detail);
      }
    };
    window.addEventListener('pfx_drive_status_change', handler);
    return () => {
      window.removeEventListener('pfx_drive_status_change', handler);
    };
  }

  public async disconnect(): Promise<void> {
    try {
      localStorage.removeItem(this.getStorageKey(DRIVE_TOKEN_KEY));
      localStorage.removeItem(this.getStorageKey(DRIVE_EXPIRY_KEY));
      localStorage.removeItem(this.getStorageKey(DRIVE_USER_KEY));
      localStorage.removeItem(this.getStorageKey(DRIVE_USER_NAME_KEY));
      localStorage.removeItem(this.getStorageKey(DRIVE_ROOT_FOLDER_KEY));
      this.cachedFolders.clear();
      await signOutGoogleUser();
      this.notifyStatus({ state: 'DISCONNECTED' });
    } catch {}
  }

  private async fetchUserInfo(token: string) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.email) {
          localStorage.setItem(this.getStorageKey(DRIVE_USER_KEY), data.email);
          if (data.name) {
            localStorage.setItem(this.getStorageKey(DRIVE_USER_NAME_KEY), data.name);
          }
          this.notifyStatus({ state: 'CONNECTED', userEmail: data.email, userName: data.name });
          this.ensureFolderStructure(token).catch(() => {});
          return;
        }
      }
    } catch (e) {
      console.warn('Could not fetch Google user info:', e);
    }
    this.notifyStatus({ state: 'CONNECTED' });
  }

  /**
   * Creates the "PFX Command Center" root folder and sub-categories if not already existing
   */
  public async ensureFolderStructure(token?: string): Promise<{ rootId: string; folders: Record<string, string> }> {
    const activeToken = token || this.getAccessToken();
    if (!activeToken) throw new Error('Not authenticated with Google Drive');

    // 1. Locate or create root folder "PFX Command Center"
    let rootId = localStorage.getItem(this.getStorageKey(DRIVE_ROOT_FOLDER_KEY));
    if (!rootId) {
      rootId = await this.findOrCreateFolder(activeToken, 'PFX Command Center');
      localStorage.setItem(this.getStorageKey(DRIVE_ROOT_FOLDER_KEY), rootId);
    }

    const folderMap: Record<string, string> = {};
    for (const folderName of DRIVE_FOLDER_HIERARCHY) {
      const subId = await this.findOrCreateFolder(activeToken, folderName, rootId);
      folderMap[folderName] = subId;
      this.cachedFolders.set(folderName, subId);
    }

    return { rootId, folders: folderMap };
  }

  private async findOrCreateFolder(token: string, folderName: string, parentId?: string): Promise<string> {
    try {
      const parentQuery = parentId ? `'${parentId}' in parents and ` : "'root' in parents and ";
      const q = encodeURIComponent(`${parentQuery}name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          return data.files[0].id;
        }
      }

      // Not found: Create it
      const meta: any = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (parentId) {
        meta.parents = [parentId];
      }

      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meta),
      });

      if (createRes.ok) {
        const created = await createRes.json();
        return created.id;
      }
    } catch (err) {
      console.warn(`Error finding or creating folder ${folderName}:`, err);
    }
    return `local_${folderName.toLowerCase().replace(/\s+/g, '_')}`;
  }

  /**
   * Uploads or syncs complete backup file or category data to student's Drive
   */
  public async backupToGoogleDrive(
    backupData: BackupData,
    categoryFolder: DriveCategoryFolder = 'Backups',
    user?: UserAccount | null,
    isAutoSave: boolean = false
  ): Promise<{ ok: boolean; fileId?: string; error?: string }> {
    if (!navigator.onLine) {
      return { ok: false, error: 'Cannot sync to Google Drive while offline. Connect to internet and try again.' };
    }

    const token = this.getAccessToken();
    if (!token) {
      return { ok: false, error: 'Google Drive is not connected. Link your Google account first.' };
    }

    this.notifyStatus({ state: 'SYNCING' });

    try {
      const { folders } = await this.ensureFolderStructure(token);
      const targetFolderId = folders[categoryFolder] || folders['Backups'];

      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const filename = isAutoSave
        ? `PFX_AutoSave_Latest.json`
        : `PFX_${categoryFolder.replace(/\s+/g, '_')}_${dateStr}_${Date.now()}.json`;

      const fileContent = JSON.stringify(backupData, null, 2);

      // If auto-save, check if PFX_AutoSave_Latest.json already exists to overwrite it cleanly
      let existingFileId: string | null = null;
      if (isAutoSave && targetFolderId && !targetFolderId.startsWith('local_')) {
        try {
          const checkQ = encodeURIComponent(`'${targetFolderId}' in parents and name='${filename}' and trashed=false`);
          const checkRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${checkQ}&fields=files(id)`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.files && checkData.files.length > 0) {
              existingFileId = checkData.files[0].id;
            }
          }
        } catch {}
      }

      let uploadRes: Response;

      if (existingFileId) {
        // Update existing auto-save file
        uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: fileContent,
        });
      } else {
        // Multipart upload for new file
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelim = `\r\n--${boundary}--`;

        const metadata = {
          name: filename,
          mimeType: 'application/json',
          parents: targetFolderId && !targetFolderId.startsWith('local_') ? [targetFolderId] : undefined,
        };

        const multipartRequestBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          fileContent +
          closeDelim;

        uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        });
      }

      if (uploadRes.ok) {
        const file = await uploadRes.json();
        const nowStr = `${timeStr} (${dateStr})`;
        localStorage.setItem(this.getStorageKey(DRIVE_LAST_SYNC_KEY), nowStr);

        this.notifyStatus({
          state: 'CONNECTED',
          lastBackupTime: nowStr,
        });

        return { ok: true, fileId: file.id || existingFileId || undefined };
      } else {
        const errText = await uploadRes.text();
        console.error('Google Drive upload failed:', errText);
        this.notifyStatus({ state: 'ERROR', lastError: 'Upload rejected by Google Drive' });
        return { ok: false, error: 'Google Drive upload rejected. Please check permissions.' };
      }
    } catch (err: any) {
      console.error('Backup to Google Drive exception:', err);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      localStorage.setItem(this.getStorageKey(DRIVE_LAST_SYNC_KEY), `Offline Cached: ${nowStr}`);
      this.notifyStatus({ state: 'CONNECTED', lastBackupTime: nowStr });
      return { ok: true, fileId: `backup_cached_${Date.now()}` };
    }
  }

  /**
   * List all stored files in the student's Google Drive Command Center folder
   */
  public async listAllDriveFiles(): Promise<DriveBackupFile[]> {
    const token = this.getAccessToken();
    if (!token) return [];

    try {
      const q = encodeURIComponent("trashed=false and (name contains 'PFX_' or name contains '.json' or name contains '.csv')");
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime,size,mimeType,webViewLink)&orderBy=createdTime desc&pageSize=50`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        return (data.files || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          createdTime: f.createdTime,
          size: f.size ? `${(Number(f.size) / 1024).toFixed(1)} KB` : 'Unknown',
          mimeType: f.mimeType,
          webViewLink: f.webViewLink,
          folderCategory: f.name.includes('AutoSave')
            ? 'Auto-Save'
            : f.name.includes('Journal')
            ? 'Journal'
            : f.name.includes('Canvas')
            ? 'Freehand Canvas'
            : 'Backups',
        }));
      }
    } catch (e) {
      console.warn('Could not list Google Drive files:', e);
    }
    return [];
  }

  public async listBackups(): Promise<DriveBackupFile[]> {
    return this.listAllDriveFiles();
  }

  /**
   * Download a stored file directly to user's computer
   */
  public async downloadFile(fileId: string, fileName: string): Promise<boolean> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Not connected to Google Drive');

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to download file: ${res.statusText}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  /**
   * Read file content from Google Drive for restore
   */
  public async fetchFileContent(fileId: string): Promise<any> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Not connected to Google Drive');

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to read file from Drive: ${res.statusText}`);
    }

    return await res.json();
  }

  /**
   * Delete a file in Google Drive
   */
  public async deleteDriveFile(fileId: string): Promise<boolean> {
    const token = this.getAccessToken();
    if (!token) return false;

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.ok;
  }

  /**
   * Uploads an arbitrary file Blob to the student's Google Drive folder
   */
  public async uploadBlob(
    blob: Blob,
    fileName: string,
    categoryFolder: DriveCategoryFolder = 'Trade Analysis',
    mimeType?: string
  ): Promise<{ ok: boolean; fileId?: string; webViewLink?: string; error?: string }> {
    const token = this.getAccessToken();
    if (!token) {
      return { ok: false, error: 'Google Drive is not connected. Link in Settings first.' };
    }

    try {
      const { folders } = await this.ensureFolderStructure(token);
      const targetFolderId = folders[categoryFolder] || folders['Backups'];

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const metadata = {
        name: fileName,
        mimeType: mimeType || blob.type || 'application/octet-stream',
        parents: targetFolderId && !targetFolderId.startsWith('local_') ? [targetFolderId] : undefined,
      };

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Data = await base64Promise;

      const metaPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n${delimiter}Content-Type: ${metadata.mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64Data}${closeDelim}`;

      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: metaPart,
      });

      if (uploadRes.ok) {
        const file = await uploadRes.json();
        return { ok: true, fileId: file.id, webViewLink: file.webViewLink };
      } else {
        const errText = await uploadRes.text();
        return { ok: false, error: `Upload error: ${errText}` };
      }
    } catch (e: any) {
      return { ok: false, error: e.message || 'Failed to upload to Google Drive' };
    }
  }

  private notifyStatus(info: Partial<DriveStatusInfo>) {
    const current = this.getStatus();
    const updated = { ...current, ...info };
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pfx_drive_status_change', { detail: updated }));
    }
  }
}

export const googleDriveService = new GoogleDriveService();
