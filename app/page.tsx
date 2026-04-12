import InputArea from "@/components/InputArea";
import SplitView from "@/components/SplitView";
import StatusBar from "@/components/StatusBar";
import Toolbar from "@/components/Toolbar";

export default function Home() {
  return (
    <main className="flex h-screen overflow-hidden flex-col">
      <Toolbar />
      <div className="flex min-h-0 flex-1 overflow-hidden py-4">
        <SplitView />
      </div>
      <InputArea />
      <StatusBar />
    </main>
  );
}
