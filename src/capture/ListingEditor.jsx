import { useState } from 'react';

const GRADES = ['A', 'B', 'C', 'D'];

const fieldCls =
  'w-full rounded-[var(--radius)] bg-[var(--stone-deep)] px-3.5 py-2.5 text-[var(--ink)] placeholder:text-[var(--ink-muted)]';
const labelCls =
  'mb-1.5 block text-[0.8125rem] font-medium tracking-[0.02em] text-[var(--ink-muted)]';

// Shared editable listing form — used by the capture review screen and the
// dashboard's inline edit. Parents key it by item id.
export default function ListingEditor({ item, onSave, primaryLabel, onDiscard, discardLabel }) {
  const [draft, setDraft] = useState(item);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <label htmlFor="f-title" className={labelCls}>
          Title
        </label>
        <input
          id="f-title"
          className={fieldCls}
          value={draft.title}
          onChange={(e) => set({ title: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="f-category" className={labelCls}>
            Category
          </label>
          <input
            id="f-category"
            className={fieldCls}
            value={draft.category}
            onChange={(e) => set({ category: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="f-brand" className={labelCls}>
            Brand
          </label>
          <input
            id="f-brand"
            className={fieldCls}
            value={draft.brand ?? ''}
            placeholder="Not visible"
            onChange={(e) => set({ brand: e.target.value || null })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <fieldset>
          <legend className={labelCls}>Condition</legend>
          <div className="flex overflow-hidden rounded-[var(--radius)] bg-[var(--stone-deep)]" role="group">
            {GRADES.map((g) => {
              const active = draft.condition_grade === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => set({ condition_grade: g })}
                  aria-pressed={active}
                  className="min-h-11 flex-1 text-sm transition-colors duration-150"
                  style={
                    active
                      ? { background: 'var(--moss)', color: 'var(--stone)', fontWeight: 700 }
                      : { color: 'var(--ink-muted)', fontWeight: 500 }
                  }
                >
                  {g}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div>
          <label htmlFor="f-price" className={labelCls}>
            Price
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-medium text-[var(--ink-muted)]"
            >
              £
            </span>
            <input
              id="f-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              className={`${fieldCls} pl-8 font-medium`}
              value={draft.suggested_price_gbp}
              onChange={(e) =>
                set({
                  suggested_price_gbp:
                    e.target.value === '' ? '' : Number(e.target.value),
                })
              }
              required
            />
          </div>
        </div>
      </div>

      {draft.price_reasoning && (
        <p className="-mt-2 text-[0.8125rem] leading-snug text-[var(--ink-muted)]">
          {draft.price_reasoning}
        </p>
      )}

      <div>
        <label htmlFor="f-desc" className={labelCls}>
          Description
        </label>
        <textarea
          id="f-desc"
          rows={3}
          className={`${fieldCls} resize-none leading-normal`}
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </div>

      {draft.defects.length > 0 && (
        <div>
          <span className={labelCls}>Defects</span>
          <ul className="flex flex-wrap gap-2">
            {draft.defects.map((d) => (
              <li
                key={d}
                className="flex min-h-11 items-center gap-1.5 rounded-full py-1 pl-3 pr-1 text-[0.8125rem] font-medium"
                style={{
                  color: 'var(--clay-deep)',
                  background: 'oklch(0.52 0.13 40 / 0.12)',
                }}
              >
                {d}
                <button
                  type="button"
                  aria-label={`Remove defect: ${d}`}
                  onClick={() => set({ defects: draft.defects.filter((x) => x !== d) })}
                  className="grid h-11 w-11 place-items-center rounded-full transition-colors duration-150 hover:bg-[oklch(0.52_0.13_40_/_0.15)]"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-1 flex gap-3">
        {onDiscard && (
          <button
            type="button"
            onClick={onDiscard}
            className="min-h-12 rounded-[var(--radius)] bg-[var(--stone-deep)] px-5 text-sm font-medium text-[var(--ink)] transition-colors duration-150 hover:bg-[oklch(0.82_0.012_130)]"
          >
            {discardLabel ?? 'Discard'}
          </button>
        )}
        <button
          type="submit"
          className="min-h-12 flex-1 rounded-[var(--radius)] bg-[var(--moss)] text-sm font-bold text-[var(--stone)] transition-colors duration-150 hover:bg-[var(--moss-deep)]"
        >
          {primaryLabel}
        </button>
      </div>
    </form>
  );
}
