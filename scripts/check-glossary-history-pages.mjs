import { existsSync, readFileSync } from "node:fs";

const db = readFileSync("lib/db.ts", "utf8");
for (const expected of [
  "CREATE TABLE IF NOT EXISTS glossary_terms",
  "listGlossaryTerms",
  "createGlossaryTerm",
  "updateGlossaryTerm",
  "deleteGlossaryTerm",
  "listTasks",
]) {
  if (!db.includes(expected)) {
    throw new Error(`lib/db.ts must include ${expected}`);
  }
}

const appHeaderPath = "components/AppHeader.tsx";
if (!existsSync(appHeaderPath)) {
  throw new Error("Shared AppHeader component must exist");
}

const appHeader = readFileSync(appHeaderPath, "utf8");
for (const expected of [
  '"use client"',
  "usePathname",
  'href: "/history"',
  'href: "/settings"',
  'pathname === "/"',
  "rounded-lg",
  "bottom-0",
]) {
  if (!appHeader.includes(expected)) {
    throw new Error(`AppHeader must include ${expected}`);
  }
}

const homePage = readFileSync("app/page.tsx", "utf8");
if (!homePage.includes("HomeWorkspace")) {
  throw new Error("Home page must render the shared HomeWorkspace shell");
}

const toolbar = readFileSync("components/Toolbar.tsx", "utf8");
if (toolbar.includes("<header")) {
  throw new Error("Toolbar should no longer own the top navigation header");
}

const glossaryApiPath = "app/api/glossary/route.ts";
if (!existsSync(glossaryApiPath)) {
  throw new Error("Glossary collection API route must exist");
}

const glossaryApi = readFileSync(glossaryApiPath, "utf8");
for (const expected of ["export async function GET", "export async function POST"]) {
  if (!glossaryApi.includes(expected)) {
    throw new Error(`Glossary collection API must include ${expected}`);
  }
}

const glossaryItemApiPath = "app/api/glossary/[id]/route.ts";
if (!existsSync(glossaryItemApiPath)) {
  throw new Error("Glossary item API route must exist");
}

const glossaryItemApi = readFileSync(glossaryItemApiPath, "utf8");
for (const expected of ["export async function PATCH", "export async function DELETE"]) {
  if (!glossaryItemApi.includes(expected)) {
    throw new Error(`Glossary item API must include ${expected}`);
  }
}

const glossaryPagePath = "app/glossary/page.tsx";
const historyPagePath = "app/history/page.tsx";
if (!existsSync(glossaryPagePath) || !existsSync(historyPagePath)) {
  throw new Error("Glossary and History pages must exist");
}

const glossaryPage = readFileSync(glossaryPagePath, "utf8");
for (const expected of ['redirect("/settings?tab=glossary")']) {
  if (!glossaryPage.includes(expected)) {
    throw new Error(`Glossary page must include ${expected}`);
  }
}

const historyPage = readFileSync(historyPagePath, "utf8");
for (const expected of ["<AppHeader", "listTasks", "searchParams", "getAppSettings"]) {
  if (!historyPage.includes(expected)) {
    throw new Error(`History page must include ${expected}`);
  }
}

console.log("glossary and history pages contract passed");
