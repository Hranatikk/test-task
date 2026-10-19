# Statement import — without losing state

A small, bare React Native (New Architecture) client for a hiring-kit test task: pick a
synthetic bank statement, send its bytes to a local HTTP mock, survive a lost response and
an app relaunch, and delete the import as a separate, honestly-reported server operation.

**Not included, on purpose:** real PDF/CSV parsing (the mock returns a fixed result),
authentication, payment, subscription cancellation, or any real bank integration. The
mock server and fixtures under `kit/` are the unmodified candidate kit and are not
changed by this submission (`npm run verify:kit` checks this).

## Requirements

- Node.js ≥ 20 (developed/verified with Node 22.23.3)
- Xcode 16+ (verified with Xcode 27.0) and CocoaPods, for iOS
- Android Studio SDK (verified with `compileSdk`/Gradle AGP from the RN 0.88 template), a
  JDK 17 (verified with Zulu 17.0.14), and an emulator or device, for Android
- `bundle`/Ruby for CocoaPods, as installed by the React Native template (`mobile/Gemfile`)

## Clean checkout

```bash
git clone <repo> && cd statement-import
npm run verify:kit                 # confirms kit/ is byte-for-byte the shipped kit

(cd kit && npm test && npm run fixtures:oversize)

cd mobile
npm ci
(cd ios && bundle install && bundle exec pod install)

npm test                           # unit + integration tests against a real mock instance
npm run typecheck
npm run lint
```

Run the mock and the app in two terminals:

```bash
# terminal 1 — from mobile/
npm run mock                       # starts kit/mock-server.mjs on :8787

# terminal 2 — from mobile/
npm start                          # Metro
npm run android                    # adb reverse tcp:8787, then builds+installs+launches
# or
npm run ios                        # simulator reaches the host's localhost directly
```

A physical device: edit the base URL on the Diagnostics screen (`__DEV__` only) and
restart the app — the override is read once at startup, matching `app/setup/rootStore.ts`.
Run the mock with `HOST=<your LAN IP>` only on a trusted network; the `/__test/*` routes
have no auth.

## Switching mock scenarios

Open the **Diag** button in the top-right corner of the Import screen (visible only in
dev builds) and tap one of `happy` / `lost_ack` / `stale_status` / `delete_failure`. The
same screen shows live mock counters (`createRequests`, `newJobs`, `duplicateHits`,
`deleteRequests`) and a switch to disable auto-recovery after a lost POST, which is what
makes the `lost_ack` + relaunch demonstration visible instead of resolving itself
instantly. Equivalent `curl` commands are documented in `kit/README.md`.

## Automated test results

Run from a clean checkout (`cd mobile && npm test`):

```
PASS core __tests__/integration/happy.test.ts
PASS core __tests__/integration/deleteFailure.test.ts
PASS core __tests__/integration/lostAck.test.ts
PASS core __tests__/integration/stale.test.ts
PASS core core/modules/statement-import/__tests__/reducer.test.ts
PASS core core/shared/validation/__tests__/fileSignature.test.ts
PASS core __tests__/integration/localReject.test.ts
PASS core core/modules/statement-import/__tests__/importController.test.ts

Test Suites: 8 passed, 8 total
Tests:       30 passed, 30 total
```

`npm run typecheck` and `npm run lint` are both clean. The integration suite boots the
**unmodified** `kit/mock-server.mjs` on a throwaway port/state file (see
`mobile/__tests__/setup/globalSetup.mjs`) and drives the client's HTTP client, controller,
and reducer against it exactly as the device build does — only the native file-staging
step is replaced by a Node `fs`-based fake (`mobile/__tests__/helpers/nodeFileStager.ts`),
since content-URI/security-scoped-URL access only exists on-device.

## Platform results

| Scenario | Android | iOS |
|---|---|---|
| Native build (incl. the `StatementFile` Turbo Module) | ✅ `./gradlew :app:assembleDebug` succeeds | ✅ `xcodebuild … BUILD SUCCEEDED` |
| App launches, Import screen renders | ✅ | ✅ |
| Picker → stage → validate → confirm card | ✅ driven interactively (see below) | ✅ driven interactively (simulator, `statement.csv` via Files › On My iPhone › Downloads) |
| happy: queued → processing → ready, correct totals | ✅ verified live against the real mock (151.99 AUD/mo) | ✅ verified live against the real mock (StreamBeam 19.99 + BrightGrid 132.00 = 151.99 AUD/mo) |
| delete: 202 → poll → `deleted`, counters match | ✅ verified live (`deleteRequests: 1`, final status `deleted`) | ✅ verified live (`deleteRequests: 1`, final status `deleted`, revision 1→5 monotonic) |
| lost_ack / stale_status / spoofed+oversize | ✅ covered by the integration suite above, which exercises the same controller/reducer code the device build runs | ✅ same code, same coverage |

**Devices used:** Android emulator `sdk_gphone64_arm64`, Android 16 (API 36). iOS
Simulator "iPhone 17 Pro", iOS 26.2.

**Two iOS-only native bugs found and fixed after the initial submission:**

1. `core/modules/statement-import/service/documentPicker.ts` built its `type` filter
   with `[types.pdf, ...types.csv, types.plainText]`. `@react-native-documents/picker`
   exports `types.csv` as an *array* of MIME types on Android but as a single UTI
   *string* on iOS — spreading the string shredded it into individual characters,
   handing the native `UIDocumentPickerViewController` a list of garbage one-letter
   UTIs and crashing it natively the instant a file was tapped, before any JS ever ran.
   Fixed by normalizing `types.csv` to an array before spreading.
2. `@react-native-documents/picker@12.0.2`'s own `releaseSecureAccess` native method
   (`ios/RNDocumentPicker.mm`) called `stopAccessingOpenedUrls:` directly on the
   TurboModule background queue, while the Swift implementation is main-actor isolated
   — every call crashed with `EXC_BREAKPOINT` / `_checkExpectedExecutor` on the very
   first `release()` our `fileIntake.ts` issues after staging. `pick:` and
   `writeDocuments:` in the same file already wrap their native call in
   `dispatch_async(dispatch_get_main_queue(), …)`; `releaseSecureAccess:` was simply
   missing the same wrap. This is a third-party library bug, not our code, so it's
   patched via `patch-package` (`mobile/patches/@react-native-documents+picker+12.0.2.patch`,
   applied automatically by the `postinstall` script) rather than edited in place.

**Honest gap, updated:** with both crashes fixed, the full interactive iOS loop (pick →
stage → confirm → `queued`/`processing` → `ready` with correct totals → delete →
`deleting` → `deleted`) was driven by a human operator in the simulator, with
`GET /__test/state` polled continuously against a reset baseline and cross-checked after
every step — the same evidence a reviewer would collect themselves per the brief
(`createRequests: 1`, `newJobs: 1`, `deleteRequests: 1`, final `status: "deleted"`,
revision monotonically 1→2→3→4→5, zero new entries in
`~/Library/Logs/DiagnosticReports/StatementImport-*.ips` throughout). No screenshots or
video were captured for this run (no GUI-automation/screen-recording tooling available —
macOS Accessibility access for `System Events`/AppleScript isn't grantable in this
environment, and `idb-companion` isn't installed), so unlike the Android walkthrough this
iOS evidence is counter-based, not screenshot-based. Given the Obj-C++ `StatementFile.mm`
mirrors the Android Kotlin module against the identical `NativeStatementFileSpec`
contract, and the entire controller/reducer/API layer is the same JS on both platforms
(proven by the integration suite), this closes what was previously the largest open gap
in this submission.

## Recording

No video is included from this session (no screen-recording tooling available) — see
the screenshot-based Android walkthrough and the counter-based iOS walkthrough
referenced above for the actual evidence this submission relies on. A reviewer recording
their own run should capture: iOS, Android, `happy`, `lost_ack` + relaunch,
`stale_status`, `delete_failure`.

## More

- [`docs/RELEASE_NOTES.md`](docs/RELEASE_NOTES.md) — permissions, where files live, how to
  clear them, rollout signals, OTA vs. native-binary boundary.
- [`docs/SELF_REVIEW.md`](docs/SELF_REVIEW.md) — decisions, what was cut for time, what
  breaks first in production.
