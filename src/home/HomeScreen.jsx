import { useStore } from '../store.js';

const STEPS = [
  ['Photograph', 'A few clear angles'],
  ['Review', 'AI-drafted details'],
  ['Track', 'Ready for your shop'],
];

export default function HomeScreen({ onScan, onBundle }) {
  const items = useStore((s) => s.items);
  const total = items.reduce((sum, item) => sum + (item.suggested_price_gbp || 0), 0);
  const posted = items.filter((item) => item.status === 'posted').length;
  const latest = items.at(-1);
  const progress = items.length ? (posted / items.length) * 100 : 0;

  return (
    <div className="h-full overflow-y-auto px-5 pb-8 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span className="text-lg font-bold tracking-[-0.025em]">Relist</span>
        </div>
        {items.length > 0 && (
          <button
            onClick={onBundle}
            className="min-h-11 rounded-full bg-[var(--stone-surface)] px-4 text-sm font-medium text-[var(--ink)] transition-colors duration-150 hover:bg-[var(--stone-deep)]"
          >
            {items.length} in bundle
          </button>
        )}
      </header>

      <section className="studio-hero relative overflow-hidden rounded-[24px] bg-[var(--moss-deep)] px-6 pb-6 pt-7 text-[var(--stone)]">
        <div className="studio-grid" aria-hidden="true" />
        <div className="relative">
          <p className="mb-8 max-w-[20ch] text-sm leading-relaxed text-[oklch(0.9_0.01_130_/_0.78)]">
            Your resale workbench
          </p>
          <h1 className="max-w-[10ch] text-[2.5rem] font-medium leading-[1.02] tracking-[-0.035em] [text-wrap:balance]">
            Turn the pile into listings.
          </h1>
          <p className="mt-4 max-w-[30ch] leading-relaxed text-[oklch(0.94_0.008_130_/_0.78)]">
            Photograph each piece. Relist grades it, suggests a price, and writes the listing while
            you keep moving.
          </p>

          <button
            onClick={onScan}
            className="mt-7 flex min-h-12 w-full items-center justify-between rounded-[var(--radius)] bg-[var(--stone)] px-4 font-bold text-[var(--moss-deep)] transition duration-200 hover:bg-white active:scale-[0.985]"
          >
            <span>{items.length ? 'Scan next item' : 'Scan first item'}</span>
            <ArrowIcon />
          </button>
        </div>
      </section>

      <ol className="my-7 grid grid-cols-3 gap-3" aria-label="How Relist works">
        {STEPS.map(([title, detail], index) => (
          <li key={title} className="min-w-0">
            <span className="mb-3 block h-px bg-[var(--stone-deep)]">
              <span className="block h-1.5 w-1.5 -translate-y-[2.5px] rounded-full bg-[var(--moss)]" />
            </span>
            <span className="block text-sm font-bold">{title}</span>
            <span className="mt-0.5 block text-xs leading-snug text-[var(--ink-muted)]">
              {detail}
            </span>
            <span className="sr-only">Step {index + 1}</span>
          </li>
        ))}
      </ol>

      {items.length ? (
        <section aria-labelledby="bundle-progress">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="bundle-progress" className="text-xl font-medium tracking-[-0.02em]">
                Bundle progress
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                {posted} posted · {items.length - posted} ready to post
              </p>
            </div>
            <p className="text-right">
              <span className="block text-lg font-bold">£{total.toFixed(total % 1 ? 2 : 0)}</span>
              <span className="block text-xs text-[var(--ink-muted)]">suggested value</span>
            </p>
          </div>

          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--stone-deep)]"
            role="progressbar"
            aria-label="Items marked as posted"
            aria-valuemin="0"
            aria-valuemax={items.length}
            aria-valuenow={posted}
          >
            <span
              className="block h-full rounded-full bg-[var(--moss)] transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          {latest && (
            <button
              onClick={onBundle}
              className="mt-5 flex min-h-[72px] w-full items-center gap-3 border-y border-[var(--stone-deep)] py-3 text-left"
            >
              {latest.images[0] ? (
                <img
                  src={latest.images[0]}
                  alt=""
                  className="h-12 w-11 rounded-[10px] object-cover"
                />
              ) : (
                <span className="h-12 w-11 rounded-[10px] bg-[var(--stone-deep)]" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-[var(--ink-muted)]">Latest item</span>
                <span className="mt-0.5 block truncate font-medium">{latest.title}</span>
              </span>
              <ArrowIcon />
            </button>
          )}
        </section>
      ) : (
        <section className="border-t border-[var(--stone-deep)] pt-5" aria-labelledby="first-scan">
          <h2 id="first-scan" className="text-xl font-medium tracking-[-0.02em]">
            Start with one garment
          </h2>
          <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-[var(--ink-muted)]">
            Lay it flat or hang it up. Capture the front, back, label, and any wear you want called
            out.
          </p>
        </section>
      )}
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
