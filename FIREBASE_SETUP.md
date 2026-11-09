# Firebase setup for Weights

Weights now uses **Firebase Authentication with Google** and **Cloud Firestore**, following MacroDiario's persistent-session model. Google Drive sync is no longer used. The app still runs as static HTML on GitHub Pages; Firebase provides authentication and storage without a custom application server.

## Current app configuration

The public web configuration supplied by the app owner is embedded in `weights.html` for project **`weights-41721`**, auth domain **`weights-41721.firebaseapp.com`**, and web app **`1:1009375055983:web:4d948a241aac746d2c7d9a`**. End users do not need to paste configuration. Analytics is not initialized.

Google Authentication, authorized domains, the Firestore database, and deployed security rules still need to be enabled/verified in Firebase Console. Embedding configuration does not activate those services or publish rules.

## 1. Obtain the Firebase web configuration

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Add Firebase to your existing **Weights Google Cloud project**, or create a dedicated Weights Firebase project. Do not reuse MacroDiario's project or its configuration without an explicit decision.
3. Open **Project settings → General → Your apps**.
4. Register a **Web app** using the `</>` icon, named **Weights**. Firebase Hosting is not required because the app uses GitHub Pages.
5. Copy the `firebaseConfig` object from the SDK setup instructions. It is also available under the registered web app in Project settings.

Example structure (replace every placeholder with the actual values):

```javascript
const firebaseConfig = {
  apiKey: "YOUR_PUBLIC_FIREBASE_WEB_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_WEB_APP_ID"
};
```

This is public web configuration, not a service-account credential. Do not upload a service-account JSON, private key, or OAuth client secret into the app.

Set the `FIREBASE_CONFIG` constant in `weights.html` to this object before publishing. For local testing, paste the object into **Account settings → App owner setup → Firebase web app configuration** and save it. Per-browser setup is a developer convenience; end users should receive a published app with the constant already configured.

## 2. Enable Google sign-in

1. Open **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Google** and set the required support email.
3. In **Authentication → Settings → Authorized domains**, add:
   - `jmhostalet.github.io`
   - `localhost`, if using local development.
4. Keep the project's standard Firebase authentication domain. The app uses Firebase's Google popup provider; the older standalone Drive OAuth client ID is no longer consumed by Weights.

Google/Firebase may show additional consent or app-publication requirements. Follow those prompts for your chosen audience.

## 3. Create Firestore and publish the security rules

1. Open **Build → Firestore Database → Create database**.
2. Use a **Standard edition / Native mode** default database and choose an appropriate region. Start with locked/production rules, not open test access.
3. In the **Rules** tab, replace the rules with the exact contents of `firestore.rules` from this repository and click **Publish**.
4. Alternatively, with Firebase CLI authenticated to the correct project:
   ```bash
   firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
   ```

Each user accesses only:

```text
users/{firebaseUid}/weightsRevisions/{revisionId}
```

Each document stores `{ version: 1, p: "JSON-serialized workout revision" }`. Revisions are immutable; repeating an identical write is allowed, while changing or deleting an existing revision is denied. Workout deletion is recorded as a new revision with an empty day.

The rules deny unauthenticated access, access to another user's records, and access outside the specific diary subcollection. The app also validates revision contents and history before merging. Rule validation limits the document envelope and payload size; it does not parse the JSON payload.

**Project owners/administrators can access database records through administrative permissions.** Per-user rules isolate ordinary app users; they do not provide end-to-end encryption or a separately owned database per person. This is the intentional change from the previous Drive design.

## 4. Publish and use the app

Publish the updated `weights.html` and `FIREBASE_SETUP.md` using the existing versioned Pages workflow. The version format remains `yymmdd.hhmmss` in Europe/Madrid time.

On startup, a configured app loads Firebase and restores its saved session. If no session exists, it shows **Welcome to Weights → Sign in with Google**. **Continue offline** permits local-only use.

Firebase explicitly uses `Auth.Persistence.LOCAL`: the session survives reloads and browser restarts on the same browser profile. Firebase manages token renewal. **Sync now** only synchronizes; it does not request login again. **Account settings → Log out** signs out and hides the account diary. Firebase can still require sign-in again after session revocation, browser data clearing, account security changes, or browser storage restrictions.

The app's own code never stores access/refresh tokens. Firebase SDK manages its persistent credentials. Cached workout histories are separate for each project and Firebase UID. Logging out preserves those caches so pending local edits remain available when the same user returns. They remain readable to someone with access to that browser profile; logout is not local encryption or secure deletion.

Automatic sync happens only after actual workout edits, with a 1.8-second debounce. A restored/signed-in session also performs one initial sync. Manual sync is always available. Merely viewing days, returning to a tab or recovering network connectivity does not trigger background sync. Offline edits are saved locally and can be retried with another edit or **Sync now** when online.

## 5. Migrate existing workouts

The previous `weights_sync_v2` and `weights_logs_v1` entries are preserved. On first upgrade, available local revision history becomes the offline diary. It is not automatically assigned to a Firebase user.

1. Use the original browser/profile holding your full workout history. Before upgrading, restore any missing history through the older Drive version, especially on devices that have not synced recently.
2. Sign in to Firebase with the intended Google account.
3. Click **Import offline workouts** and confirm that the local workouts belong to that account.
4. The app merges the complete revision history into that account, preserving conflicts and deletions, and schedules sync. It clears the active offline diary after the account copy is safely saved. Legacy storage remains preserved but is marked as already imported so it is not offered to another account again.
5. On another device, sign in to the same Firebase account to restore the Firestore diary.

Old Drive files, including encrypted files, are untouched. The Firebase version does not fetch or decrypt them. It does not ask for the old encryption password. If data exists only in Drive, retrieve it through the previous version first; do not erase original browser storage prematurely.

## 6. Verification

```bash
node --test tests/sync.test.cjs
```

The suite simulates Firebase session restoration, sync, account switching, migration, logout, failures and conflicts. It does not use a live project or verify its deployed rules.

`tests/firestore.rules.test.cjs` exercises the real Firestore emulator, including cross-account denial, unauthenticated denial, idempotent retries and immutable history. It uses development-only dependencies `@firebase/rules-unit-testing` and `firebase`, plus Firebase CLI and Java. With those dependencies available, run through the emulator:

```bash
firebase emulators:exec --only firestore --project demo-weights "node --test tests/firestore.rules.test.cjs"
```

During this restructuring, browser checks also used the real Firebase SDK with local Authentication/Firestore emulators to verify persisted login across reload, writes, direct Sync, and persistent logout. That does not verify the live Google popup or project configuration.

Before announcing live readiness, test your configured project: Google login, refresh/browser reopen without another login, two-device sync, explicit logout, and denial of another account's data.

References: [Firebase session persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence), [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin), [Firestore security rules](https://firebase.google.com/docs/firestore/security/rules-conditions).
