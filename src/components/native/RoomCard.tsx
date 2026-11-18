import { useEffect, useState, type ReactElement } from 'react';
import type { RoomState } from '../../features/state';
import type { FaceitMatch, FaceitTeam } from '../../lib/faceit/api';
import { summarizeForm, teamMapRates, type FaceitMatchStat, type FormSummary } from '../../lib/faceit/stats';
import { formatLabel, mapLabel, seriesScore, type Outcome } from '../../lib/frtv/analysis';
import {
  eloTrendSentence,
  fatigueSentence,
  formSentence,
  h2hSentence,
  leagueHeadline,
  leagueMapsSentence,
  mapCompareRows,
  matchmakingHeadline,
  matchmakingMapsSentence,
  vetoPlan,
  type Headline,
  type MapCompareRow,
  type Side,
  type VetoCell,
} from '../../lib/frtv/narrative';
import type { MatchInsight, TeamInsight } from '../../lib/frtv/service';
import { fmtInt, fmtPct, fmtSigned, fmtTier, fmtTime } from '../../lib/format';
import { roomTabItem } from '../../lib/settings';
import { useStore, type Store } from '../../lib/store';
import { initials } from '../Shell';
import type { AsyncState } from '../useAsync';
import { Wordmark } from '../Wordmark';

/**
 * Bloc C — maquette Claude Design `FrtvAnalyse` (400 px) : en-tête, résumé (phrase clé,
 * barre de prévision, équipes), onglets Veto / Maps / Forme, pied « Non affilié à FACEIT ».
 */
type TabId = 'veto' | 'maps' | 'forme';
const TAB_LABEL: Record<TabId, string> = { veto: 'Veto', maps: 'Maps', forme: 'Forme' };
const LEAGUE_TABS: TabId[] = ['veto', 'maps', 'forme'];
const MM_TABS: TabId[] = ['maps', 'forme'];

export function RoomCard({ store, onRetry }: { store: Store<RoomState>; onRetry: () => void }) {
  const faceit = useStore(store, (s) => s.faceit);
  const insight = useStore(store, (s) => s.insight);
  const stats = useStore(store, (s) => s.stats);
  const meId = useStore(store, (s) => s.meId);

  const match = faceit.status === 'ready' ? faceit.data : null;
  const statsList = Object.values(stats);
  const statsReady = statsList.some((s) => s.status === 'ready');
  const statsPending = faceit.status === 'loading' || statsList.some((s) => s.status === 'loading');
  const matchmaking = Boolean(match && match.calculateElo === true);

  let body: ReactElement;
  let meta = '';
  let foot = 'Données FRTV · frtv.fr ↗';

  if (insight.status === 'ready' && insight.data) {
    meta = leagueMeta(insight.data);
    body = <LeagueBody insight={insight.data} />;
  } else if (match && statsReady && (insight.status === 'ready' || (insight.status === 'error' && matchmaking))) {
    meta = `${matchmaking ? 'Matchmaking' : 'Match'} · BO1 · 5v5`;
    foot = 'Estimation FRTV · frtv.fr ↗';
    body = <MatchmakingBody match={match} stats={stats} meId={meId} />;
  } else if (insight.status === 'loading' || (insight.status === 'ready' && statsPending)) {
    body = <LoadingState />;
  } else if (insight.status === 'error') {
    body = <ErrorState onRetry={onRetry} />;
  } else {
    body = <EmptyState />;
  }

  return (
    <section className="frtv-acard" aria-label="Analyse FRTV">
      <header className="frtv-acard__head">
        <Wordmark height={14} />
        <span className="frtv-acard__title">Analyse</span>
        <span className="frtv-grow" />
        {meta && <span className="frtv-acard__meta">{meta}</span>}
      </header>
      {body}
      <footer className="frtv-acard__foot">
        <span className="frtv-mention">Non affilié à FACEIT</span>
        <a className="frtv-link" href="https://frtv.fr" target="_blank" rel="noreferrer">
          {foot}
        </a>
      </footer>
    </section>
  );
}

function leagueMeta(insight: MatchInsight): string {
  const c = insight.series.match_series_competition_id;
  const competition = ['ESEA', c?.event_season, c?.event_division].filter(Boolean).join(' ');
  return [competition, formatLabel(insight.series.match_series_format), fmtTime(insight.series.match_series_dates?.scheduled)]
    .filter(Boolean)
    .join(' · ');
}

// ---------------------------------------------------------------- Résumé

function Summary({ headline, names, probability }: { headline: Headline; names: [string, string]; probability: number | null }) {
  const pctA = probability === null ? null : Math.round(probability * 100);
  return (
    <div className="frtv-acard__sum">
      <div className="frtv-acard__key">{headline.title}</div>
      <div className="frtv-acard__sub">{headline.subtitle}</div>
      {pctA !== null && (
        <>
          <div className="frtv-acard__bar" aria-hidden="true">
            <span style={{ width: `${pctA}%` }} />
          </div>
          <div className="frtv-acard__teams">
            <div className="frtv-acard__side">
              <span className="frtv-acard__init">{initials(names[0])}</span>
              <span className="frtv-acard__nameA" title={names[0]}>
                {names[0]}
              </span>
              <span className="frtv-acard__pctA">{fmtPct(pctA / 100)}</span>
            </div>
            <div className="frtv-acard__side frtv-acard__side--b">
              <span className="frtv-acard__pctB">{fmtPct(1 - pctA / 100)}</span>
              <span className="frtv-acard__nameB" title={names[1]}>
                {names[1]}
              </span>
              <span className="frtv-acard__init">{initials(names[1])}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Tabs({ tabs, meta, children }: { tabs: TabId[]; meta: string; children: (tab: TabId) => ReactElement }) {
  const [tab, setTab] = useState<TabId>(tabs[0] as TabId);
  useEffect(() => {
    void roomTabItem.getValue().then((stored) => {
      if (tabs.includes(stored as TabId)) setTab(stored as TabId);
    });
  }, [tabs]);
  const select = (next: TabId) => {
    setTab(next);
    void roomTabItem.setValue(next);
  };
  return (
    <>
      <div className="frtv-atabs" role="tablist">
        {tabs.map((t) => (
          <button key={t} type="button" role="tab" className="frtv-atab" aria-selected={tab === t} onClick={() => select(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
        <span className="frtv-grow" />
        <span className="frtv-atabs__meta">{meta}</span>
      </div>
      {children(tab)}
    </>
  );
}

// ---------------------------------------------------------------- Ligue

function LeagueBody({ insight }: { insight: MatchInsight }) {
  const [a, b] = insight.teams;
  const names: [string, string] = [a.name, b.name];
  const eloLite = (t: TeamInsight) => (t.elo ? { rating: t.elo.rating, rank: t.elo.rank, tier: fmtTier(t.elo.currentTier) } : null);
  const headline = leagueHeadline(names, [eloLite(a), eloLite(b)], insight.winProbability);
  const plan = vetoPlan([a.veto, b.veto], [a.maps, b.maps], insight.series.match_series_format ?? null);
  const rows = mapCompareRows([a.maps, b.maps], plan.probable);
  const sample = Math.max(a.veto.sample, b.veto.sample);

  return (
    <>
      <Summary headline={headline} names={names} probability={insight.winProbability} />
      <Tabs tabs={LEAGUE_TABS} meta={sample > 0 ? `${sample} veto par équipe` : 'Bilan en ligue FRTV'}>
        {(tab) =>
          tab === 'veto' ? (
            <VetoPanel names={names} plan={plan} />
          ) : tab === 'maps' ? (
            <MapsPanel names={names} rows={rows} source="Bilan" lead={leagueMapsSentence(names, rows, plan.probable)} />
          ) : (
            <LeagueFormPanel insight={insight} />
          )
        }
      </Tabs>
    </>
  );
}

function VetoPanel({ names, plan }: { names: [string, string]; plan: ReturnType<typeof vetoPlan> }) {
  return (
    <div className="frtv-apanel">
      <div className="frtv-apanel__lead">{plan.sentence ?? 'Pas encore de veto connu pour ces équipes.'}</div>
      {plan.rows.length > 0 && (
        <>
          <div className="frtv-veto-grid frtv-veto-grid--head">
            <span>Map</span>
            <span className="frtv-cut frtv-veto-grid__a">{names[0]}</span>
            <span className="frtv-cut">{names[1]}</span>
          </div>
          {plan.rows.map((row) => (
            <div key={row.map} className="frtv-veto-grid frtv-veto-grid--row">
              <MapName map={row.map} probable={row.probable} />
              <VetoChip cell={row.cells[0]} />
              <VetoChip cell={row.cells[1]} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function MapName({ map, probable }: { map: string; probable: boolean }) {
  return (
    <span className={`frtv-mapname${probable ? ' frtv-mapname--probable' : ''}`}>
      {probable && <span className="frtv-pdot" title="Map probable" />}
      <span>{mapLabel(map)}</span>
    </span>
  );
}

function VetoChip({ cell }: { cell: VetoCell }) {
  if (cell.kind === null) return <span className="frtv-vnone">—</span>;
  return (
    <span>
      <span className={`frtv-vchip frtv-vchip--${cell.kind}`}>
        {cell.kind === 'ban' ? 'Ban' : 'Pick'} {cell.count}/{cell.total}
      </span>
    </span>
  );
}

function MapsPanel({ names, rows, source, lead }: { names: [string, string]; rows: MapCompareRow[]; source: string; lead: string | null }) {
  const pct = (t: MapCompareRow['tallies'][number]) => (t && t.played > 0 ? Math.round((t.won / t.played) * 100) : 0);
  const text = (t: MapCompareRow['tallies'][number]) => (t && t.played > 0 ? `${t.won}/${t.played} · ${fmtPct(t.won / t.played)}` : '—');
  return (
    <div className="frtv-apanel">
      {lead && <div className="frtv-apanel__lead">{lead}</div>}
      {rows.length === 0 ? (
        <div className="frtv-apanel__lead">Pas encore assez de maps jouées pour comparer.</div>
      ) : (
        <>
          <div className="frtv-maps-grid frtv-maps-grid--head">
            <span className="frtv-cut frtv-maps-grid__a">{names[0]}</span>
            <span className="frtv-maps-grid__src">{source}</span>
            <span className="frtv-cut frtv-maps-grid__b">{names[1]}</span>
          </div>
          {rows.map((r) => (
            <div key={r.map} className="frtv-maps-grid frtv-maps-grid--row">
              <span className={`frtv-maps-val${r.tallies[0]?.played ? '' : ' frtv-maps-val--empty'}`}>{text(r.tallies[0])}</span>
              <span className="frtv-maps-bar frtv-maps-bar--a">
                <span style={{ width: `${pct(r.tallies[0])}%` }} />
              </span>
              <span className={`frtv-mapname frtv-mapname--center${r.probable ? ' frtv-mapname--probable' : ''}`}>
                {r.probable && <span className="frtv-pdot" />}
                <span>{mapLabel(r.map)}</span>
              </span>
              <span className="frtv-maps-bar frtv-maps-bar--b">
                <span style={{ width: `${pct(r.tallies[1])}%` }} />
              </span>
              <span className={`frtv-maps-val frtv-maps-val--b${r.tallies[1]?.played ? '' : ' frtv-maps-val--empty'}`}>{text(r.tallies[1])}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function FormLine({ name, form, count }: { name: string; form: Outcome[]; count: string }) {
  return (
    <div className="frtv-formline">
      <span className="frtv-formline__name" title={name}>
        {name}
      </span>
      <span className="frtv-form">
        {[...form].reverse().map((r, i) => (
          <span key={i} className={`frtv-sq frtv-sq--lg frtv-sq--${r}`}>
            {r}
          </span>
        ))}
      </span>
      <span className="frtv-grow" />
      <span className="frtv-formline__count">{count}</span>
    </div>
  );
}

const countVD = (form: Outcome[]) =>
  form.length ? `${form.filter((r) => r === 'V').length} V · ${form.filter((r) => r === 'D').length} D` : 'Aucune série';

function FormPanel({
  lead,
  lines,
  blockLabel,
  blockText,
  recentLabel,
  recent,
}: {
  lead: string;
  lines: Array<{ name: string; form: Outcome[]; count: string }>;
  blockLabel: string;
  blockText: string;
  recentLabel: string;
  recent: Array<{ key: string; outcome: Outcome | null; score: string; scoreClass?: string; opponent: string; right: string }>;
}) {
  return (
    <div className="frtv-apanel frtv-apanel--forme">
      <div className="frtv-apanel__lead">{lead}</div>
      {lines.length > 0 && (
        <div className="frtv-formlines">
          {lines.map((l) => (
            <FormLine key={l.name} {...l} />
          ))}
        </div>
      )}
      <div className="frtv-ablock">
        <div className="frtv-ablock__lbl">{blockLabel}</div>
        <div className="frtv-ablock__txt">{blockText}</div>
      </div>
      {recent.length > 0 && (
        <div className="frtv-ablock frtv-ablock--list">
          <div className="frtv-ablock__lbl frtv-ablock__lbl--list">{recentLabel}</div>
          {recent.map((s) => (
            <div key={s.key} className="frtv-recent">
              {s.outcome ? <span className={`frtv-sq frtv-sq--lg frtv-sq--${s.outcome}`}>{s.outcome}</span> : <span className="frtv-sq frtv-sq--lg" />}
              <span className={`frtv-recent__score${s.scoreClass ? ` ${s.scoreClass}` : ''}`}>{s.score}</span>
              <span className="frtv-recent__opp">{s.opponent}</span>
              <span className="frtv-grow" />
              <span className="frtv-recent__right">{s.right}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeagueFormPanel({ insight }: { insight: MatchInsight }) {
  const [a, b] = insight.teams;
  const names: [string, string] = [a.name, b.name];
  const last = insight.h2h.series[0];
  const singleMap = (s: typeof last) => {
    const played = (s?.match_series_matches ?? []).filter((m) => m.match_map);
    return played.length === 1 ? (played[0]?.match_map ?? null) : null;
  };
  return (
    <FormPanel
      lead={formSentence(names, [a.form, b.form])}
      lines={[
        { name: a.name, form: a.form, count: countVD(a.form) },
        { name: b.name, form: b.form, count: countVD(b.form) },
      ]}
      blockLabel="Face-à-face"
      blockText={h2hSentence(names, {
        winsA: insight.h2h.winsA,
        winsB: insight.h2h.winsB,
        last: last ? { score: seriesScore(last, a.id), map: singleMap(last), date: last.match_series_dates?.scheduled ?? null } : null,
      })}
      recentLabel={`Dernières séries d’${a.name}`}
      recent={a.recent.map((s) => ({
        key: s.id,
        outcome: s.outcome,
        score: s.score ? `${s.score.mine}–${s.score.theirs}` : '—',
        opponent: s.opponent,
        right: s.map ? mapLabel(s.map) : '',
      }))}
    />
  );
}

// ---------------------------------------------------------------- Matchmaking

function sideOfMe(match: FaceitMatch, meId: string | null): Side | null {
  if (!meId) return null;
  const index = match.teams.findIndex((t) => [...t.roster, ...t.substitutes].some((p) => p.id === meId));
  return index === 0 || index === 1 ? index : null;
}

function averageElo(team: FaceitTeam): number | null {
  const elos = team.roster.map((p) => p.elo).filter((e): e is number => e !== null);
  return elos.length ? elos.reduce((s, e) => s + e, 0) / elos.length : null;
}

function teamForms(team: FaceitTeam, stats: Record<string, AsyncState<FaceitMatchStat[]>>) {
  return team.roster.flatMap((p) => {
    const s = stats[p.nickname.toLowerCase()];
    if (s?.status !== 'ready') return [];
    const form = summarizeForm(s.data);
    return form ? [{ nickname: p.nickname, form, stats: s.data }] : [];
  });
}

/** Forme d'équipe en matchmaking : pour chacun des 5 derniers matchs, résultat majoritaire des joueurs. */
function averageForm(forms: FormSummary[]): Outcome[] {
  const out: Outcome[] = [];
  for (let i = 0; i < 5; i += 1) {
    const results = forms.map((f) => f.last5[i]).filter((r): r is 'V' | 'D' => Boolean(r));
    if (!results.length) break;
    out.push(results.filter((r) => r === 'V').length * 2 >= results.length ? 'V' : 'D');
  }
  return out;
}

function MatchmakingBody({ match, stats, meId }: { match: FaceitMatch; stats: Record<string, AsyncState<FaceitMatchStat[]>>; meId: string | null }) {
  const [a, b] = match.teams as [FaceitTeam, FaceitTeam];
  const names: [string, string] = [a.name, b.name];
  const mySide = sideOfMe(match, meId);
  const elos: [number | null, number | null] = [averageElo(a), averageElo(b)];
  const both = elos[0] !== null && elos[1] !== null;
  // Match terminé : l'Elo est déjà réglé, la prévision devient une estimation d'avant-match.
  const finished = match.state === 'FINISHED';
  const base = both
    ? matchmakingHeadline(names, [elos[0] as number, elos[1] as number], mySide, match.calculateElo === true && !finished)
    : { title: 'Prévision indisponible', subtitle: "L'Elo des joueurs n'a pas pu être lu." };
  const headline = finished && both ? { ...base, subtitle: `Estimation d'avant-match. ${base.subtitle}` } : base;
  const probability = both ? 1 / (1 + 10 ** (((elos[1] as number) - (elos[0] as number)) / 400)) : null;
  const fa = teamForms(a, stats);
  const fb = teamForms(b, stats);
  const rows = mapCompareRows([teamMapRates(fa.map((p) => p.stats)), teamMapRates(fb.map((p) => p.stats))], []);
  const delta = (list: typeof fa) => list.reduce((s, p) => s + (p.form.eloDelta ?? 0), 0);
  const formA = averageForm(fa.map((p) => p.form));
  const formB = averageForm(fb.map((p) => p.form));
  const ranked = [...fa, ...fb].filter((p) => p.form.eloDelta !== null).sort((x, y) => (y.form.eloDelta ?? 0) - (x.form.eloDelta ?? 0));
  const highlights = ranked.length > 2 ? [ranked[0], ranked[1], ranked[ranked.length - 1]] : ranked;

  return (
    <>
      <Summary headline={headline} names={names} probability={probability} />
      <Tabs tabs={MM_TABS} meta="20 derniers matchs par joueur">
        {(tab) =>
          tab === 'maps' ? (
            <MapsPanel names={names} rows={rows} source="Victoires" lead={matchmakingMapsSentence(names, rows, mySide)} />
          ) : (
            <FormPanel
              lead={eloTrendSentence(names, [delta(fa), delta(fb)], mySide)}
              lines={[
                { name: a.name, form: formA, count: `${countVD(formA)} · moyenne des ${fa.length}` },
                { name: b.name, form: formB, count: `${countVD(formB)} · moyenne des ${fb.length}` },
              ]}
              blockLabel="Fatigue"
              blockText={fatigueSentence(names, [fa.map((p) => p.form.last24h), fb.map((p) => p.form.last24h)], mySide)}
              recentLabel="Joueurs les plus en forme"
              recent={highlights
                .filter((p): p is (typeof fa)[number] => Boolean(p))
                .map((p) => ({
                  key: p.nickname,
                  outcome: p.form.last5[0] ?? null,
                  score: fmtSigned(p.form.eloDelta ?? 0),
                  scoreClass: (p.form.eloDelta ?? 0) >= 0 ? 'frtv-up' : 'frtv-down',
                  opponent: p.nickname,
                  right: `${fmtInt(p.form.last24h)} auj.`,
                }))}
            />
          )
        }
      </Tabs>
    </>
  );
}

// ---------------------------------------------------------------- États

function LoadingState() {
  return (
    <>
      <div className="frtv-aload frtv-shimmer" aria-busy="true">
        <span style={{ width: 220, height: 16, background: '#242424' }} />
        <span style={{ width: 300, height: 12, background: '#1f1f1f' }} />
        <span style={{ width: '100%', height: 6, borderRadius: 3, background: '#242424', marginTop: 4 }} />
        <span className="frtv-aload__pills">
          <span style={{ background: '#242424' }} />
          <span />
          <span />
        </span>
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="frtv-aload__row" />
        ))}
      </div>
      <div className="frtv-aload__txt">Chargement des données FRTV…</div>
    </>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="frtv-astate" role="alert">
      <div className="frtv-astate__title">FRTV injoignable</div>
      <div className="frtv-astate__text">
        Les données de la scène FR ne répondent pas pour le moment. Les stats FACEIT restent affichées sous chaque joueur.
      </div>
      <div className="frtv-astate__actions">
        <button type="button" className="frtv-btn" onClick={onRetry}>
          Réessayer
        </button>
        <a className="frtv-btn-ghost" href="https://frtv.fr" target="_blank" rel="noreferrer">
          État du service ↗
        </a>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="frtv-astate">
      <div className="frtv-astate__title">Aucune donnée pour ce match</div>
      <div className="frtv-astate__text">
        Compétition hors des ligues suivies par FRTV, et pas assez d'historique récent chez les joueurs pour estimer une prévision.
      </div>
    </div>
  );
}
