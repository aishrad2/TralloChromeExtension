# Project: Trallo is a Chrome extension to support trip planning. It runs as a side panel that centralizes trip research into one, organized Google Sheets.

## Overview
Build a Chrome extension (Manifest V3) that helps a person plan trips. A Google Sheet is the database: each trip is one Google Sheet that lives in the user's Google Drive, so people can also view and edit it directly in Sheets. The Google Sheet is organized into 6 tabs: Flights, Hotels & Housing, Bucket List, Packing List, Budget & Expenses, and Notes & Brainstorm. The extension is a planning tool: it creates the trip Google Sheets, lets the user add flight and hotel information from Expedia and Google Flights while browsing, and adds the details to the organized Google Sheets. Collaboration works by sharing the Google Sheets; do NOT build a custom backend or user accounts. Do NOT worry about more than one user; only one user will be using this Chrome extension.

A complete UI prototype already exists: Reuse its components and styling in the side panel wherever possible. Leverage the Trallo logo.png and plane logo.png.

## Tech stack
- TypeScript, React for the side panel UI, Vite with WXT (or CRXJS) for building the extension
- Manifest V3: side panel, service worker, content scripts. No remote-hosted code; bundle all dependencies.
- Google OAuth via chrome.identity, Google Sheets API v4 and Drive API v3
- chrome.storage.local for cached trip data, chrome.storage.session for the in-progress draft
- Data types are plain typed objects and functions, not classes with getters/setters. Use classes only for services (TripManager, TripRepository, AuthService, parsers).

## Architecture (follow the attached UML)
The UML is not definitive, but it is a strong starting point. Leverage the attached UML for the simple cases but also add additional functionality or variables to ensure all edge cases are accounted for. Document when you add these features.

Key rules:
- the UI never touches Google directly. It always goes through TripManager, and TripManager goes through TripRepository, which is the only code that knows Google Sheets exists. 
- TripManager runs against a TripRepository interface. TripRepository is the only code that calls Google APIs.
- Content script, service worker, and side panel communicate via chrome.runtime messages; all shared data goes through storage or messages (JSON only).
- Derived values (countdown, whats_next, total expenses) are computed, not stored in the sheet.

## Google Sheets as the database
- A master template sheet that is attached has the tabs: Flights, Hotels & Housing, Bucket List, Packing List, Budget & Expenses, and Notes & Brainstorming. It includes header rows, data validation dropdowns, and protected header rows.
- Creating a trip copies the template with Drive files.copy.
- Every row has a hidden ID column. Find, update, and delete rows by ID, never by row number, since users can sort or insert rows in Sheets.
- Write only the cells or rows that changed; never overwrite a whole tab from cache. Appends are used for new items.
- Validate headers on load; if the sheet structure was broken by manual edits, show a friendly error instead of failing.
- People assigned to packing items and notes are stored as just Strings for now so it is just manually viewed. There is no linking of people’s emails.
- Sharing: the Share button calls Drive permissions.create for the sheet with an editor or viewer role.
- Sync: no push notifications. When the side panel opens or regains focus, and every 15 to 30 seconds while open, check the file's modifiedTime via Drive; re-read the tabs only if it changed. Read whole tabs in one request and batch writes. Show a "last synced" indicator and a manual refresh button. Never replace a form the user is currently editing during a refresh.

## Adding flights and hotels from websites (core feature)
Is just a form that has to be manually filled out by user


Behavior:
- On a supported page, the content script injects a small "+ Add to trip" button on each result card, inside a Shadow DOM so site CSS doesn't interfere. It may also show a slim banner with the active trip name and the number of items added this session. Use a MutationObserver so buttons appear on results that load later.
- Parse only when the user clicks a button, and only that one listing. Do NOT parse all results or show a list of options in the side panel.
- Parsing strategy, in order: (1) JSON-LD / schema.org structured data if present, (2) site-specific adapter using CSS selectors kept in one config object per site, (3) if both fail, open the form blank with the page URL filled in so the user can enter details manually.
- Verify against real pages which fields each site actually exposes before assuming; do not invent structured data that isn't there.
- The parse result is a ParsedListing (type, sourceSite, sourceUrl, capturedAt, fields, missingFields). Save it as a draft in chrome.storage.session and open the side panel to the pre-filled, editable form. Highlight fields that came back empty. Fields that can't be found (beds, guests, exact layover details) are optional.
- Opening the side panel from a content-script click needs a user gesture and may be unreliable; if it fails, set a badge on the extension icon and show the draft when the user opens the panel.
- On Save, call TripManager.addItem() for the active trip, record addedBy (current user), sourceSite, sourceUrl, and capturedAt, then clear the draft.
- Host permissions: request access to the supported sites only; [ADD LATER: decide between static host_permissions or optional permissions requested on first use].
- Keep selectors and site logic isolated in adapter modules (GoogleFlightsAdapter, ExpediaFlightsAdapter, ExpediaHotelsAdapter) so a markup change means a one-file fix.

## Screens (from the wireframe review)
1. **My Trips Hub:** trip cards with interactive photos, dates and number of days, trip cities above the date, active status, a progress bar leading to a "what's next" card with a button and a countdown, and an edit-trip menu.
2. **New Trip form:** name, locations (cities), dates, people (emails), budget.
3. **Specific Trip:** prominent "Share" button, bottom sync button with animation, Budget tab opens the sheet's Budget tab, other tabs open in the extension.
4. **Bucket List:** more vertical space and more editable-looking, link to the sheet, map with pins from the sheet's lat/lng columns, Quick Assign to Day Schedule [ADD LATER: calendar feature details].
5. **Flights:** form-based, with layovers.
6. **Hotels & Housing:** form-based.
7. **Packing list:** [ADD LATER: design not finished].
Titles should say the section name, not "Trallo Companion". Removed from the design: auto-export on delete, trip-type bubble, companion label.

## Build order
1. Project scaffold, auth with Google, and a read/write test against one sheet
2. TripRepository and TripManager with a fake in-memory repository for tests, then the Sheets implementation
3. Create trip from template, My Trips Hub, Specific Trip, Share
4. Manual-entry forms for flights and hotels saving to the sheet
5. Content script, Add button, Google Flights adapter, then the Expedia adapters
6. Bucket List map and day assignment, Packing list
7. Polling sync, error states, edge cases

## Acceptance criteria
- A user can sign in, create a trip, and see a new sheet in their Drive with the template structure.
- A second user given editor access can see and edit the same trip, and changes appear within about 30 seconds without a manual refresh.
- On Google Flights and Expedia, clicking "+ Add to trip" on one listing opens a pre-filled form; saving adds one row to the right tab with the source URL.
- Editing the sheet by hand (sorting, adding rows) doesn't break the extension.
- No request is made to any server other than Google APIs.


Start by confirming the plan and listing any assumptions or questions before writing code.
