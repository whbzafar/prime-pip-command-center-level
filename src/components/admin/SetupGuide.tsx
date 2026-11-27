import { ExternalLink } from 'lucide-react';
import type { PubConfig } from '../../utils/publishClient';

/* Plain-language setup guide for posting to YouTube, Facebook, Instagram and TikTok.
   Written from the platforms' own developer documentation (checked 27 Nov 2026). Everything is free. */

interface Step { t: string; d?: string; link?: [string, string] }
interface Guide { id: string; name: string; status: 'ready' | 'partial' | 'manual'; chip: string; need: string[]; steps: Step[]; find: [string, string][]; limit: string }

const A = (url: string, label: string): [string, string] => [url, label];

export function guides(cfg: PubConfig): Guide[] {
  const metaOk = !!(cfg.metaPageId && cfg.metaPageToken);
  return [
    {
      id: 'facebook', name: 'Facebook Page', status: metaOk ? 'ready' : 'partial', chip: metaOk ? 'Connected' : 'Needs Page ID + token',
      need: ['A Facebook Page (not a personal profile) that you manage.', 'A free Meta developer account (developers.facebook.com, log in with the same Facebook).'],
      steps: [
        { t: 'Create a free Meta app', d: 'My Apps → Create App → choose “Business” (or “Other” → Business). Name it anything, for example “PrimePipFX Poster”. You become its admin automatically.', link: A('https://developers.facebook.com/apps/', 'Open Meta for Developers') },
        { t: 'Open the Graph API Explorer', d: 'Choose your app on the right. Under “User or Page” pick “User Token”.', link: A('https://developers.facebook.com/tools/explorer/', 'Open Graph API Explorer') },
        { t: 'Tick the permissions', d: 'pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish. Press “Generate Access Token” and approve your Page (and Instagram) in the pop-up.' },
        { t: 'Make the token last', d: 'Press the blue “i” next to the token → “Open in Access Token Tool” → “Extend Access Token”. Copy the new long-lived token and paste it back into the Explorer’s token box.', link: A('https://developers.facebook.com/tools/debug/accesstoken/', 'Open Access Token Tool') },
        { t: 'Read your Page ID and Page token', d: 'In the Explorer type me/accounts and press Submit. Find your Page: “id” is the Page ID, “access_token” is the Page access token. A Page token made from a long-lived token does not expire.' },
        { t: 'Paste both here', d: 'Put the Page ID and Page access token in the boxes above, then press “Check Facebook / Instagram connection”. A green line with your Page name means it works.' },
      ],
      find: [['Page ID', 'Open your Page → About → scroll to “Page transparency”, or use me/accounts above.'], ['Page access token', 'Graph API Explorer → me/accounts → “access_token” next to your Page.']],
      limit: 'Facebook allows about 30 API-published Reels in 24 hours. While your app is in Development mode it works for accounts you manage, with no Meta app review.',
    },
    {
      id: 'instagram', name: 'Instagram Reels', status: cfg.igUserId ? 'ready' : metaOk ? 'partial' : 'partial', chip: cfg.igUserId ? 'Linked' : 'Link to your Page first',
      need: ['A Professional Instagram account (Creator or Business — both are free).', 'That account linked to your Facebook Page.', 'The Facebook steps above finished (the same Page token posts to Instagram).'],
      steps: [
        { t: 'Switch to a Professional account', d: 'Instagram app → Profile → ☰ → Settings and privacy → Account type and tools → Switch to professional account → Creator (or Business).' },
        { t: 'Link it to your Facebook Page', d: 'Instagram app → Edit profile → Links → Page → choose your Page. Or on Facebook: Page → Settings → Linked accounts → Instagram → Connect.' },
        { t: 'Finish the Facebook steps', d: 'The token you made for Facebook already has the Instagram permissions. Press “Check Facebook / Instagram connection”: it should say “Instagram linked ✅”.' },
        { t: 'Post', d: 'Videos are published as Reels. The video must be an MP4; Instagram can take a few minutes to process it.' },
      ],
      find: [['Instagram account ID', 'Found automatically by the connection check. You do not type it.']],
      limit: 'Instagram allows 50 API posts per 24 hours. If your Page asks for “Page Publishing Authorization”, complete that on Facebook once, otherwise publishing is blocked.',
    },
    {
      id: 'youtube', name: 'YouTube Shorts', status: cfg.ytClientId ? 'partial' : 'partial', chip: cfg.ytClientId ? 'Client ID added · uploads private until audit' : 'Needs Google client ID',
      need: ['A YouTube channel on your Google account.', 'A free Google Cloud project (no card needed for this API).'],
      steps: [
        { t: 'Create a Google Cloud project', d: 'Open the console → project menu → New project → name it → Create.', link: A('https://console.cloud.google.com/projectcreate', 'Open Google Cloud') },
        { t: 'Turn on the YouTube Data API', d: 'APIs & Services → Library → search “YouTube Data API v3” → Enable.', link: A('https://console.cloud.google.com/apis/library/youtube.googleapis.com', 'Open the API page') },
        { t: 'Set up the consent screen', d: 'APIs & Services → OAuth consent screen → External → app name and your email → Save. Under “Test users” add the Gmail you use for YouTube.', link: A('https://console.cloud.google.com/apis/credentials/consent', 'Open consent screen') },
        { t: 'Create the client ID', d: 'Credentials → Create credentials → OAuth client ID → Web application. Under “Authorized JavaScript origins” add https://primepipfx.site and press Create. Copy the Client ID (it ends with .apps.googleusercontent.com).', link: A('https://console.cloud.google.com/apis/credentials', 'Open Credentials') },
        { t: 'Paste it here', d: 'Put the Client ID in the YouTube box above. The first upload opens a Google sign-in pop-up; approve it once.' },
        { t: 'Make uploads public (one time)', d: 'Google keeps videos uploaded by a new, unaudited app private and they cannot be appealed. To lift this, submit Google’s free “YouTube API Services Audit and Quota Extension Form” for your project. Until it is approved, use the manual route below: download the video, copy the title and description from this page, upload in YouTube Studio.', link: A('https://support.google.com/youtube/contact/yt_api_form', 'Open the audit form') },
      ],
      find: [['Client ID', 'Google Cloud → APIs & Services → Credentials → your Web client → “Client ID”.'], ['Manual upload', 'studio.youtube.com → Create → Upload videos → paste the copied title and description.']],
      limit: 'New projects get 10,000 quota units a day and one upload costs about 1,600, so roughly 6 uploads a day. Uploads stay private until Google approves your project.',
    },
    {
      id: 'tiktok', name: 'TikTok', status: 'manual', chip: 'Connect once, then automatic',
      need: ['A TikTok account.', 'Optional: a free TikTok developer account if you want to apply for automatic posting.'],
      steps: [
        { t: 'Record, then download', d: 'Press “Download video” in this panel. The cover image and the TikTok title with hashtags are ready on this page: press Copy.' },
        { t: 'Upload', d: 'On a computer open tiktok.com/upload, or use the phone app → + → Upload. Choose the video, paste the copied text, and choose the cover.', link: A('https://www.tiktok.com/upload', 'Open TikTok upload') },
        { t: 'Connect for automatic posting', d: 'Paste the client key and secret in Channels → TikTok and press Connect TikTok. Create the app first: developers.tiktok.com → Manage apps → Connect an app → add “Content Posting API” → submit for review. TikTok keeps posts from unaudited apps private (visible only to you) until the app passes its audit, which can take days to two weeks.', link: A('https://developers.tiktok.com/', 'Open TikTok for Developers') },
      ],
      find: [['Why manual?', 'TikTok only allows public automatic posts from apps that passed its audit. Until then, every API post would be private.']],
      limit: 'Once an audit passes, this app can post to TikTok too. Posts made while unaudited stay private.',
    },
  ];
}

const CHIP: Record<Guide['status'], string> = { ready: 'bg-emerald-500/20 text-emerald-200', partial: 'bg-amber-500/20 text-amber-200', manual: 'bg-sky-500/20 text-sky-200' };

export function SetupGuide({ cfg }: { cfg: PubConfig }) {
  const gs = guides(cfg);
  return (
    <details className="rounded-xl border border-sky-500/30 bg-slate-950/70 p-3" data-testid="setup-guide">
      <summary className="cursor-pointer text-sm font-semibold text-sky-200">🧭 Posting setup guide: what you need and where to find it (all free)</summary>
      <div className="mt-2 text-[11px] text-slate-400">Do each platform once. After that, you only press Record. Your keys stay in this browser and are never sent to anyone except the platform you post to.</div>
      <div className="mt-3 grid gap-2">
        {gs.map((g) => (
          <details key={g.id} className="rounded-lg bg-slate-900/60 p-2" data-testid={`guide-${g.id}`}>
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-xs font-bold text-slate-100">{g.name}<span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CHIP[g.status]}`}>{g.chip}</span></summary>
            <div className="mt-2 grid gap-2 text-[11px] text-slate-300">
              <div><div className="font-semibold text-slate-200">What you need</div><ul className="ml-4 list-disc">{g.need.map((n) => <li key={n}>{n}</li>)}</ul></div>
              <div><div className="font-semibold text-slate-200">Steps</div>
                <ol className="ml-4 list-decimal space-y-1.5">{g.steps.map((s) => (
                  <li key={s.t}><b className="text-slate-100">{s.t}.</b> {s.d}{s.link && <> <a href={s.link[0]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-sky-300 underline">{s.link[1]}<ExternalLink className="h-3 w-3" /></a></>}</li>))}
                </ol></div>
              <div><div className="font-semibold text-slate-200">Where to find it</div><ul className="ml-4 list-disc">{g.find.map(([k, v]) => <li key={k}><b>{k}:</b> {v}</li>)}</ul></div>
              <div className="rounded bg-black/30 p-1.5 text-amber-100">⚠ {g.limit}</div>
            </div>
          </details>))}
      </div>
    </details>
  );
}
