import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("provider settings bubble save and delete success into a toast", () => {
  const manager = readFileSync("components/ProviderSettingsManager.tsx", "utf8");
  const engineConfig = readFileSync("components/EngineConfig.tsx", "utf8");
  const uiText = readFileSync("lib/ui-text.ts", "utf8");

  assert.match(manager, /AppToast/);
  assert.match(manager, /setToastMessage/);
  assert.match(manager, /setToastTone/);
  assert.match(manager, /setToastMessage\(message\)/);
  assert.match(engineConfig, /onSaved\?: \(message: string\) => void/);
  assert.match(engineConfig, /onSaved\?\.\(providerText\.saved\)/);
  assert.match(
    engineConfig,
    /onDeleteProvider\?: \(engineId: string, message: string\) => void/
  );
  assert.match(engineConfig, /onDeleteProvider\?\.\(engineId, providerText\.deleted\)/);
  assert.match(uiText, /saved: "Config saved\."/);
  assert.match(
    uiText,
    /saved: "\u4fdd\u5b58\u914d\u7f6e\u6210\u529f"/
  );
  assert.match(uiText, /deleted: "Provider deleted\."/);
  assert.match(uiText, /deleted:/);
});
