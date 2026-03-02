import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import PromptEditor from "./components/PromptEditor";
import "./index.css";

type Prompt = {
  id: string;
  title: string;
  content: string;
};

function hasElectronPromptStorage(): boolean {
  return (
    typeof window.promptStorage?.load === "function" &&
    typeof window.promptStorage?.save === "function"
  );
}

export default function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [search, setSearch] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isStorageReady, setIsStorageReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPromptsFromFile() {
      if (!hasElectronPromptStorage()) {
        if (isMounted) setIsStorageReady(true);
        return;
      }

      try {
        const storage = window.promptStorage;
        if (!storage) return;

        const data = await storage.load();
        if (!isMounted) return;

        setPrompts(data);
        setIsStorageReady(true);
      } catch (error) {
        console.error("Falha ao carregar prompts.json", error);
        if (isMounted) {
          setPrompts([]);
          setIsStorageReady(true);
        }
      }
    }

    void loadPromptsFromFile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isStorageReady) return;

    if (!hasElectronPromptStorage()) return;

    const storage = window.promptStorage;
    if (!storage) return;

    void storage.save(prompts).catch((error) => {
      console.error("Falha ao salvar prompts.json", error);
    });
  }, [prompts, isStorageReady]);

  const handleSave = (title: string, content: string) => {
    if (!hasElectronPromptStorage()) {
      alert("Execute o app pela janela do Electron para salvar em prompts.json.");
      return;
    }

    if (!title.trim() || !content.trim()) {
      alert("Titulo e conteudo nao podem estar vazios.");
      return;
    }

    if (selected) {
      setPrompts((prev: Prompt[]) =>
        prev.map((p: Prompt) =>
          p.id === selected.id ? { ...p, title, content } : p
        )
      );
    } else {
      const newPrompt: Prompt = {
        id: Date.now().toString(36),
        title,
        content,
      };
      setPrompts((prev: Prompt[]) => [newPrompt, ...prev]);
      setSelected(newPrompt);
    }

    alert("Prompt salvo com sucesso!");
  };

  const handleDelete = (id: string) => {
    setPrompts((prev: Prompt[]) => prev.filter((p: Prompt) => p.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const handleSelect = (id: string) => {
    const prompt = prompts.find((p: Prompt) => p.id === id);
    if (prompt) setSelected(prompt);
  };

  const handleNew = () => setSelected(null);

  const filteredPrompts = prompts.filter((p: Prompt) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app">
      <Sidebar
        isOpen={isSidebarOpen}
        onOpen={() => setIsSidebarOpen(true)}
        onClose={() => setIsSidebarOpen(false)}
        prompts={filteredPrompts}
        onSearch={setSearch}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onNew={handleNew}
      />
      <PromptEditor
        prompt={selected}
        onSave={handleSave}
        onCopy={() => {
          if (selected?.content)
            navigator.clipboard.writeText(selected.content as string);
          alert("Conteudo copiado!");
        }}
      />
    </div>
  );
}
