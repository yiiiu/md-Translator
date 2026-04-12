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

async function main() {
  const engines = await expectJson(`${base}/api/engines`);
  const ids = new Set((engines.data.engines || []).map((engine) => engine.id));

  if (!ids.has("openai")) {
    throw new Error("Expected openai engine");
  }

  if (!ids.has("custom-openai")) {
    throw new Error("Expected custom-openai engine");
  }

  const models = await expectJson(`${base}/api/engines/custom-openai/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: "sk-test",
      base_url: "https://example.com/v1"
    })
  });

  if (typeof models.data.ok !== "boolean") {
    throw new Error("Expected ok boolean from models endpoint");
  }

  const testResult = await expectJson(`${base}/api/engines/custom-openai/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: "sk-test",
      base_url: "https://example.com/v1",
      model: "demo-model"
    })
  });

  if (typeof testResult.data.ok !== "boolean") {
    throw new Error("Expected ok boolean from test endpoint");
  }

  console.log("custom-openai smoke shape checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
