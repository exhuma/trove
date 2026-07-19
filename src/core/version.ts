/**
 * Build identity, inlined at `vite build` from git tags (see vite.config.ts).
 * Mirrors `config.ts`: a single typed access point so components never touch the
 * injected `__APP_*__` globals directly.
 *
 * `version` follows CalVer git tags (`vYYYY.MM.MICRO`); `channel` is `production`
 * for a clean release tag, a pre-release word (`beta`/`rc`/`alpha`) for a
 * pre-release tag, or `dev` for an untagged build.
 */
export const build = Object.freeze({
  version: __APP_VERSION__,
  channel: __APP_CHANNEL__,
  commit: __APP_COMMIT__,
})

/** True for anything that isn't a clean production release — drives the channel chip. */
export const isPrerelease = build.channel !== 'production'
