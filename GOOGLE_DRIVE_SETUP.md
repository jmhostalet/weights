# Previous Google Drive sync (retired)

Weights now uses Firebase Authentication and Firestore for persistent Google sessions and workout sync. Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for current setup.

The old standalone Drive OAuth client ID and `drive.appdata` permission are no longer used. No Drive files are deleted by this upgrade. Restore any cloud-only workouts with the previous version before migration, then import the original browser's offline history into the intended Firebase account using **Import offline workouts**.

Earlier encrypted Drive files still require the previous app and original password if no readable local copy exists. Firebase login cannot decrypt or recover those files automatically.
