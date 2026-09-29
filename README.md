# TRAY — Street News Network

Static GitHub Pages website for TRAY.

## Files

- `index.html` — page structure and content
- `styles.css` — newspaper / field-desk visual system
- `app.js` — Three.js globe, marker interactions and directory
- `newsstands.json` — bundled NYC newsstand dataset

## Deploy to GitHub Pages

1. Create a new GitHub repository, for example `tray`.
2. Upload `index.html`, `styles.css`, and `app.js` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`.
6. Save. GitHub will publish the site.

No build step is required.

## NYC newsstand data

The supplied NYC Newsstands CSV has been converted to `newsstands.json` and bundled with the site.

The browser loads:

`./newsstands.json`

This avoids browser CORS issues and means GitHub Pages can serve the globe and directory without making a runtime request to NYC Open Data.

The included dataset contains 361 newsstand records with latitude/longitude, borough, street, district, neighborhood and other fields.

If the local JSON cannot be loaded, `app.js` falls back to five demo points so the visual experience still renders.

## Notes

- Three.js and OrbitControls are loaded from jsDelivr.
- The Earth texture is loaded from the Three.js examples CDN.
- Because this is a static site, the newsstand dataset is fetched client-side.
- For a fully self-contained deployment later, export the NYC data to `newsstands.json` and replace `DATA_URL` with `./newsstands.json`.


## Globe interaction

The globe opens already oriented toward New York. The camera supports much deeper
zoom than the initial version, and clicking a newsstand moves both the camera and
the orbit target to the selected street location. This makes nearby NYC stands
visibly separate instead of leaving all markers clustered together.


## Arrival sequence

The site opens with a cinematic cloud-to-Earth camera flight toward New York. The animation starts immediately on page initialization, independent of the newsstand data request.
