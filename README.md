# STX Fairburn Report

Phone-first report app for the STX crew at CSX Fairburn Intermodal. One app does three reports:

- **Daily Project Report** (project 26001 CSX Intermodal GA)
- **Fairburn Callout Report** (project 26002 CSX Fairburn Extra Work GA)
- **Planned T&M Report** (project 26002, planned time-and-materials work with its own work order)

It is a sibling of [stx-daily-summary](https://github.com/railboss70/stx-daily-summary): same look, same step-by-step flow, same PDF style, same JHA scan and photo-page layout.

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
| Planned T&M | `project- YYMMDD-workorder# name` | `26002- 261016-015 Chris.pdf` |

"Name" is the **Name on file names** field (falls back to the first word of the print name). The work order number is padded to three digits; a new callout reuses the last one used that month, or starts from the month number. The name can still be edited on the Send step.

## What each report asks

Both reports: weather, progress summary, delays, **materials used**, **equipment used**, safety checklist, photos, signature.

- **Crew and work hours** (all three reports): pick a class from the drop-down (Foreman, Operator, Laborer, Superintendent, Project Manager), then QTY (how many) and hours each. Man-hours are QTY x hours, totaled on screen and in the PDF. Add a line for each class. On callouts and planned T&M each line is **Straight time** (T&M default) or **Overtime** (callout default); add a second line for the same class to split them.
- Planned T&M asks the same as the daily report, plus its work order number and a **Quoted work** box (adds QUOTED WORK to the PDF title).
- Callout adds the work order number, time the call was received and time arrived onsite.
- Reports saved before version 8 (Yes / No question per class) convert to crew lines on their own, one person per class.
- Equipment and materials each have QTY too (equipment: QTY and hours; materials: QTY and unit).

## Using the app

- **Save** is on every step (reports also save as you type). **Home**, or tapping the STX logo, goes back to the home screen; the report stays in Drafts.
- **Version** shows at the top of the home screen, so you can tell when phones have picked up an update.
- **JHA / pre-task safety planner** (Photos step): photograph both pages, drag the corners to the paper edges, and the app straightens it like a scanner ("Scan look" whitens the paper). Both pages print right after the report.
- **Photo pages** (last step): 1, 2 or 4 photos per page; tap photos to put up to 4 on one page, split them out, or leave one off the report. The home-screen setting is the default for new reports.
- **PDF stays under 2 MB** so it goes through email; photos are scaled back evenly if needed. The last step shows the page count and size.
- **Weather** tries up to 5 nearby National Weather Service stations when the closest one is down.
- Last step: **Preview PDF** shows the finished report on screen ("Back to report" returns to it), **Download PDF** keeps a copy, **Share PDF** sends just the PDF (photos are already inside it) to Mail, Messages and so on. Both need the print name and signature.

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
  - `const CACHE = "stx-fairburn-v9"` in `docs/sw.js` (and the `?v=9` lines in its list)
  - the `?v=9` on `app.js` in `docs/index.html`

## Files

| File | What it is |
| --- | --- |
| `docs/index.html` | Page shell and styles |
| `docs/app.js` | The whole app: form, weather, photos, signature, PDF, sharing |
| `docs/pdf.min.js`, `docs/pdf.worker.min.js` | pdf.js 3.11.174, draws the PDF preview (same copy as stx-daily-summary) |
| `docs/sw.js` | Offline cache |
| `docs/manifest.webmanifest`, `docs/icon-*.png` | Home-screen install name and icon |
| `docs/jspdf.umd.min.js` | jsPDF 2.5.1, the PDF library (same copy as stx-daily-summary) |
| `docs/stx-logo.png`, `docs/stx-logo-pdf.jpg` | Logo for the app header and the PDF |
