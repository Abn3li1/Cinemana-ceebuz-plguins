// Shared by the standalone plugins (build.mjs puts it in front of each one): Reelora's stream card wording, so these
// links read like Reelora's in the source list. Keep in step with cinema-addon/stream-format.mjs in the addons repo.
// Name: "<Source>\nجودة 1080p" (the app reads "جودة 1080p" to sort and for its dead-link fallback).
const CARD_LANGUAGE_NAMES = { en: 'الإنجليزية', fr: 'الفرنسية', es: 'الإسبانية', de: 'الألمانية', tr: 'التركية', pt: 'البرتغالية', hi: 'الهندية' };

function cardQuality(height) {
  return height >= 2000 ? '4K' : height ? height + 'p' : 'تلقائية';
}

// The TMDB number these sites need. The phone app hands plugins an IMDb ID (tt…) when its own TMDB lookup fails, so a
// tt ID is looked up on Wikidata (no key): it keeps the TMDB number (P4947 film, P4983 series) next to the IMDb ID (P345),
// and its Arabic label stands in for the title. Returns { tmdb, arTitle }; tmdb is null when no number is found.
const CARD_WIKIDATA = 'https://www.wikidata.org/w/api.php?format=json&origin=*';
const CARD_WIKIDATA_HEADERS = { 'Accept': 'application/json', 'User-Agent': 'CinemaHome-plugin/1.0' };

async function cardIds(id, mediaType) {
  const s = String(id || '').trim().replace(/^tmdb:/i, '').split(':')[0];
  if (/^\d+$/.test(s)) return { tmdb: s, arTitle: null };
  if (!/^tt\d{5,12}$/.test(s)) return { tmdb: null, arTitle: null };
  try {
    const found = await (await fetch(CARD_WIKIDATA + '&action=query&list=search&srlimit=1&srsearch=haswbstatement:P345=' + s, { headers: CARD_WIKIDATA_HEADERS })).json();
    const item = found && found.query && found.query.search && found.query.search[0] && found.query.search[0].title;
    if (!/^Q\d+$/.test(item || '')) return { tmdb: null, arTitle: null };
    const data = await (await fetch(CARD_WIKIDATA + '&action=wbgetentities&props=labels|claims&languages=ar&ids=' + item, { headers: CARD_WIKIDATA_HEADERS })).json();
    const entity = data && data.entities && data.entities[item] || {};
    const claim = entity.claims && entity.claims[mediaType === 'movie' ? 'P4947' : 'P4983'];
    const value = claim && claim[0] && claim[0].mainsnak && claim[0].mainsnak.datavalue && claim[0].mainsnak.datavalue.value;
    const arTitle = entity.labels && entity.labels.ar && entity.labels.ar.value || null;
    return { tmdb: /^\d+$/.test(String(value || '')) ? String(value) : null, arTitle: arTitle };
  } catch (e) { return { tmdb: null, arTitle: null }; }
}

// Arabic title from TMDB with the app's own key; null when it cannot be had.
async function cardTitle(tmdbId, mediaType) {
  try {
    if (typeof TMDB_API_KEY === 'undefined' || !TMDB_API_KEY) return null;
    const kind = mediaType === 'movie' ? 'movie' : 'tv';
    const res = await fetch('https://api.themoviedb.org/3/' + kind + '/' + encodeURIComponent(tmdbId) + '?language=ar&api_key=' + TMDB_API_KEY);
    if (!res.ok) return null;
    const data = await res.json();
    return String(data.title || data.name || data.original_title || data.original_name || '').trim() || null;
  } catch (e) { return null; }
}

// Length of a VOD media playlist in seconds (0 when it is not a complete one).
function cardSeconds(playlist) {
  const text = String(playlist || '');
  if (text.indexOf('#EXT-X-ENDLIST') < 0) return 0;
  let total = 0;
  const re = /#EXTINF:([\d.]+)/g;
  let m;
  while ((m = re.exec(text))) total += Number(m[1]);
  return Math.round(total);
}

// Reads the first variant of a master playlist (or the playlist itself) to get the length.
async function cardLength(url, master, headers) {
  try {
    let text = master;
    if (!text) text = await (await fetch(url, { headers: headers })).text();
    if (/#EXT-X-STREAM-INF/.test(text)) {
      const variant = text.split('\n').find(l => l.trim() && l.charAt(0) !== '#');
      if (!variant) return 0;
      text = await (await fetch(new URL(variant.trim(), url).href, { headers: headers })).text();
    }
    return cardSeconds(text);
  } catch (e) { return 0; }
}

function cardDescription(o) {
  const name = o.title || o.source;
  const lines = [o.mediaType !== 'movie' && o.season && o.episode
    ? '📺 ' + name + ' — الموسم ' + Number(o.season) + '، الحلقة ' + Number(o.episode)
    : '🎬 ' + name];
  lines.push('🔌 المصدر: ' + o.source + (o.server ? ' (' + o.server + ')' : ''));
  const s = o.seconds || 0;
  if (s > 0) {
    const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    lines.push('⏱️ المدة: ' + (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0'));
  }
  const codes = [];
  for (const sub of o.subtitles || []) if (codes.indexOf(sub.lang) < 0) codes.push(sub.lang);
  lines.push(codes.indexOf('ar') >= 0 ? '✅ ترجمة عربية مدمجة' : '💡 استعمل إضافات الترجمة');
  const others = codes.filter(c => c !== 'ar').map(c => CARD_LANGUAGE_NAMES[c] || c.toUpperCase());
  if (others.length) lines.push('🗂️ لغات أخرى: ' + others.slice(0, 2).join('، ') + (others.length > 2 ? ' +' + (others.length - 2) : ''));
  return lines.join('\n');
}

function cardName(source, height) {
  return source + '\nجودة ' + cardQuality(height);
}
