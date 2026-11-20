/**
 * Local frame bundler using Vite import.meta.glob across all 302 exercises
 * in @bryllim/workout-guide plus our 16 custom vector exercises (318 total).
 * Zero external CDN links.
 */
const pkgFrameModules = import.meta.glob<string>(
  '/node_modules/@bryllim/workout-guide/assets/*/frame-*.{png,svg}',
  { eager: true, import: 'default' },
);

const customFrameModules = import.meta.glob<string>(
  '/src/assets/custom-exercises/*/frame-*.svg',
  { eager: true, import: 'default' },
);

const framesBySlug: Record<string, [string, string, string]> = {};

function registerModules(modules: Record<string, string>) {
  for (const [path, url] of Object.entries(modules)) {
    const match = path.match(/\/([^/]+)\/frame-([123])\.(png|svg)$/);
    if (!match) continue;
    const [, slug, frameNum] = match;
    if (!framesBySlug[slug]) {
      framesBySlug[slug] = ['', '', ''];
    }
    framesBySlug[slug][Number(frameNum) - 1] = url;
  }
}

registerModules(pkgFrameModules);
registerModules(customFrameModules);

export function getLocalExerciseFrames(slug: string): [string, string, string] {
  return framesBySlug[slug] ?? ['', '', ''];
}
