import { useMemo, useState } from 'react';
import TabBar from './components/TabBar';
import { tools } from './tools/registry';
import { usePersistentState } from './hooks/usePersistentState';
import { writeCheckState } from './hooks/useCheckState';
import { AppNavContext, type AppNav } from './appNav';
import { checkFromItem } from './tools/shortlist/mapping';
import { clearSharedLinkFromAddressBar, readSharedLink } from './tools/shortlist/share';

export default function App() {
  // A link shared into the app (?share=…) goes straight to "Add by link".
  const [pendingShare, setPendingShare] = useState(() => readSharedLink(window.location.href));
  const [activeId, setActiveId] = usePersistentState('activeTool', pendingShare ? 'shortlist' : tools[0].id);
  const [checkVersion, setCheckVersion] = useState(0);
  const [pendingOpenId, setPendingOpenId] = useState<string>();
  const active = tools.find((t) => t.id === (pendingShare ? 'shortlist' : activeId)) ?? tools[0];

  const nav = useMemo<AppNav>(
    () => ({
      goTo: (id) => {
        setActiveId(id);
        window.scrollTo({ top: 0 });
      },
      openInCheck: (item) => {
        writeCheckState(checkFromItem(item));
        setCheckVersion((v) => v + 1); // remount the Check screen with the loaded car
        setActiveId('check');
        window.scrollTo({ top: 0 });
      },
      openShortlistItem: (id) => {
        setPendingOpenId(id);
        setActiveId('shortlist');
        window.scrollTo({ top: 0 });
      },
      pendingOpenId,
      clearPendingOpen: () => setPendingOpenId(undefined),
      pendingShare,
      clearPendingShare: () => {
        setPendingShare(undefined);
        setActiveId('shortlist');
        clearSharedLinkFromAddressBar();
      },
    }),
    [pendingShare, pendingOpenId, setActiveId],
  );

  return (
    <AppNavContext.Provider value={nav}>
      <div className="app">
        <header className="app-header">
          <h1>{active.title}</h1>
        </header>
        <main className="app-main">
          <active.Component key={active.id === 'check' ? `check-${checkVersion}` : active.id} />
        </main>
        <TabBar tools={tools} activeId={active.id} onSelect={nav.goTo} />
      </div>
    </AppNavContext.Provider>
  );
}
