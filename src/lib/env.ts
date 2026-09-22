/**
 * Környezeti beállítások egy helyen. Titkot ez a modul nem ad vissza, csak kapcsolókat és publikus
 * értékeket; a kulcsokat a felhasználó modul olvassa közvetlenül a szerveroldalon.
 */
export type DeploymentEnv = 'production' | 'preview' | 'development' | 'test'

export function deploymentEnv(
  env: Record<string, string | undefined> = process.env,
): DeploymentEnv {
  if (env.APP_ENV === 'production' || env.VERCEL_ENV === 'production') return 'production'
  if (env.APP_ENV === 'preview' || env.VERCEL_ENV === 'preview') return 'preview'
  if (env.NODE_ENV === 'test' || env.VITEST) return 'test'
  return 'development'
}

export function isProductionDeployment(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return deploymentEnv(env) === 'production'
}

export type LaunchMode = 'waitlist' | 'live'

export function launchMode(env: Record<string, string | undefined> = process.env): LaunchMode {
  return env.LAUNCH_MODE === 'live' ? 'live' : 'waitlist'
}

export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return raw.replace(/\/+$/, '')
}
