# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.2] - 2026-08-02

### Fixed
- Fix location_zones.json path (missing runtime/ prefix)

## [1.2.1] - 2026-08-02

### Fixed
- Simplify swipe detection by removing direction lock; swipe now works from all tabs

## [1.2.0] - 2026-08-01

### Added
- Swipe gesture to switch between Form / Notes / Report tabs

## [1.1.0] - 2026-07-22

### Added
- Collapsible domain cards in mobile status report

### Fixed
- Correct `selected_domains.json` path and safe fallback for missing file
- Collapse all cards by default; correct `due_today.json` path

## [1.0.3] - 2026-07-18

### Fixed
- Correct mention index offset across multiple domains in report tab

## [1.0.2] - 2026-07-18

### Fixed
- Add mention button to note items

## [1.0.1] - 2026-07-18

### Fixed
- Remove text content from issue title to match my-home-page format

## [1.0.0] - 2026-06-14

### Added
- Initial mobile note app with tab navigation (Notes / Form / Report)
- Tab bar moved to top with text labels and active color indicator; Save button
- PWA support: icons and `mobile-web-app-capable` meta tag
- Label creation in Form tab with sync to `my_notes/sync.json`
- Label rename and delete management modal in Form tab
- Phase section and subcat support in status report
- Checkbox items (`- [ ]` / `- [x]`) parsing in report
- Role picker button for note items without a role
- Location-aware label selection, due-today display, and status report integration (agent repo migration)

### Fixed
- Auto-label selection now correctly maps Phase items to parent label
- Section tracking for skipped headings in `markdownToHtml`
- Role selection changed to radio-button behavior
- Report 403 error message and DEFAULT_LABELS update

[Unreleased]: https://github.com/KaitoKurokochi/mobile-note/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/KaitoKurokochi/mobile-note/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/KaitoKurokochi/mobile-note/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/KaitoKurokochi/mobile-note/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/KaitoKurokochi/mobile-note/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/KaitoKurokochi/mobile-note/releases/tag/v1.0.0
