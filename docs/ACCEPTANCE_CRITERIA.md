# Tool acceptance criteria

These criteria define the MVP behaviour for every tool. The automated suite uses the IDs below so a failed test can be traced back to the expected user outcome.

## Shared criteria

- **AC-SHARED-01:** Every enabled tool is reachable from its directory card and direct hash URL.
- **AC-SHARED-02:** Every tool loads its named workspace without a runtime error.
- **AC-SHARED-03:** Browser-based tools do not require a login and keep supplied content on the device unless the UI explicitly identifies an external check.
- **AC-SHARED-04:** Actions that need input are disabled or return a useful validation message when required input is missing.

## Criteria by tool

| ID | Tool | Acceptance criteria |
|---|---|---|
| AC-EMOJI | Emoji Copy | Search filters the emoji catalogue; choosing an emoji copies it and confirms success; no-match searches remain usable. |
| AC-DATES | Date Range Calculator | Valid dates show calendar days, business days, and weeks; the same day returns zero; reversed dates are described correctly. |
| AC-SCHEDULE | Calendar Schedule Generator | Generates the requested number and interval of sessions; applies same/week/session title formats; exports a standards-based ICS file and summary. |
| AC-GST | GST Calculator | Add mode calculates GST and total at 10%; remove mode derives the GST-exclusive amount; currency values remain stable for zero and decimal inputs. |
| AC-CLEANER | Text Cleaner | Space mode collapses repeated whitespace; line-break mode tidies excessive breaks; the word/character summary updates with the result. |
| AC-ONELINE | Text to One Line | Converts multi-line input into one space-normalised line; disables conversion when unnecessary; allows the result to be copied. |
| AC-INVOICE | Invoice Description Generator | Rough notes generate a non-empty invoice draft; selected tone changes the template; empty notes do not create misleading output; draft can be copied. |
| AC-CASE | Case Converter | Converts input to upper, lower, title, and sentence case; character count follows edited output; result can be copied. |
| AC-COUNTER | Word Counter | Counts words, characters, sentences, and paragraphs while typing; reports reading time and characters without spaces; empty input returns zeroes. |
| AC-SHRINKER | Image Shrinker | Accepts supported images; exposes width and quality controls; produces a smaller downloadable image or a clear processing error without uploading. |
| AC-HTML | HTML Viewer | Shows live HTML in a sandboxed preview; removes scripts, event handlers, and unsafe external resources; allows source to be reset. |
| AC-JSON | JSON Formatter | Formats and minifies valid JSON; validates without altering valid input; reports a useful parse error for invalid JSON; formatted output can be copied. |
| AC-IMAGEPDF | Image to PDF | Accepts one or more JPG/PNG files; preserves selected order; creates one PDF page per image using the chosen page mode; exposes a PDF download. |
| AC-PDFIMAGE | PDF to Image | Accepts a PDF; renders every page to a numbered PNG; exposes individual downloads; reports unreadable PDFs without crashing. |
| AC-COMBINEPDF | Combine PDFs | Requires at least two PDFs; allows file order changes and removal; merges in displayed order; exposes one downloadable PDF. |
| AC-WEBSTATUS | Website Status Checker | Normalises a domain to a URL; reports reachable response timing or a browser/network limitation; prevents an empty check. |
| AC-SPEED | Internet Speed Checker | Lets the user choose test size; reports Mbps, duration, and a rating after a successful download; reports network failure and prevents concurrent tests. |
| AC-HOURLY | Hourly Rate Calculator | Calculates a sustainable rate from income, hours, leave, overhead, and profit inputs; updates results immediately; handles zero billable hours safely. |
| AC-MARGIN | Profit Margin Calculator | Known-price mode reports price, profit, margin, and markup; target-margin mode derives price; invalid divisors do not produce Infinity or NaN. |
| AC-SIGNPDF | Sign PDF | Accepts and previews a PDF; accepts a drawn/uploaded signature or typed line; supports placement; creates a downloadable signed PDF and validates missing signature content. |
| AC-TTS | Text to Speech | Uses available browser voices; respects speed and pitch; reads non-empty text and can stop/restart; disables speaking for empty input. |
| AC-RECORDER | Audio Recorder | Detects recording support; starts/stops with microphone permission; enforces the chosen maximum; exposes a local audio download or a permission error. |
| AC-LOCATION | My Location | Requests location only after user action; shows coordinates and accuracy; offers copy and map actions; reports denial/unavailable location clearly. |
| AC-SYSINFO | IP & System Info | Shows browser, OS, language, timezone, screen, CPU, and network values; fetches public IP; uses an unavailable state when the IP request fails. |
| AC-CAMERA | Camera | Opens the selected device camera; captures local photos; supports selection/removal and selected downloads; stops media tracks when closed. |
| AC-PERCENT | Percentage Calculator | Calculates X% of Y, what percentage X is of Y, and percentage change; mode switching preserves usability; zero divisors do not yield invalid output. |
| AC-UNITS | Unit Converter | Converts in both directions for every category; temperature uses non-linear formulas; swapping units preserves the represented quantity; invalid input remains safe. |
| AC-SCAM | Scam Email Checker | Requires email body content; detects common phishing, urgency, payment, credential, sender, and link signals; produces a risk verdict with explainable findings and a safety disclaimer. |
| AC-SEO | SEO Checker | Accepts and normalises a website URL; displays available PageSpeed/SEO findings; shows API/network errors clearly; prevents empty and concurrent checks. |
| AC-CALC | Calculator | Keeps the complete chained expression visible and updates a separate running result; performs arithmetic from buttons or keyboard; Enter calculates, Backspace edits, and Escape clears; Scientific mode provides trigonometry, roots, powers, logarithms, constants, and DEG/RAD control; copies the current result; records calculation/result history with per-result copy and clear controls; invalid operations do not crash or enter history. |
| AC-UTC | UTC Converter | Local changes update UTC, Unix, and ISO values; UTC changes update local time; “current time” refreshes all formats consistently. |
| AC-TZ | Time Zone Converter | Converts a source date/time across listed zones; changing source zone recalculates results; “Now” resets to current local time and zone. |
| AC-QR | QR Code Generator | Renders non-empty content as a QR code; respects size and quiet-zone controls; enables a PNG download only when content exists. |
| AC-TEXTQR | QR Text Transfer | Encodes short text or a tiny file into a same-site QR URL without a backend; opens and decodes the receive route locally; reconstructs file name, MIME type, bytes, preview, and download; uses gzip when it makes the payload smaller; accepts browser-readable raster source images up to 15 MB and automatically resizes/recompresses them to a QR-sized WebP/JPEG; displays the original and exact condensed QR previews with dimensions and sizes before transfer and previews received images; clearly states that the condensed version—not the original—is sent; rejects SVG and unsafe executable extensions, non-image source files above 20 KB, and final QR URLs above the reliable capacity; supports copy, safe-link opening, QR download, camera scanning, and QR-image upload; warns above 1,200 text characters and blocks above 1,500. |
| AC-BGREMOVE | Background Remover | Accepts an image; lets the user pick/derive a background colour and tolerance; produces a transparent PNG preview/download; supports starting over and reports processing failure. |
| AC-FILECONV | Image Converter | Accepts supported images; converts to JPG, PNG, or WebP; applies quality where relevant and white-fills JPEG transparency; exposes a correctly named download. |
| AC-FILEVIEW | File Viewer | Detects media, PDF, text, ICS, CSV, JSON, and binary files; previews the detected format; lets text be edited/copied/downloaded; uses a bounded hex fallback for binary data. |
| AC-SUGGEST | Suggest a Tool | Requires a tool name; includes optional contact/context in the generated mail request; confirms submission; allows the form to be reset for another suggestion. |

## Test layers

- `toolContracts.test.jsx` mounts every one of the 37 direct tool routes and checks its primary workspace contract.
- `toolWorkflows.test.jsx` exercises deterministic user workflows and validation across the main calculation, text, generator, safety, and browser-API tools.
- `calendar.test.js` verifies calendar recurrence and ICS generation independently of React.
