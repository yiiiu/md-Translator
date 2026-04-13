import { readFileSync } from "node:fs";

const packageJson = readFileSync("package.json", "utf8");
if (!packageJson.includes('"react-icons"')) {
  throw new Error("Project must use a brand icon library for real provider logos");
}

const engineConfig = readFileSync("components/EngineConfig.tsx", "utf8");
if (engineConfig.includes("Logo Url") || engineConfig.includes("setLogoUrl")) {
  throw new Error("EngineConfig must not expose manual logo URL input");
}

const providerLogo = readFileSync("components/ProviderLogo.tsx", "utf8");
if (!providerLogo.includes("SiOpenai") || !providerLogo.includes("deriveFaviconUrl")) {
  throw new Error("ProviderLogo must render provider logos from base_url-derived favicon fallback logic");
}

if (!providerLogo.includes('engineId === "openai"')) {
  throw new Error("Only the built-in openai engine should render the OpenAI logo by default");
}

if (!providerLogo.includes("google.com/s2/favicons") || !providerLogo.includes("failedImageUrl")) {
  throw new Error("ProviderLogo must derive favicon from base_url and then fall back to text when images fail");
}

console.log("provider logos contract passed");
