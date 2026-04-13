import { readFileSync } from "node:fs";

const packageJson = readFileSync("package.json", "utf8");
if (!packageJson.includes('"react-icons"')) {
  throw new Error("Project must use a brand icon library for real provider logos");
}

const services = readFileSync("services/api.ts", "utf8");
if (!services.includes("logo_url?: string") || !services.includes("logo_url?: string")) {
  throw new Error("API types must include optional provider logo_url");
}

const enginesRoute = readFileSync("app/api/engines/route.ts", "utf8");
if (!enginesRoute.includes("logo_url")) {
  throw new Error("Engine list API must return logo_url");
}

const configRoute = readFileSync("app/api/engines/[id]/config/route.ts", "utf8");
if (!configRoute.includes("readExtra") || !configRoute.includes("logo_url")) {
  throw new Error("Engine config API must persist logo_url in extra JSON");
}

const engineConfig = readFileSync("components/EngineConfig.tsx", "utf8");
if (!engineConfig.includes("logoUrl") || !engineConfig.includes("Logo Url")) {
  throw new Error("EngineConfig must allow custom provider logo URL input");
}

const toolbar = readFileSync("components/Toolbar.tsx", "utf8");
if (!toolbar.includes("SiOpenai") || !toolbar.includes("logoUrl") || !toolbar.includes("backgroundImage")) {
  throw new Error("Toolbar must render real provider logos and custom logo URLs");
}

if (!toolbar.includes('engineId === "openai"')) {
  throw new Error("Only the built-in openai engine should render the OpenAI logo by default");
}

console.log("provider logos contract passed");
