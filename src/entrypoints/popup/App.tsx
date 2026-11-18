import { useEffect, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { browser } from 'wxt/browser';
import { TeamLogo } from '../../components/Shell';
import { useAsync } from '../../components/useAsync';
import { Wordmark } from '../../components/Wordmark';
import { faceitRoomUrl } from '../../lib/faceit/route';
import { formatLabel, mapsWon, scheduledTime } from '../../lib/frtv/analysis';
import { frtv, todayFrenchSeries } from '../../lib/frtv/service';
import type { FrtvSeries, FrtvStream } from '../../lib/frtv/types';
import { fmtInt, fmtLongDay, fmtSigned, fmtTier, fmtTime, fmtUntil, plural } from '../../lib/format';
import { DEFAULT_SETTINGS, getSettings, popupTabItem, settingsItem, type Settings } from '../../lib/settings';

type Tab = 'today' | 'elo' | 'live' | 'settings';
const TABS: Array<[Tab, string]> = [
  ['today', "Aujourd'hui"],
  ['elo', 'Elo FRTV'],
  ['live', 'Live'],
  ['settings', 'Réglages'],
];
const FRTV = 'https://frtv.fr';
const NNBSP = ' ';

export function App({ initialTab }: { initialTab?: Tab } = {}) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'today');
  useEffect(() => {
    if (initialTab) return;
    void popupTabItem.getValue().then((t) => TABS.some(([id]) => id === t) && setTab(t as Tab));
  }, [initialTab]);
  const select = (t: Tab) => {
    setTab(t);
    void popupTabItem.setValue(t);
  };

  const today = useAsync(() => todayFrenchSeries(), []);
  const elo = useAsync(() => frtv.eloRanking(), []);
  const streams = useAsync(() => frtv.streams(), []);
  const version = browser.runtime.getManifest?.().version ?? '';

  const liveCount = streams.status === 'ready' ? streams.data.length : 0;
  const counts: Partial<Record<Tab, number>> = {
    today: today.status === 'ready' ? today.data.length : 0,
    live: liveCount,
  };

  // Flèches gauche / droite entre les onglets (motif ARIA « tabs »).
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = TABS.findIndex(([id]) => id === tab);
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]![0];
    select(next);
    document.getElementById(`frtv-ptab-${next}`)?.focus();
  };

  let body: ReactElement;
  if (tab === 'today') body = <TodayTab state={today} />;
  else if (tab === 'elo') body = <EloTab state={elo} />;
  else if (tab === 'live') body = <LiveTab state={streams} />;
  else body = <SettingsTab version={version} />;

  return (
    <main className="frtv frtv-pop">
      <header className="frtv-pop__head">
        <a className="frtv-pop__brand" href={FRTV} target="_blank" rel="noreferrer" title="Ouvrir frtv.fr">
          <Wordmark height={18} />
          <span className="frtv-pop__tag">Companion</span>
        </a>
        {liveCount > 0 && tab !== 'live' && (
          <button type="button" className="frtv-pop__onair" onClick={() => select('live')} title="Voir les streams FR en direct">
            <span className="frtv-livedot frtv-livedot--pulse" />
            {fmtInt(liveCount)} en direct
          </button>
        )}
      </header>

      <nav className="frtv-ptabs" role="tablist" aria-label="Sections">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            id={`frtv-ptab-${id}`}
            type="button"
            role="tab"
            className="frtv-ptab"
            aria-selected={tab === id}
            aria-controls="frtv-ppanel"
            tabIndex={tab === id ? 0 : -1}
            onClick={() => select(id)}
            onKeyDown={onTabKey}
          >
            {label}
            {counts[id] ? <span className="frtv-ptab__count">{fmtInt(counts[id])}</span> : null}
          </button>
        ))}
      </nav>

      <div className="frtv-pop__body" role="tabpanel" id="frtv-ppanel" aria-labelledby={`frtv-ptab-${tab}`}>
        {body}
      </div>

      <footer className="frtv-pop__foot">
        <span className="frtv-mention">Non affilié à FACEIT</span>
        <a className="frtv-link" href={FRTV} target="_blank" rel="noreferrer">
          frtv.fr ↗
        </a>
      </footer>
    </main>
  );
}

/* ------------------------------------------------------------ briques */

type Load<T> = ReturnType<typeof useAsync<T>>;

function Lead({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="frtv-plead">
      <span className="frtv-plead__title">{title}</span>
      {sub && <span className="frtv-plead__sub">{sub}</span>}
    </div>
  );
}

function Group({ title, aside, live, children }: { title: ReactNode; aside?: ReactNode; live?: boolean; children: ReactNode }) {
  return (
    <section className="frtv-pgroup">
      <h3 className="frtv-pgroup__head">
        {live && <span className="frtv-livedot frtv-livedot--pulse" />}
        <span className="frtv-pgroup__title">{title}</span>
        {aside && <span className="frtv-pgroup__aside">{aside}</span>}
      </h3>
      <div className="frtv-plist">{children}</div>
    </section>
  );
}

function Loading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="frtv-pgroup" aria-busy="true" aria-label="Chargement">
      <span className="frtv-skel" style={{ width: 120, height: 14, margin: '4px 4px 12px' }} />
      <div className="frtv-plist">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="frtv-pskel">
            <span className="frtv-skel" style={{ width: 28, height: 28, borderRadius: 6 }} />
            <span className="frtv-pskel__lines">
              <span className="frtv-skel" style={{ width: `${70 - i * 7}%` }} />
              <span className="frtv-skel" style={{ width: `${45 - i * 4}%`, height: 10 }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="frtv-pempty">
      <span className="frtv-pempty__mark" aria-hidden="true" />
      <span className="frtv-pempty__title">{title}</span>
      <span className="frtv-pempty__text">{text}</span>
      {action}
    </div>
  );
}

function OutLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="frtv-pbtn" href={href} target="_blank" rel="noreferrer">
      {children} <span aria-hidden="true">↗</span>
    </a>
  );
}

/* ------------------------------------------------------------ Aujourd'hui */

type Status = 'live' | 'upcoming' | 'done';

/** Une série commencée depuis plus longtemps sans résultat n'est plus affichée « en cours ». */
const LIVE_WINDOW_MS = 4 * 3600_000;

function isForfeit(s: FrtvSeries): boolean {
  return (s.match_series_status ?? '').toLowerCase() === 'forfeit';
}

// L'API ne connaît que Upcoming, Finished et Forfeit : « en cours » se déduit de l'horaire.
function statusOf(s: FrtvSeries, now: number): Status {
  const status = (s.match_series_status ?? '').toLowerCase();
  if (status === 'finished' || status === 'forfeit' || s.match_series_dates?.ended) return 'done';
  const start = scheduledTime(s);
  if (start <= 0 || start > now) return 'upcoming';
  return now - start < LIVE_WINDOW_MS ? 'live' : 'done';
}

/** Rang d'une division pour trier les filtres : Advanced avant Main, Open 10 avant Open 9… */
function tierRank(tier: string): number {
  const t = tier.toLowerCase().replace(/[\s_]/g, '');
  if (/pro|elite|master/.test(t)) return 0;
  if (t.startsWith('advanced')) return 1;
  if (t.startsWith('main')) return 2;
  if (t.startsWith('intermediate')) return 3;
  const open = /^open(\d+)/.exec(t);
  if (open) return 20 - Number(open[1]);
  if (t.startsWith('entry')) return 30;
  return 40;
}

/** Score affiché : manches pour un BO1 joué, sinon maps gagnées. */
function seriesScore(s: FrtvSeries): [number, number] | null {
  const maps = s.match_series_matches ?? [];
  const single = maps.length === 1 ? maps[0]?.match_scores : null;
  if ((s.match_series_format ?? 1) <= 1 && typeof single?.team1 === 'number' && typeof single?.team2 === 'number') {
    return [single.team1, single.team2];
  }
  const won = mapsWon(s);
  if (won.team1 + won.team2 > 0) return [won.team1, won.team2];
  const t1 = s.match_series_teams?.team1?.score;
  const t2 = s.match_series_teams?.team2?.score;
  return typeof t1 === 'number' && typeof t2 === 'number' && t1 + t2 > 0 ? [t1, t2] : null;
}

function TodayTab({ state }: { state: Load<FrtvSeries[]> }) {
  const [division, setDivision] = useState<string>('');
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') {
    return <Empty title="FRTV injoignable" text={`Les matchs du jour n'ont pas pu être chargés (${state.error}).`} />;
  }

  const now = Date.now();
  const all = state.data;
  const divisions = [...new Set(all.map((s) => s.match_series_competition_id?.event_division).filter((d): d is string => !!d))].sort(
    (a, b) => tierRank(a) - tierRank(b),
  );
  const active = divisions.includes(division) ? division : '';
  const list = active ? all.filter((s) => s.match_series_competition_id?.event_division === active) : all;

  const live = list.filter((s) => statusOf(s, now) === 'live');
  const done = list.filter((s) => statusOf(s, now) === 'done');
  const slots = new Map<string, FrtvSeries[]>();
  for (const s of list) {
    if (statusOf(s, now) !== 'upcoming') continue;
    const key = fmtTime(s.match_series_dates?.scheduled);
    slots.set(key, [...(slots.get(key) ?? []), s]);
  }
  const day = fmtLongDay(new Date());

  return (
    <>
      <Lead
        title={day.charAt(0).toUpperCase() + day.slice(1)}
        sub={all.length ? `${plural(list.length, 'série')} ${active ? fmtTier(active) : 'FR'}` : undefined}
      />
      {all.length === 0 && (
        <Empty
          title="Pas de match FR aujourd'hui"
          text="Aucune série d'équipe francophone n'est programmée. Les prochains matchs apparaîtront ici."
          action={<OutLink href={FRTV}>Voir frtv.fr</OutLink>}
        />
      )}
      {divisions.length > 1 && (
        <div className="frtv-pfilters" role="group" aria-label="Filtrer par division">
          {['', ...divisions].map((d) => (
            <button key={d || 'all'} type="button" className="frtv-pfilter" aria-pressed={active === d} onClick={() => setDivision(d)}>
              {d ? fmtTier(d) : 'Toutes'}
            </button>
          ))}
        </div>
      )}
      {live.length > 0 && (
        <Group title="En cours" aside={fmtInt(live.length)} live>
          {live.map((s) => (
            <MatchRow key={s._id} s={s} status="live" showTier={!active} />
          ))}
        </Group>
      )}
      {[...slots].map(([time, items]) => (
        <Group key={time} title={time} aside={`${fmtUntil(scheduledTime(items[0]!), now) ?? ''} · ${plural(items.length, 'série')}`}>
          {items.map((s) => (
            <MatchRow key={s._id} s={s} status="upcoming" showTier={!active} />
          ))}
        </Group>
      ))}
      {done.length > 0 && (
        <Group title="Terminés" aside={fmtInt(done.length)}>
          {done.map((s) => (
            <MatchRow key={s._id} s={s} status="done" showTier={!active} />
          ))}
        </Group>
      )}
    </>
  );
}

function MatchRow({ s, status, showTier }: { s: FrtvSeries; status: Status; showTier: boolean }) {
  const teams = [s.match_series_teams?.team1?.id, s.match_series_teams?.team2?.id];
  const raw = status === 'upcoming' ? null : seriesScore(s);
  // Un 0-0 n'a de sens que pendant le match (forfaits et résultats manquants : pas de score).
  const score = raw && (status === 'live' || raw[0] + raw[1] > 0) ? raw : null;
  const winner = status === 'done' && score && score[0] !== score[1] ? (score[0] > score[1] ? 0 : 1) : null;
  const tier = fmtTier(s.match_series_competition_id?.event_division ?? null);
  const format = isForfeit(s)
    ? 'Forfait'
    : status === 'done' && !score && s.match_series_status !== 'Finished'
      ? 'Sans résultat'
      : formatLabel(s.match_series_format);
  const href = s.match_series_faceit_id ? faceitRoomUrl(s.match_series_faceit_id) : FRTV;

  return (
    <a className="frtv-pmatch" href={href} target="_blank" rel="noreferrer" title="Ouvrir la salle de match FACEIT">
      <span className="frtv-pmatch__teams">
        {teams.map((t, i) => (
          <span key={i} className={`frtv-pmatch__team${winner === null ? '' : winner === i ? ' is-win' : ' is-loss'}`}>
            <TeamLogo src={t?.team_logo} name={t?.team_name ?? '?'} />
            <span className="frtv-ellipsis">{t?.team_name ?? 'À définir'}</span>
            {score && <b className="frtv-pmatch__score">{score[i]}</b>}
          </span>
        ))}
      </span>
      <span className="frtv-pmatch__meta">
        {showTier && tier && <span className="frtv-pchip">{tier}</span>}
        <span className="frtv-pmatch__fmt">{status === 'live' ? <span className="frtv-pmatch__live">Live</span> : format}</span>
      </span>
    </a>
  );
}

/* ------------------------------------------------------------ Elo FRTV */

function EloTab({ state }: { state: Load<Awaited<ReturnType<typeof frtv.eloRanking>>> }) {
  if (state.status === 'loading') return <Loading rows={6} />;
  if (state.status === 'error') {
    return <Empty title="Classement indisponible" text={`L'Elo FRTV n'a pas pu être chargé (${state.error}).`} />;
  }
  const ranked = state.data.ranking.filter((r) => !r.isProvisional);
  return (
    <>
      <Lead title="Elo FRTV" sub={`${plural(state.data.ranked ?? ranked.length, 'équipe classée', 'équipes classées')}`} />
      <Group title="Top 10" aside="évolution sur 7 jours">
        {ranked.slice(0, 10).map((row) => {
          const delta = row.delta7d ?? 0;
          const move = row.rankDelta ?? 0;
          return (
            <a key={row.teamId} className="frtv-prank" href={`${FRTV}/team/${encodeURIComponent(row.teamId)}`} target="_blank" rel="noreferrer">
              <span className={`frtv-prank__pos${row.rank <= 3 ? ' is-podium' : ''}`}>{row.rank}</span>
              <TeamLogo src={row.logo} name={row.name} size="28" />
              <span className="frtv-prank__id">
                <span className="frtv-prank__name frtv-ellipsis">{row.name}</span>
                <span className="frtv-prank__tier">
                  {fmtTier(row.currentTier) ?? 'Division inconnue'}
                  {move !== 0 && (
                    <span className={move > 0 ? 'frtv-up' : 'frtv-down'}>
                      {' · '}
                      {move > 0 ? '▲' : '▼'}
                      {Math.abs(move)}
                    </span>
                  )}
                </span>
              </span>
              <span className="frtv-prank__elo">{fmtInt(row.rating)}</span>
              <span className={`frtv-pdelta ${delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : ''}`}>{delta === 0 ? '=' : fmtSigned(delta)}</span>
            </a>
          );
        })}
      </Group>
      <div className="frtv-pbtns">
        <OutLink href={`${FRTV}/classement`}>Équipes</OutLink>
        <OutLink href={`${FRTV}/classement-joueurs`}>Joueurs</OutLink>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ Live */

function since(iso: string | null | undefined, now: number): string | null {
  const t = iso ? Date.parse(iso) : Number.NaN;
  if (!Number.isFinite(t)) return null;
  const minutes = Math.max(0, Math.round((now - t) / 60_000));
  if (minutes < 60) return `depuis ${minutes}${NNBSP}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `depuis ${h}${NNBSP}h${m ? ` ${String(m).padStart(2, '0')}` : ''}`;
}

function LiveTab({ state }: { state: Load<FrtvStream[]> }) {
  if (state.status === 'loading') return <Loading rows={4} />;
  if (state.status === 'error') {
    return <Empty title="Streams indisponibles" text={`La liste des lives n'a pas pu être chargée (${state.error}).`} />;
  }
  const list = [...state.data].sort((a, b) => b.viewer_count - a.viewer_count);
  const viewers = list.reduce((sum, s) => sum + s.viewer_count, 0);
  const now = Date.now();
  // Les miniatures Twitch sont régénérées toutes les 5 minutes environ.
  const bust = Math.floor(now / 300_000);

  return (
    <>
      <Lead title="Streams FR" sub={list.length ? `${plural(viewers, 'spectateur')} · Twitch` : undefined} />
      {list.length === 0 && (
        <Empty title="Personne en live" text="Aucun stream Counter-Strike francophone pour le moment. Repasse ce soir !" />
      )}
      <div className="frtv-pstreams">
        {list.map((s, i) => (
          <a
            key={s.id}
            className={`frtv-pstream${i === 0 ? ' is-top' : ''}`}
            href={`https://twitch.tv/${encodeURIComponent(s.user_login)}`}
            target="_blank"
            rel="noreferrer"
          >
            <Thumb stream={s} bust={bust} large={i === 0} />
            <span className="frtv-pstream__info">
              <span className="frtv-pstream__name">{s.user_name}</span>
              <span className="frtv-pstream__title" title={s.title}>
                {s.title}
              </span>
              <span className="frtv-pstream__since">{since(s.started_at, now) ?? 'En direct'}</span>
            </span>
          </a>
        ))}
      </div>
    </>
  );
}

function Thumb({ stream, bust, large }: { stream: FrtvStream; bust: number; large: boolean }) {
  const [failed, setFailed] = useState(false);
  const [w, h] = large ? [640, 360] : [256, 144];
  const src = stream.thumbnail_url ? `${stream.thumbnail_url.replace('{width}', String(w)).replace('{height}', String(h))}?t=${bust}` : null;
  return (
    <span className="frtv-pstream__thumb">
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="frtv-pstream__ph">{stream.user_name.slice(0, 2).toUpperCase()}</span>
      )}
      <span className="frtv-pstream__viewers">
        <span className="frtv-livedot" />
        {fmtInt(stream.viewer_count)}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------ Réglages */

type ToggleKey = Exclude<keyof Settings, 'version'>;
const SETTING_LABELS: Record<ToggleKey, { title: string; hint: string }> = {
  restyleRoom: { title: 'Salle de match FRTV', hint: 'Colonnes joueurs, en-tête du match et groupes redessinés.' },
  matchPanel: { title: "Carte d'analyse", hint: 'Prévision, veto probable, maps et forme des équipes.' },
  playerStrips: { title: 'Forme des joueurs', hint: '5 derniers matchs, Elo sur 20 matchs, matchs du jour.' },
  hideFaceitStats: { title: 'Masquer les stats FACEIT', hint: 'Remplace « Global / 20 derniers matchs » par la fiche FRTV.' },
  customLevels: { title: 'Niveaux 11 à 20', hint: `Paliers de 250 Elo au-delà de 2${NNBSP}250.` },
  profileCard: { title: 'Cartes du profil', hint: 'Suivi de niveau et carte Scène FR sur les profils.' },
  debug: { title: 'Mode debug', hint: 'Réponses FACEIT brutes dans la console de la page.' },
};
const SETTING_GROUPS: Array<{ title: string; keys: ToggleKey[] }> = [
  { title: 'Salle de match', keys: ['restyleRoom', 'matchPanel', 'playerStrips', 'hideFaceitStats'] },
  { title: 'Niveaux et profil', keys: ['customLevels', 'profileCard'] },
  { title: 'Avancé', keys: ['debug'] },
];

function SettingsTab({ version }: { version: string }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);
  const update = (key: ToggleKey, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    void settingsItem.setValue(next);
  };

  return (
    <>
      <Lead title="Réglages" sub="Appliqués tout de suite sur faceit.com" />
      {SETTING_GROUPS.map((group) => (
        <Group key={group.title} title={group.title}>
          {group.keys.map((key) => (
            <label key={key} className="frtv-pset">
              <span className="frtv-pset__text">
                <span className="frtv-pset__title">{SETTING_LABELS[key].title}</span>
                <span className="frtv-pset__hint">{SETTING_LABELS[key].hint}</span>
              </span>
              <input className="frtv-switch" type="checkbox" role="switch" checked={settings[key]} onChange={(e) => update(key, e.target.checked)} />
            </label>
          ))}
        </Group>
      ))}
      {version && <p className="frtv-pversion">FRTV Companion v{version}</p>}
    </>
  );
}
