# Design lint (report-only) spec

## Purpose

Every pull request gets a design-quality report for the pages it would ship.
A detector scans the built site, as served, for UI anti-patterns (generic
"AI-generated" tells, contrast, typography, layout and quality rules) and the
report lands in the job summary and as a downloadable artifact.

The check is report-only. It never blocks a merge. It exists so findings are
visible on every change before anyone decides to enforce any of them.

## Terms

- **Detector**: the Impeccable `detect` command, installed as an exact-pinned
  dev dependency. Its exit codes are 0 (scanned, no primary findings),
  1 (at least one target could not be scanned) and 2 (scanned, primary
  findings present).
- **Page**: one route the build emits as its own HTML file, served by a local
  preview server.
- **Canary**: a small page with known anti-patterns, served beside the site
  and scanned in the same detector run. It is never deployed.
- **Primary finding**: a detector finding that counts toward its exit code.
  **Advisory finding**: listed by the detector but never counted as a failure.
- **RAN**: the scan provably happened. **NOT RUN**: it did not, or we cannot
  prove it did.

## Scenarios

1. **A normal pull request with findings.** The site builds, every page serves
   HTTP 200, the detector exits 2, the canary is flagged. The report status is
   RAN, it states pages scanned (greater than 0), total, primary and advisory
   counts, a table per rule and a table per page (pages with no findings
   included), and the job concludes success.
2. **A clean site.** Same as 1, but the site pages have no findings. The
   detector still exits 2 because of the canary. The report status is RAN
   with 0 site findings; canary findings are never counted as site findings.
3. **The detector cannot scan.** The detector exits 1 (for example a page
   timed out or no browser was found). Its standard output may be an empty
   array, which must not be read as clean. The report status is NOT RUN with
   the exit code and reason, the job raises an error annotation and concludes
   failure. The job is not a required check, so this is loud but does not
   block merging.
4. **The scan silently stops rendering.** The detector exits 0 or 2 but the
   canary has no primary finding. The report status is NOT RUN.
5. **Nothing to scan.** The build emits no pages, or a page does not serve
   HTTP 200. The report status is NOT RUN.
6. **Malformed detector output.** Standard output is not a JSON array, or the
   detector exits with any code other than 0, 1 or 2 (including a signal or
   a timeout). The report status is NOT RUN.

## Constraints

- Report-only: the job is never listed in the required-checks gate's base
  list or in branch protection, and it carries no job-level `if:` condition
  that a later promotion could inherit as a silent skip.
- The detector version is exact in `package.json` and locked with its
  integrity hash in the lockfile. The job never runs a floating `npx` install.
- Telemetry, design-health upload and paid-rule dispatch are switched off for
  every detector run.
- Project ignore configuration is not honored (`--no-config`), so the report
  cannot be silenced from inside a pull request while the check is report-only.
- New workflow steps use actions pinned to full commit SHAs.
- The job runs in the untrusted lane: read-only token, no persisted
  credentials, no secrets, no substrate checkout.
- The exit code is captured before it is neutralized, and the detector output
  is never piped through another command whose exit code would replace it.

## Acceptance criteria

- A pull request run uploads an artifact holding the raw detector JSON, its
  standard error, and a report JSON carrying status, detector version, exit
  code, pages requested, pages scanned, canary result, totals, per-rule and
  per-page tallies.
- The job summary leads with RAN or NOT RUN, the exit code and pages scanned.
- Scenarios 3 to 6 each produce NOT RUN in the report logic tests; scenario 1
  and 2 produce RAN.
- The required-checks test fails if the job name is ever added to the base
  required list without a deliberate promotion.

## Test seams

- The report logic is a pure function from detector exit code, detector
  standard output, the served page list and the canary address to a report.
  All six scenarios are exercised there.
- Workflow shape (report-only, pinning, telemetry) is asserted by reading the
  workflow and package files, beside the existing required-checks test.

## Promotion (out of scope)

Making the job required later means adding it to the gate's base list and to
branch protection together, keeping it free of any `if:` skip, choosing which
rules are enforced, and deciding whether project ignore configuration becomes
the waiver path.
