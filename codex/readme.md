# Weights: context and specification for maintaining or reproducing the app

Last reviewed: November 9, 2026. **This document and all application instructions must be in English. The entire application interface must also be in English**, including messages, help, errors, and accessibility labels.

## 1. Purpose and reference sources

Weights is a personal weight-training diary. Users record machines, sets, repetitions, kilograms, and cycling minutes per day, view their lifting volume, and sync devices through Firebase Authentication and Cloud Firestore with a persistent Google sign-in session.

Repository references:

- `weights.html`: the complete implementation and primary visual and functional reference. Preserve its styles, SVG assets, and behavior when editing.
- `codex/readme.md`: requirements, decisions, and product context for any AI or developer.
- `FIREBASE_SETUP.md`: current Firebase configuration, authentication, security rules, and migration guide.
- `firestore.rules` and `firebase.json`: per-user immutable revision rules and emulator/deployment configuration.
- `GOOGLE_DRIVE_SETUP.md`: retirement notice for the old Drive integration.
- `tests/firestore.rules.test.cjs`: access-control tests against the Firestore emulator.
- `scripts/stamp-version.py`: stamps the visible version using the Europe/Madrid timezone.
- `.github/workflows/pages.yml`: validates and publishes a new version on every push to `main`.
- `tests/sync.test.cjs`: executable storage and sync tests; Google access is not required.

The original inspiration is `macrodiario.html` from the neighboring MacroDiario project. Its single-file architecture and visual language were adapted for weight training. If available in the same environment, the reference is at `../MacroDiario/macrodiario.html`. **It is not a runtime dependency.** Its Firebase Authentication session model is now deliberately reused. Do not copy its food tracking, chat, friends, barcode scanning, project configuration, or database contents.

To reproduce the app, implement this specification and reuse the original assets from `weights.html` when available. Do not replace the design with a landing page, desktop dashboard, or different visual system.

## 2. Architecture and execution

- Static application in **one `weights.html` file**, with embedded HTML, CSS, JavaScript, and SVG.
- Native JavaScript: no framework, custom backend, bundler, or runtime dependency installation. Firebase provides managed authentication and a shared Firestore database with per-user access rules.
- Sign-in is required to access the interface. Workouts still save locally and remain available during temporary network outages for a restored authenticated session. There is no signed-out offline bypass.
- Inter and Poppins fonts are requested from Google Fonts, with `sans-serif` fallbacks.
- Firebase app/auth/firestore compatibility SDKs load sequentially from `https://www.gstatic.com/firebasejs/13.2.0/`. The application explicitly enables `firebase.auth.Auth.Persistence.LOCAL`. No Google Drive SDK or direct Drive OAuth flow remains.
- Opening the HTML directly supports local use in compatible browsers; Firebase sign-in requires HTTPS or localhost. Configured apps attempt to restore the Firebase session at startup and show an opaque full-screen sign-in page when signed out, containing the Weights dumbbell logo above **Sign in with Google**. Hide the workout application until authentication is restored.
- Development: run `python3 -m http.server 8000` and open `http://localhost:8000/weights.html`.
- Requires a modern browser supporting `localStorage`, `<dialog>`, `fetch`, `crypto.randomUUID()`, dates, and international formatting.
- There is no service worker, PWA installation, background sync process, or complete offline asset cache. Saving workouts offline does not mean a first visit can load the page without a network connection.

## 3. Visual design to preserve

Mobile-first design with a centered column, **640 px maximum width**, `100dvh` minimum height, and typical horizontal padding of 20 px. At viewport widths up to 360 px, padding decreases to 12 px.

| Element | Value or behavior |
|---|---|
| Page background | `#F4F5FA` |
| Cards | White `#FFFFFF` |
| Primary text | `#20232E` |
| Secondary text | `#73798D` |
| Soft borders | `#ECEDF4` |
| Primary green | `#0FBF8F` |
| Dark green | `#087D5E` |
| Soft green | `#E3F8F1` |
| Error / danger | `#D72D55` |
| Body font | Inter |
| Headings and highlighted numbers | Poppins |
| Card radius | 22 px |
| Primary button radius | 14 px |
| Input radius | 10 px |
| Card shadow | `0 2px 10px #20232e0d, 0 10px 24px -12px #20232e1a` |
| Daily volume number | 36 px, weight 800; 30 px on very small screens |

Screen order:

1. Header with a green dumbbell logo, **Weights** title, and the signed-in user's circular avatar at the top right.
2. Horizontal weekly calendar with previous/next arrows.
3. Connect/sync action and status text.
4. Conflict review button, shown only when conflicts exist.
5. Selected date.
6. Summary card: weekly total, daily volume, and three counters.
7. **Your workout** heading and number of added machines.
8. Machine cards or an empty state.
9. Green **+ Add machine** button.
10. Final **Total weight lifted** indicator in kg.
11. Footer: **Your progress, one set at a time.**, **Saved automatically in this browser.**, and **Version yymmdd.hhmmss**.

The summary card remains sticky while scrolling (`position: sticky; top: 8px; z-index: 2`). The header and calendar scroll normally.

The favicon is a **32 × 32 SVG embedded as a data URI**, with a primary-green background, 8 px corner radius, and a horizontal white dumbbell consisting of plates and a bar. No separate image file or image generation is required. Keep the favicon and logo consistent with the brand.

## 4. Calendar and summary

- Select the current local date at startup, rather than a UTC date that might fall on a different day.
- Day keys use `YYYY-MM-DD`. Convert them to `Date` at local noon (`T12:00:00`); use local calendar arithmetic to prevent accidental timezone-related date changes.
- Weeks run Monday through Sunday. Arrows shift both the displayed week and selected date by seven days.
- Each day button is approximately 42 × 58 px, pill-shaped, and displays an English weekday abbreviation and day number.
- Selected day: dark background with white text. Today, when not selected: green inset border. Days with recorded machines: small green dot at the bottom.
- The calendar can scroll horizontally if all seven days do not fit.
- Dates and numbers use `en-GB` formatting; summary numbers allow up to two decimal places.
- Prefix the date with **Today ·** only for today, followed by the weekday, day, month, and year in English.
- Weekly summary: sum the volume of the seven visible days. Its current label is **This week**, including when browsing another week.
- Daily summary: **Total weight lifted today**, unit kg, and **Machines**, **Sets**, **Warm-up** counters.
- `Machines` includes the bike when added. `Sets` counts strength-training sets only. `Warm-up` displays cycling minutes.
- The summary reflects the selected date, even though some current labels contain the word “today.”

## 5. Machines, sets, and defaults

**+ Add machine** opens an **Add machine** dialog, using this order and these stable identifiers:

| ID | Display name | Recorded data |
|---|---|---|
| `bike` | Warm-up bike | Minutes |
| `abs` | Abdominals | Sets with reps and weight |
| `pulldown` | Lat pulldown | Sets with reps and weight |
| `quads` | Quadriceps | Sets with reps and weight |
| `calves` | Calves | Sets with reps and weight |
| `biceps` | Biceps | Sets with reps and weight |

- Allow only one instance of each machine per day. Disable already-added machines in the picker with **Already added**.
- Each picker option and machine card has a line-art SVG representing the actual exercise. Cycling, abdominals, pulldown, quadriceps, and biceps use distinct person/equipment drawings. **Calves must use exactly the same icon as Quadriceps**, as explicitly requested by the user.
- Exercise SVGs use `viewBox="0 0 32 32"`, rounded strokes, no fill, and approximately 1.6 stroke width. Display them at 30 × 30 inside a 38 × 38 soft-green box with 12 px corner radius. Reuse `exercisePaths` and `exerciseIcon()` from the HTML for exact fidelity.
- Adding a strength machine immediately creates **one set of 12 reps**.
- Its initial weight comes from the latest available set of the same machine, searching backward from the selected date. Include the selected day if it already has sets; always exclude later dates. Skip days where that machine has no sets. With no history, use **20 kg**.
- **+ Add set** creates another set of **12 reps**, reusing the latest weight under the same rule. Do not copy the previous rep count.
- Reps: integer from **1 to 999**, entered through a numeric field with an appropriate keyboard.
- Weight: dropdown from **20 through 70 kg inclusive, in 1 kg increments**: 51 options. No free-text weight, pounds, or fractions.
- Each row displays the set number starting at 1, reps, weight, and a remove action.
- Removing a set is immediate; remaining sets are renumbered. A machine may have no sets.
- Removing a machine requires a **Remove machine?** confirmation dialog with **Remove machine** and **Keep machine**. It affects only the selected day.
- The bike starts at **0 minutes**; its numeric field accepts 0–1440 minutes in 0.1 increments. It has no sets or kilograms.
- Save valid field edits through `change`; invalid input must not enter the data model. Display native validation and allow correction.
- Focusing a field or entering its existing value again must not create a data change.

### Copying the previous workout

- On a selected day with no entries, show **Copy last workout** when an earlier day with entries exists. Display the source date below it as **From D Month YYYY**.
- Search for the most recent nonempty workout strictly before the selected date. Skip empty days and never copy a later date, including when browsing historical days.
- Copy the complete workout: machine order, all sets, actual rep counts and weights, and bike minutes. The 12-rep default applies to adding new sets, not copying existing ones.
- Deep-copy the data so editing the copied workout cannot change its source.
- Never overwrite a day with entries. Hide the action when the day already has machines or there is no earlier workout; disable it while syncing or storage is unavailable.
- Save the copy as a normal new revision for the selected day, refresh summaries/calendar, and schedule automatic sync under the existing actual-change rules. Do not require a separate save or confirmation.

## 6. Calculations

```text
set volume = reps × weight in kg
machine volume = sum of its set volumes
daily volume = sum of all strength-machine volumes for the day
weekly volume = sum of daily volumes across the seven visible days
```

Example: 12 reps × 30 kg = **360 kg**. Two identical sets total **720 kg**. Cycling is tracked separately and never adds kilograms.

Display the daily total in the top summary and again at the bottom; also display each strength machine's subtotal.

**The app does not calculate calories.** Approximate estimates were discussed for the user (age 53, height 187 cm, weight 89 kg, sessions lasting 30–40 minutes), but implementing that feature was not requested. Those personal details are not product defaults and must not be saved in profiles or used in calculations without a new request. Do not automatically convert accumulated lifting kilograms into calories.

## 7. Data model and compatible persistence

In memory, workouts are represented by a date-keyed `logs` object:

```json
{
  "2026-11-09": [
    { "type": "bike", "minutes": 10 },
    { "type": "biceps", "sets": [
      { "reps": 12, "weight": 30 },
      { "reps": 12, "weight": 32 }
    ] }
  ]
}
```

Days without machines may be omitted from `logs`. Preserve machine and set order.

`localStorage` keys:

| Key | Purpose |
|---|---|
| `weights_logs_v1` | Preserved historical date-keyed logs; used only to stage offline migration if no newer history exists. |
| `weights_sync_v2` | Preserved legacy Drive revision state; never uploaded automatically or overwritten by Firebase sync. |
| `weights_firebase_guest_v1` | Current offline diary: `{ "version": 2, "account": null, "records": [...] }`. |
| `weights_firebase_user_v1:{projectId}:{uid}` | Authoritative local Firebase account history: `{ "version": 2, "account": "firebaseUid", "records": [...] }`. |
| `weights_firebase_config_v1` | Optional public Firebase configuration for developer testing; the HTML constant takes precedence. |
| `weights_legacy_imported_v1` | Records that the legacy offline history has been claimed, preventing it from being restaged for another user. |

Firebase SDK manages its own persisted authentication credentials. Application code does not manually store access tokens, refresh tokens, Google passwords, or an OAuth client secret.

Each revision stores a **complete snapshot of one day**, rather than an individual machine:

```json
{
  "id": "4df5534f-08d8-4cb3-b613-ab5bf778fa42",
  "date": "2026-11-09",
  "machines": [{ "type": "biceps", "sets": [{ "reps": 12, "weight": 30 }] }],
  "parents": [],
  "time": 1794222000000
}
```

- `id`: UUID generated by `crypto.randomUUID()`; `time`: milliseconds from `Date.now()`.
- `parents`: IDs of revisions for the same day that the new revision supersedes.
- Validate real dates, machine catalog, types, ranges, duplicate machines, unique IDs, and the parent graph. Reject cycles, missing parents, and parents from another day. The current validation limit is 20,000 revisions.
- At startup without guest state, stage the legacy revision history, or create one root revision per historical day if no revision history exists. Preserve all legacy storage. Once legacy import is marked complete, do not restage it.
- Rebuild `logs` from history. Do not reset the diary or silently overwrite corrupt data.
- On a storage failure, display a warning and pause sync; do not present unsaved data as synced.
- If another tab modifies the active diary key or Firebase configuration, invalidate pending sync operations and block editing/sync until reload to prevent mixing states or accounts.

## 8. Sync: Firebase Authentication and Firestore

**Current decision: use the same persistent-session approach as MacroDiario.** This explicitly supersedes the previous requirement for each user's files to live in their own Google Drive. Firebase Authentication identifies users; a shared Firestore project stores per-user workout histories.

- Users sign in once with Google. Explicit `Auth.Persistence.LOCAL` restores the session on reload and browser restart. Firebase manages token renewal; clicking Sync never starts another login while signed in.
- Sessions can still end because of explicit logout, revocation, browser data removal or browser restrictions. Do not promise a session can never expire or be revoked.
- No extra password, application-level encryption, Drive token management or custom backend.
- Database project administrators can access records. Per-user rules protect ordinary users from each other; they do not provide end-to-end encryption or independently owned databases.
- Keep Firebase configuration separate from MacroDiario. Do not reuse its project or credentials without the user's explicit decision.

### Startup, sign-in, logout and account isolation

1. Load local offline history, then initialize Firebase when valid configuration exists.
2. Load app/auth/firestore SDKs, create a named Firebase app `weights`, explicitly set local auth persistence, and subscribe to `onAuthStateChanged`.
3. Keep the app hidden from the initial HTML until the session is restored. The signed-out page is a full-viewport opaque screen showing the existing white dumbbell on a green rounded-square logo (72 × 72 px, 20 px corner radius, 28 px spacing) above **Sign in with Google**, centered with a maximum button width of 320 px. No welcome heading, explanatory text, offline bypass, account settings action, translucent backdrop, or underlying workout UI. Disable the button while restoring the session. Show an error message only when an error occurs; announce it accessibly.
4. Sign in through `GoogleAuthProvider` and `signInWithPopup`. Do not open an OAuth popup automatically on page load; the user activates the sign-in button. Restoring an existing session requires no popup.
5. On authentication change, invalidate old operations, switch to the correct project/UID local cache, refresh the UI, and initially sync that account. Do not merge another user's local cache.
6. Signed in: the top button is **☁ Sync now** and directly syncs. Signed out: **Sign in with Google** opens account settings.
7. The top-right avatar shows the Google profile photo, or initials if no usable photo exists or loading fails. Clicking it opens a right-aligned dropdown with the user's name/email and **Account settings**, **About Weights**, and **Log out**. Close on outside click, focus leaving, Escape, or account change; Escape returns focus to the avatar. Keep `aria-expanded` and accessible account labels accurate. **Log out** directly invokes the existing Firebase logout. The about dialog still contains **Manage account**, and account settings retain sync/logout actions.
8. **Log out** calls Firebase `signOut()` and returns to the sign-in gate and offline diary. Preserve the signed-out user's cached history, including unsynced edits, under its separate project/UID key. Do not show it to a different account or copy it into guest history. If logout fails, keep the current session and report the error.

Without configuration, the login page reports that the app owner must configure Firebase. Do not expose developer setup or an offline bypass on the login page, invent project values, or fall back to MacroDiario's project. Publish the embedded configuration before users sign in.

### When to sync

- Actual changes only: adding/editing/removing machines or sets, cycling minutes, copying a previous workout, importing offline workouts, and resolving conflicts.
- Save locally first, debounce for **1800 ms**, and avoid generating revisions or sync requests for unchanged values.
- Do not sync merely when browsing dates, focusing/blurring without changes, returning to the tab, or reconnecting the network.
- Deliberate exceptions: one initial sync after sign-in/session restoration and the manual **Sync now** action.
- If a workout field holds focus, defer pending sync until focus leaves; focus alone must not initiate sync.
- Avoid overlapping operations, disable editing during sync, and use a generation counter so results from an old account cannot mutate the current account.
- Network failures preserve local history and display an error. Operations have a 15-second timeout so unavailable services do not leave the interface permanently disabled. A write whose response times out may later complete; immutable IDs and idempotent writes make retries safe.
- No polling or real-time subscription is used. Another edit or manual Sync can retrieve another device's changes. Firebase's authentication renewal does not itself mean a workout sync runs.

### Firestore protocol and revision conflicts

- Path: **`users/{firebaseUid}/weightsRevisions/{revisionId}`**. Use this exact narrow subcollection; do not write to MacroDiario's `items` collection.
- Document: **`{ "version": 1, "p": "JSON-serialized revision" }`**. The local state still uses version 2; these are separate contracts.
- Read all revisions from the server in pages of 500, ordered by document ID (`orderBy('__name__')`), advancing with `startAfter(lastDocument)` and `.get({source:'server'})`. Continue until a short/empty page, rejecting histories over 20,000 total entries. Never request a limit above the server's 10,000 maximum; the total history limit is not a per-query limit. Do not report a cache-only response as a successful cloud sync.
- Parse and validate every payload, check the document ID against the revision UUID, reject changed contents for an existing ID, and validate the complete parent graph before applying or uploading.
- Save the merged account state locally, then `.set()` missing revision documents. Limit serialized payloads to 200,000 characters. Never overwrite differing revisions or delete history.
- `firestore.rules` allows authenticated users to read/create only their own revision documents. Creation checks the envelope, revision ID and size. Updating is allowed only when the complete document is unchanged, making retries idempotent. Deletes and all other paths are denied.
- The JSON payload is validated by the app; security rules validate its envelope and size but do not parse the JSON. Never use open test rules for production.
- Workout deletion creates a revision with `machines: []` and propagates without resurrecting old data.

A head is a revision not superseded by another revision's parent list for that day. Preserve every head. Display the latest by `time`, then `id`, provisionally. Different days merge automatically; multiple branches of the same day require **Review N conflicting day(s)** → **Choose a workout version**. A choice creates a revision descending from every current head. Normal edits descend only from the provisional head and must not silently resolve the other branches.

### Importing local and previous Drive data

- Preserve `weights_sync_v2` and `weights_logs_v1`. Stage available history into the offline diary, without automatically assigning it to a Firebase account.
- After sign-in, show **Import offline workouts** when offline history exists. Confirm **Import into my account** in a dialog explaining ownership and the migration.
- Merge revision histories without changing IDs, resolve conflicts normally, save the account copy first, then mark the legacy import and clear the active guest diary. Schedule normal change-triggered sync.
- The imported history must not be offered again to a different account. Keep old storage for recovery, but do not restage it once claimed.
- This version never requests Drive access, downloads Drive files, or decrypts old encrypted files. Cloud-only history must first be restored through the previous Drive app on its original browser. Firebase sign-in cannot recover missing Drive-only data.

## 9. Developer configuration and publishing

Current public configuration entry point: **`FIREBASE_CONFIG` in `weights.html`**, configured for project **`weights-41721`** with auth domain **`weights-41721.firebaseapp.com`** and app ID **`1:1009375055983:web:4d948a241aac746d2c7d9a`**. Required properties: `apiKey`, `authDomain`, `projectId`, `appId`. Other web SDK fields may also be included. These are public app settings, not service-account secrets.

- Obtain the configuration from Firebase Console → Project settings → General → Your apps → Web app. Add Firebase to the existing Weights Google Cloud project or create a separate Weights project.
- Enable Google in Authentication, add `jmhostalet.github.io` to authorized domains, create the default Standard/Native Firestore database, and publish the exact repository `firestore.rules`.
- Prefer embedding the public configuration once before publishing. A developer-only settings textarea can also save it for a browser; ordinary users should not need to configure it.
- Never embed private keys, service-account JSON or client secrets. The previous Drive OAuth client ID is no longer used.
- Repository: `https://github.com/jmhostalet/weights`, branch `main`. App: `https://jmhostalet.github.io/weights/weights.html`.
- GitHub Pages remains the static host. Firebase Hosting and a custom backend are not required. `FIREBASE_SETUP.md` contains the setup and migration procedure; the old Drive guide is a retirement notice.
- Editing files does not publish them. Verify push, Pages deployment status and live HTML before diagnosing cache; a `?v=...` URL cannot fix an unpublished or failed deployment.
- Do not announce live Firebase readiness until configuration, provider setup, rules and actual account tests are verified. Emulator and mocked tests do not verify the deployed project.

### Visible version on every push

- Display `<span id="appVersion">Version yymmdd.hhmmss</span>` in the footer.
- The version represents that publication's generation date/time in **Europe/Madrid**, including daylight saving time. For example, `261109.173359` means November 9, 2026 at 17:33:59.
- Every push to `main` runs `.github/workflows/pages.yml`: checks the logic, generates `_site/weights.html` with `scripts/stamp-version.py`, copies the Firebase guide and the Drive retirement notice, and publishes the artifact to Pages. Manual execution is also supported.
- Configure **Settings → Pages → Build and deployment → Source: GitHub Actions** once. This workflow replaces direct branch publishing so Pages serves the HTML with its generated version.
- Generate the timestamp while preparing the deployment associated with the push, not when a visitor opens the page. Do not use the visitor's browser time as the version or regenerate it when saving workouts.
- The workflow does not create automatic commits: the source file retains its latest locally stamped version, while published HTML receives the new one. To update the local copy, run `python3 scripts/stamp-version.py`.
- The script accepts `--output` to write a copy and `--timestamp` with a timezone for reproducible checks. Do not rename `appVersion` without adapting the script.
- Pushing a branch other than `main` does not update the public version. Only the latest completed deployment becomes visible; caches may temporarily display an earlier version.

## 10. Accessibility and validation

- Preserve accessible labels for icon buttons and fields, identifying the exercise and set number.
- Days use `aria-pressed`; warnings use `role="alert"`; sync status uses `role="status"`; the final total uses `aria-live="polite"`.
- Native dialogs have associated titles, explicit close actions, and keyboard navigation. Visible focus uses a green outline.
- Decorative SVGs use `aria-hidden="true"`; exercise identification must not depend on icons alone.
- Respect `prefers-reduced-motion`; use brief entrance animation only when motion is allowed.

Run the logic tests when modifying data handling or sync:

```bash
node --test tests/sync.test.cjs
```

The logic suite covers legacy staging, corrupt data, revision conflicts/deletions, explicit persistent Firebase session restoration, syncing without repeated popups, two-device transfer, explicit import, account and project isolation, logout, failures, actual-change scheduling, and copying previous workouts. Preserve coverage rather than a specific test count.

`tests/firestore.rules.test.cjs` checks real access controls against the Firestore emulator: unauthenticated denial, cross-user denial, valid owner writes, immutable history, idempotent retries and size limits. See `FIREBASE_SETUP.md` for the emulator command and development-only dependencies.

When changing the interface, check a browser at approximately 390 × 844 px and narrower sizes: calendar, machine/set editing, copying previous workouts, totals, historic defaults, icons, favicon/version, and the sign-in gate. For auth/sync changes, verify startup restoration, reload without popup, two contexts, import, account switching and logout. Distinguish simulated browser tests and emulator checks from actual Firebase project authorization.

## 11. Rules for future changes

- Preserve existing data, machine identifiers, local keys, cloud schema, and revisions unless implementing an explicit compatible migration.
- Keep the single-file architecture, English interface, and MacroDiario visual style adapted for weight training.
- Keep Firebase Authentication + Firestore as the current backend. Do not reintroduce standalone Drive OAuth, an additional password, or automatic workout sync triggered merely by navigation.
- Do not personalize the product with the age, height, or weight mentioned in the conversation.
- Ask the user if a new decision changes data ownership, the login experience, or adds features outside the agreed scope; routine changes can follow this specification.
- Update this document when a product decision or data contract changes. Distinguish implemented behavior from future proposals.
- Keep all instructions and documentation in this file fully in English.
