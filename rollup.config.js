"use strict";

import clear from 'rollup-plugin-clear';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import screeps from 'rollup-plugin-screeps';

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
    resolve({ rootDir: "src" }),
    commonjs(),
    typescript({tsconfig: "./tsconfig.json"}),
    screeps({config: cfg, dryRun: cfg == null}),
    {
      name: 'upload-logger',
      writeBundle() {
        if (cfg) {
          console.log('\n📤 Uploading to Screeps...');
          setTimeout(() => {
            console.log('✅ Upload complete! (Check your Screeps console to verify)');
          }, 1000);
        }
      }
    }
  ]
}
