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
| AC-SCHEDULE | Calendar Schedule Generator | Generates the requested number and interval of sessions; title and description use insertable chip patterns (week, session, date, time, title); month calendar preview with clickable days and session detail panel; exports a standards-based ICS file and summary. |
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
| AC-SIGNPDF | Fill & Sign PDF | Accepts and previews a PDF; lets the user place multiple draggable text overlays on flat forms; accepts a drawn/uploaded signature with placement and resize; creates one downloadable completed PDF; validates when no text or signature has been added. |
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
| AC-MAPROUTE | Multi-Stop Map Link Generator | Requires a destination; treats a blank origin as current location; ignores empty stops and supports up to eight ordered waypoints; generates an encoded Google Maps directions URL for driving, walking, bicycling, and transit; exposes route/link copying, direct opening, sharing, clearing, and a downloadable QR code; keeps addresses in the browser. |
| AC-PAYREQUEST | Payment Request Generator | Requires a positive amount and the fields needed by standard payment methods; BPOINT mode requires a shop short name, accepts optional biller/reference/AUD amount values, URL-encodes all supplied values, formats its amount to two decimals, and omits empty parameters; contains no card fields and never processes or verifies payments; generates copyable provider URL, SMS, email, payment details, and QR outputs; warns that BPOINT URL fields may be locked or pre-filled and warns about non-HTTPS generic links or missing references. |
| AC-INVOICEPDF | Simple Invoice PDF Generator | Supports repeatable line items; validates descriptions, quantities, and prices; calculates no-GST, GST-added, and GST-included totals correctly; warns without blocking when the due date precedes the invoice date; renders a browser preview; creates a downloadable multi-page PDF locally; copies payment instructions; contains the supplied business, client, invoice, payment, notes, terms, and footer information. |
| AC-QUOTEPDF | Quote PDF Generator | Requires a quote number and valid line items; calculates GST the same way as invoices; supports quote date, valid-until date, optional deposit amount, validity/acceptance notes, notes, terms, and footer; warns without blocking when valid-until precedes quote date; renders a browser preview; creates a downloadable quote PDF locally; copies a quote summary message; never uploads contents. |
| AC-RECEIPTPDF | Receipt Generator | Requires business name, receipt number, receipt date, payer name, and a positive amount paid; supports payment method, invoice/reference, description, notes, and footer; renders a browser preview; creates a downloadable receipt PDF locally; copies receipt text; never uploads contents. |
| AC-PDFPAGES | PDF Page Editor | Accepts a PDF locally; lists pages with thumbnails; supports reordering, 90° rotation, deletion while keeping at least one page, downloading the edited PDF, and extracting selected pages; reports encrypted/unsupported PDF errors clearly; never uploads the file. |
| AC-CHECKLIST | Quick Checklist Share | Creates editable checklists with up to 30 items; supports tick/untick, edit, delete, reorder, and clear-completed actions; generates compressed URL-safe snapshot links through the shared tool-link helpers; restores title, items, tick state, version, timestamp, and optional updater from a link; increments version and timestamp for each updated share; copies the latest link and plain-text checklist; generates a QR only within the shared safe-size limit; downloads a kebab-cased TXT file; provides clear large-link warnings, optional device-only draft storage, invalid-link recovery, privacy/safety wording, and explicit no-live-sync expectations. |
| AC-PDFPAGES | PDF Page Editor | Reorders, rotates, deletes, and extracts PDF pages locally without upload. |
| AC-PDFFORM | PDF Form Filler | Reads AcroForm fields from a local PDF; supports text, checkbox, dropdown, radio, and list fields; updates values and downloads a filled PDF locally; warns when XFA-only or unsupported field types are present. |
| AC-TEXTEXTRACT | Text Extractor | Accepts images, PDFs, Word docs, and plain text files; shows extracted text immediately; supports file switching, copy, and download; OCR runs locally with optional CDN engine download. |
| AC-VIDEOTRIM | Video Trimmer | Accepts local MP4/WebM/MOV files up to the stated size limit; previews the video with start/end trim controls; optionally removes a middle section and joins the kept parts; exports a trimmed download locally with ffmpeg.wasm. |
| AC-LOCALTRANSFER | Local Device Transfer | Creates a compressed WebRTC offer and return answer without a signalling backend; uses mobile single-QR plus copy/share on phones and copy/share-only pairing on desktop; paste-first return completion on all devices; displays the same six-digit verification code on both devices and distinguishes it from the return connection code; establishes an encrypted browser data channel using local ICE candidates; sends text up to 100,000 characters; asks the other device to accept or decline each file up to 100 MB; transfers file chunks with progress and SHA-256 verification where Web Crypto is available; supports single-QR mobile camera scanning (with legacy multi-part compatibility), QR image upload, and manual code fallback; suppresses premature pairing errors while the return code is still being exchanged; explains that guest Wi-Fi, VPNs, or client isolation can block peer connections; never uploads or stores transfer contents. |

## Test layers

- `toolContracts.test.jsx` mounts every one of the direct tool routes and checks its primary workspace contract.
- `toolWorkflows.test.jsx` exercises deterministic user workflows and validation across the main calculation, text, generator, safety, and browser-API tools.
- `calendar.test.js` verifies calendar recurrence and ICS generation independently of React.
