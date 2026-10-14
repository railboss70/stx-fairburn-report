# STX Fairburn Report

Phone-first report app for the STX crew at CSX Fairburn Intermodal. One app does both reports:

- **Daily Project Report** (project 26001 CSX Intermodal GA)
- **Fairburn Callout Report** (project 26002 CSX Fairburn Extra Work GA)

It is a sibling of [stx-daily-summary](https://github.com/railboss70/stx-daily-summary): same look, same step-by-step flow, same PDF style, same "Share PDF + photos" to Mail.

## Open on your iPhone

1. Open this link in **Safari** (not Chrome):
   https://railboss70.github.io/stx-fairburn-report/
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Name it **Fairburn** and Add.

Reports stay on the phone until you send them. Photos and form data are not uploaded to GitHub.

## PDF file names

The app names every PDF in the office filing format and prints the same title in the footer of every page.

| Report  | Format                              | Example                        |
| ------- | ----------------------------------- | ------------------------------ |
| Daily   | `project- YYMMDD name`              | `26001- 260226 Chris.pdf`      |
| Callout | `project- YYMMDD-workorder# name`   | `26002- 260709-007 Chris.pdf`  |

"Name" is the **Name on file names** field (falls back to the first word of the print name). The work order number is padded to three digits; a new callout reuses the last one used that month, or starts from the month number. The name can still be edited on the Send step.

## What each report asks

Both reports: weather, progress summary, delays, **materials used**, **equipment used**, safety checklist, photos, signature.

- Daily adds crew consist and work hours (superintendent, foreman / inspector, operator, laborer).
- Callout adds the work order number, time the call was received, time arrived onsite, and name / hours for each class.

## Using the app

- **Save** is on every step (reports also save as you type). **Home**, or tapping the STX logo, goes back to the home screen; the report stays in Drafts.
- **Version** shows at the top of the home screen, so you can tell when phones have picked up an update.
- **JHA / pre-task safety planner** (Photos step): photograph both pages, drag the corners to the paper edges, and the app straightens it like a scanner ("Scan look" whitens the paper). Both pages print right after the report.
- **Photo pages**: 1, 2 or 4 photos per page; tap photos to put up to 4 on one page, split them out, or leave one off the report. The home-screen setting is the default for new reports.
- **PDF stays under 2 MB** so it goes through email; photos are scaled back evenly if needed. The last step shows the page count and size.
- **Weather** tries up to 5 nearby National Weather Service stations when the closest one is down.
- Last step: **Download PDF** keeps a copy, **Share PDF** sends just the PDF (photos are already inside it) to Mail, Messages and so on. Both need the print name and signature.

## Monthly callout billing

Fairburn callouts bill by the month. **Home > Callout billing** keeps a running billing for each month, and a callout's Send step shows which month it went on.

- **A callout is added to its month as soon as its report is finished**: the PDF is downloaded or shared, or the report is marked sent. Unfinished drafts are listed but left off.
- **Dropbox / office computer**: open `https://railboss70.github.io/stx-fairburn-report/#billing` (bookmark it) and drag the callout PDFs, or the whole month's folder, from Dropbox onto the drop box. The billing sheet `.xlsx` can be dropped in too the first time. Daily reports and other PDFs in the folder are skipped. On iPhone, tap the box and use Browse › Dropbox.
- **Callouts from other people**: every callout PDF carries its billing details (not the photos or signature) in the PDF's keywords. Whoever does the billing saves the PDFs the crew sent to Files and taps **Add callout PDFs**. Each lands on its month, marked "added from PDF", with a Remove button. The same callout is never added twice; a newer copy of it replaces the older one. PDFs from before this version, or PDFs edited or re-saved by another app, can't be read.
- Each month shows the callout dates, man-hours and equipment hours so far, and its state: **Open** (current month, "Export so far"), **Ready to export** (month is over, "Month complete · export"), or **Exported** with the date. If a callout is added or edited after an export, the month says so and offers "Export updated sheet".
- After export: **Share billing sheet** (Mail, Save to Files), **Open billing sheet** (shows it on screen with its own share button), or **Download billing sheet**.
- Export fills the office **TIME AND MATERIALS SUMMARY** billing sheet and names it the office way: `26002_BILLING_SHEET_261005.xlsx` (project, then the export date). The job number is `project-workorder` (`26002-009`), taken from the month's callouts.
- **The billing sheet is not in this repo, and must not be added to it.** It holds STX billing rates and this repo is public. Each phone loads the `.xlsx` once (Load billing sheet); it is kept in that phone's storage. Any filled copy works: the fill-in cells are overwritten, and rates, formulas, formatting, logo and sheet protection are left as they are. The older 2025 sheet layout is refused with a message to load the updated one.
- What gets filled: job number, a date and work-detail note per callout day (the progress summary, in capitals like the office sheet), the date and hours on each labor line, equipment hours, and material lines (date, description, quantity, unit).
- Labor: Project Manager, Inspector (Superintendent / Inspector column), Operator (Utility Operator column), Laborer (Track Laborer column). Callout hours go in the OT column unless the crew row is switched to Straight time.
- Equipment: each equipment name in the app maps to one sheet column (`EQUIPMENT` in `docs/app.js`). A written-in machine that is not on the rate sheet is flagged and noted in that day's work detail.
- Left for the office: material unit rates, travel / per diem, lump-sum, other services and adjustments.
- The sheet has 7 date lines and 10 material lines. A month with more rolls into a second file (`..._261005-2.xlsx`).
- The export includes the callouts on that phone plus any added from PDFs.
- If the sheet layout changes (rows or columns move), update `BILLING` at the top of `docs/billing.js` and `EQUIPMENT` in `docs/app.js`.

## Page breaks

The PDF is drawn directly, not printed from a web page, so breaks are controlled:

- a table row, the sign-off block and a photo never split across pages
- the signature never lands on a page by itself; it travels with the safety checklist
- a section that fits on one page is never split; it moves to the next page whole
- a section longer than a page breaks between rows and repeats its bar and column heads
- every later page carries the project and date at the top, and every page carries the file title and page count at the bottom

## Weather

Readings for 7 AM, 11 AM and 3 PM come from the National Weather Service station nearest Fairburn, GA (`api.weather.gov`, no key needed). They are only available for the last 7 days. Anything typed under "Enter weather manually" replaces the reading for that time.

## Deploy

Static site, no build step. Everything the phone loads is in `docs/`.

1. Push this folder to a public repo named `stx-fairburn-report`.
2. Repo **Settings → Pages → Deploy from a branch → `main` / `/docs`**.

## Changing the app

- Questions, project numbers and the site address are constants at the top of `docs/app.js` (`DELAYS`, `SAFETY`, `TYPES`, `SITE`, `EQUIP_PRESETS`, `MATERIAL_UOM`).
- The PDF layout is `buildPdf()` in `docs/app.js`.
- The app works offline through `docs/sw.js`, which caches files under a version name. **After any change, bump the version in both places or phones keep the old copy:**
  - `const CACHE = "stx-fairburn-v5"` in `docs/sw.js` (and the `?v=5` lines in its list)
  - the `?v=5` on `app.js` and `billing.js` in `docs/index.html`

## Files

| File | What it is |
| --- | --- |
| `docs/index.html` | Page shell and styles |
| `docs/app.js` | The whole app: form, weather, photos, signature, PDF, sharing |
| `docs/billing.js` | Monthly callout billing: fills and exports the billing sheet |
| `docs/jszip.min.js` | JSZip 3.10.1, reads and writes the .xlsx |
| `docs/sw.js` | Offline cache |
| `docs/manifest.webmanifest`, `docs/icon-*.png` | Home-screen install name and icon |
| `docs/jspdf.umd.min.js` | jsPDF 2.5.1, the PDF library (same copy as stx-daily-summary) |
| `docs/stx-logo.png`, `docs/stx-logo-pdf.jpg` | Logo for the app header and the PDF |
