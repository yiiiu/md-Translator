const base = process.env.APP_BASE_URL || "http://127.0.0.1:3000";

async function expectJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${text}`);
  }
  return { response, data };
}

function expectOkShape(name, payload) {
  if (typeof payload.ok !== "boolean") {
    throw new Error(`Expected ok boolean from ${name} endpoint`);
  }

  if (payload.ok === false && typeof payload.error !== "string") {
    throw new Error(`Expected error string from ${name} endpoint when ok is false`);
  }
}

async function main() {
  const created = await expectJson(`${base}/api/engines`, {
    method: "POST"
  });

  if (!created.data.ok) {
    throw new Error("Expected provider creation to succeed");
  }

  const createdId = created.data.id;
  if (!String(createdId).startsWith("custom-openai-")) {
    throw new Error("Expected POST /api/engines to create a custom-openai-* id");
  }

  const configPayload = {
    name: "Relay Test",
    api_key: "sk-test",
    base_url: "https://example.com/v1",
    model: "demo-model"
  };

  const configResponse = await expectJson(`${base}/api/engines/${createdId}/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(configPayload)
  });

  if (!configResponse.data.ok) {
    throw new Error("Expected config save to succeed");
  }

  const savedConfig = await expectJson(`${base}/api/engines/${createdId}/config`);
  if (savedConfig.data.name !== configPayload.name) {
    throw new Error("Expected custom provider name to persist");
  }
  if (savedConfig.data.base_url !== configPayload.base_url) {
    throw new Error("Expected custom provider base_url to persist");
  }
  if (savedConfig.data.model !== configPayload.model) {
    throw new Error("Expected custom provider model to persist");
  }
  if (savedConfig.data.api_key_configured !== true) {
    throw new Error("Expected config read endpoint to report stored api key");
  }
  if (savedConfig.data.api_key !== configPayload.api_key) {
    throw new Error("Expected config GET to expose saved api_key for editing");
  }

  const updatedConfigPayload = {
    name: "Relay Test Updated",
    base_url: "https://example.com/updated/v1",
    model: "updated-demo-model"
  };

  const updateResponse = await expectJson(`${base}/api/engines/${createdId}/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedConfigPayload)
  });

  if (!updateResponse.data.ok) {
    throw new Error("Expected existing custom provider config update to succeed without resending api_key");
  }

  const updatedConfig = await expectJson(`${base}/api/engines/${createdId}/config`);
  if (updatedConfig.data.name !== updatedConfigPayload.name) {
    throw new Error("Expected updated custom provider name to persist");
  }
  if (updatedConfig.data.base_url !== updatedConfigPayload.base_url) {
    throw new Error("Expected updated custom provider base_url to persist");
  }
  if (updatedConfig.data.model !== updatedConfigPayload.model) {
    throw new Error("Expected updated custom provider model to persist");
  }
  if (updatedConfig.data.api_key !== configPayload.api_key) {
    throw new Error("Expected saved api_key to remain available after update");
  }

  const engines = await expectJson(`${base}/api/engines`);
  const customEngine = (engines.data.engines || []).find(
    (engine) => engine.id === createdId
  );

  if (!customEngine) {
    throw new Error("Expected created custom provider in engine list");
  }

  if (!("configured" in customEngine)) {
    throw new Error("Expected configured flag on custom-openai engine");
  }

  if (!("name" in customEngine)) {
    throw new Error("Expected display name on custom-openai engine");
  }
  if (customEngine.base_url !== updatedConfigPayload.base_url) {
    throw new Error("Expected engine list to expose custom provider base_url");
  }

  const models = await expectJson(`${base}/api/engines/${createdId}/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: "sk-test",
      base_url: "https://example.com/v1"
    })
  });

  expectOkShape("models", models.data);

  const testResult = await expectJson(`${base}/api/engines/${createdId}/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: "sk-test",
      base_url: "https://example.com/v1",
      model: "demo-model"
    })
  });

  expectOkShape("test", testResult.data);

  const translation = await fetch(`${base}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      engine: createdId,
      target_lang: "zh-CN",
      mode: "full",
      paragraphs: [
        { id: "p-0", type: "paragraph", content: "Hello world", index: 0 }
      ]
    })
  });

  const translationText = await translation.text();
  if (!translationText.includes("data:")) {
    throw new Error("Expected SSE response for custom provider translation");
  }

  if (translationText.includes("Unknown engine")) {
    throw new Error("Expected custom provider id to be routed to an engine adapter");
  }

  const deleted = await expectJson(`${base}/api/engines/${createdId}`, {
    method: "DELETE"
  });

  if (!deleted.data.ok) {
    throw new Error("Expected custom provider delete to succeed");
  }

  const afterDelete = await expectJson(`${base}/api/engines`);
  const deletedStillExists = (afterDelete.data.engines || []).some(
    (engine) => engine.id === createdId
  );
  if (deletedStillExists) {
    throw new Error("Expected deleted provider to disappear from engine list");
  }

  console.log("multiple custom providers smoke shape checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
