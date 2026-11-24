# Technical Verification

Travel Bird · He Wei · 24 November 2026 (UTC+8)  
Windows · Node.js 24.22.3 · pnpm 11.25.0 · Vite 7.3.6 · Vitest 3.2.7 · Playwright 1.63.0

The target was the final dist built from the working tree based on commit `8ec20db13d03d94887367b85e9a3c8349f513079`. Both the pre-existing working-tree changes and the 24 November fixes were uncommitted. Use the build hashes to identify the files that were tested. Browser logs ending in Z report UTC. Add eight hours for local time. [Build hashes](verification/dist-entry-sha256.txt)

| Check and command | Observed result |
| --- | --- |
| Initial full run with `pnpm test` | Exit 1. Twenty-nine suites and 286 cases passed. Two cases timed out at five seconds on the parallel run. The BirdButton draft suite also failed to load because its module was missing. |
| `pnpm test --maxWorkers=2` | Exit 1. All 289 executed cases in 31 suites passed, including the earlier timeouts. The only suite-load failure came from src/ui/BirdButton.test.tsx importing an absent ./BirdButton. This draft is untracked in the local workspace and already exists on GitHub main. It was preserved. [Full-run summary](verification/vitest-full-summary.txt) |
| `pnpm test --maxWorkers=2 --exclude src/ui/BirdButton.test.tsx` | Exit 0. Thirty-one suites and 289 cases passed. The run covered game, firstTrip, travelChoreography, travelRewardChannels, App.travel, App.garden, roomLayout, RoomScene, and GardenScene. [Filtered run output](verification/vitest-active.txt) |
| `pnpm exec tsc --noEmit -p tsconfig.json` | Exit 0. This configuration covers application source. Vitest executes the test files separately. |
| `pnpm build` | Exit 0. TypeScript and Vite produced the final dist. [Build output](verification/vite-build.txt) · [Entry, redirect, and 404 hashes](verification/dist-entry-sha256.txt) |
| `pnpm exec vitest run src/ui/preload.test.ts src/ui/RoomScene.test.tsx src/ui/GardenScene.test.tsx --maxWorkers=2` | All 31 targeted tests passed. Before the fixes, the two new assertions detected the 26 preload attempts at once and the missing retry. |
| `node Semester1_Final_Archive/HeWei_Technical/verification/verify-asset-references.mjs` | Exit 0. Public and dist each matched 110 static and configuration-derived paths by exact case, with zero missing. HTML entry bundles were checked separately. [Asset audit](verification/asset-references.txt) |
| `pnpm exec vite preview --host 127.0.0.1 --port 4312 --strictPort`, then run `node Semester1_Final_Archive/HeWei_Technical/verification/browser-verification.mjs` in another terminal | Windows Chrome 157.0.8103.80 passed at 390 × 844. Browser time was advanced for task waits. Gameplay actions used actual UI controls. [Chrome output](verification/chrome-game.txt) |
| Run the same script with `TB_TEST_ENGINE=webkit` | Windows WebKit 26.6 passed with Playwright's iPhone 13 profile. Before the CSS fix, the mature crop image intercepted clicks on the harvest button. The final build accepted the click. [WebKit output](verification/webkit-game.txt) |
| Add `--retry-only` to the script invocation for each engine | In both scenes, the first injected failure triggered a successful retry. Two injected failures triggered the alert and stopped further retries. [Chrome output](verification/chrome-background-retry.txt) · [WebKit output](verification/webkit-background-retry.txt) |
| `pnpm --package=netlify-cli dlx netlify dev --offline --dir <absolute path to dist> --port 4314`, then GET requests using curl.exe | Netlify CLI 27.20.1 served existing files with 200, missing static paths with 404, and ordinary SPA paths with 200. The initial serve command exited on a CLI path-argument error. An older dev instance briefly cleared rules during a rebuild. Restarting dev with the final dist passed. [Local routing output](verification/netlify-dev-routes.txt) · [Pre-fix production responses](verification/netlify-production-probes.txt) |

## Browser gameplay and save coverage

The flow began from an empty save. The script cooked the bun, packed the bag, and advanced to the first departure. It reloaded while ready and checked that the journey ID persisted. It verified that the travelling bird was absent from both scenes during the main travel phase. The page was closed and reopened in the same browser after the scheduled return. The app then exposed the two pending rewards.

The script opened the mailbox envelope, attempted a double claim, reloaded, and collected the travel bag reward. It checked that the album entry, carrot seed, and travel record were each credited once. It planted and harvested the carrot, made a Carrot Crescent Crisp, chose Mosslight Forest, and advanced the second trip to travelling. In Settings, it exported JSON, confirmed that malformed input preserved current progress, imported edited valid JSON, and verified the result after reload. The domain suite travelRewardChannels.test covers claiming in the reverse order.

The older scripts/verify-autonomous-travel.mjs targets earlier cooking, packing, and envelope controls. Early test-script attempts timed out because they expected a bag close button after packing and a direct claim action before opening the envelope. The archive script was corrected to match the current UI and rerun. The separate WebKit harvest click failure was reproduced after correcting the script and resolved in the product CSS. [Reproducible browser script](verification/browser-verification.mjs)

## Verification still required

Test Chrome on physical Android and Safari on physical iPhone, including real weak connections and long background suspensions. Verify the production CDN after deployment and collect evidence from any recurrence of the original intermittent fault. The Windows Playwright runs are browser simulations. These results are recorded on 24 November. [Device checklist](Cross_Device_Test_Checklist.md)
