import { useEffect, useRef, useState } from 'react';
import { normalizeCategory, useStore } from '../store.js';
import { useCamera, grabFrame, fileToDataURI } from './useCamera.js';
import { analyzeItem, enhanceImages, enhancementEnabled } from './api.js';
import ListingEditor from './ListingEditor.jsx';

const MAX_PHOTOS = 5; // n8n contract: 1-5 images per item
const GRADE_LABELS = {
  A: 'Excellent condition',
  B: 'Good condition',
  C: 'Fair condition',
  D: 'Well worn',
};

async function startImageEnhancement(item) {
  const results = await enhanceImages(item.images, (index, image) => {
    const current = useStore.getState().items.find(({ id }) => id === item.id);
    if (!current) return;
    const enhanced = [...current.enhanced_images];
    enhanced[index] = image;
    useStore.getState().updateItem(item.id, { enhanced_images: enhanced });
  });

  const completed = results.filter(({ status }) => status === 'fulfilled').length;
  useStore.getState().updateItem(item.id, {
    enhancement_status:
      completed === item.images.length ? 'ready' : completed > 0 ? 'partial' : 'failed',
  });
}

export default function CaptureScreen({ onFinishBundle }) {
  const addItem = useStore((s) => s.addItem);
  const items = useStore((s) => s.items);
  const bundles = useStore((s) => s.bundles);
  const captureMode = useStore((s) => s.captureMode);
  const activeBundleId = useStore((s) => s.activeBundleId);
  const setCaptureMode = useStore((s) => s.setCaptureMode);
  const startBundle = useStore((s) => s.startBundle);
  const finishBundle = useStore((s) => s.finishBundle);
  const [mode, setMode] = useState('camera'); // camera | analyzing | review
  const [photos, setPhotos] = useState([]);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const fileInputRef = useRef(null);

  const activeBundle = bundles.find((bundle) => bundle.id === activeBundleId);
  const bundleItemCount = activeBundleId
    ? items.filter((item) => item.bundle_id === activeBundleId).length
    : 0;

  const cameraActive = mode !== 'review';
  const { videoRef, status } = useCamera(cameraActive);

  // Freeze the viewfinder on the last frame while analyzing.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (mode === 'analyzing') v.pause();
    else v.play().catch(() => {});
  }, [mode, videoRef]);

  useEffect(() => {
    if (!savedNotice) return;
    const t = setTimeout(() => setSavedNotice(''), 1800);
    return () => clearTimeout(t);
  }, [savedNotice]);

  const capture = () => {
    const v = videoRef.current;
    if (!v || photos.length >= MAX_PHOTOS) return;
    setPhotos((p) => [...p, grabFrame(v)]);
  };

  const addFiles = async (files) => {
    const room = MAX_PHOTOS - photos.length;
    const uris = await Promise.all([...files].slice(0, room).map(fileToDataURI));
    setPhotos((p) => [...p, ...uris]);
  };

  const analyze = async () => {
    setError(false);
    setMode('analyzing');
    try {
      const data = await analyzeItem(photos);
      setDraft({ id: crypto.randomUUID(), images: photos, status: 'draft', ...data });
      setMode('review');
    } catch {
      setError(true);
      setMode('camera');
    }
  };

  const chooseCaptureMode = (nextMode) => {
    if (nextMode === 'bundle' && !activeBundleId) startBundle();
    else setCaptureMode(nextMode);
  };

  const save = (edited) => {
    let bundleId = null;
    if (captureMode === 'bundle') bundleId = activeBundleId || startBundle();
    const item = {
      ...edited,
      bundle_id: bundleId,
      enhanced_images: Array(edited.images.length).fill(null),
      enhancement_status: enhancementEnabled ? 'processing' : 'idle',
    };
    addItem(item);
    if (enhancementEnabled) void startImageEnhancement(item);
    setPhotos([]);
    setDraft(null);
    setMode('camera');
    setSavedNotice(
      bundleId ? `Added to ${normalizeCategory(edited.category)}` : 'Listing saved',
    );
  };

  const discard = () => {
    setPhotos([]);
    setDraft(null);
    setError(false);
    setMode('camera');
  };

  const finishActiveBundle = () => {
    if (!activeBundleId || photos.length > 0) return;
    const id = activeBundleId;
    finishBundle(id);
    onFinishBundle?.(id);
  };

  if (mode === 'review' && draft) {
    const destination =
      captureMode === 'bundle' ? normalizeCategory(draft.category) : 'All items';
    return (
      <div className="fade-in h-full overflow-y-auto px-5 pb-6 pt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-[var(--moss-deep)]">Listing ready</p>
          <span className="rounded-full bg-[var(--stone-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink-muted)]">
            {captureMode === 'bundle' ? activeBundle?.name || 'Bundle' : 'Single'}
          </span>
        </div>
        <h1 className="mt-1 text-[1.5rem] font-medium leading-tight tracking-[-0.02em] [text-wrap:balance]">
          Check the essentials
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Relist will save this under <strong className="font-medium text-[var(--ink)]">{destination}</strong>.
          Fine-tune the category below if it belongs somewhere else.
        </p>

        <section className="my-5 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--stone-surface)]">
          <div className="flex gap-4 p-4">
            <img
              src={draft.images[0]}
              alt="Primary item photo"
              className="h-28 w-24 shrink-0 rounded-[var(--radius)] object-cover"
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-medium leading-snug [text-wrap:pretty]">{draft.title}</h2>
              <p className="mt-3 text-2xl font-bold tracking-[-0.02em]">
                £{draft.suggested_price_gbp}
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Grade {draft.condition_grade} · {GRADE_LABELS[draft.condition_grade]}
              </p>
            </div>
          </div>
          {draft.defects.length > 0 && (
            <div className="border-t border-[var(--stone-deep)] px-4 py-3 text-sm">
              <span className="font-medium text-[var(--clay-deep)]">
                {draft.defects.length} condition note{draft.defects.length > 1 ? 's' : ''}
              </span>
              <span className="text-[var(--ink-muted)]"> · {draft.defects.join(', ')}</span>
            </div>
          )}
        </section>

        <button
          onClick={() => save(draft)}
          className="min-h-12 w-full rounded-[var(--radius)] bg-[var(--moss)] px-5 text-sm font-bold text-[var(--stone)] transition-colors duration-150 hover:bg-[var(--moss-deep)]"
        >
          {captureMode === 'bundle' ? `Add to ${destination} & continue` : 'Save & scan next'}
        </button>

        <details className="mt-3 rounded-[var(--radius-lg)] bg-[var(--stone-surface)]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium">
            Edit listing details
            <span aria-hidden="true" className="text-lg text-[var(--ink-muted)]">+</span>
          </summary>
          <div className="border-t border-[var(--stone-deep)] p-4">
            <ListingEditor
              key={draft.id}
              item={draft}
              onSave={save}
              primaryLabel="Save changes & next"
              onDiscard={discard}
            />
          </div>
        </details>
        <button
          onClick={discard}
          className="mt-2 min-h-11 w-full rounded-full px-4 text-sm font-medium text-[var(--ink-muted)]"
        >
          Retake photos
        </button>
      </div>
    );
  }

  // Camera unavailable: file-input fallback keeps the whole flow usable
  // (denied permission, desktop without webcam, demo safety net).
  if (status === 'unavailable') {
    return (
      <div className="flex h-full flex-col px-5 pb-6 pt-5">
        <h1 className="text-[1.375rem] font-medium leading-tight [text-wrap:balance]">
          Camera unavailable
        </h1>
        <p className="mt-2 max-w-[38ch] text-[var(--ink-muted)]">
          Allow camera access in your browser settings, or add photos of the item from your
          library instead.
        </p>
        <ModeControls
          mode={captureMode}
          activeBundle={activeBundle}
          disabled={photos.length > 0}
          onChange={chooseCaptureMode}
          onFinish={finishActiveBundle}
        />
        {error && <ErrorBanner onRetry={analyze} />}
        <PhotoStrip photos={photos} onRemove={(i) => setPhotos((p) => p.filter((_, j) => j !== i))} light />
        <div className="mt-auto flex flex-col gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS}
            className="rounded-[var(--radius)] bg-[var(--stone-deep)] py-3.5 text-sm font-medium text-[var(--ink)] disabled:opacity-40"
          >
            Add photos ({photos.length}/{MAX_PHOTOS})
          </button>
          {photos.length > 0 && (
            <AnalyzeButton onClick={analyze} analyzing={mode === 'analyzing'} />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden bg-[var(--ink)]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />

      {mode === 'camera' && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-28 bg-gradient-to-b from-[oklch(0.2_0.012_130_/_0.72)] to-transparent"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-x-5 top-5 z-10 flex items-start justify-between text-[var(--stone)]">
            <div>
              <p className="font-bold">
                {captureMode === 'bundle'
                  ? `${activeBundle?.name || 'Bundle'} · item ${bundleItemCount + 1}`
                  : `Item ${items.length + 1}`}
              </p>
              <p className="mt-0.5 text-xs text-[oklch(0.94_0.008_130_/_0.76)]">
                Front · back · label · wear
              </p>
            </div>
            <span className="rounded-full bg-[oklch(0.2_0.012_130_/_0.58)] px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
              {photos.length || 0}/{MAX_PHOTOS}
            </span>
          </div>
          <div className="absolute inset-x-5 top-[4.75rem] z-10">
            <ModeControls
              mode={captureMode}
              activeBundle={activeBundle}
              disabled={photos.length > 0}
              onChange={chooseCaptureMode}
              onFinish={finishActiveBundle}
              dark
            />
          </div>
          <div className="capture-frame pointer-events-none absolute inset-x-8 bottom-40 top-36 z-[1] rounded-[24px]" aria-hidden="true" />
        </>
      )}

      {savedNotice && (
        <p
          role="status"
          className="settle-in absolute inset-x-0 top-5 z-10 mx-auto w-fit rounded-full px-4 py-1.5 text-sm font-bold text-[var(--stone)]"
          style={{ background: 'var(--moss)' }}
        >
          {savedNotice}
        </p>
      )}

      {mode === 'analyzing' && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[oklch(0.2_0.012_130_/_0.45)]">
          <div className="text-center text-[var(--stone)]" role="status">
            <p className="soft-pulse text-lg font-medium">Building your listing…</p>
            <p className="mt-2 text-sm text-[oklch(0.94_0.008_130_/_0.76)]">
              Checking condition, brand, and resale value
            </p>
          </div>
        </div>
      )}

      {status === 'starting' && mode === 'camera' && (
        <p
          role="status"
          className="absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center text-sm font-medium text-[var(--stone)]"
        >
          Starting camera…
        </p>
      )}

      {mode === 'camera' && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-[oklch(0.2_0.012_130_/_0.75)] to-transparent px-5 pb-6 pt-14">
          {error && <ErrorBanner onRetry={analyze} />}
          <PhotoStrip photos={photos} onRemove={(i) => setPhotos((p) => p.filter((_, j) => j !== i))} />
          <div className="grid grid-cols-3 items-center">
            <span className="text-sm font-medium text-[var(--stone)]" aria-live="polite">
              {photos.length > 0 && `${photos.length}/${MAX_PHOTOS}`}
            </span>
            <button
              onClick={capture}
              disabled={status !== 'ready' || photos.length >= MAX_PHOTOS}
              aria-label="Capture photo"
              className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full border-[3px] border-[var(--stone)] transition-transform duration-150 active:scale-90 disabled:opacity-40"
            >
              <span className="block h-14 w-14 rounded-full bg-[var(--stone)]" />
            </button>
            <div className="flex justify-end">
              {photos.length > 0 && <AnalyzeButton onClick={analyze} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeControls({ mode, activeBundle, disabled, onChange, onFinish, dark }) {
  const surface = dark
    ? 'bg-[oklch(0.2_0.012_130_/_0.58)] text-[var(--stone)] backdrop-blur-sm'
    : 'bg-[var(--stone-surface)] text-[var(--ink)]';
  return (
    <div className="flex items-center justify-between gap-2">
      <div
        className={`flex rounded-full p-1 ${surface}`}
        role="group"
        aria-label="Capture mode"
      >
        {['single', 'bundle'].map((value) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange(value)}
              className="min-h-9 rounded-full px-3 text-xs font-bold transition-colors duration-150 disabled:opacity-45"
              style={
                active
                  ? { background: 'var(--moss)', color: 'var(--stone)' }
                  : undefined
              }
            >
              {value === 'single' ? 'Single' : activeBundle ? 'Bundle' : 'New bundle'}
            </button>
          );
        })}
      </div>
      {mode === 'bundle' && activeBundle && (
        <button
          type="button"
          onClick={onFinish}
          disabled={disabled}
          className={`min-h-11 rounded-full px-3.5 text-xs font-bold disabled:opacity-45 ${surface}`}
        >
          Finish bundle
        </button>
      )}
    </div>
  );
}

function PhotoStrip({ photos, onRemove, light }) {
  if (photos.length === 0) return null;
  return (
    <ul className={`flex gap-2 overflow-x-auto ${light ? 'mt-5' : ''}`}>
      {photos.map((src, i) => (
        <li key={src.slice(-24) + i} className="settle-in relative shrink-0">
          <img src={src} alt="" className="h-16 w-14 rounded-lg object-cover" />
          <button
            onClick={() => onRemove(i)}
            aria-label={`Remove photo ${i + 1}`}
            className="absolute -right-3 -top-3 grid h-11 w-11 place-items-center text-[var(--stone)]"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--ink)]">
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function AnalyzeButton({ onClick, analyzing }) {
  return (
    <button
      onClick={onClick}
      disabled={analyzing}
      className="min-h-11 rounded-full bg-[var(--moss)] px-5 text-sm font-bold text-[var(--stone)] transition-colors duration-150 hover:bg-[var(--moss-deep)] disabled:opacity-60"
    >
      {analyzing ? 'Building…' : 'Build listing'}
    </button>
  );
}

function ErrorBanner({ onRetry }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-[var(--radius)] px-4 py-3 text-sm font-medium text-[var(--stone)]"
      style={{ background: 'var(--clay-deep)' }}
    >
      Couldn't build this listing
      <button
        onClick={onRetry}
        className="min-h-11 shrink-0 rounded-full bg-[oklch(1_0_0_/_0.18)] px-3.5 font-bold"
      >
        Retry
      </button>
    </div>
  );
}
