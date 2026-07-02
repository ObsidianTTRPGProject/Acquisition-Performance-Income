// App version + changelog.
// ─────────────────────────────────────────────────────────────────────────────
// HOW TO UPDATE: whenever you ship a change, bump APP_VERSION and add a new
// entry to the TOP of CHANGELOG (newest first). Use semantic versioning:
//   patch (1.0.x) = small fixes/tweaks
//   minor (1.x.0) = new features, backwards-compatible
//   major (x.0.0) = big or breaking changes
// The version shows in the footer and links to the Changelog page.

export const APP_VERSION = '1.3.0'

export const CHANGELOG = [
  {
    version: '1.3.0',
    date: '2026-07-03',
    title: 'Photo drag-and-drop imports & vote option suggestions',
    changes: [
      'Photos: drag images straight into the Photos tab — from your computer or directly from another website (e.g. an image in a Facebook chat).',
      'Photos: import many photos at once, tagging the whole batch with a date, status, and description.',
      'Photos: group the gallery by import batch, date, or status when reviewing.',
      'Voting: any member can suggest and add new options to an open option-vote.',
      'Setup: run supabase/migration-13-photo-batches.sql (or setup-all.sql), and deploy the new fetch-image Edge Function (supabase/functions/fetch-image) to enable dragging images in from other websites.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-07-02',
    title: 'Vote on pre-defined options',
    changes: [
      'Votes can now be either a yes/no question (as before) or a choice between pre-defined options (e.g. pick a builder from a shortlist).',
      'Option votes are configured when raised: the list of options, whether abstaining is allowed, and whether members may select multiple options.',
      'Option votes show live per-option counts; closing records the winning option (or Tied) as the result.',
      'Database update required: run supabase/migration-12-vote-options.sql (or setup-all.sql) in the Supabase SQL Editor.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-06-25',
    title: 'Multi-company support',
    changes: [
      'The portal now supports multiple companies, each with its own fully isolated data — users only ever see their own company.',
      'New roles: super-admin (manages all companies) and company-admin (manages their own company).',
      'Admin panel to create companies, add users (email invite or starting password), reset passwords, and assign roles.',
      'Super-admin company switcher in the header to view and assist any company, defaulting to your primary one.',
      'Dashboard now deep-links each alert to the exact tab, with a per-property activity panel, and the company banner on the Dashboard.',
    ],
  },
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
