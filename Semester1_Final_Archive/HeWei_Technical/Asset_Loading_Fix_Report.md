# Asset Loading Fix Report

TB-ASSET-FIX · He Wei · 24 November 2026 (UTC+8)

The release candidate includes scoped fixes for the observed loading and routing behavior. The originally reported intermittent failures remain **Open** because no captured URL, MIME type, or decode error is available from an affected device.

| Change | Implementation and verification |
| --- | --- |
| Return 404 for missing static files | Non-forced rules for art, assets, and fonts run before the general SPA fallback. Existing files are served normally. The 404 rules use the published 404 page. netlify.toml still sets the build, and the published redirect file is used for Git builds and manual uploads. [Redirects](../../public/_redirects) · [404 page](../../public/404.html) · [Netlify config](../../netlify.toml) · [Local routing output](verification/netlify-dev-routes.txt) |
| Prioritize visible artwork | Preloading starts after the page load event. Two low-priority requests can run at a time, with packing and hopping assets near the front of the queue. Visible room elements initiate their own downloads. Each failed preload logs its URL and allows the queue to continue. [main.tsx](../../src/main.tsx) · [preload.ts](../../src/ui/preload.ts) |
| Retry each main scene background once | The first failure triggers the same URL with ?retry=1. A second failure activates the existing alert and disables the relevant hotspots. Console warnings record the URL and attempt number. Injected failures verified recovery and the terminal failure behavior in both scenes. [useSceneBackground.ts](../../src/ui/useSceneBackground.ts) · [RoomScene.tsx](../../src/ui/RoomScene.tsx) · [GardenScene.tsx](../../src/ui/GardenScene.tsx) |
| Restore harvest-button clicks in WebKit | Simulated iPhone WebKit reported that the mature crop image intercepted the harvest control. The decorative image now ignores pointer events, with the same sizing, position, and harvest rules. [gardenScene.css](../../src/gardenScene.css) |
| Preserve the artwork and game rules | All 176 files in public/art had identical relative paths and SHA-256 hashes before and after the fixes. Artwork encoding, hotspot coordinates, and game values were preserved. |

## Observed performance and verification

A Windows Chrome 390 × 844 test compared one cold visit per version on the local production preview. The simulated connection used 350 ms latency, about 1 Mbps downstream, and 0.5 Mbps upstream. Time from navigation to room-background decode was about 126.93 s before the fix and 83.08 s afterward. Both runs decoded the room and reached the garden. These single-run measurements describe behavior under the simulated conditions. Total asset size remains substantial, and performance on physical devices and real networks is pending.

All 31 targeted tests passed. Chrome and Windows WebKit verified recovery after a single injected background failure and an alert after two failures. The final gameplay retest passed through the harvest click and second departure in both engines. [Verification results](Technical_Verification_Final.md)

The observed production cache policy uses must-revalidate. This update keeps the default policy, since hashed bundles share the assets URL prefix with some unversioned files. No service worker was added.

## Release acceptance

After publishing to the existing site, check image responses, HTTP statuses, and MIME types. Run cold visits, reopen, refresh, weak-network tests, and the first two journeys on physical devices. When the original symptom appears, capture the request URL, network status, Netlify request ID, and console attempts. These records can help distinguish transfer, deployment, CDN, and decoding failures.

[Investigation](Asset_Loading_Investigation.md) · [Device checklist](Cross_Device_Test_Checklist.md) · [Deployment instructions](Upload_and_Deploy.md)
