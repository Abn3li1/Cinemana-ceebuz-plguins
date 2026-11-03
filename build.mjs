// Builds providers/cinemana.js and providers/cee.js from src/template.js, plus manifest.json.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const template=readFileSync(new URL('src/template.js',import.meta.url),'utf8');
const sites=[
 {key:'cinemana',name:'Cinemana',host:'cinemana.shabakaty.cc',description:'Shabakaty Cinemana: films and series with Arabic subtitles. Works inside Iraq only.'},
 {key:'cee',name:'Cee',host:'cee.buzz',description:'Cee (cee.buzz): films and series with Arabic subtitles. Works inside Iraq only.'}
];
const version='1.0.2';
mkdirSync(new URL('providers/',import.meta.url),{recursive:true});
for(const s of sites)writeFileSync(new URL(`providers/${s.key}.js`,import.meta.url),template.replaceAll('__KEY__',s.key).replaceAll('__NAME__',s.name).replaceAll('__HOST__',s.host));
writeFileSync(new URL('manifest.json',import.meta.url),JSON.stringify({name:'CinemaHome Cinemana plugins',version,scrapers:sites.map(s=>({
 id:s.key,name:s.name,description:s.description,version,author:'CinemaHome',supportedTypes:['movie','tv'],
 filename:`providers/${s.key}.js`,enabled:true,formats:['mp4','m3u8'],contentLanguage:['ar','en'],
 logo:`https://www.google.com/s2/favicons?domain=${s.host}&sz=256`
}))},null,2)+'\n');
console.log('built',sites.map(s=>s.key).join(', '));
