import { readFile } from "node:fs/promises";

const path = new URL("./guides.json", import.meta.url);
const guides = JSON.parse(await readFile(path, "utf8"));
const guideIds = new Set();
const issueIds = new Set();
const errors = [];

if (!Array.isArray(guides)) errors.push("Top-level JSON value must be an array.");
for (const [index, guide] of (Array.isArray(guides) ? guides : []).entries()) {
  const label = `guide[${index}]`;
  for (const field of ["id", "title", "description", "updatedAt"]) {
    if (typeof guide[field] !== "string" || !guide[field].trim()) errors.push(`${label}: missing string field '${field}'.`);
  }
  if (!["Marvel", "DC"].includes(guide.publisher)) errors.push(`${label}: publisher must be Marvel or DC.`);
  if (!["event", "character", "creator", "chronology"].includes(guide.category)) errors.push(`${label}: invalid category.`);
  if (!Array.isArray(guide.issues) || guide.issues.length === 0) errors.push(`${label}: issues must be a non-empty array.`);
  if (guideIds.has(guide.id)) errors.push(`${label}: duplicate guide id '${guide.id}'.`);
  guideIds.add(guide.id);
  for (const [issueIndex, issue] of (Array.isArray(guide.issues) ? guide.issues : []).entries()) {
    const issueLabel = `${label}.issues[${issueIndex}]`;
    for (const field of ["id", "series", "issueNumber"]) {
      if (typeof issue[field] !== "string" || !issue[field].trim()) errors.push(`${issueLabel}: missing string field '${field}'.`);
    }
    if (issue.publisher !== guide.publisher) errors.push(`${issueLabel}: publisher differs from its guide.`);
    if (issueIds.has(issue.id)) errors.push(`${issueLabel}: duplicate issue id '${issue.id}'.`);
    issueIds.add(issue.id);
  }
}

if (errors.length) {
  console.error(`Guide validation failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const issueCount = guides.reduce((sum, guide) => sum + guide.issues.length, 0);
  console.log(`Validated ${guides.length} guides and ${issueCount} issue entries.`);
}
