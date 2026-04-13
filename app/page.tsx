"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import InputArea from "@/components/InputArea";
import SplitView from "@/components/SplitView";
import StatusBar from "@/components/StatusBar";
import Toolbar from "@/components/Toolbar";

export default function Home() {
  const [showConfig, setShowConfig] = useState(false);

  return (
    <main className="flex h-screen overflow-hidden flex-col bg-[#f9f9ff] text-[#111c2d]">
      <AppHeader onOpenSettings={() => setShowConfig(true)} />
      <Toolbar
        showConfig={showConfig}
        onOpenConfig={() => setShowConfig(true)}
        onCloseConfig={() => setShowConfig(false)}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-[#f0f3ff] px-4 py-4 lg:px-8 lg:py-6">
        <SplitView />
        <StatusBar />
      </div>
      <InputArea />
    </main>
  );
}
