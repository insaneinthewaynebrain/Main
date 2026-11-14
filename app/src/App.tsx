import TabBar from './components/TabBar';
import { tools } from './tools/registry';
import { usePersistentState } from './hooks/usePersistentState';

export default function App() {
  const [activeId, setActiveId] = usePersistentState('activeTool', tools[0].id);
  const active = tools.find((t) => t.id === activeId) ?? tools[0];

  return (
    <div className="app">
      <header className="app-header">
        <h1>{active.title}</h1>
      </header>
      <main className="app-main">
        <active.Component />
      </main>
      <TabBar
        tools={tools}
        activeId={active.id}
        onSelect={(id) => {
          setActiveId(id);
          window.scrollTo({ top: 0 });
        }}
      />
    </div>
  );
}
