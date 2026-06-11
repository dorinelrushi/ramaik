'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

type Choice = 'PO' | 'JO';

interface VoteState {
  po: number;
  jo: number;
  hasVoted: boolean;
  userChoice: Choice | null;
  loading: boolean;
  voting: boolean;
  error: string | null;
}

export default function VotingPage() {
  const [state, setState] = useState<VoteState>({
    po: 0,
    jo: 0,
    hasVoted: false,
    userChoice: null,
    loading: true,
    voting: false,
    error: null,
  });

  // ── Load current results on mount ────────────────────────────────
  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch('/api/vote');
      if (!res.ok) throw new Error('Gabim serveri');
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        po: data.po,
        jo: data.jo,
        hasVoted: data.hasVoted,
        userChoice: data.userChoice,
        loading: false,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Nuk mund të lidhet me serverin. Provoni sërish.',
      }));
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // ── Cast a vote ───────────────────────────────────────────────────
  const castVote = async (choice: Choice) => {
    if (state.hasVoted || state.voting) return;
    setState((prev) => ({ ...prev, voting: true, error: null }));

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      });
      const data = await res.json();

      if (res.status === 409) {
        setState((prev) => ({
          ...prev,
          voting: false,
          hasVoted: true,
          error: 'Keni votuar tashmë nga ky pajisje.',
        }));
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Gabim');

      setState((prev) => ({
        ...prev,
        po: data.po,
        jo: data.jo,
        hasVoted: true,
        userChoice: choice,
        voting: false,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        voting: false,
        error: 'Votimi dështoi. Provoni sërish.',
      }));
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────
  const total = state.po + state.jo;
  const poPct = total > 0 ? Math.round((state.po / total) * 100) : 0;
  const joPct = total > 0 ? Math.round((state.jo / total) * 100) : 0;

  return (
    <main style={styles.main}>
      {/* ── Background image ──────────────────────────────────────── */}
      <div style={styles.bgWrapper}>
        <Image
          src="/bg.png"
          alt="Background"
          fill
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          priority
          quality={85}
        />
        {/* dark overlay */}
        <div style={styles.bgOverlay} />
        {/* red gradient overlay */}
        <div style={styles.bgRedGradient} />
      </div>

      {/* ── Floating particles ───────────────────────────────────── */}
      <div style={styles.particles} aria-hidden>
        {[...Array(8)].map((_, i) => (
          <span key={i} style={{ ...styles.particle, ...particleStyle(i) }} />
        ))}
      </div>

      {/* ── Card ─────────────────────────────────────────────────── */}
      <div style={styles.card}>
        {/* Albanian flag stripe */}
        <div style={styles.flagStripe} />

        {/* Header */}
        <div style={styles.header}>
          <span style={styles.badge}>🇦🇱 VOTIM KOMBËTAR</span>
          <h1 style={styles.question}>
            Duhet të largohet<br />
            <span style={styles.highlight}>Kryeministri Edi Rama</span>?
          </h1>
          <p style={styles.subtitle}>Çdo zë ka rëndësi. Votoni tani.</p>
        </div>

        {/* ── Loading spinner ───────────────────────────────────── */}
        {state.loading && (
          <div style={styles.loadingWrap}>
            <div style={styles.spinner} />
            <p style={{ color: '#aaa', marginTop: 12, fontSize: 14 }}>Duke u ngarkuar…</p>
          </div>
        )}

        {/* ── Voting buttons ────────────────────────────────────── */}
        {!state.loading && !state.hasVoted && (
          <div style={styles.btnRow}>
            {/* PO button */}
            <button
              id="vote-po"
              onClick={() => castVote('PO')}
              disabled={state.voting}
              style={{ ...styles.btn, ...styles.btnPo }}
              onMouseEnter={(e) => applyHover(e, styles.btnPoHover)}
              onMouseLeave={(e) => removeHover(e, styles.btnPo)}
              aria-label="Voto PO"
            >
              {state.voting ? <span style={styles.btnSpinner} /> : null}
              <span style={styles.btnEmoji}>✅</span>
              <span style={styles.btnLabel}>PO</span>
              <span style={styles.btnSub}>Po, duhet të largohet</span>
            </button>

            {/* JO button */}
            <button
              id="vote-jo"
              onClick={() => castVote('JO')}
              disabled={state.voting}
              style={{ ...styles.btn, ...styles.btnJo }}
              onMouseEnter={(e) => applyHover(e, styles.btnJoHover)}
              onMouseLeave={(e) => removeHover(e, styles.btnJo)}
              aria-label="Voto JO"
            >
              {state.voting ? <span style={styles.btnSpinner} /> : null}
              <span style={styles.btnEmoji}>❌</span>
              <span style={styles.btnLabel}>JO</span>
              <span style={styles.btnSub}>Jo, le të qëndrojë</span>
            </button>
          </div>
        )}

        {/* ── Already voted / results ───────────────────────────── */}
        {!state.loading && state.hasVoted && (
          <div style={styles.results}>
            <div style={styles.votedBadge}>
              {state.userChoice === 'PO' ? '✅' : '❌'} Keni votuar:{' '}
              <strong>{state.userChoice}</strong>
            </div>

            {/* Progress bars */}
            <div style={styles.barSection}>
              {/* PO bar */}
              <div style={styles.barRow}>
                <div style={styles.barInfo}>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>PO</span>
                  <span style={styles.barPct}>{poPct}%</span>
                </div>
                <div style={styles.barTrack}>
                  <div
                    id="bar-po"
                    style={{
                      ...styles.barFill,
                      width: `${poPct}%`,
                      background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                      boxShadow: '0 0 12px rgba(34,197,94,0.6)',
                    }}
                  />
                </div>
                <span style={styles.barCount}>{state.po.toLocaleString()} vota</span>
              </div>

              {/* JO bar */}
              <div style={styles.barRow}>
                <div style={styles.barInfo}>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>JO</span>
                  <span style={styles.barPct}>{joPct}%</span>
                </div>
                <div style={styles.barTrack}>
                  <div
                    id="bar-jo"
                    style={{
                      ...styles.barFill,
                      width: `${joPct}%`,
                      background: 'linear-gradient(90deg, #b91c1c, #ef4444)',
                      boxShadow: '0 0 12px rgba(239,68,68,0.6)',
                    }}
                  />
                </div>
                <span style={styles.barCount}>{state.jo.toLocaleString()} vota</span>
              </div>
            </div>

            <p style={styles.totalVotes}>
              Gjithsej: <strong>{total.toLocaleString()}</strong> votues
            </p>
          </div>
        )}

        {/* ── Error message ─────────────────────────────────────── */}
        {state.error && (
          <div style={styles.errorBox} role="alert">
            ⚠️ {state.error}
          </div>
        )}

        {/* Footer */}
        <p style={styles.footer}>
          Ky votim është anonim dhe regjistrohet vetëm një herë për pajisje.
        </p>
      </div>
    </main>
  );
}

// ─── Particle helper ──────────────────────────────────────────────────────────
function particleStyle(i: number): React.CSSProperties {
  const sizes = [6, 4, 8, 5, 7, 3, 6, 4];
  const tops = [10, 30, 60, 80, 20, 70, 45, 90];
  const lefts = [5, 15, 25, 70, 80, 90, 50, 35];
  const delays = [0, 1, 2, 0.5, 1.5, 0.8, 2.5, 1.2];
  return {
    width: sizes[i],
    height: sizes[i],
    top: `${tops[i]}%`,
    left: `${lefts[i]}%`,
    animationDelay: `${delays[i]}s`,
  };
}

// ─── Button hover helpers ─────────────────────────────────────────────────────
function applyHover(e: React.MouseEvent<HTMLButtonElement>, hoverStyles: React.CSSProperties) {
  Object.assign((e.currentTarget as HTMLElement).style, hoverStyles);
}
function removeHover(e: React.MouseEvent<HTMLButtonElement>, baseStyles: React.CSSProperties) {
  Object.assign((e.currentTarget as HTMLElement).style, baseStyles);
}

// ─── Inline styles ────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  main: {
    position: 'relative',
    minHeight: '100vh',

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Inter', sans-serif",


  },
  bgWrapper: {


    inset: 0,
    zIndex: 0,
  },
  bgOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.72)',
    zIndex: 1,
  },
  bgRedGradient: {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(ellipse at top, rgba(200,16,46,0.22) 0%, transparent 65%),' +
      'radial-gradient(ellipse at bottom, rgba(0,0,0,0.5) 0%, transparent 60%)',
    zIndex: 2,
  },
  particles: {
    position: 'fixed',
    inset: 0,

    zIndex: 1,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'rgba(200,16,46,0.45)',
    animation: 'float 4s ease-in-out infinite',
  },
  card: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: 600,
    background: 'rgba(10,10,10,0.82)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(200,16,46,0.35)',
    borderRadius: 24,
    padding: '40px 36px',
    boxShadow:
      '0 0 60px rgba(200,16,46,0.18), 0 32px 80px rgba(0,0,0,0.6)',
    animation: 'fadeInUp 0.7s ease both',
    overflow: 'hidden',
  },
  flagStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: 'linear-gradient(90deg, #c8102e 0%, #f5c518 50%, #c8102e 100%)',
    borderRadius: '24px 24px 0 0',
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(200,16,46,0.18)',
    border: '1px solid rgba(200,16,46,0.5)',
    color: '#ff6b80',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.15em',
    padding: '5px 14px',
    borderRadius: 20,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  question: {
    fontSize: 'clamp(22px, 5vw, 32px)',
    fontWeight: 800,
    lineHeight: 1.25,
    color: '#fff',
    marginBottom: 12,
    letterSpacing: '-0.02em',
  },
  highlight: {
    background: 'linear-gradient(135deg, #c8102e 0%, #f5c518 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    letterSpacing: '0.04em',
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 0',
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '3px solid rgba(200,16,46,0.2)',
    borderTopColor: '#c8102e',
    animation: 'spin 0.8s linear infinite',
  },
  btnRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  btn: {
    flex: 1,
    minWidth: 130,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '24px 20px',
    borderRadius: 16,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    fontFamily: 'inherit',
    position: 'relative',
    overflow: 'hidden',
  },
  btnPo: {
    background: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
    boxShadow: '0 4px 24px rgba(22,163,74,0.35)',
    transform: 'translateY(0)',
  },
  btnPoHover: {
    background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
    boxShadow: '0 8px 36px rgba(34,197,94,0.55)',
    transform: 'translateY(-4px)',
  },
  btnJo: {
    background: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)',
    boxShadow: '0 4px 24px rgba(185,28,28,0.35)',
    transform: 'translateY(0)',
  },
  btnJoHover: {
    background: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)',
    boxShadow: '0 8px 36px rgba(239,68,68,0.55)',
    transform: 'translateY(-4px)',
  },
  btnSpinner: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
  },
  btnEmoji: {
    fontSize: 32,
    lineHeight: 1,
  },
  btnLabel: {
    fontSize: 28,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '0.05em',
  },
  btnSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: 500,
    textAlign: 'center',
  },
  results: {
    marginBottom: 24,
  },
  votedBadge: {
    textAlign: 'center',
    padding: '10px 20px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: 15,
    fontWeight: 500,
    color: '#e2e8f0',
    marginBottom: 24,
  },
  barSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    marginBottom: 16,
  },
  barRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  barInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  barPct: {
    color: 'rgba(255,255,255,0.7)',
  },
  barTrack: {
    height: 12,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
    transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
  },
  barCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    alignSelf: 'flex-end',
  },
  totalVotes: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 8,
  },
  errorBox: {
    background: 'rgba(200,16,46,0.12)',
    border: '1px solid rgba(200,16,46,0.4)',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 13,
    color: '#fca5a5',
    marginBottom: 16,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: '0.03em',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 16,
  },
};
