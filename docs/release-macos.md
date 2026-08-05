# macOS release builds

Production `.app` bundles are built with Tauri and published to **GitHub Releases** when a version tag is pushed.

## For users

1. Open [GitHub Releases](https://github.com/Rillus/inscriva/releases/latest) (or the **Download for macOS** link in the app welcome / `/download` page).
2. Download the `Inscriva-macos-universal.zip` asset (name may vary by CI).
3. Unzip and move **Inscriva.app** to Applications.
4. On first open, macOS may block unsigned builds — see [Apple’s docs](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unknown-developer-mh40616/mac) or use a signed/notarised build from your team.

## For maintainers

### Tag a release

```bash
git tag v0.0.1
git push origin v0.0.1
```

The [Release macOS](../../.github/workflows/release-macos.yml) workflow builds on `macos-latest` and attaches the bundle to the GitHub release.

### Local build (same as CI)

```bash
pnpm install
pnpm build:desktop
```

Output: `apps/desktop-macos/src-tauri/target/release/bundle/macos/Inscriva.app`

### Notarisation

Not automated in CI. For public distribution outside your machine, sign with a Developer ID certificate and notarise with `notarytool` (see root README).

### Vercel env (optional)

Point the web UI download button at a specific asset:

| Variable | Example |
|----------|---------|
| `VITE_MACOS_DOWNLOAD_URL` | `https://github.com/Rillus/inscriva/releases/download/v0.0.1/Inscriva-macos-universal.zip` |
| `VITE_GITHUB_RELEASES_URL` | `https://github.com/Rillus/inscriva/releases/latest` |

If `VITE_MACOS_DOWNLOAD_URL` is unset, the app links to **latest releases**.
