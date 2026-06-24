// App version + changelog.
// ─────────────────────────────────────────────────────────────────────────────
// HOW TO UPDATE: whenever you ship a change, bump APP_VERSION and add a new
// entry to the TOP of CHANGELOG (newest first). Use semantic versioning:
//   patch (1.0.x) = small fixes/tweaks
//   minor (1.x.0) = new features, backwards-compatible
//   major (x.0.0) = big or breaking changes
// The version shows in the footer and links to the Changelog page.

export const APP_VERSION = '1.0.0'

export const CHANGELOG = [
  {
    version: '1.0.0',
    date: '2026-06-25',
    title: 'Initial release',
    changes: [
      'Property portfolio — tiles, add-property wizard, and detailed per-property pages with cover photos and map pins.',
      'Tracking — tasks & incidents, bills (with PDF / photographed-bill import and OCR), tenants & rent, maintenance requests, and progress photos.',
      'Financials — per-property and portfolio reporting, Australian financial-year view, depreciation (both ATO methods), and accountant export (CSV / Excel / PDF).',
      'Shared money pool with one-off and recurring contributions.',
      'Per-property voting on decisions.',
      'Dashboard with Priority Actions and Recent Changes that link straight to the relevant tab, plus a per-property activity panel on each Overview.',
      'Email notifications (votes raised, vote results, task assignments, and a daily bills-due digest) alongside in-app notifications.',
      'Team member profiles, password reset, and a mobile-friendly layout.',
    ],
  },
]
