// Vidrift (embed.vidrift.net) for the CinemaHomeTV plugin runner. Runs on the viewer's device, so each viewer asks with
// their own address: Vidrift refuses Cloudflare Workers, which is why this is not a Reelora provider.
// The embed page lists its HLS links and subtitle files as plain JSON. Only the original-audio link is kept (no dubs).
// The playlist answers 403 unless the request names the embed page as Referer, as Vidrift's own player does.
const SITE = 'https://embed.vidrift.net';
const UA = 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function unescapeJson(value) {
  try { return JSON.parse('"' + value + '"'); } catch (e) { return value; }
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const path = mediaType === 'movie' ? 'movie/' + tmdbId : 'tv/' + tmdbId + '/' + (season || 1) + '/' + (episode || 1);
    const page = SITE + '/embed/' + path;
    const res = await fetch(page, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const html = await res.text();
    const headers = { 'User-Agent': UA, 'Referer': page, 'Origin': SITE };

    const subtitles = [];
    const subRe = /\{"code":"([^"]+)","label":"([^"]+)","lang":"([^"]*)","url":"([^"]+)"\}/g;
    let m;
    while ((m = subRe.exec(html)) && subtitles.length < 6) {
      if (m[3] !== 'ar' && m[3] !== 'en') continue;
      subtitles.push({ id: 'vidrift-' + m[1], url: new URL(unescapeJson(m[4]), SITE).href, lang: m[3], label: unescapeJson(m[2]), name: 'Vidrift' });
    }
    // Arabic first.
    subtitles.sort((a, b) => (a.lang === 'ar' ? 0 : 1) - (b.lang === 'ar' ? 0 : 1));

    const titleJob = cardTitle(tmdbId, mediaType);
    const found = [];
    const srcRe = /\{"index":\d+,"url":"(\/api\/[^"]+?\.m3u8)"[^{}]*?"name":"([^"]+)"(?:,"rungs":\[\{"width":\d+,"height":(\d+))?/g;
    while ((m = srcRe.exec(html))) {
      const name = unescapeJson(m[2]);
      if (!/original/i.test(name)) continue;
      found.push({ url: new URL(unescapeJson(m[1]), SITE).href, height: Number(m[3]) || 0, server: name.split(' · ')[0] });
      if (found.length >= 2) break;
    }
    const lengths = await Promise.all(found.map(f => cardLength(f.url, null, headers)));
    const title = await titleJob;
    return found.map((f, i) => ({
      name: cardName('Vidrift', f.height),
      title: cardDescription({ title: title, mediaType: mediaType, season: season, episode: episode, source: 'Vidrift', server: f.server, seconds: lengths[i], subtitles: subtitles }),
      url: f.url,
      quality: f.height ? f.height + 'p' : 'Auto',
      headers: headers,
      subtitles: subtitles
    }));
  } catch (e) {
    console.error('[Vidrift] ' + (e && e.message));
    return [];
  }
}

module.exports = { getStreams };
