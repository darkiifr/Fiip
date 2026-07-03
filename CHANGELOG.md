# Fiip v.8.0.2

## Fixes

- Fixed desktop release builds by aligning the Tauri JavaScript packages with the Rust Tauri crates.
- Fixed the release failures on macOS, Linux, and Windows caused by mismatched `@tauri-apps/*` versions.
- Kept the previous security fixes for CodeQL and dependency audits included in this release line.

## Validation

- Desktop Tauri package alignment verified with `npm run tauri -- info`.
- Desktop build verified with `npm run tauri -- build --no-bundle`.
- Frontend targeted tests passed for the security and attachment viewer fixes.
- Root npm audit reports 0 moderate-or-higher vulnerabilities.
