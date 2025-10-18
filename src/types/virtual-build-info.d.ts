/**
 * Type definitions for virtual-build-info
 * This module is injected at build time by rollup with commit hash information
 */

export interface BuildInfo {
  /** Current git commit hash (short form) */
  commitHash: string;
  /** First line of commit message */
  commitMessage: string;
  /** Current git branch name */
  branch: string;
  /** Whether working directory had uncommitted changes at build time */
  isDirty: boolean;
  /** ISO string of build time */
  buildTime: string;
  /** Timestamp of build time in milliseconds */
  buildTimestamp: number;
}

/**
 * Build information injected at build time
 * Contains commit hash, message, branch, and timing information
 */
export const BUILD_INFO: BuildInfo;

/**
 * Initialization version - uses commit hash
 * Changes automatically on every rebuild/commit
 */
export const INIT_VERSION: string;
