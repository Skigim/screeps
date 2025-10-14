"use strict";

import clear from 'rollup-plugin-clear';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import screeps from 'rollup-plugin-screeps';
import { execSync } from 'child_process';

// Get git commit hash
let gitHash = 'unknown';
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  console.warn('⚠️ Could not retrieve git hash');
}

let cfg;
const dest = process.env.DEST;
if (!dest) {
  console.log("No destination specified - code will be compiled but not uploaded");
} else if ((cfg = require("./screeps.json")[dest]) == null) {
  throw new Error("Invalid upload destination");
} else {
  console.log(`✓ Destination: ${dest}`);
  console.log(`✓ Branch: ${cfg.branch}`);
  console.log(`✓ Server: ${cfg.protocol}://${cfg.hostname}:${cfg.port}${cfg.path}`);
  console.log(`✓ Token: ${cfg.token ? '***' + cfg.token.slice(-4) : 'NOT SET'}`);
}

export default {
  input: "src/main.ts",
  output: {
    file: "dist/main.js",
    format: "cjs",
    sourcemap: true
  },

  plugins: [
    clear({ targets: ["dist"] }),
    resolve({ rootDir: "src", extensions: ['.ts', '.js'] }),
    typescript({ tsconfig: "./tsconfig.json" }),
    commonjs(),
    screeps({config: cfg, dryRun: cfg == null}),
    {
      name: 'inject-git-hash',
      transform(code, id) {
        if (id.endsWith('main.ts')) {
          // Inject git hash as a global constant
          const transformed = code.replace(
            /\/\/ @GIT_HASH@/g,
            `global.__GIT_HASH__ = "${gitHash}";`
          );

          if (transformed === code) {
            return { code, map: { mappings: "" } };
          }

          return { code: transformed, map: { mappings: "" } };
        }
        return null;
      }
    },
    {
      name: 'upload-logger',
      writeBundle() {
        if (cfg) {
          console.log('\n📤 Uploading to Screeps...');
          console.log(`📋 Git Hash: ${gitHash}`);
          setTimeout(() => {
            console.log('✅ Upload complete! (Check your Screeps console to verify)');
          }, 1000);
        }
      }
    }
  ]
}
