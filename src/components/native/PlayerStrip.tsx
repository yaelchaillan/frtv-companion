import type { RankedPlayer, RoomState } from '../../features/state';
import { summarizeForm, type FormSummary } from '../../lib/faceit/stats';
import { fmtDecimal, fmtInt, fmtPct, fmtRating, fmtSigned } from '../../lib/format';
import { useStore, type Store } from '../../lib/store';
import { Wordmark } from '../Wordmark';

/**
 * Bloc A sous la carte d'un joueur FACEIT — maquettes Claude Design :
 * - `FrtvFormeJoueur` (compact, 392 × 40) : forme, Elo sur 20, matchs du jour, rating FRTV ;
 * - `FrtvFicheJoueur` (étendu, quand la boîte FACEIT est masquée) : en-tête 36 px + ligne
 *   « 20 derniers » + ligne FRTV pour les joueurs classés.
 * Les remplaçants restent en compact avec l'étiquette « REMPL. ».
 */
export function PlayerStrip({ store, nickname, extended }: { store: Store<RoomState>; nickname: string; extended: boolean }) {
  const key = nickname.toLowerCase();
  const stats = useStore(store, (s) => s.stats[key]);
  const ratings = useStore(store, (s) => s.ratings);
  const faceit = useStore(store, (s) => s.faceit);
  if (!stats) return null;

  const ranked = ratings?.get(key) ?? null;
  const substitute =
    faceit.status === 'ready' && faceit.data.teams.some((t) => t.substitutes.some((p) => p.nickname.toLowerCase() === key));
  const form = stats.status === 'ready' ? summarizeForm(stats.data) : null;

  if (extended && !substitute) {
    return (
      <div className="frtv-fiche" aria-label={`Stats de ${nickname}`}>
        <div className="frtv-fiche__head">
          <Head stats={stats} form={form} />
          <span className="frtv-grow" />
          {!ranked && <Wordmark height={10} opacity={0.45} />}
        </div>
        {form && (
          <div className="frtv-fiche__row">
            <span className="frtv-fiche__lbl">20 derniers</span>
            <Pair value={fmtPct(form.winRate)} label="V" />
            <Pair value={fmtRating(form.kd)} label="K/D" />
            <Pair value={form.adr !== null ? fmtDecimal(form.adr) : '—'} label="ADR" />
            <Pair value={fmtPct(form.hsPct)} label="HS" />
          </div>
        )}
        {ranked && (
          <div className="frtv-fiche__row">
            <span className="frtv-fiche__frtv" title="Rating FRTV 2.0 · 3 mois · ligues suivies">
              <Wordmark height={9} />
              <b className="frtv-fiche__rating">{fmtRating(ranked.avgRating)}</b>
              <span className="frtv-fiche__rank">#{ranked.rank}</span>
            </span>
            <Pair value={ranked.kd !== null ? fmtRating(ranked.kd) : '—'} label="K/D" />
            <Pair value={ranked.adr !== null ? fmtDecimal(ranked.adr) : '—'} label="ADR" />
            <Pair value={ranked.kast !== null ? fmtPct(ranked.kast / 100) : '—'} label="KAST" />
            <span className="frtv-grow" />
            <span className="frtv-fiche__muted">{fmtInt(ranked.maps)} maps</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="frtv-forme" aria-label={`Forme de ${nickname}`}>
      {substitute && <span className="frtv-subtag">REMPL.</span>}
      <Head stats={stats} form={form} />
      <span className="frtv-grow" />
      <FrtvMark ranked={ranked} />
    </div>
  );
}

/** Forme · Elo · matchs du jour (commun aux deux variantes), ou état de chargement / vide. */
function Head({ stats, form }: { stats: NonNullable<RoomState['stats'][string]>; form: FormSummary | null }) {
  if (stats.status === 'loading') {
    return (
      <>
        <span className="frtv-form frtv-shimmer" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className="frtv-sq frtv-sq--skel" />
          ))}
        </span>
        <span className="frtv-sep" />
        <span className="frtv-skel" style={{ width: 64 }} />
        <span className="frtv-sep" />
        <span className="frtv-skel" style={{ width: 38 }} />
      </>
    );
  }
  if (stats.status === 'error') return <span className="frtv-forme__note">Forme indisponible</span>;
  if (!form) return <span className="frtv-forme__note">Aucun match récent</span>;

  const chronological = [...form.last5].reverse(); // du plus ancien au plus récent
  const delta = form.eloDelta;
  return (
    <>
      <span className="frtv-form" title="5 derniers matchs, du plus ancien au plus récent">
        {chronological.map((r, i) => (
          <span key={i} className={`frtv-sq frtv-sq--${r}`}>
            {r}
          </span>
        ))}
      </span>
      {delta !== null && (
        <>
          <span className="frtv-sep" />
          <span className="frtv-forme__item" title="Elo gagné ou perdu sur les 20 derniers matchs">
            <b className={`frtv-forme__elo ${delta > 0 ? 'frtv-up' : delta < 0 ? 'frtv-down' : 'frtv-flat'}`}>{fmtSigned(delta)}</b>
            <span className="frtv-forme__lbl">Elo</span>
          </span>
        </>
      )}
      <span className="frtv-sep" />
      <span className="frtv-forme__item" title="Matchs joués aujourd'hui">
        <b className="frtv-forme__today">{form.last24h}</b>
        <span className="frtv-forme__lbl">auj.</span>
      </span>
    </>
  );
}

/** Chip « FRTV 1,28 · #15 » si classé, sinon wordmark discret. */
function FrtvMark({ ranked }: { ranked: RankedPlayer | null }) {
  if (!ranked) return <Wordmark height={10} opacity={0.45} />;
  return (
    <span className="frtv-rchip" title="Rating FRTV 2.0 sur 3 mois">
      <Wordmark height={9} />
      <span>
        {fmtRating(ranked.avgRating)} · #{ranked.rank}
      </span>
    </span>
  );
}

function Pair({ value, label }: { value: string; label: string }) {
  return (
    <span className="frtv-pair">
      <b>{value}</b>
      <span>{label}</span>
    </span>
  );
}
