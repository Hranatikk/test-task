# Release note

## Permissions

None. No `READ_EXTERNAL_STORAGE` / `READ_MEDIA_*` on Android, no photo-library or
file-access entitlement beyond the system document picker on iOS. The picker itself
grants temporary, revocable access to only the one file the user picked
(`@react-native-documents/picker`, `mode: 'open'`); our own native code never asks for
broader storage access.

## Where copies of the file live

- **Android:** `context.noBackupFilesDir/imports/<opId>.bin` — private to the app, excluded
  from Auto Backup by virtue of being under `noBackupFilesDir`, not `cache` (cache can be
  cleared by the OS under pressure before we've gotten a `jobId` back).
- **iOS:** `Library/Application Support/imports/<opId>.bin`, with
  `NSURLIsExcludedFromBackupKey` set on the directory.
- **Lifetime:** from the moment the file is picked until the server accepts the upload
  (202) or the operation is cancelled/rejected — at which point the copy is deleted
  immediately. A crash between copying and recording that fact in persisted state is
  handled by `sweep()`, run at every app start, which deletes anything in that folder not
  referenced by the currently-persisted operation.
- Neither the original file name nor its bytes are ever written to persisted app state —
  only `opId`, size, and detected format. The display name is held in memory only, for the
  confirmation screen and the `X-File-Name` header.

## What is stored permanently (MMKV)

`opId`, `phase`, the idempotency key, the delete key, `jobId`, and the last **accepted**
server status/revision. That's it — no file name, no bytes, no transaction descriptions.

## How to clear data

- **"Delete import"** in the app: an authenticated server operation. The UI does not say
  "deleted" until a `GET` confirms `status: "deleted"` — a `202` from the `DELETE` call is
  only ever shown as "deleting".
- **"Clear local data"** on the Diagnostics screen (dev builds only): wipes the local
  operation state and any staged file copy. Explicitly labeled "server not touched" —
  this cannot be used to fake a delete.
- Uninstalling the app removes everything above, since none of it is backed up.

## Signals that should stop a rollout

- A rising rate of `409` responses to `POST /imports` — the idempotency key is being
  reused with different bytes, which should be impossible if persist-then-act is working;
  it would mean a client is retrying with a key it didn't actually generate fresh, or
  state got corrupted between the key being written and the bytes it was written for.
- `newJobs` (or equivalently, distinct jobs per user per short window) greater than one
  for what the user experienced as a single import — the literal stop-factor from the
  brief (second job after a retry).
- A `DELETE` returning `202` with no later `GET` resolving to `deleted` within a few
  minutes — points at a server-side stuck `deleting` state, not a client bug, but the
  client should surface it (it currently never auto-resolves "deleting" past a short
  polling window without user action; that's worth an explicit alert in production).
- A rising share of operations stuck in `uncertain` that never resolve via `by-key` —
  suggests the by-key recovery path itself is failing, not just individual POSTs.

## OTA/JS vs. a new native binary

**Ships via OTA/JS** (no app store release needed): the reducer and all its rules,
screens and copy, polling intervals/backoff, the `sniff()`/format-detection rules (the
*byte* size limit check happens natively before the bytes are even read into JS, but the
numeric limit itself is passed in from JS, so lowering/raising it is OTA-safe; removing
the native pre-check entirely would not be).

**Requires a new native binary:** anything inside the `StatementFile` Turbo Module
(the streaming stage/upload/remove/sweep implementation, in Kotlin and Objective-C++),
the document-picker and MMKV native libraries, the Android `network_security_config.xml`
/ iOS `NSAppTransportSecurity` entries, any manifest/Info.plist permission, and the React
Native / New Architecture version itself. This also covers the `patch-package` fix below —
it edits Objective-C++ inside the picker pod, so it only takes effect in a new iOS build,
never via OTA.

## Known third-party native bug, patched

`@react-native-documents/picker@12.0.2`'s iOS `releaseSecureAccess` native method calls a
main-actor-isolated Swift method off the main queue and crashes (`EXC_BREAKPOINT`) the
first time our own `release()` call runs after staging — i.e. on every successful pick,
not an edge case. This is a bug in the third-party pod, not in our code, so it's carried
as a `patch-package` patch (`mobile/patches/@react-native-documents+picker+12.0.2.patch`)
applied by the `postinstall` script rather than hand-edited in `node_modules`.

**Rollout risk:** if a CI pipeline or install step ever runs with install scripts
disabled (`npm ci --ignore-scripts`, or an equivalent lockfile-only restore that skips
`postinstall`), this patch silently does not apply and the iOS picker crash returns on
every file pick, with no build-time signal — `pod install`/`xcodebuild` would still
succeed, since the unpatched source still compiles. Treat "`npm run ios` crashes
immediately on file selection" as a first thing to check if that ever happens, and verify
the patch is applied via `git status mobile/node_modules/@react-native-documents/picker/ios/RNDocumentPicker.mm`
before assuming it's a new bug. Upgrading `@react-native-documents/picker` past `12.0.2`
should also re-check whether this patch is still needed (`npx patch-package` will fail
loudly if the upstream file no longer matches).
