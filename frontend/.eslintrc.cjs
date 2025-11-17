/**
 * Frontend ESLint config to ensure the Next.js recommended rules and parser
 * are used when running ESLint from the repository root or inside the
 * frontend folder. This also sets ignorePatterns for the frontend package.
 */
module.exports = {
  root: true,
  extends: ["next/core-web-vitals"],
  ignorePatterns: ["node_modules/", ".next/", "public/"]
};
