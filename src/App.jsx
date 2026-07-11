import { useState } from 'react';
import { useStore } from './store.js';
import HomeScreen from './home/HomeScreen.jsx';
import CaptureScreen from './capture/CaptureScreen.jsx';
import DashboardScreen from './dashboard/DashboardScreen.jsx';

const NAV = [
  { key: 'home', label: 'Home' },
  { key: 'capture', label: 'Scan' },
  { key: 'dashboard', label: 'Library' },
];

export default function App() {
  const [screen, setScreen] = useState('home');
  const [dashboardEntry, setDashboardEntry] = useState({
    view: 'items',
    bundleId: null,
  });
  const count = useStore((s) => s.items.length);
  const hasHydrated = useStore((s) => s.hasHydrated);
  const continueBundle = useStore((s) => s.continueBundle);

  const openDashboard = (view = 'items', bundleId = null) => {
    setDashboardEntry({ view, bundleId });
    setScreen('dashboard');
  };

  if (!hasHydrated) {
    return (
      <div className="mx-auto grid h-full max-w-md place-items-center bg-[var(--stone)] px-6 text-center">
        <p className="soft-pulse text-sm font-medium text-[var(--ink-muted)]" role="status">
          Restoring your workbench…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-[var(--stone)]">
      <main className="min-h-0 flex-1">
        {screen === 'home' ? (
          <HomeScreen
            onScan={() => setScreen('capture')}
            onBundle={() => openDashboard('bundles')}
            onItems={() => openDashboard('items')}
          />
        ) : screen === 'capture' ? (
          <CaptureScreen
            onFinishBundle={(bundleId) => openDashboard('bundles', bundleId)}
          />
        ) : (
          <DashboardScreen
            key={`${dashboardEntry.view}-${dashboardEntry.bundleId || 'all'}`}
            initialView={dashboardEntry.view}
            initialBundleId={dashboardEntry.bundleId}
            onScanFirst={() => setScreen('capture')}
            onContinueBundle={(bundleId) => {
              continueBundle(bundleId);
              setScreen('capture');
            }}
          />
        )}
      </main>

      <nav
        aria-label="Main"
        className="flex shrink-0 items-stretch border-t border-[var(--stone-deep)] bg-[var(--stone)] pb-[env(safe-area-inset-bottom)]"
      >
        {NAV.map(({ key, label }) => {
          const active = screen === key;
          return (
            <button
              key={key}
              onClick={() => {
                if (key === 'dashboard') openDashboard('items');
                else setScreen(key);
              }}
              aria-current={active ? 'page' : undefined}
              className="relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] transition-colors duration-150"
              style={{
                color: active ? 'var(--moss-deep)' : 'var(--ink-muted)',
                fontWeight: active ? 700 : 500,
              }}
            >
              <span className="relative">
                <NavIcon name={key} />
                {key === 'dashboard' && count > 0 && (
                  <span
                    className="absolute -right-3 -top-2 grid min-h-4 min-w-4 place-items-center rounded-full px-1 text-[0.625rem] font-bold text-[var(--stone)]"
                    style={{ background: 'var(--moss)' }}
                  >
                    {count}
                  </span>
                )}
              </span>
              <span>{label}</span>
              <span
                aria-hidden="true"
                className="absolute inset-x-10 top-0 h-0.5 rounded-full transition-opacity duration-150"
                style={{ background: 'var(--moss)', opacity: active ? 1 : 0 }}
              />
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function NavIcon({ name }) {
  const paths = {
    home: <path d="M3.5 9.2 10 3.8l6.5 5.4v7H12v-4H8v4H3.5v-7Z" />,
    capture: (
      <>
        <path d="M6.2 5.2 7.3 3.8h5.4l1.1 1.4h2.4v10.5H3.8V5.2h2.4Z" />
        <circle cx="10" cy="10.5" r="3" />
      </>
    ),
    dashboard: (
      <>
        <rect x="4" y="3.8" width="12" height="12.4" rx="1.5" />
        <path d="M7 7.2h6M7 10h6M7 12.8h4" />
      </>
    ),
  };

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </g>
    </svg>
  );
}
