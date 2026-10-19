# Self-review

## Decisions I'd defend

1. **Persist-then-act, not optimistic-then-fix.** The idempotency key is written to
   storage *before* the network call starts (`CONFIRMED` commits before `POST_STARTED`
   commits before `uploadFile()` is even invoked — see
   `core/modules/statement-import/service/importController.ts`). The same is true for the
   delete key. This is the one property the whole brief is actually testing for, and it's
   cheap to get right if it's the first thing you build rather than a thing you bolt on
   after the happy path works. The `importController.test.ts` unit test asserts this
   directly by inspecting storage from inside a fake `uploadFile`.

2. **Monotonic revision + "once deleting, only deleting/deleted" as two independent
   guards**, not one. `acceptStatus()` rejects a lower-or-equal revision regardless of
   intent, and separately rejects anything that isn't `deleting`/`deleted` once a delete
   has been requested, regardless of revision. Two stop-factors in the brief (`second job`,
   `false delete confirmation`) map to these two guards plus the idempotency-key
   persistence above — I treated those three checks as the load-bearing wall and built
   everything else around them, not the other way round.

3. **The native module does exactly three things and nothing else:** stream a copy with a
   hard size cap (checking declared size before reading, and aborting mid-stream if the
   actual byte count exceeds the limit — never trusting `ContentResolver`/`NSURLFileSizeKey`
   metadata alone), upload straight from that file, and clean up. No parsing, no
   business logic crossed the JS/native boundary, which is what made it possible to unit-
   test the entire controller/reducer/API layer in Node against the real mock server
   (30 passing tests) without ever touching a simulator.

## What I simplified because of the time box

- One operation at a time. There's no multi-import queue; starting a new pick while one
  is in flight isn't a supported flow in this build (the controller always treats
  `pickFile()` as resetting to a fresh `opId`).
- No native unit tests for the Kotlin/Obj-C++ module itself — I verified it by actually
  building and running it (see README's platform table) rather than writing
  instrumented tests for it. That's the honest gap I'd fill first with more time.
- **Update, post-submission:** driving the iOS picker interactively (something the
  original submission couldn't do — see README's prior "Honest gap") surfaced two real
  native crashes that zero unit/integration tests could have caught, because both lived
  entirely outside the JS controller/reducer layer those tests exercise: (1) our own
  `documentPicker.ts` spread a *string* (`types.csv`'s iOS UTI) instead of an array,
  handing the system picker garbage type filters and crashing it on file tap; (2)
  `@react-native-documents/picker@12.0.2`'s `releaseSecureAccess` native method
  (a third-party bug, patched via `patch-package`) called a main-actor-isolated Swift
  method off the main queue and crashed on every `release()`. Both are now fixed, and a
  full interactive iOS happy-path (pick → ready → delete → deleted) runs clean. This is
  the concrete argument for the native-instrumented-test gap above: a thin JS-only test
  surface will not catch a native picker or a native-module threading bug, no matter how
  good its coverage number looks.
- If the OS reclaims the staged file before a `jobId` comes back (e.g., the user force-
  kills the app mid-upload and the OS also decided to clear the directory, which
  shouldn't happen since it's `noBackupFilesDir`/excluded-from-backup but isn't
  cache-pressure-proof in theory), `retryPost()` surfaces a plain "choose the file again"
  failure rather than trying to re-derive anything. A new operation gets a new key, which
  is correct, just not maximally forgiving.
- No background polling: polling only runs while the app is foregrounded. The app does
  not currently pause/resume the poller on `AppState` changes — it's short-lived (seconds)
  by design of the mock's timing, so this didn't surface in testing, but a slower real
  backend would need that wired in before shipping.

## What breaks first in production, and how I'd notice

**Long `uncertain` stretches on bad mobile networks.** The happy path here resolves in
about a second because the mock's `ready` threshold is tuned for a demo. A real backend
processing a real statement could leave a user in `uncertain` for much longer while they
have poor connectivity, and the only way out right now is a user-initiated "check again"
or "send again" — there's no background retry. I'd watch the fraction of operations that
reach `uncertain` and never resolve via `by-key` within some window (the same metric the
release note's rollout-signal section calls out), and I'd expect to add a bounded
background retry with backoff once that number is non-trivial.

**AI disclosure.** I used an AI assistant to scaffold boilerplate (test harness structure,
first drafts of the Kotlin/Obj-C++ native module against the generated TurboModule specs,
and this documentation's prose). I verified it myself by: running the full test suite
from a clean state (30/30 passing, shown in the README), running `tsc --noEmit` and
`eslint` clean, actually building both native projects from scratch (`gradlew
assembleDebug`, `xcodebuild`) rather than trusting that generated native code compiles,
and manually driving the Android build through `happy` and `delete` via `adb input tap` +
screenshots, cross-checking the mock's own `/__test/state` counters after each step
against what the UI claimed.

In a later session, the same AI assistant diagnosed both iOS crashes described above —
not from a guess, but from reading the actual `.ips` crash reports in
`~/Library/Logs/DiagnosticReports/` (symbolized stack traces identified the exact
faulting native frame in each case) and the relevant library source before changing
anything. I verified its fixes myself the same way as everything else: `tsc --noEmit`
clean after the JS fix, a real `xcodebuild`/`npm run ios` rebuild after the native patch,
and then drove the full iOS happy-path by hand while the assistant cross-checked
`/__test/state` after each tap and confirmed no new crash report appeared — not just
"the code looks right."
