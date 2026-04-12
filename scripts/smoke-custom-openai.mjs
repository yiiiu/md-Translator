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
  const engines = await expectJson(`${base}/api/engines`);
  const customEngine = (engines.data.engines || []).find(
    (engine) => engine.id === "custom-openai"
  );

  if (!customEngine) {
    throw new Error("Expected custom-openai engine");
  }

  if (!("configured" in customEngine)) {
    throw new Error("Expected configured flag on custom-openai engine");
  }

  if (!("name" in customEngine)) {
    throw new Error("Expected display name on custom-openai engine");
  }

  const models = await expectJson(`${base}/api/engines/custom-openai/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: "sk-test",
      base_url: "https://example.com/v1"
    })
  });

  expectOkShape("models", models.data);

  const testResult = await expectJson(`${base}/api/engines/custom-openai/test`, {
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
      engine: "custom-openai",
      target_lang: "zh-CN",
      mode: "full",
      paragraphs: [
        { id: "p-0", type: "paragraph", content: "Hello world", index: 0 }
      ]
    })
  });

  const translationText = await translation.text();
  if (!translationText.includes("data:")) {
    throw new Error("Expected SSE response for custom-openai translation");
  }

  if (translationText.includes("Unknown engine")) {
    throw new Error("Expected custom-openai to be routed to an engine adapter");
  }

  console.log("custom-openai smoke shape checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
