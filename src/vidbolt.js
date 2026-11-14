// VidBolt (vidbolt.xyz) for the CinemaHomeTV plugin runner. Runs on the viewer's device: VidBolt refuses Cloudflare
// Workers and blocks an address after many quick requests, so it cannot sit behind one shared server, but one viewer's
// few requests stay well under that. One API call returns the stream; hevc=0 asks for H.264 so every TV can play it.
// A link whose default audio track is Hindi is dropped.
const SITE = 'https://vidbolt.xyz';
const UA = 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function defaultAudioIsHindi(master) {
  const line = String(master || '').split('\n').find(l => /TYPE=AUDIO/.test(l) && /DEFAULT=YES/.test(l));
  return !!line && /LANGUAGE="hi|NAME="Hindi/i.test(line);
}

function topHeight(master) {
  let top = 0;
  const re = /RESOLUTION=\d+x(\d+)/g;
  let m;
  while ((m = re.exec(String(master || '')))) top = Math.max(top, Number(m[1]));
  return top;
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const ids = await cardIds(tmdbId, mediaType);
    if (!ids.tmdb) return [];
    tmdbId = ids.tmdb;
    const movie = mediaType === 'movie';
    const page = SITE + '/' + (movie ? 'movie/' + tmdbId : 'tv/' + tmdbId + '/' + (season || 1) + '/' + (episode || 1));
    const query = 'type=' + (movie ? 'movie' : 'tv') + '&id=' + encodeURIComponent(tmdbId) +
      (movie ? '' : '&season=' + (season || 1) + '&episode=' + (episode || 1)) + '&hevc=0';
    const res = await fetch(SITE + '/api/resolve?' + query, { headers: { 'User-Agent': UA, 'Referer': page, 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    const stream = data && data.stream;
    if (!stream || !Array.isArray(stream.sources)) return [];
    const server = typeof stream.server === 'string' ? stream.server : '';
    const titleJob = cardTitle(tmdbId, mediaType);
    const found = [];
    for (const src of stream.sources) {
      if (!src || typeof src.url !== 'string' || !/^https:\/\//.test(src.url)) continue;
      if (defaultAudioIsHindi(src.master)) continue;
      const height = topHeight(src.master) || parseInt(String(src.quality || ''), 10) || 0;
      const headers = Object.assign({ 'User-Agent': UA, 'Referer': SITE + '/', 'Origin': SITE }, src.headers || {});
      found.push({ url: src.url, master: typeof src.master === 'string' ? src.master : null, height: height, headers: headers });
      if (found.length >= 2) break;
    }
    const label = server ? server.charAt(0).toUpperCase() + server.slice(1) : '';
    const lengths = await Promise.all(found.map(f => cardLength(f.url, f.master, f.headers)));
    const title = (await titleJob) || ids.arTitle;
    return found.map((f, i) => ({
      name: cardName('VidBolt', f.height),
      title: cardDescription({ title: title, mediaType: mediaType, season: season, episode: episode, source: 'VidBolt', server: label, seconds: lengths[i], subtitles: [] }),
      url: f.url,
      quality: f.height ? f.height + 'p' : 'Auto',
      headers: f.headers
    }));
  } catch (e) {
    console.error('[VidBolt] ' + (e && e.message));
    return [];
  }
}

module.exports = { getStreams };
