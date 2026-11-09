# Google Drive sync for Weights

Each person stores workout revisions in their own Google Drive application-data folder. There is no shared workout database or app backend. The Google Cloud project identifies the app and manages API configuration; it does not own users’ Drive files.

## One-time app setup

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select a project for Weights. You can use one project for all users; they do not need to create projects.
2. Enable **Google Drive API** in **APIs & Services → Library**.
3. Configure **Google Auth Platform**: app branding, support email, audience and developer contact. For personal accounts choose an external audience. While the app is in testing, add each permitted Google account as a test user. To offer it more widely, complete Google's production publishing requirements.
4. Under **Data Access**, add only this scope:
   ```text
   https://www.googleapis.com/auth/drive.appdata
   ```
5. Create an OAuth client under **Clients**, with application type **Web application**.
6. Add the exact **Authorized JavaScript origins** where Weights runs:
   - `https://jmhostalet.github.io` for GitHub Pages (no `/weights` path).
   - `http://localhost:8000` if you use that local development port.
   The app uses Google's browser popup token flow; no redirect handler or client secret is used.
7. Copy the public client ID ending in `.apps.googleusercontent.com`. Either:
   - Paste it into **Sync with Google Drive** on each device, or
   - Set `GOOGLE_CLIENT_ID` in `weights.html` once and publish that file. This is public configuration, safe to include in HTML. Never put a client secret in the app.
8. Publish `weights.html` and this setup guide to GitHub Pages using your normal workflow. Open `https://jmhostalet.github.io/weights/weights.html`. `file://` pages cannot connect; use HTTPS or localhost.

All devices must use the same Weights OAuth app/project to access the same application-data folder. Google account login alone does not grant Drive access: Google also needs the app identity and the user's consent.

## User experience

After the app owner sets `GOOGLE_CLIENT_ID` and publishes Weights, users only:

1. Open **Sync with Google Drive**.
2. Confirm this browser's workouts belong to the account they will select.
3. Click **Connect Google Drive**, choose their Google account and grant permission.

No separate password or encryption key is needed. On another device, connect the same account. Users do not create projects, databases, API keys or OAuth client IDs.

If the app owner has not configured the client ID yet, the **App owner setup** section opens with the configuration field and this guide. Once configured, that section remains collapsed.

## Everyday use

- Workouts save locally while offline. When connected, edits sync after editing, on returning to the app and on reconnecting to the network. **Sync now** also checks for changes. The app must be open; there is no background service.
- Google's access token is kept only in memory. After reloading or when the token expires, reconnect Google Drive. No Google password is handled by Weights.
- **Disconnect** clears the app's access token. It keeps local workouts and cloud files and does not revoke Google's app permission. You can revoke permission in your Google account settings.
- Each browser diary binds to the first successfully synced account. Use separate browser profiles for different people to avoid mixing workouts.
- Different days merge automatically. If devices edit the same day concurrently, **Review conflicting days** lets you choose the version to keep. All revisions remain in the history.
- Deletions propagate as revisions. Sync appends files rather than overwriting them. History and Drive usage grow over time; automatic compaction is not implemented.
- Wait for **Synced** before closing. Retries deduplicate revisions by their IDs.
- If another tab changes local storage, editing and sync pause until you reload. Use one tab per browser profile.

## Privacy

Workouts are stored as readable JSON in the signed-in user's private Google Drive application-data folder. Access relies on Google's account authorization and Drive permissions. Weights does not apply additional application-level encryption.

Owning the app's Google Cloud project does not grant administrative access to users' Drive files. The app itself has the access each user authorizes, so users must trust the app code and its hosting.

Local workouts and history are also readable in the browser profile. Clearing browser data removes that local copy; successfully synced workouts can be restored by connecting the same Google account and app.

## Upgrading from the earlier encrypted version

Local revision history is retained unchanged. New cloud files use the `weights-revision-v3-` prefix and readable JSON; existing encrypted `weights-revision-v2-` files are never overwritten or deleted.

Connect first from a device holding the complete original local history. Weights checks that every old encrypted revision has a matching local or new-format revision before uploading. It then republishes the available history in the new format, without needing the old password. Other devices can subsequently restore it with Google authorization alone.

If any encrypted revision is missing locally and has not been republished, sync stops before uploading. Recover that history using the earlier app version and its original encryption password, then upgrade that device. This version cannot decrypt old files and does not pretend an account login can recover encrypted data. Do not clear original devices' browser storage before migration.

## Verification

Run `node --test tests/sync.test.cjs`. Tests cover local migration, cloud-format validation, two-device sync with mocked Drive requests, deletions, conflicts, expired sessions, account separation, network failures and safe handling of old encrypted files. Live Google authorization still requires the configured client ID and account consent.

References: [Google Drive application data](https://developers.google.com/workspace/drive/api/guides/appdata), [Google Identity Services browser token flow](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Drive multipart uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads).
