# Asset Loading Investigation

TB-BUG-05 · He Wei · 24 November 2026 (UTC+8)

The investigation compared the live Netlify site with a local build made before the fixes. Production served index-CMvK51Jd.js and index-T3bTNP28.css. The SHA-256 checksums of both downloaded files matched the local rebuild. Intermittent asset failure remains **Open** because the original device, failed URL, network trace, and reproduction steps are unavailable. [Production site](https://tranquil-lokum-a62556.netlify.app/) · [Production HTTP probes](verification/netlify-production-probes.txt)

## Confirmed observations

| Area | Evidence |
| --- | --- |
| Missing assets in production | GET requests for /art/room-v2/does-not-exist.png and /assets/missing.js returned 200 with text/html and the application index. The ordinary /missing-route URL also loaded the application through the SPA fallback. Existing background.png and trunk-foreground.png returned image/png. The intentionally nonexistent requests confirm that the fallback masked missing static files. |
| Paths and case | The first pass checked 95 paths. The final audit added paths resolved from animation and crop mappings. It checked 110 exact-case paths in public and in dist, with zero missing in either. The HTML entry bundles were present. [Audit results](verification/asset-references.txt) |
| Hosting and asset sources | Vite uses the default base path of / and copies public into dist. Current runtime artwork and fonts use same-origin paths in CSS and TS/TSX. Source inspection found no remote artwork URL, service worker registration, or Cache Storage implementation. Legacy files remain in the public directory. |
| Caching and release consistency | Production responses sampled for the homepage, the hashed JavaScript and CSS, and in-use PNGs used public,max-age=0,must-revalidate. Refreshes produced normal 304 responses. The sampled entry page and bundles matched. Headers and the Deploy ID from the originally affected devices are unavailable. |
| Startup requests | Before the fix, the preloader created 26 Image objects before React rendered and called decode() with suppressed errors. Visible room elements also requested their own images. A Windows Chrome throttling run decoded the background, with a long wait. [Timing comparison](Asset_Loading_Fix_Report.md) |
| Image sizes | Public contains 181 images totaling 147,927,507 bytes, or about 141.07 MiB. This includes legacy assets and does not represent the first-screen transfer size. The active room background is about 2.49 MiB, the garden background about 3.02 MiB, and the first postcard about 4.25 MiB. Several garden sprite strips exceed 2 MiB. |
| Intermittent probe errors | Some curl.exe HTTPS probes produced Windows Schannel error 35. Later probes or Chrome decoded the affected assets. This identifies a local probe failure and does not establish a Netlify outage or the cause on the original device. |

## Production browser observations

Windows Google Chrome 157 was tested at 1366 × 900 and with a 390 × 844 touch viewport. The room and garden backgrounds decoded in both configurations, including refresh and reopen. Time from navigation to room-background decode was 11.38 s and 56.33 s respectively, from one cold visit per configuration. The connection and concurrent local work could have affected the timings. The reported missing-image symptom did not reproduce reliably.

Potential causes still include missing files or incorrect MIME types on an affected deployment, network interruption, decoding or compatibility issues, and device memory pressure. The production deployment details are needed to tie the live build to a source commit. For a captured failure, record the URL, status, MIME type, Netlify request ID, device and browser, network conditions, cache state, and recurrence.

[Netlify rewrite and 404 behavior](https://docs.netlify.com/manage/routing/redirects/redirect-options/) · [Fix report](Asset_Loading_Fix_Report.md) · [Device checklist](Cross_Device_Test_Checklist.md)
