import { useMemo, useState } from 'react';
import { useStore } from '../store.js';
import ListingEditor from '../capture/ListingEditor.jsx';

const SORTS = {
  newest: { label: 'Newest', fn: () => 0 }, // insertion order, reversed below
  price: { label: 'Price, high to low', fn: (a, b) => b.suggested_price_gbp - a.suggested_price_gbp },
  condition: { label: 'Condition, best first', fn: (a, b) => a.condition_grade.localeCompare(b.condition_grade) },
  category: { label: 'Category', fn: (a, b) => a.category.localeCompare(b.category) },
};

const FILTERS = ['All', 'Draft', 'Posted'];

export default function DashboardScreen({ onScanFirst }) {
  const items = useStore((s) => s.items);
  const updateItem = useStore((s) => s.updateItem);
  const [sort, setSort] = useState('newest');
  const [filter, setFilter] = useState('All');
  const [openId, setOpenId] = useState(null);

  const visible = useMemo(() => {
    let list = filter === 'All' ? items : items.filter((i) => i.status === filter.toLowerCase());
    list = [...list];
    if (sort === 'newest') list.reverse();
    else list.sort(SORTS[sort].fn);
    return list;
  }, [items, sort, filter]);

  const total = items.reduce((sum, i) => sum + (i.suggested_price_gbp || 0), 0);
  const postedCount = items.filter((item) => item.status === 'posted').length;
  const readyCount = items.length - postedCount;

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <span className="brand-mark mb-5" aria-hidden="true"><span /></span>
        <h1 className="text-[1.5rem] font-medium tracking-[-0.02em] [text-wrap:balance]">
          Your workbench is ready
        </h1>
        <p className="mt-2 max-w-[32ch] text-[var(--ink-muted)]">
          Scan one garment and its graded, priced listing will land here.
        </p>
        <button
          onClick={onScanFirst}
          className="mt-6 min-h-12 rounded-[var(--radius)] bg-[var(--moss)] px-6 text-sm font-bold text-[var(--stone)] transition-colors duration-150 hover:bg-[var(--moss-deep)]"
        >
          Scan first item
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-5 pb-6 pt-5">
      <header className="mb-5">
        <p className="text-sm font-medium text-[var(--ink-muted)]">
          Your bundle
        </p>
        <h1 className="mt-1 text-[1.75rem] font-medium leading-tight tracking-[-0.025em] [text-wrap:balance]">
          {readyCount ? `${readyCount} ready to post` : 'Bundle complete'}
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          {postedCount} posted · {items.length} {items.length === 1 ? 'item' : 'items'} · £
          {total.toFixed(total % 1 ? 2 : 0)} suggested value
        </p>
        <div
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--stone-deep)]"
          role="progressbar"
          aria-label="Items marked as posted"
          aria-valuemin="0"
          aria-valuemax={items.length}
          aria-valuenow={postedCount}
        >
          <span
            className="block h-full rounded-full bg-[var(--moss)] transition-[width] duration-200"
            style={{ width: `${(postedCount / items.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={active}
                className="min-h-11 rounded-full px-3.5 text-[0.8125rem] transition-colors duration-150"
                style={
                  active
                    ? { background: 'var(--moss)', color: 'var(--stone)', fontWeight: 700 }
                    : { background: 'var(--stone-surface)', color: 'var(--ink)', fontWeight: 500 }
                }
              >
                {f}
              </button>
            );
          })}
        </div>
        <label className="shrink-0">
          <span className="sr-only">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="min-h-11 max-w-[8.5rem] rounded-full bg-[var(--stone-surface)] px-3 text-[0.8125rem] font-medium"
          >
            {Object.entries(SORTS).map(([k, { label }]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="flex flex-col gap-2.5">
        {visible.map((item) => (
          <Row
            key={item.id}
            item={item}
            open={openId === item.id}
            onToggle={() => setOpenId(openId === item.id ? null : item.id)}
            onPost={() => updateItem(item.id, { status: 'posted' })}
            onUndoPost={() => updateItem(item.id, { status: 'draft' })}
            onSave={(draft) => {
              updateItem(item.id, draft);
              setOpenId(null);
            }}
          />
        ))}
        {visible.length === 0 && (
          <li className="py-10 text-center">
            <p className="text-[var(--ink-muted)]">No {filter.toLowerCase()} items yet.</p>
            <button
              onClick={() => setFilter('All')}
              className="mt-3 min-h-11 rounded-full px-4 text-sm font-bold text-[var(--moss-deep)]"
            >
              Show all items
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

function Row({ item, open, onToggle, onPost, onUndoPost, onSave }) {
  const posted = item.status === 'posted';
  return (
    <li className="settle-in overflow-hidden rounded-[var(--radius-lg)] bg-[var(--stone-surface)]">
      <div className="flex w-full items-center gap-3 p-3 text-left">
        <button
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${open ? 'Close' : 'Edit'} ${item.title}`}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {item.images[0] ? (
            <img
              src={item.images[0]}
              alt=""
              className="h-16 w-14 shrink-0 rounded-[10px] object-cover"
            />
          ) : (
            <span className="h-16 w-14 shrink-0 rounded-[10px] bg-[var(--stone-deep)]" />
          )}
          <span className="min-w-0">
            <span className="block truncate font-medium">{item.title}</span>
            <span className="mt-0.5 flex items-center gap-2 text-[0.8125rem] text-[var(--ink-muted)]">
              <span
                className="rounded-md bg-[var(--stone-deep)] px-1.5 py-px font-bold text-[var(--ink)]"
                aria-label={`Condition grade ${item.condition_grade}`}
              >
                {item.condition_grade}
              </span>
              <span className="truncate">{item.category}</span>
              {item.defects.length > 0 && (
                <span className="shrink-0 font-medium" style={{ color: 'var(--clay-deep)' }}>
                  {item.defects.length} defect{item.defects.length > 1 ? 's' : ''}
                </span>
              )}
            </span>
          </span>
        </button>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="font-bold">£{item.suggested_price_gbp}</span>
          {posted ? (
            <button
              onClick={onUndoPost}
              className="min-h-11 rounded-full px-3 text-xs font-bold"
              style={{ color: 'var(--moss-deep)', background: 'oklch(0.42 0.06 130 / 0.14)' }}
            >
              Posted · Undo
            </button>
          ) : (
            <button
              onClick={onPost}
              className="min-h-11 rounded-full bg-[var(--moss)] px-3.5 text-xs font-bold text-[var(--stone)] transition-colors duration-150 hover:bg-[var(--moss-deep)]"
            >
              Mark posted
            </button>
          )}
        </span>
      </div>

      {open && (
        <div className="fade-in border-t border-[var(--stone-deep)] p-4">
          <ListingEditor
            key={item.id}
            item={item}
            onSave={onSave}
            primaryLabel="Save changes"
            onDiscard={onToggle}
            discardLabel="Cancel"
          />
        </div>
      )}
    </li>
  );
}
