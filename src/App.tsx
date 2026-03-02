import { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import PromptEditor from "./components/PromptEditor";
import "./index.css";
import "./categories.css";

type Prompt = {
  id: string;
  title: string;
  content: string;
  category: string;
};

type StoredPrompt = {
  id: string;
  title: string;
  content: string;
  category?: string;
};

function hasElectronPromptStorage(): boolean {
  return (
    typeof window.promptStorage?.load === "function" &&
    typeof window.promptStorage?.save === "function"
  );
}

function normalizePrompt(prompt: StoredPrompt): Prompt {
  return {
    id: prompt.id,
    title: prompt.title,
    content: prompt.content,
    category: prompt.category?.trim() || "Sem categoria",
  };
}

export default function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
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

        setPrompts(data.map((prompt) => normalizePrompt(prompt as StoredPrompt)));
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

  const handleSave = (title: string, content: string, category: string) => {
    if (!hasElectronPromptStorage()) {
      alert("Execute o app pela janela do Electron para salvar em prompts.json.");
      return;
    }

    if (!title.trim() || !content.trim()) {
      alert("Titulo e conteudo nao podem estar vazios.");
      return;
    }

    const normalizedCategory = category.trim() || "Sem categoria";

    if (selected) {
      const updatedPrompt: Prompt = {
        ...selected,
        title,
        content,
        category: normalizedCategory,
      };

      setPrompts((prev: Prompt[]) =>
        prev.map((p: Prompt) => (p.id === selected.id ? updatedPrompt : p))
      );
      setSelected(updatedPrompt);
    } else {
      const newPrompt: Prompt = {
        id: Date.now().toString(36),
        title,
        content,
        category: normalizedCategory,
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

  const categories = useMemo(
    () =>
      Array.from(new Set(prompts.map((p) => p.category)))
        .filter((category) => category.trim() !== "")
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [prompts]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const prompt of prompts) {
      counts[prompt.category] = (counts[prompt.category] || 0) + 1;
    }

    return counts;
  }, [prompts]);

  const filteredPrompts = prompts.filter((p: Prompt) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "Todas" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="app">
      <Sidebar
        isOpen={isSidebarOpen}
        onOpen={() => setIsSidebarOpen(true)}
        onClose={() => setIsSidebarOpen(false)}
        prompts={filteredPrompts}
        categories={categories}
        categoryCounts={categoryCounts}
        totalPrompts={prompts.length}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onSearch={setSearch}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onNew={handleNew}
      />
      <PromptEditor
        prompt={selected}
        categories={categories}
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
