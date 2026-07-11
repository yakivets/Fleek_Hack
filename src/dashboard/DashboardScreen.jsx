import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_CATEGORY_GROUPS, useStore } from '../store.js';
import ListingEditor from '../capture/ListingEditor.jsx';

const SORTS = {
  newest: { label: 'Newest', fn: () => 0 },
  price: {
    label: 'Price, high to low',
    fn: (a, b) => b.suggested_price_gbp - a.suggested_price_gbp,
  },
  condition: {
    label: 'Condition, best first',
    fn: (a, b) => a.condition_grade.localeCompare(b.condition_grade),
  },
  category: { label: 'Category', fn: (a, b) => a.category.localeCompare(b.category) },
};

const FILTERS = ['All', 'Draft', 'Posted'];

export default function DashboardScreen({
  onScanFirst,
  onContinueBundle,
  initialView = 'items',
  initialBundleId = null,
}) {
  const [view, setView] = useState(initialBundleId ? 'bundles' : initialView);
  const [selectedBundleId, setSelectedBundleId] = useState(initialBundleId);

  return (
    <div className="h-full overflow-y-auto px-5 pb-6 pt-5">
      <div
        className="mb-5 grid grid-cols-2 rounded-full bg-[var(--stone-surface)] p-1"
        role="tablist"
        aria-label="Dashboard view"
      >
        {[
          ['items', 'All items'],
          ['bundles', 'Bundles'],
        ].map(([key, label]) => {
          const active = view === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => {
                setView(key);
                if (key === 'items') setSelectedBundleId(null);
              }}
              className="min-h-10 rounded-full px-4 text-sm transition-colors duration-150"
              style={
                active
                  ? { background: 'var(--moss)', color: 'var(--stone)', fontWeight: 700 }
                  : { color: 'var(--ink-muted)', fontWeight: 500 }
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {view === 'items' ? (
        <AllItemsView onScanFirst={onScanFirst} />
      ) : (
        <BundlesView
          selectedBundleId={selectedBundleId}
          onSelectBundle={setSelectedBundleId}
          onScanFirst={onScanFirst}
          onContinueBundle={onContinueBundle}
        />
      )}
    </div>
  );
}

function AllItemsView({ onScanFirst }) {
  const items = useStore((state) => state.items);
  const updateItem = useStore((state) => state.updateItem);
  const [sort, setSort] = useState('newest');
  const [filter, setFilter] = useState('All');
  const [openId, setOpenId] = useState(null);

  const visible = useMemo(() => {
    let list = filter === 'All' ? items : items.filter((item) => item.status === filter.toLowerCase());
    list = [...list];
    if (sort === 'newest') list.reverse();
    else list.sort(SORTS[sort].fn);
    return list;
  }, [items, sort, filter]);

  const total = items.reduce((sum, item) => sum + (item.suggested_price_gbp || 0), 0);
  const postedCount = items.filter((item) => item.status === 'posted').length;
  const readyCount = items.length - postedCount;

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your workbench is ready"
        copy="Scan one garment and its graded, priced listing will land here."
        action="Scan first item"
        onAction={onScanFirst}
      />
    );
  }

  return (
    <>
      <header className="mb-5">
        <p className="text-sm font-medium text-[var(--ink-muted)]">All listings</p>
        <h1 className="mt-1 text-[1.75rem] font-medium leading-tight tracking-[-0.025em] [text-wrap:balance]">
          {readyCount ? `${readyCount} ready to post` : 'Everything posted'}
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          {postedCount} posted · {items.length} {items.length === 1 ? 'item' : 'items'} · £
          {formatMoney(total)} suggested value
        </p>
        <Progress value={postedCount} max={items.length} />
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5" role="group" aria-label="Filter by status">
          {FILTERS.map((value) => {
            const active = filter === value;
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                aria-pressed={active}
                className="min-h-11 rounded-full px-3.5 text-[0.8125rem] transition-colors duration-150"
                style={
                  active
                    ? { background: 'var(--moss)', color: 'var(--stone)', fontWeight: 700 }
                    : {
                        background: 'var(--stone-surface)',
                        color: 'var(--ink)',
                        fontWeight: 500,
                      }
                }
              >
                {value}
              </button>
            );
          })}
        </div>
        <label className="shrink-0">
          <span className="sr-only">Sort by</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="min-h-11 max-w-[8.5rem] rounded-full bg-[var(--stone-surface)] px-3 text-[0.8125rem] font-medium"
          >
            {Object.entries(SORTS).map(([key, { label }]) => (
              <option key={key} value={key}>
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
    </>
  );
}

function BundlesView({
  selectedBundleId,
  onSelectBundle,
  onContinueBundle,
}) {
  const bundles = useStore((state) => state.bundles);
  const items = useStore((state) => state.items);
  const startBundle = useStore((state) => state.startBundle);
  const selected = bundles.find((bundle) => bundle.id === selectedBundleId);

  if (selected) {
    return (
      <BundleDetail
        bundle={selected}
        items={items.filter((item) => item.bundle_id === selected.id)}
        onBack={() => onSelectBundle(null)}
        onContinue={() => onContinueBundle(selected.id)}
      />
    );
  }

  if (bundles.length === 0) {
    return (
      <EmptyState
        title="No bundles yet"
        copy="Start Bundle mode to scan a mixed lot and sort every item automatically."
        action="Start a bundle"
        onAction={() => {
          const id = startBundle();
          onContinueBundle(id);
        }}
      />
    );
  }

  return (
    <>
      <header className="mb-5">
        <p className="text-sm font-medium text-[var(--ink-muted)]">Scanning sessions</p>
        <h1 className="mt-1 text-[1.75rem] font-medium tracking-[-0.025em]">Bundles</h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Mixed lots, sorted by what the camera found.
        </p>
      </header>
      <ul className="flex flex-col gap-3">
        {[...bundles].reverse().map((bundle) => (
          <BundleCard
            key={bundle.id}
            bundle={bundle}
            items={items.filter((item) => item.bundle_id === bundle.id)}
            onOpen={() => onSelectBundle(bundle.id)}
          />
        ))}
      </ul>
    </>
  );
}

function BundleCard({ bundle, items, onOpen }) {
  const total = items.reduce((sum, item) => sum + (item.suggested_price_gbp || 0), 0);
  const posted = items.filter((item) => item.status === 'posted').length;
  const groups = new Set(items.map((item) => item.category_key)).size;
  return (
    <li className="settle-in overflow-hidden rounded-[var(--radius-lg)] bg-[var(--stone-surface)]">
      <button onClick={onOpen} className="w-full p-4 text-left">
        <span className="flex items-start justify-between gap-4">
          <span>
            <span className="block text-lg font-medium">{bundle.name}</span>
            <span className="mt-1 block text-xs text-[var(--ink-muted)]">
              {formatDate(bundle.created_at)} · {bundle.status}
            </span>
          </span>
          <span className="text-right">
            <span className="block text-lg font-bold">£{formatMoney(total)}</span>
            <span className="block text-xs text-[var(--ink-muted)]">suggested value</span>
          </span>
        </span>
        <span className="mt-4 flex items-end justify-between gap-3">
          <span className="flex -space-x-2">
            {items.slice(0, 4).map((item) =>
              item.images[0] ? (
                <img
                  key={item.id}
                  src={item.images[0]}
                  alt=""
                  className="h-11 w-11 rounded-full border-2 border-[var(--stone-surface)] object-cover"
                />
              ) : (
                <span
                  key={item.id}
                  className="h-11 w-11 rounded-full border-2 border-[var(--stone-surface)] bg-[var(--stone-deep)]"
                />
              ),
            )}
          </span>
          <span className="text-right text-xs leading-relaxed text-[var(--ink-muted)]">
            {items.length} {items.length === 1 ? 'item' : 'items'} · {groups}{' '}
            {groups === 1 ? 'group' : 'groups'}
            <br />
            {posted} posted
          </span>
        </span>
      </button>
    </li>
  );
}

function BundleDetail({ bundle, items, onBack, onContinue }) {
  const updateItem = useStore((state) => state.updateItem);
  const removeItem = useStore((state) => state.removeItem);
  const renameBundle = useStore((state) => state.renameBundle);
  const renameCategoryGroup = useStore((state) => state.renameCategoryGroup);
  const finishBundle = useStore((state) => state.finishBundle);
  const archiveBundle = useStore((state) => state.archiveBundle);
  const [openId, setOpenId] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(bundle.name);
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [drag, setDrag] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [notice, setNotice] = useState('');
  const dragSession = useRef(null);
  const deleteDialogRef = useRef(null);

  const groups = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      const key = item.category_key || 'Other';
      map.set(key, [...(map.get(key) || []), item]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const groupOptions = [...new Set([...DEFAULT_CATEGORY_GROUPS, ...groups.map(([key]) => key)])]
    .sort((a, b) => a.localeCompare(b));
  const total = items.reduce((sum, item) => sum + (item.suggested_price_gbp || 0), 0);
  const posted = items.filter((item) => item.status === 'posted').length;

  const saveBundleName = () => {
    renameBundle(bundle.id, name);
    setEditingName(false);
  };

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (pendingDelete && !dialog.open) dialog.showModal();
    if (!pendingDelete && dialog.open) dialog.close();
  }, [pendingDelete]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 1800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(
    () => () => {
      if (dragSession.current?.timer) window.clearTimeout(dragSession.current.timer);
    },
    [],
  );

  const startHold = (event, item) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const x = event.clientX;
    const y = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
    const session = {
      item,
      pointerId: event.pointerId,
      startX: x,
      startY: y,
      active: false,
      target: null,
    };
    session.timer = window.setTimeout(() => {
      session.active = true;
      setDrag({ item, x, y, target: null });
      navigator.vibrate?.(20);
    }, 350);
    dragSession.current = session;
  };

  const moveHold = (event) => {
    const session = dragSession.current;
    if (!session || session.pointerId !== event.pointerId) return;

    if (!session.active) {
      const distance = Math.hypot(
        event.clientX - session.startX,
        event.clientY - session.startY,
      );
      if (distance > 8) {
        window.clearTimeout(session.timer);
        dragSession.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }

    event.preventDefault();
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const deleteTarget = element?.closest('[data-delete-zone]');
    const groupTarget = element?.closest('[data-drop-group]');
    const target = deleteTarget
      ? { type: 'delete' }
      : groupTarget
        ? { type: 'group', key: groupTarget.dataset.dropGroup }
        : null;

    session.target = target;
    setDrag({ item: session.item, x: event.clientX, y: event.clientY, target });
  };

  const endHold = (event, cancelled = false) => {
    const session = dragSession.current;
    if (!session || session.pointerId !== event.pointerId) return;
    window.clearTimeout(session.timer);

    if (session.active && !cancelled) {
      if (session.target?.type === 'delete') {
        setPendingDelete(session.item);
      } else if (
        session.target?.type === 'group'
        && session.target.key !== session.item.category_key
      ) {
        updateItem(session.item.id, { category_key: session.target.key });
        setNotice(`Moved to ${session.target.key}`);
      }
    }

    setDrag(null);
    dragSession.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <>
      <button
        onClick={onBack}
        className="mb-4 min-h-11 rounded-full pr-4 text-sm font-bold text-[var(--moss-deep)]"
      >
        ← All bundles
      </button>

      <header className="mb-5">
        {editingName ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveBundleName();
            }}
            className="flex gap-2"
          >
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-h-12 min-w-0 flex-1 rounded-[var(--radius)] bg-[var(--stone-surface)] px-3.5 font-medium"
              aria-label="Bundle name"
            />
            <button className="min-h-12 rounded-[var(--radius)] bg-[var(--moss)] px-4 text-sm font-bold text-[var(--stone)]">
              Save
            </button>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--ink-muted)]">
                {formatDate(bundle.created_at)} · {bundle.status}
              </p>
              <h1 className="mt-1 text-[1.75rem] font-medium tracking-[-0.025em]">
                {bundle.name}
              </h1>
            </div>
            <button
              onClick={() => setEditingName(true)}
              className="min-h-11 rounded-full bg-[var(--stone-surface)] px-3.5 text-xs font-bold"
            >
              Rename
            </button>
          </div>
        )}
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          {items.length} {items.length === 1 ? 'item' : 'items'} · {groups.length}{' '}
          {groups.length === 1 ? 'group' : 'groups'} · £{formatMoney(total)} suggested value
        </p>
        <Progress value={posted} max={items.length} />
        <div className="mt-4 flex gap-2">
          <button
            onClick={onContinue}
            className="min-h-12 flex-1 rounded-[var(--radius)] bg-[var(--moss)] px-4 text-sm font-bold text-[var(--stone)]"
          >
            Continue scanning
          </button>
          {bundle.status === 'active' ? (
            <button
              onClick={() => finishBundle(bundle.id)}
              className="min-h-12 rounded-[var(--radius)] bg-[var(--stone-surface)] px-4 text-sm font-bold"
            >
              Finish
            </button>
          ) : bundle.status !== 'archived' ? (
            <button
              onClick={() => archiveBundle(bundle.id)}
              className="min-h-12 rounded-[var(--radius)] bg-[var(--stone-surface)] px-4 text-sm font-bold"
            >
              Archive
            </button>
          ) : null}
        </div>
      </header>

      {groups.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--stone-surface)] p-5 text-center">
          <p className="font-medium">This bundle is ready for its first item.</p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Continue scanning and Relist will build the groups.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="-mb-2 text-xs text-[var(--ink-muted)]">
            Hold the grip on an item, then drag it to another group.
          </p>
          {groups.map(([group, groupItems]) => (
            <section
              key={group}
              aria-labelledby={`group-${slug(group)}`}
              data-drop-group={group}
              className={`rounded-[var(--radius-lg)] transition-[outline-color,background-color] duration-150 ${
                drag?.target?.type === 'group' && drag.target.key === group
                  ? 'bg-[oklch(0.42_0.06_130_/_0.1)] outline outline-2 outline-[var(--moss)]'
                  : ''
              }`}
            >
              {renamingGroup === group ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    renameCategoryGroup(bundle.id, group, groupName);
                    setRenamingGroup(null);
                  }}
                  className="mb-2 flex gap-2"
                >
                  <input
                    autoFocus
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    className="min-h-11 min-w-0 flex-1 rounded-[var(--radius)] bg-[var(--stone-surface)] px-3.5 text-sm"
                    aria-label={`Rename ${group}`}
                  />
                  <button className="min-h-11 rounded-[var(--radius)] bg-[var(--moss)] px-4 text-xs font-bold text-[var(--stone)]">
                    Save
                  </button>
                </form>
              ) : (
                <div className="mb-2 flex items-center justify-between">
                  <h2 id={`group-${slug(group)}`} className="font-medium">
                    {group} <span className="text-sm text-[var(--ink-muted)]">· {groupItems.length}</span>
                  </h2>
                  <button
                    onClick={() => {
                      setRenamingGroup(group);
                      setGroupName(group);
                    }}
                    className="min-h-11 rounded-full px-3 text-xs font-bold text-[var(--moss-deep)]"
                  >
                    Rename group
                  </button>
                </div>
              )}
              <ul className="flex flex-col gap-2.5">
                {groupItems.map((item) => (
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
                    groupOptions={groupOptions}
                    onMove={(categoryKey) => updateItem(item.id, { category_key: categoryKey })}
                    dragHandleProps={{
                      onPointerDown: (event) => startHold(event, item),
                      onPointerMove: moveHold,
                      onPointerUp: endHold,
                      onPointerCancel: (event) => endHold(event, true),
                    }}
                    onRequestDelete={() => setPendingDelete(item)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {notice && (
        <p
          role="status"
          className="settle-in fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-full bg-[var(--moss)] px-4 py-2 text-sm font-bold text-[var(--stone)]"
        >
          {notice}
        </p>
      )}

      {drag && (
        <>
          <div
            data-delete-zone
            className={`fixed bottom-20 left-1/2 z-40 min-h-14 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 rounded-[var(--radius-lg)] border-2 border-dashed px-4 py-3 text-center text-sm font-bold transition-colors duration-150 ${
              drag.target?.type === 'delete'
                ? 'border-[var(--clay-deep)] bg-[var(--clay-deep)] text-[var(--stone)]'
                : 'border-[var(--clay)] bg-[var(--stone)] text-[var(--clay-deep)]'
            }`}
          >
            Drop here to delete
          </div>
          <div
            className="pointer-events-none fixed z-50 max-w-[15rem] -translate-x-1/2 -translate-y-[120%] rounded-[var(--radius)] bg-[var(--ink)] px-3 py-2 text-sm font-medium text-[var(--stone)] shadow-[var(--lift)]"
            style={{ left: drag.x, top: drag.y }}
            aria-hidden="true"
          >
            <span className="block truncate">{drag.item.title}</span>
          </div>
        </>
      )}

      <dialog
        ref={deleteDialogRef}
        onCancel={() => setPendingDelete(null)}
        className="w-[calc(100%-2.5rem)] max-w-sm rounded-[var(--radius-lg)] bg-[var(--stone)] p-0 text-[var(--ink)] backdrop:bg-[oklch(0.2_0.012_130_/_0.55)]"
      >
        <div className="p-5">
          <h2 className="text-xl font-medium">Delete this item?</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
            {pendingDelete?.title} will be removed from the bundle and All Items. This cannot be
            undone.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setPendingDelete(null)}
              className="min-h-12 flex-1 rounded-[var(--radius)] bg-[var(--stone-surface)] px-4 text-sm font-bold"
            >
              Keep item
            </button>
            <button
              onClick={() => {
                if (!pendingDelete) return;
                removeItem(pendingDelete.id);
                setOpenId(null);
                setPendingDelete(null);
                setNotice('Item deleted');
              }}
              className="min-h-12 flex-1 rounded-[var(--radius)] bg-[var(--clay-deep)] px-4 text-sm font-bold text-[var(--stone)]"
            >
              Delete item
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function Row({
  item,
  open,
  onToggle,
  onPost,
  onUndoPost,
  onSave,
  groupOptions,
  onMove,
  dragHandleProps,
  onRequestDelete,
}) {
  const posted = item.status === 'posted';
  return (
    <li className="settle-in overflow-hidden rounded-[var(--radius-lg)] bg-[var(--stone-surface)]">
      <div className="flex w-full items-center gap-3 p-3 text-left">
        {dragHandleProps && (
          <button
            type="button"
            {...dragHandleProps}
            aria-label={`Hold and drag ${item.title}`}
            title="Hold to move"
            className="grid h-11 w-7 shrink-0 touch-none cursor-grab place-items-center rounded-full text-[var(--ink-muted)] active:cursor-grabbing"
          >
            <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor" aria-hidden="true">
              <circle cx="3" cy="4" r="1.2" />
              <circle cx="9" cy="4" r="1.2" />
              <circle cx="3" cy="10" r="1.2" />
              <circle cx="9" cy="10" r="1.2" />
              <circle cx="3" cy="16" r="1.2" />
              <circle cx="9" cy="16" r="1.2" />
            </svg>
          </button>
        )}
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
          {groupOptions && (
            <label className="mb-4 block">
              <span className="mb-1.5 block text-[0.8125rem] font-medium text-[var(--ink-muted)]">
                Bundle group
              </span>
              <select
                value={item.category_key}
                onChange={(event) => onMove(event.target.value)}
                className="min-h-11 w-full rounded-[var(--radius)] bg-[var(--stone-deep)] px-3.5 text-sm"
              >
                {groupOptions.map((group) => (
                  <option key={group}>{group}</option>
                ))}
              </select>
            </label>
          )}
          <ListingEditor
            key={item.id}
            item={item}
            onSave={onSave}
            primaryLabel="Save changes"
            onDiscard={onToggle}
            discardLabel="Cancel"
          />
          {onRequestDelete && (
            <button
              type="button"
              onClick={onRequestDelete}
              className="mt-3 min-h-11 w-full rounded-full text-sm font-bold text-[var(--clay-deep)]"
            >
              Delete item
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function EmptyState({ title, copy, action, onAction }) {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center px-3 text-center">
      <span className="brand-mark mb-5" aria-hidden="true"><span /></span>
      <h1 className="text-[1.5rem] font-medium tracking-[-0.02em] [text-wrap:balance]">
        {title}
      </h1>
      <p className="mt-2 max-w-[32ch] text-[var(--ink-muted)]">{copy}</p>
      <button
        onClick={onAction}
        className="mt-6 min-h-12 rounded-[var(--radius)] bg-[var(--moss)] px-6 text-sm font-bold text-[var(--stone)] transition-colors duration-150 hover:bg-[var(--moss-deep)]"
      >
        {action}
      </button>
    </div>
  );
}

function Progress({ value, max }) {
  const percent = max ? (value / max) * 100 : 0;
  return (
    <div
      className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--stone-deep)]"
      role="progressbar"
      aria-label="Items marked as posted"
      aria-valuemin="0"
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <span
        className="block h-full rounded-full bg-[var(--moss)] transition-[width] duration-200"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function formatMoney(value) {
  return Number(value).toFixed(value % 1 ? 2 : 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(
    new Date(value),
  );
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
