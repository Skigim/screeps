/**
 * Build utilities for Screeps project
 * Handles commit hash injection and other build-time operations
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Get the current git commit hash (short version)
 * @returns {string} The short commit hash (7 characters)
 */
export function getCommitHash() {
  try {
    const hash = execSync('git rev-parse --short HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'] // Suppress git errors
    }).trim();
    return hash;
  } catch (error) {
    console.warn('⚠️  Could not get git commit hash. Using fallback.');
    return 'unknown';
  }
}

/**
 * Get the current git commit message (first line only)
 * @returns {string} The first line of the commit message
 */
export function getCommitMessage() {
  try {
    const message = execSync('git log -1 --pretty=%B', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim().split('\n')[0];
    return message;
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Get the current git branch name
 * @returns {string} The current branch name
 */
export function getBranchName() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    return branch;
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Get git status information
 * @returns {boolean} true if working directory is dirty (uncommitted changes)
 */
export function isDirty() {
  try {
    const status = execSync('git status --porcelain', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    return status.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Create build metadata object with git information
 * @returns {object} Build metadata
 */
export function getBuildMetadata() {
  const commitHash = getCommitHash();
  const commitMessage = getCommitMessage();
  const branch = getBranchName();
  const isDirtyWorkingDir = isDirty();
  const buildTime = new Date().toISOString();

  return {
    commitHash,
    commitMessage,
    branch,
    isDirty: isDirtyWorkingDir,
    buildTime,
    buildTimestamp: Date.now()
  };
}

/**
 * Format metadata for display
 * @param {object} metadata - Build metadata
 * @returns {string} Formatted string
 */
export function formatMetadata(metadata) {
  const dirty = metadata.isDirty ? ' (dirty)' : '';
  return `${metadata.commitHash}${dirty}`;
}
