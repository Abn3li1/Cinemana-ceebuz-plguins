# CinemaHome Cinemana plugins

Nuvio/CinemaHomeTV stream plugins: Cinemana and Cee (both answer only inside Iraq), plus Vidrift and VidBolt (sources that refuse shared servers, so they run on the viewer's device).

Add this repository to the app:

```
https://raw.githubusercontent.com/Abn3li1/Cinemana-ceebuz-plguins/main/manifest.json
```

Edit `src/` (`template.js` for Cinemana/Cee, `vidrift.js`, `vidbolt.js`), raise the version in `build.mjs`, then run `node build.mjs` to regenerate `providers/` and `manifest.json`.
