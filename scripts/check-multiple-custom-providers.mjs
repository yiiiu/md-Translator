import { readFileSync } from "node:fs";

const db = readFileSync("lib/db.ts", "utf8");
if (!db.includes("deleteEngineConfig")) {
  throw new Error("DB layer must support deleting engine config rows");
}

const enginesRoute = readFileSync("app/api/engines/route.ts", "utf8");
if (!enginesRoute.includes('startsWith("custom-openai-")')) {
  throw new Error("Engine list API must support dynamic custom-openai-* ids");
}
if (!enginesRoute.includes("crypto.randomUUID")) {
  throw new Error("Engine list API must create new custom providers");
}

const configRoute = readFileSync("app/api/engines/[id]/config/route.ts", "utf8");
if (!configRoute.includes("api_key: apiKey")) {
  throw new Error("Config GET must expose saved api_key for edit prefilling");
}
if (!configRoute.includes('startsWith("custom-openai-")')) {
  throw new Error("Config API must support dynamic custom-openai-* ids");
}

const modelsRoute = readFileSync("app/api/engines/[id]/models/route.ts", "utf8");
if (!modelsRoute.includes('startsWith("custom-openai-")')) {
  throw new Error("Models API must support dynamic custom-openai-* ids");
}

const testRoute = readFileSync("app/api/engines/[id]/test/route.ts", "utf8");
if (!testRoute.includes('startsWith("custom-openai-")')) {
  throw new Error("Test API must support dynamic custom-openai-* ids");
}

const deleteRoute = readFileSync("app/api/engines/[id]/route.ts", "utf8");
if (!deleteRoute.includes("export async function DELETE")) {
  throw new Error("Provider delete route must exist");
}

const services = readFileSync("services/api.ts", "utf8");
for (const expected of ["createEngine", "deleteEngine", "api_key?: string"]) {
  if (!services.includes(expected)) {
    throw new Error(`services/api.ts must include ${expected}`);
  }
}

const translate = readFileSync("lib/translate.ts", "utf8");
if (!translate.includes('engineId.startsWith("custom-openai-")')) {
  throw new Error("createEngine must support dynamic custom provider ids");
}

const toolbar = readFileSync("components/Toolbar.tsx", "utf8");
for (const expected of [
  "google.com/s2/favicons",
  "createEngine(",
  "setEngine(created.id)",
  "onDeleteProvider",
]) {
  if (!toolbar.includes(expected)) {
    throw new Error(`Toolbar must include ${expected}`);
  }
}
if (toolbar.includes("logoUrl || deriveFaviconUrl")) {
  throw new Error("Toolbar must not prioritize a manually saved logo_url over base_url favicon");
}

const engineConfig = readFileSync("components/EngineConfig.tsx", "utf8");
for (const expected of [
  'type={showApiKey ? "text" : "password"}',
  "deleteEngine(",
  "showApiKey",
  "Trash2",
]) {
  if (!engineConfig.includes(expected)) {
    throw new Error(`EngineConfig must include ${expected}`);
  }
}
if (engineConfig.includes("Logo Url") || engineConfig.includes("logo_url:")) {
  throw new Error("EngineConfig must not submit or render a manual logo_url field");
}

console.log("multiple custom providers contract passed");
