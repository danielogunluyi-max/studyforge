---
description: Canonical dev commands for Kyvex on Windows (PowerShell ExecutionPolicy workaround)
---

# Kyvex dev workflow (Windows / PowerShell)

PowerShell on this machine has an `ExecutionPolicy` that blocks `npm.ps1`, `npx.ps1`, `next.ps1`, `tsc.ps1`, and `playwright.ps1`. Every direct invocation prints a `running scripts is disabled on this system` preamble. To stay sane, route every Node-tool call through `cmd /c` until the policy is changed.

## One-time fix (optional, requires a separate elevated shell)

If you want native PowerShell back, open **PowerShell as Administrator** and run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Cascade cannot run this for you — it's a security setting that must be approved by you in an interactive shell.

## Canonical commands (use these as-is from Cascade or any terminal)

### TypeScript check
```
cmd /c "npx --no-install tsc --noEmit --skipLibCheck"
```

### Type-check report to file (readable by Cascade tools — note: NOT `.log`, that's gitignored)
```
cmd /c "npx --no-install tsc --noEmit --skipLibCheck > phase1-tsc-report.txt 2>&1"
```

### Lint
```
cmd /c "npx --no-install next lint"
```

### Production build
```
cmd /c "npx --no-install next build"
```

### Dev server
```
cmd /c "npx --no-install next dev --turbo"
```

### Prisma (after schema edits)
```
cmd /c "npx --no-install prisma validate"
cmd /c "npx --no-install prisma db push"
cmd /c "npx --no-install prisma generate"
```

### Playwright
```
cmd /c "npx --no-install playwright test"
```

## Why `cmd /c` and `--no-install`

- `cmd /c` bypasses PowerShell entirely — `npm.cmd` / `npx.cmd` shims execute as plain Windows batch scripts.
- `--no-install` prevents `npx` from auto-fetching a different version when the local one is sufficient (it usually is, since everything is in `package.json`).

## Cleanup hygiene

When done debugging, delete these scratch artifacts before committing:

- `phase1-tsc-report.txt`, any `*.log`, `tmp_*` (already gitignored).
