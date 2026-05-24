/**
 * Phase 1 — Module augmentation
 * Allow CSS custom properties (--mx, --my, --bg, etc.) on React style props
 * without per-site `@ts-expect-error` escapes.
 *
 * React 19's CSSProperties extends csstype.Properties, and TypeScript
 * resolves the constraint check down to csstype directly when verifying an
 * object literal — so we must augment csstype as well as react.
 *
 * IMPORTANT: these MUST be `interface` declarations (not `type` aliases),
 * because module augmentation only merges interfaces. eslint's
 * `consistent-indexed-object-style` rule will try to rewrite these into
 * Record<...> and silently break the augmentation — that's why the rule is
 * disabled for this file.
 */

/* eslint-disable @typescript-eslint/consistent-indexed-object-style */

import "react";
import "csstype";

declare module "csstype" {
  interface Properties {
    [key: `--${string}`]: string | number | undefined;
  }
}

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}

export {};
