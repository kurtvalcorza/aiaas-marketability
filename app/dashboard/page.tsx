import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Download, LogOut, Database, AlertTriangle } from 'lucide-react';
import {
  fetchDashboardData,
  bandForDvi,
  BAND_COLORS,
  VECTOR_LABELS,
  OVERLAY_LABELS,
  type DashboardData,
} from '@/lib/dashboard-data';
import { DASHBOARD_COOKIE, requireDashboardSession } from '@/lib/dashboard-auth';
import { ScoreBarChart, BandBarChart } from '@/components/dashboard/DashboardCharts';
import { StatCard, ChartCard } from '@/components/dashboard/DashboardUI';

// Always render fresh against the database; never cache the aggregate reads.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Researcher Dashboard — AIaaS Market Study',
  robots: { index: false, follow: false },
};

function fmtDvi(v: number | null): string {
  return v === null ? '—' : v.toFixed(2);
}

function fmtDate(s: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toISOString().replace('T', ' ').slice(0, 16)} UTC`;
}

export default async function DashboardPage() {
  // Defense in depth: enforce auth in the page itself so the dashboard stays
  // protected even if the middleware gate never runs — e.g. a client-settable
  // `Next-Router-Prefetch` / `Purpose: prefetch` header that drops the request
  // from the proxy.ts matcher. Never render data without a valid session.
  const token = (await cookies()).get(DASHBOARD_COOKIE)?.value;
  if (!(await requireDashboardSession(token))) {
    redirect('/dashboard/login');
  }

  let data: DashboardData | null = null;
  let loadError: string | null = null;

  try {
    data = await fetchDashboardData();
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  const needsSchema = !!loadError && /does not exist|relation .* does not exist/i.test(loadError);

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2 text-white" aria-hidden="true">
            <Database size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Researcher Dashboard</h1>
            <p className="text-xs text-gray-500">AIaaS Market Study · Demand Viability Index</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/dashboard/export"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Export CSV</span>
          </a>
          <form method="POST" action="/api/dashboard/logout">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {loadError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle size={18} />
              {needsSchema ? 'Database views not found' : 'Could not load dashboard data'}
            </div>
            {needsSchema ? (
              <p className="text-sm">
                The aggregate views are missing. Run{' '}
                <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">schema.sql</code>{' '}
                once in the Neon SQL editor to create them, then reload.
              </p>
            ) : (
              <p className="text-sm">
                Check that <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">DATABASE_URL</code>{' '}
                is configured and the database is reachable.
              </p>
            )}
          </div>
        ) : data && data.overall.interviews === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <Database size={28} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-700">No responses yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Charts appear here once the first interview is submitted.
            </p>
          </div>
        ) : data ? (
          <DashboardBody data={data} />
        ) : null}
      </main>
    </div>
  );
}

function DashboardBody({ data }: { data: DashboardData }) {
  const { overall, byVector, byOverlay, byRoute, bands, workbench } = data;
  const overallBand = overall.avgDvi === null ? null : bandForDvi(overall.avgDvi);

  const barrierData = [
    { label: 'Cost barrier', value: overall.avgCostBarrier },
    { label: 'Technical complexity', value: overall.avgTechnicalComplexity },
    { label: 'Localization gap', value: overall.avgLocalizationGap },
    { label: 'UVP resonance', value: overall.avgUvpResonance },
  ];

  const vectorData = byVector.map((r) => ({
    label: VECTOR_LABELS[r.key] ?? r.key,
    value: r.avgDvi,
  }));
  const overlayData = byOverlay.map((r) => ({
    label: OVERLAY_LABELS[r.key] ?? r.key,
    value: r.avgDvi,
  }));
  const routeData = byRoute.map((r) => ({ label: r.key, value: r.avgDvi }));

  return (
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Responses" value={String(overall.interviews)} />
        <StatCard
          label="Mean DVI"
          value={fmtDvi(overall.avgDvi)}
          hint={overallBand ? `${overallBand} demand` : undefined}
          accent={overallBand ? BAND_COLORS[overallBand] : undefined}
        />
        <StatCard
          label="Workbench interest"
          value={workbench.pct === null ? '—' : `${workbench.pct.toFixed(0)}%`}
          hint={`${workbench.interested}/${workbench.interviews} · keyword-matched (approx.)`}
        />
        <StatCard
          label="Contact opt-ins"
          value={String(overall.contactConsented)}
          hint={`Latest: ${fmtDate(overall.latestSubmission)}`}
        />
      </div>

      {/* Band distribution + barrier breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Demand band distribution"
          subtitle="Respondents by DVI band (Weak · Limited · Moderate · Strong)"
        >
          <BandBarChart data={bands} />
        </ChartCard>
        <ChartCard
          title="Barrier breakdown"
          subtitle="Average component score, 0–5 (higher = stronger demand signal)"
        >
          <ScoreBarChart data={barrierData} />
        </ChartCard>
      </div>

      {/* Segment / overlay / route cuts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Mean DVI by segment vector" subtitle="Research/Data vs Developer teams">
          <ScoreBarChart data={vectorData} colorByBand />
        </ChartCard>
        <ChartCard title="Mean DVI by AI-maturity overlay" subtitle="Basic vs Advanced Demand">
          <ScoreBarChart data={overlayData} colorByBand />
        </ChartCard>
      </div>

      <ChartCard title="Mean DVI by route" subtitle="Segment × overlay combination">
        <ScoreBarChart data={routeData} colorByBand height={200} />
      </ChartCard>

      {/* Per-group counts */}
      <ChartCard title="Response counts by group" subtitle="Sample size behind each average above">
        <div className="grid grid-cols-1 gap-6 text-sm sm:grid-cols-3">
          <CountList
            title="Segment vector"
            rows={byVector.map((r) => ({ label: VECTOR_LABELS[r.key] ?? r.key, n: r.interviews }))}
          />
          <CountList
            title="AI-maturity overlay"
            rows={byOverlay.map((r) => ({ label: OVERLAY_LABELS[r.key] ?? r.key, n: r.interviews }))}
          />
          <CountList
            title="Route"
            rows={byRoute.map((r) => ({ label: r.key, n: r.interviews }))}
          />
        </div>
      </ChartCard>
    </div>
  );
}

function CountList({ title, rows }: { title: string; rows: { label: string; n: number }[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <ul className="flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-2 border-b border-gray-100 py-1">
            <span className="text-gray-700">{r.label}</span>
            <span className="font-mono font-semibold text-gray-900">{r.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
