/**
 * Shortlist tab: saved cars, add by link, compare.
 */
import { useEffect, useState } from 'react';
import { useAppNav } from '../../appNav';
import { useShortlist } from '../../hooks/useShortlist';
import type { ShortlistItem } from '../../storage/shortlist';
import { CompareIcon, LinkIcon } from '../../components/icons';
import ShortlistCard from './ShortlistCard';
import ShortlistEditor from './ShortlistEditor';
import AddByLink from './AddByLink';
import CompareView from './CompareView';

type Filter = 'all' | 'favourites' | 'active';

export default function ShortlistScreen() {
  const nav = useAppNav();
  const { items, loaded, error } = useShortlist();
  const [openId, setOpenId] = useState<string>();
  const [adding, setAdding] = useState<{ url?: string }>();
  const [filter, setFilter] = useState<Filter>('all');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [toast, setToast] = useState<string>();
  const [query, setQuery] = useState('');

  // A link shared into the app opens "Add by link" pre-filled;
  // "On shortlist" on the Check tab opens that card.
  useEffect(() => {
    if (nav.pendingShare) {
      setAdding({ url: nav.pendingShare.url });
      nav.clearPendingShare();
    }
    if (nav.pendingOpenId) {
      setOpenId(nav.pendingOpenId);
      nav.clearPendingOpen();
    }
  }, [nav]);

  const q = query.trim().toLowerCase().replace(/\s+/g, '');
  const shown = items
    .filter((i) => (filter === 'favourites' ? i.favourite : filter === 'active' ? !i.ruledOut : true))
    .filter((i) =>
      !q ||
      [i.reg, i.make, i.model, i.advertTitle, i.advertSite, i.notes]
        .filter(Boolean)
        .some((t) => t!.toLowerCase().replace(/\s+/g, '').includes(q)),
    );
  const open = items.find((i) => i.id === openId);
  const toCompare = selected.map((id) => items.find((i) => i.id === id)).filter((i): i is ShortlistItem => !!i);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(undefined), 3000);
  };

  return (
    <div className="shortlist">
      <div className="sl-actions">
        <button type="button" className="btn btn-primary" onClick={() => setAdding({})}>
          <LinkIcon /> Add by link
        </button>
        <button
          type="button"
          className={`btn btn-ghost${selecting ? ' btn-active' : ''}`}
          disabled={items.length < 2}
          onClick={() => {
            setSelecting(!selecting);
            setSelected([]);
          }}
        >
          <CompareIcon /> {selecting ? 'Cancel' : 'Compare'}
        </button>
      </div>

      {selecting && (
        <div className="compare-bar">
          <span>{selected.length < 2 ? 'Tap 2–4 cars to compare' : `${selected.length} selected`}</span>
          <button type="button" className="btn btn-primary btn-small" disabled={selected.length < 2} onClick={() => setComparing(true)}>
            Compare
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className="segmented" role="tablist" aria-label="Filter">
          {(
            [
              ['all', `All (${items.length})`],
              ['favourites', 'Favourites'],
              ['active', 'Hide ruled out'],
            ] as [Filter, string][]
          ).map(([f, label]) => (
            <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {items.length > 2 && (
        <input
          className="search-input"
          type="search"
          placeholder="Search reg, make, model, site, notes"
          aria-label="Search shortlist"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      {q && shown.length === 0 && <p className="muted">No cars match “{query}”.</p>}

      {error && <p className="note note--warn">{error}</p>}

      {loaded && items.length === 0 && (
        <section className="card empty">
          <p className="result-title">No cars yet</p>
          <p className="muted">
            Look up a car on the Check tab and tap "Save to shortlist", or add one from an advert link.
          </p>
        </section>
      )}

      <div className="sl-list">
        {shown.map((item) => (
          <ShortlistCard
            key={item.id}
            item={item}
            onOpen={() => setOpenId(item.id)}
            selectable={selecting}
            selected={selected.includes(item.id)}
            onToggleSelect={() =>
              setSelected((s) => (s.includes(item.id) ? s.filter((x) => x !== item.id) : s.length >= 4 ? s : [...s, item.id]))
            }
          />
        ))}
      </div>

      {open && <ShortlistEditor key={open.id} item={open} onClose={() => setOpenId(undefined)} />}
      {adding && (
        <AddByLink
          initialUrl={adding.url}
          onClose={() => setAdding(undefined)}
          onAdded={(item, note) => {
            setAdding(undefined);
            setOpenId(item.id);
            if (note) flash(note);
          }}
        />
      )}
      {comparing && toCompare.length >= 2 && <CompareView items={toCompare} onClose={() => setComparing(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
