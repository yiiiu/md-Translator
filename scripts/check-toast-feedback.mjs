import { existsSync, readFileSync } from "node:fs";

const toastPath = "components/ui/AppToast.tsx";
if (!existsSync(toastPath)) {
  throw new Error("AppToast component must exist");
}

const toast = readFileSync(toastPath, "utf8");
for (const expected of ['"use client"', 'tone?: "success" | "error"', "fixed right-4 top-4"]) {
  if (!toast.includes(expected)) {
    throw new Error(`AppToast must include ${expected}`);
  }
}

const historyWorkspace = readFileSync("components/HistoryWorkspace.tsx", "utf8");
for (const expected of ["AppToast", "toastMessage", "toastTone", "setToastMessage"]) {
  if (!historyWorkspace.includes(expected)) {
    throw new Error(`HistoryWorkspace must include ${expected}`);
  }
}
if (!historyWorkspace.includes("aria-label={text.delete}")) {
  throw new Error("HistoryWorkspace delete button must be icon-only with aria-label");
}
if (!historyWorkspace.includes("whitespace-nowrap")) {
  throw new Error("HistoryWorkspace status badge must prevent wrapping");
}
if (historyWorkspace.includes(`>{text.delete}<`)) {
  throw new Error("HistoryWorkspace delete button must not render a visible text label");
}

const settingsWorkspace = readFileSync("components/SettingsWorkspace.tsx", "utf8");
for (const expected of ["AppToast", "toastMessage", "toastTone", "setToastMessage"]) {
  if (!settingsWorkspace.includes(expected)) {
    throw new Error(`SettingsWorkspace must include ${expected}`);
  }
}

console.log("toast feedback contract passed");
