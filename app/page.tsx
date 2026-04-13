import HomeWorkspace from "@/components/HomeWorkspace";
import { getAppSettings } from "@/lib/db";

export default function Home() {
  return <HomeWorkspace initialSettings={getAppSettings()} />;
}
