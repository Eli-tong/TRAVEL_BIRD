[README.md](https://github.com/user-attachments/files/35321505/README.md)
[README.md](https://github.com/user-attachments/files/35321498/README.md)# Travel Bird

Travel Bird is a mobile-first idle game developed for ENT303TC Team Technopreneurship at Xi’an Jiaotong-Liverpool University. Grow crops, cook travel food, and pack a bag for a blue Quaker parrot. The bird leaves on its own and brings home postcards and rewards that unlock more of the game.

[Play Travel Bird on Netlify](https://tranquil-lokum-a62556.netlify.app/) · [Technical Evidence Archive](Semester1_Final_Archive/HeWei_Technical/README.md)

## How to play

1. In the treehouse, open the kitchen and make a **Strawberry Cloud Bun**. When it is ready, collect it.
2. Open the travel bag, choose **Windmill Fields** and the bun, then select **Finish packing**. The bird leaves after packing. In production, the main travel phase takes about five minutes, with departure and return animations in addition.
3. After the bird returns, go through the treehouse door to the garden. Swipe or drag the garden to reach the mailbox and three planting plots. Collect the postcard from the mailbox and the seed and unlocks from the travel bag in the treehouse. Open the album from the menu to view collected postcards.
4. Plant the carrot seed, harvest it when ready, and make a **Carrot Crescent Crisp**. Pack it for **Mosslight Forest** to start the second trip.

The Settings menu supports English and Simplified Chinese. The game uses illustrated indoor and outdoor scenes, with a separate sprite for the bird and local image assets.

## Run locally

The project uses React 19, TypeScript, and Vite. The 24 November verification used Node.js 24.22.3 and pnpm 11.25.0.

~~~bash
pnpm install --frozen-lockfile
pnpm dev --port 5173
~~~

[Open the local game](http://127.0.0.1:5173/). New saves created in development start with faster timers. The development-only **Play pace** setting can switch between development and relaxed play. New production saves start in relaxed play.

~~~bash
pnpm build
pnpm preview
~~~

`pnpm build` type-checks the application and writes the production files to `dist/`. `pnpm preview` serves that build locally.

## Saves

The game autosaves to `localStorage` under `travel-bird-save-v1`. It stores progress in the current browser and site origin. On reopening, the app checks saved timestamps and resolves elapsed tasks.

Use **Settings & save** to export a JSON backup or import a save. Invalid JSON or invalid save data leaves existing progress intact. Export a backup before clearing site data or changing devices.

## Deploy to Netlify

For a manual update, open the existing **tranquil-lokum-a62556** site's **Deploys** page and upload the built `dist/` folder. For a Git-connected deployment, use the repository root, the build command `npm run build`, and the publish directory `dist`. Vite copies the redirect rules into the publish directory. Static files under `/art/`, `/assets/`, and `/fonts/` return 404 when missing. Other unmatched paths use the SPA fallback. [Netlify configuration](netlify.toml) · [Publish rules](public/_redirects) · [Deployment handoff](Semester1_Final_Archive/HeWei_Technical/Upload_and_Deploy.md)

## Verification and release status

On 24 November 2026, the production build and TypeScript check passed, and 110 asset references matched their files by exact path and case. Windows Chrome and Playwright WebKit with an iPhone 13 profile both completed the first two departures, separate reward claims, harvesting, and save import and export. The updated Netlify homepage references the same JavaScript and CSS entry filenames as the tested local build. Physical Android Chrome and iPhone Safari testing is pending. The original intermittent asset-loading issue remains open. [Technical verification](Semester1_Final_Archive/HeWei_Technical/Technical_Verification_Final.md) · [Device checklist](Semester1_Final_Archive/HeWei_Technical/Cross_Device_Test_Checklist.md)

The full `pnpm test` scan reports a suite-load error in the historical `src/ui/BirdButton.test.tsx` draft because its component is missing. The following command passed 289 tests across 31 suites.

~~~bash
pnpm test --maxWorkers=2 --exclude src/ui/BirdButton.test.tsx
~~~
