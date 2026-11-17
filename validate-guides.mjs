import { readFile } from "node:fs/promises";

const path = new URL("./guides.json", import.meta.url);
const raw = JSON.parse(await readFile(path, "utf8"));
const guides = Array.isArray(raw) ? raw : raw?.guides;
const CATEGORIES = ["event", "character", "creator", "chronology", "series", "era"];
const ORDERS = ["publication", "recommended", "chronological"];
const guideIds = new Set();
const issueIds = new Set();
const errors = [];

if (!Array.isArray(guides)) errors.push("Expected an array of guides or an object with a 'guides' array.");
const isNonEmptyString = (v) => typeof v === "string" && v.trim() !== "";

for (const [index, guide] of (Array.isArray(guides) ? guides : []).entries()) {
  const label = `guide[${index}]`;
  for (const field of ["id", "title", "description", "updatedAt"]) {
    if (!isNonEmptyString(guide[field])) errors.push(`${label}: missing string field '${field}'.`);
  }
  if (!["Marvel", "DC"].includes(guide.publisher)) errors.push(`${label}: publisher must be Marvel or DC.`);
  if (!CATEGORIES.includes(guide.category)) errors.push(`${label}: category must be one of ${CATEGORIES.join(", ")}.`);
  if (!ORDERS.includes(guide.readingOrder)) errors.push(`${label}: readingOrder must be one of ${ORDERS.join(", ")}.`);
  if (guide.tags !== undefined && !(Array.isArray(guide.tags) && guide.tags.every(isNonEmptyString))) errors.push(`${label}: tags must be an array of strings.`);
  if (guide.popular !== undefined && typeof guide.popular !== "boolean") errors.push(`${label}: popular must be true or false.`);
  if (!Array.isArray(guide.issues) || guide.issues.length === 0) errors.push(`${label}: issues must be a non-empty array.`);
  if (guideIds.has(guide.id)) errors.push(`${label}: duplicate guide id '${guide.id}'.`);
  guideIds.add(guide.id);
  for (const [issueIndex, issue] of (Array.isArray(guide.issues) ? guide.issues : []).entries()) {
    const issueLabel = `${label}.issues[${issueIndex}]`;
    for (const field of ["id", "series", "issueNumber"]) {
      if (!isNonEmptyString(issue[field])) errors.push(`${issueLabel}: missing string field '${field}'.`);
    }
    for (const field of ["year", "volumeYear"]) {
      if (issue[field] !== undefined && !Number.isInteger(issue[field])) errors.push(`${issueLabel}: '${field}' must be an integer.`);
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
  console.log(`Validated ${guides.length} guides and ${issueIds.size} issue entries.`);
}
