import { redirect } from "next/navigation";

export default function GlossaryPage() {
  redirect("/settings?tab=glossary");
}
