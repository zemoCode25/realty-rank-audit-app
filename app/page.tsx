import InputPanel from "@/components/InputPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 p-8 dark:bg-black">
      <main className="w-full max-w-3xl">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          RealtyRank Audit
        </h1>
        <Tabs defaultValue="paste">
          <TabsList>
            <TabsTrigger value="paste">Paste JSON</TabsTrigger>
            <TabsTrigger value="form">Fill Form</TabsTrigger>
          </TabsList>
          <TabsContent value="paste">
            <InputPanel />
          </TabsContent>
          <TabsContent value="form">
            <p className="p-4 text-sm text-muted-foreground">Coming soon.</p>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
