import type { V } from './shared';
/** Pinterest videos curated for the Motivation Hub (credit & link back to Pinterest on every card). srcs are tried in order (H.264 first). */
const px = (p: string) => `https://v1.pinimg.com/videos/${p}`;
const im = (p: string) => `https://i.pinimg.com/736x/${p}.jpg`;
const pin = (id: string, title: string, vibe: string, poster: string, srcs: string[]): V => ({ id: `pin_${id}`, kind: 'pin', pinId: id, title, channel: 'Pinterest', thumb: im(poster), vibe, srcs: srcs.map(px) });
export const PINS: V[] = [
  pin('888616570242799162', 'Aesthetic nature — background for editing', 'nature', '30/f9/46/30f9465f25812548a1276082b9965fb4', ['iht/expMp4/04/c0/38/04c038d1e9e0071890e7fa5de1aa0032_720w.mp4']),
  pin('1124703706933847343', 'Relaxing cinematic vibes', 'serene', '4d/a2/c3/4da2c32708cbc61955bfce9a05f909e1', ['iht/720p/f1/2b/da/f12bda85fa34639b0168d300ea8e9515.mp4']),
  pin('991988255405196665', 'Motivational speech — keep running', 'stories', '55/95/23/559523d8ac3bf940d196e2e043d6d64c', ['mc/720p/37/b0/ee/37b0eeac76b4a0bbcc3b5e0144f0d7e3.mp4']),
  pin('1150458667306371283', 'The past will never come again — focus on the present', 'stories', '0a/d3/53/0ad353d45311c9fdd4a2c3db167b8df5', ['iht/720p/d4/15/e3/d415e371fa375f718f55f430fcba3274.mp4']),
  pin('1029424427336915164', 'The Lone Wolf’s guide — train solo, build resilience', 'sigma', '62/13/e2/6213e244b54bca6b6c4ecf83a1226275', ['iht/720p/34/7c/48/347c486af99dfaabf0c42d92e25c1d4f.mp4']),
  pin('1021965340456351168', 'Rainy night, fire and quiet nature', 'nature', '9d/1e/dd/9d1eddb6c104117ee618ec1c6fa1ecf2', ['iht/expMp4/3f/38/dc/3f38dc18ec6ceb57d266c5b4b86769a3_720w.mp4']),
  pin('849773023482161970', 'Peace feels like this', 'serene', 'cc/f5/7d/ccf57db2c0989ce3eee1ca3ab80dfa3f', ['iht/expMp4/95/75/ae/9575aeea2fb78a5cc9b31e9fccdb84a9_720w.mp4']),
  pin('1129559150348368498', 'Evening drive — California road trip', 'dreamy', '89/b7/fc/89b7fc2fd8b47b628252e432695d4d10', ['iht/expMp4/e5/28/67/e528675a87b0dedab23dba69f92bf787_720w.mp4', 'iht/h265-pt-mp4/e5/28/67/e528675a87b0dedab23dba69f92bf787_720w_t2.mp4', 'iht/hevcMp4V3/e5/28/67/e528675a87b0dedab23dba69f92bf787_540w.mp4']),
  pin('861243128788681428', 'Chill fantasy aesthetic — floating planet', 'dreamy', '7f/79/97/7f7997105c1e660ac5c3001aa808cac1', ['iht/expMp4/91/df/26/91df26b939ce861fab6a097ccddf65f7_720w.mp4', 'iht/av1Mp4-enabled-v4-v/91/df/26/91df26b939ce861fab6a097ccddf65f7_720w.mp4', 'iht/hevcMp4V3/91/df/26/91df26b939ce861fab6a097ccddf65f7_540w.mp4']),
  pin('986710599616304145', 'Nature transitions — scenic landscapes', 'nature', 'f4/b1/86/f4b186abed2caa6a68a71dfa3ed88973', ['iht/expMp4/de/2b/49/de2b4996dacc8b2a4557b0da5fad0ae3_720w.mp4']),
  pin('936537685025218111', 'Aura farming', 'intense', '39/c5/d9/39c5d9689bdc71139e2baa9d4c1be9bd', ['iht/expMp4/2a/05/78/2a0578dc5a000b0eba2eee0926df3dbe_720w.mp4']),
  pin('986006912186110298', 'Ghostly glow in nature', 'serene', 'fe/9f/d5/fe9fd596a24d797b3e1156c13f61ecfc', ['iht/expMp4/95/d4/30/95d430ff6b1d2d8f4a871185c6035122_720w.mp4']),
  pin('671669731955449306', 'Man of Steel mindset — cinematic edit', 'intense', '42/b2/bb/42b2bb7cac7ca1e52e84d88380719a36', ['mc/720p/c1/83/97/c1839760e636a029a902364369932b9d.mp4']),
  pin('772789617353988584', 'Bonsai — surreal stillness', 'nature', '0e/76/2c/0e762c6e1d5c76bf037fdd1d9524af54', ['iht/expMp4/7f/c3/d6/7fc3d615ce0f2d04755eac2ab8d5589d_720w.mp4', 'iht/av1Mp4-control-v4/7f/c3/d6/7fc3d615ce0f2d04755eac2ab8d5589d_720w.mp4', 'iht/hevcMp4V3/7f/c3/d6/7fc3d615ce0f2d04755eac2ab8d5589d_720w.mp4']),
];
