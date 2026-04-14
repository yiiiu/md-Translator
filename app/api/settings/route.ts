import { NextRequest, NextResponse } from "next/server";
import { normalizeAppSettings } from "@/lib/app-settings";
import { getAppSettings, upsertAppSettings } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getAppSettings());
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const current = getAppSettings();
  const nextSettings = normalizeAppSettings({
    ui_language:
      body.ui_language === "zh-CN" || body.ui_language === "en"
        ? body.ui_language
        : current.ui_language,
    theme_mode:
      body.theme_mode === "system" ||
      body.theme_mode === "light" ||
      body.theme_mode === "dark"
        ? body.theme_mode
        : current.theme_mode,
    default_engine:
      typeof body.default_engine === "string"
        ? body.default_engine
        : current.default_engine,
    default_target_lang:
      typeof body.default_target_lang === "string"
        ? body.default_target_lang
        : current.default_target_lang,
    auto_translate_enabled:
      typeof body.auto_translate_enabled === "boolean"
        ? body.auto_translate_enabled
        : current.auto_translate_enabled,
    auto_translate_debounce_ms:
      typeof body.auto_translate_debounce_ms === "number" ||
      typeof body.auto_translate_debounce_ms === "string"
        ? body.auto_translate_debounce_ms
        : current.auto_translate_debounce_ms,
  });

  return NextResponse.json(upsertAppSettings(nextSettings));
}
