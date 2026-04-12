import InputArea from "@/components/InputArea";
import SplitView from "@/components/SplitView";
import StatusBar from "@/components/StatusBar";
import Toolbar from "@/components/Toolbar";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Toolbar />
      <div className="flex flex-1 flex-col py-4">
        <SplitView />
      </div>
      <InputArea />
      <StatusBar />
    </main>
  );
}
