# Upload and Deploy

Travel Bird · He Wei · 24 November 2026

The evidence archive and the Netlify deployment can be submitted separately.

## Update the GitHub archive

1. Open `Semester1_Final_Archive/HeWei_Technical/` in the team repository. Upload the English Markdown files and the verification subfolder there. Retain the existing placeholder, weekly evidence, and other contributors' folders. [Archive index](Technical_Evidence_Index.md)
2. To update the buildable source as well, create a branch from the latest main checkout and extract the GitHub Overlay ZIP from `output/technical-handoff-20261124/` into the repository root. Keep its relative paths. The overlay was compared with the GitHub main snapshot read on 24 November. It includes the source and public assets required to reproduce the build as well as the evidence package. It includes work that was already in the local workspace at handoff. Review it alongside any newer team changes. [Comparison snapshot](https://github.com/Eli-tong/TRAVEL_BIRD/tree/9b5d3e5c1bf2bbc461ebba865a1cdfc157b32f9f)
3. Run `pnpm install --frozen-lockfile` and `pnpm build` from the repository root. Review the diff before committing. Leave dist, node_modules, local draft files, and historical asset deletions out of the source commit. Give the final GitHub SHA to Li Zhitong for the Evidence Register.

The fixes for this delivery are in main.tsx, preload.ts, useSceneBackground.ts, RoomScene.tsx, GardenScene.tsx, gardenScene.css, the regression tests in preload.test.ts and RoomScene.test.tsx, public/_redirects, public/404.html, and netlify.toml. [Verification report](Technical_Verification_Final.md)

## Update the existing Netlify site

1. Sign in to Netlify and open the **Deploys** tab for **tranquil-lokum-a62556**. Drag the local **dist** folder to that site's manual deployment area. If using the Netlify ZIP, extract it and drag its dist folder. The first level of dist should contain index.html, 404.html, _redirects, assets, art, and fonts. [Netlify deployment instructions](https://docs.netlify.com/deploy/create-deploys/)
2. Once the deploy is published, verify that the production domain is the existing site. Record the Deploy ID, publication time, URL, and a screenshot of the deploy details. Compare the entry JavaScript and CSS filenames with the verification report. [Production site](https://tranquil-lokum-a62556.netlify.app/) · [Final build hashes](verification/dist-entry-sha256.txt)
3. Verify the room and garden, missing file 404s, SPA fallback, and physical devices. Use the same browser and origin to check existing saves. Export JSON before clearing site data. [Cross-device checklist](Cross_Device_Test_Checklist.md)
4. For future Git-based deployment, use the repository root as the base, `npm run build` as the build command, and `dist` as the publish directory. Vite copies public/_redirects into the publish directory. Manual deployment uses the built folder directly.

If a new issue appears after publication, save the failure evidence in the existing project and follow the team's process for restoring the previous working production deploy. GitHub commits, pushes, and Netlify deployment are pending manual action.
