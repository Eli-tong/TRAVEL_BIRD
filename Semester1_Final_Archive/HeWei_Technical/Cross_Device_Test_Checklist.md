# Cross-Device Test Checklist

TB-BUG-05 · 24 November 2026 (UTC+8) · He Wei and QA to record results after release

| Platform | Evidence from this round | Post-release check |
| --- | --- | --- |
| Windows Google Chrome | Chrome 157.0.8103.80 on the live site at desktop size and in a 390 × 844 touch viewport. Local production testing covered refresh, reopen, throttling, and injected failures. | Repeat on the existing Netlify URL and save the Network results. |
| Android Chrome | The 390 × 844 Windows Chrome run is a simulation. | Test on a physical Android phone and record the model, Android version, and Chrome version. |
| iPhone Safari | Windows Playwright WebKit 26.6 with the iPhone 13 profile passed background failure injection, harvesting, two departures, and save handling. | Test on a physical iPhone with Safari. Record the model and iOS version. Rotate the device and return to portrait. |
| New Netlify deployment | Manual release is pending. | Record the Deploy ID, production URL, and test time. Confirm the new JavaScript entry is in use. |

## Test procedure

1. Record the Deploy ID, release time, and URL. Export existing progress as JSON from Settings and Save. Use a private window or a separate browser profile for the cold-visit test.
2. On a normal connection, open the homepage. Check the room background, tree trunk, travel bag, and bird. Open the kitchen, cabinet, bag, and menu. In the garden, pan horizontally and tap the treehouse entrance, mailbox, and all three plots. Check for artwork gaps, shifted controls, text clipping, and unexpected changes in layout.
3. Refresh in the same window, then close the tab and reopen the same URL in the same browser. Check that artwork loads and progress persists. Use a temporary test profile to clear site data and verify startup with an empty save.
4. In Chrome DevTools, disable the cache and repeat under approximately 1 Mbps download, 0.5 Mbps upload, and 350 ms latency. On a phone, use repeatable throttled Wi-Fi or document the weaker connection used. For a failed background request, look for ?retry=1. Check for recovery or a refresh prompt after two failures. Repeat at least three times on the normal and weak connections and record each result.
5. Cook a Strawberry Cloud Bun, pack it for Windmill Fields, and observe departure. The daily bird sprite should disappear from both scenes during the main travel phase. The return animation can show the travelling bird. Close and reopen after the trip is due to check catch-up. Pull out and collect the postcard from the garden mailbox, then collect the seeds and recipe via the indoor travel bag. Use another save to test the reverse order. Plant the carrot, tap the harvest button in the mature plot popover, and cook a Carrot Crescent Crisp. Select the unlocked Mosslight Forest and verify that the second trip reaches the travelling state. The main travel phase is approximately five minutes in production, plus departure and return choreography.
6. In Network or using curl, check that /art/room-v2/does-not-exist.png, /assets/missing.js, and /fonts/missing.woff2 return 404. The existing background should return image/png. The entry JS and CSS should load with the corresponding MIME types, and /missing-route should keep the SPA fallback. After refresh, a 304 is normal if the asset renders correctly.
7. If a failure occurs, keep the page open and capture a screenshot and Network trace or HAR. Remove personal information before sharing. Use desktop Chrome device inspection for Android or Safari Web Inspector on a Mac for iPhone. If these tools are unavailable, record the time, affected region, screenshot, and reproduction steps.

## Result log

| Date, time, and time zone | Deploy ID | Device, OS, and browser | Network and cache state | Flow | Result and elapsed time | Failed URL, status, MIME, request ID | Screenshot or HAR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |

[Fix report](Asset_Loading_Fix_Report.md) · [Evidence index](Technical_Evidence_Index.md)
