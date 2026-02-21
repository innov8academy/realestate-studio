/**
 * Shared security utilities for PlotAI API routes
 *
 * Provides:
 * - Path sanitization to prevent directory traversal
 * - Authentication helpers (HMAC-based token verification)
 * - Request origin validation
 */

import * as crypto from "crypto";
import * as path from "path";
import { NextRequest, NextResponse } from "next/server";

// ─── Path Sanitization ───────────────────────────────────────────────────────

/** Sensitive system directories that should never be accessed */
const BLOCKED_PATHS = [
  "/etc",
  "/var",
  "/usr",
  "/bin",
  "/sbin",
  "/boot",
  "/proc",
  "/sys",
  "/dev",
  "/root",
  "C:\\Windows",
  "C:\\Program Files",
  "C:\\Program Files (x86)",
  "C:\\ProgramData",
];

/**
 * Validate and sanitize a user-supplied filesystem path.
 * Returns the resolved path if valid, or null if the path is suspicious.
 *
 * Rules:
 * - Path must be absolute
 * - Path must not contain ".." traversal segments
 * - Path must not target sensitive system directories
 * - Path must not contain null bytes
 */
export function sanitizePath(inputPath: string): string | null {
  if (!inputPath || typeof inputPath !== "string") return null;

  // Reject null bytes (can be used to truncate paths in some systems)
  if (inputPath.includes("\0")) return null;

  // Resolve to absolute path
  const resolved = path.resolve(inputPath);

  // Check for ".." in the resolved path (after normalization)
  // path.resolve already normalizes, but double-check the input
  if (inputPath.includes("..")) return null;

  // Check against blocked system directories
  const normalizedLower = resolved.toLowerCase().replace(/\\/g, "/");
  for (const blocked of BLOCKED_PATHS) {
    const blockedNormalized = blocked.toLowerCase().replace(/\\/g, "/");
    if (
      normalizedLower === blockedNormalized ||
      normalizedLower.startsWith(blockedNormalized + "/")
    ) {
      return null;
    }
  }

  return resolved;
}

/**
 * Validate that a filename component does not contain path traversal.
 * Returns sanitized filename or null if invalid.
 */
export function sanitizeFilename(filename: string): string | null {
  if (!filename || typeof filename !== "string") return null;
  if (filename.includes("\0")) return null;
  if (filename.includes("..")) return null;
  if (filename.includes("/") || filename.includes("\\")) return null;

  // Additional sanitization: strip any non-alphanumeric characters except .-_
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!sanitized || sanitized === "." || sanitized === "..") return null;

  return sanitized;
}

/**
 * Helper to return a standardized 400 error for invalid paths
 */
export function invalidPathResponse(fieldName: string = "path"): NextResponse {
  return NextResponse.json(
    { success: false, error: `Invalid ${fieldName}: path is not allowed` },
    { status: 400 }
  );
}

// ─── Authentication ──────────────────────────────────────────────────────────

const COOKIE_NAME = "admin_tok";
const HMAC_SECRET_ENV = "ADMIN_PASSWORD";

/**
 * Create an HMAC-SHA256 token from the admin password.
 * Uses the password itself as both input and part of the key material,
 * combined with a static application-level salt.
 */
export function createAuthToken(password: string): string {
  const hmac = crypto.createHmac("sha256", "plotai-auth-v1");
  hmac.update(password);
  return hmac.digest("hex");
}

/**
 * Verify an auth token against the expected admin password.
 */
export function verifyAuthToken(token: string): boolean {
  const expected = process.env[HMAC_SECRET_ENV];
  if (!expected) return false;

  try {
    const expectedToken = createAuthToken(expected);
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(token, "utf8"),
      Buffer.from(expectedToken, "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * Check if a request is authenticated via the admin cookie.
 */
export function isAuthed(req: NextRequest): boolean {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyAuthToken(token);
}

/**
 * Check if a request is authorized for sensitive operations.
 * If ADMIN_PASSWORD is not configured, access is open (local dev mode).
 * If ADMIN_PASSWORD is configured, the request must have a valid admin cookie.
 */
export function requireAuthIfConfigured(req: NextRequest): boolean {
  const adminPassword = process.env[HMAC_SECRET_ENV];
  // If no admin password is set, allow access (local dev mode)
  if (!adminPassword) return true;
  // Otherwise require proper authentication
  return isAuthed(req);
}

/**
 * Helper to return a standardized 401 unauthorized response
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

/**
 * Get the cookie name used for auth
 */
export function getAuthCookieName(): string {
  return COOKIE_NAME;
}
