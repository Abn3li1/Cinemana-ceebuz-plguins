// Builds providers/cinemana.js and providers/cee.js from src/template.js, copies the standalone plugins
// (src/vidrift.js, src/vidbolt.js) to providers/, and writes manifest.json.
// To ship a change: edit src/, raise that plugin's version below (the app re-checks a plugin when its version changes),
// run node build.mjs, commit and push. Installs fetch the repo again within 7 days, or at once on a manual refresh.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const template=readFileSync(new URL('src/template.js',import.meta.url),'utf8');
const sites=[
 {key:'cinemana',name:'Cinemana',host:'cinemana.shabakaty.cc',description:'Shabakaty Cinemana: films and series with Arabic subtitles. Works inside Iraq only.'},
 {key:'cee',name:'Cee',host:'cee.buzz',description:'Cee (cee.buzz): films and series with Arabic subtitles. Works inside Iraq only.'}
];
const siteVersion='1.0.2';
// Sources that refuse shared servers (Cloudflare Workers), so they run on the viewer's device instead of in Reelora.
const standalone=[
 {key:'vidrift',name:'Vidrift',host:'embed.vidrift.net',version:'1.0.1',formats:['m3u8'],contentLanguage:['en'],
  description:'Vidrift: films and series in original audio (HLS, up to 1080p) with Arabic and English subtitles.'},
 {key:'vidbolt',name:'VidBolt',host:'vidbolt.xyz',version:'1.0.1',formats:['m3u8'],contentLanguage:['en'],
  description:'VidBolt: films and series (HLS, up to 1080p, H.264). Links with Hindi default audio are skipped.'}
];
const repoVersion='1.1.1';
mkdirSync(new URL('providers/',import.meta.url),{recursive:true});
for(const s of sites)writeFileSync(new URL(`providers/${s.key}.js`,import.meta.url),template.replaceAll('__KEY__',s.key).replaceAll('__NAME__',s.name).replaceAll('__HOST__',s.host));
// Standalone plugins get src/card.js (Reelora's card wording) in front: the app loads one file per plugin.
const card=readFileSync(new URL('src/card.js',import.meta.url),'utf8');
for(const s of standalone)writeFileSync(new URL(`providers/${s.key}.js`,import.meta.url),card+'\n'+readFileSync(new URL(`src/${s.key}.js`,import.meta.url),'utf8'));
const entry=(s,version,formats,contentLanguage)=>({id:s.key,name:s.name,description:s.description,version,author:'CinemaHome',
 supportedTypes:['movie','tv'],filename:`providers/${s.key}.js`,enabled:true,formats,contentLanguage,
 logo:`https://www.google.com/s2/favicons?domain=${s.host}&sz=256`});
writeFileSync(new URL('manifest.json',import.meta.url),JSON.stringify({name:'CinemaHome plugins',version:repoVersion,scrapers:[
 ...sites.map(s=>entry(s,siteVersion,['mp4','m3u8'],['ar','en'])),
 ...standalone.map(s=>entry(s,s.version,s.formats,s.contentLanguage))
]},null,2)+'\n');
console.log('built',[...sites,...standalone].map(s=>s.key).join(', '));
