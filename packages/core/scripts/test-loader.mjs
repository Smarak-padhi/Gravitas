/**
 * Gravitas WorkSession Kernel — JavaScript Node ESM Loader Hook
 *
 * Maintained Test-Support Artifact
 *
 * Node.js 24 natively strips types in TypeScript files when invoked with --experimental-strip-types.
 * However, Node ESM loaders themselves must be valid JavaScript (or stripped via loaders).
 * In accordance with NodeNext ECMAScript resolution, source files import './foo.js'.
 * This loader intercepts specifiers ending in '.js' and falls back to '.ts' if the '.js'
 * target does not exist on disk, allowing direct native testing without a compile step.
 */

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (typeof specifier === 'string' && specifier.endsWith('.js')) {
      const tsSpecifier = specifier.slice(0, -3) + '.ts';
      try {
        return await nextResolve(tsSpecifier, context);
      } catch {
        // Fall back to original error
      }
    }
    throw err;
  }
}
