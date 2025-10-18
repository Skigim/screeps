import clear from 'rollup-plugin-clear';
import typescript from 'rollup-plugin-typescript2';
import { getBuildMetadata, formatMetadata } from './build-utils.mjs';

// Get build metadata once at build time
const metadata = getBuildMetadata();

// Custom plugin to inject build information
const commitHashPlugin = {
  name: 'commit-hash-injector',
  resolveId(id) {
    if (id === 'virtual-build-info') {
      return id;
    }
  },
  load(id) {
    if (id === 'virtual-build-info') {
      // Escape special characters in strings
      const escapedMessage = metadata.commitMessage
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n');
      
      return `
export const BUILD_INFO = {
  commitHash: '${metadata.commitHash}',
  commitMessage: '${escapedMessage}',
  branch: '${metadata.branch}',
  isDirty: ${metadata.isDirty},
  buildTime: '${metadata.buildTime}',
  buildTimestamp: ${metadata.buildTimestamp}
};

export const INIT_VERSION = '${metadata.commitHash}';
`;
    }
  }
};

// Log build information
console.log(`🔨 Building with commit: ${formatMetadata(metadata)}`);
if (metadata.isDirty) {
  console.warn('⚠️  Working directory has uncommitted changes');
}

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/main.js',
    format: 'cjs',
    sourcemap: true
  },
  plugins: [
    clear({ targets: ['dist'] }),
    commitHashPlugin,
    typescript({ tsconfig: './tsconfig.json' })
  ],
  external: []
};
