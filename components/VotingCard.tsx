'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { POLLS, type Poll, type PollOption } from '@/lib/polls';

interface PollResult {
  pollId: string;
  counts: Record<string, number>;
  hasVoted: boolean;
  userChoice: string | null;
}

interface PollUiState extends PollResult {
  voting: boolean;
  error: string | null;
}

function emptyState(poll: Poll): PollUiState {
  return {
    pollId: poll.id,
    counts: Object.fromEntries(poll.options.map((o) => [o.id, 0])),
    hasVoted: false,
    userChoice: null,
    voting: false,
    error: null,
  };
}

const VARIANT_STYLES: Record<
  PollOption['variant'],
  { base: React.CSSProperties; hover: React.CSSProperties; bar: string; label: string }
> = {
  green: {
    base: {
      background: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
      boxShadow: '0 4px 24px rgba(22,163,74,0.35)',
    },
    hover: {
      background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
      boxShadow: '0 8px 36px rgba(34,197,94,0.55)',
      transform: 'translateY(-4px)',
    },
    bar: 'linear-gradient(90deg, #16a34a, #22c55e)',
    label: '#22c55e',
  },
  red: {
    base: {
      background: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)',
      boxShadow: '0 4px 24px rgba(185,28,28,0.35)',
    },
    hover: {
      background: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)',
      boxShadow: '0 8px 36px rgba(239,68,68,0.55)',
      transform: 'translateY(-4px)',
    },
    bar: 'linear-gradient(90deg, #b91c1c, #ef4444)',
    label: '#ef4444',
  },
  blue: {
    base: {
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
      boxShadow: '0 4px 24px rgba(37,99,235,0.35)',
    },
    hover: {
      background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
      boxShadow: '0 8px 36px rgba(59,130,246,0.55)',
      transform: 'translateY(-4px)',
    },
    bar: 'linear-gradient(90deg, #1d4ed8, #3b82f6)',
    label: '#60a5fa',
  },
  gold: {
    base: {
      background: 'linear-gradient(135deg, #713f12 0%, #ca8a04 100%)',
      boxShadow: '0 4px 24px rgba(202,138,4,0.35)',
    },
    hover: {
      background: 'linear-gradient(135deg, #a16207 0%, #eab308 100%)',
      boxShadow: '0 8px 36px rgba(234,179,8,0.55)',
      transform: 'translateY(-4px)',
    },
    bar: 'linear-gradient(90deg, #ca8a04, #eab308)',
    label: '#facc15',
  },
};

export default function VotingCard() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, PollUiState>>(() =>
    Object.fromEntries(POLLS.map((p) => [p.id, emptyState(p)]))
  );

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch('/api/vote');
      if (!res.ok) throw new Error('Gabim serveri');
      const data = await res.json();
      const next: Record<string, PollUiState> = {};
      for (const poll of POLLS) {
        const row = (data.polls as PollResult[] | undefined)?.find((r) => r.pollId === poll.id);
        next[poll.id] = {
          pollId: poll.id,
          counts: row?.counts ?? emptyState(poll).counts,
          hasVoted: row?.hasVoted ?? false,
          userChoice: row?.userChoice ?? null,
          voting: false,
          error: null,
        };
      }
      setStates(next);
      setLoading(false);
      setLoadError(null);
    } catch {
      setLoading(false);
      setLoadError('Nuk mund të lidhet me serverin. Provoni sërish.');
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const castVote = async (poll: Poll, choice: string) => {
    const current = states[poll.id];
    if (!current || current.hasVoted || current.voting) return;

    setStates((prev) => ({
      ...prev,
      [poll.id]: { ...prev[poll.id], voting: true, error: null },
    }));

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice, pollId: poll.id }),
      });
      const data = await res.json();

      if (res.status === 409) {
        setStates((prev) => ({
          ...prev,
          [poll.id]: {
            ...prev[poll.id],
            voting: false,
            hasVoted: true,
            error: 'Keni votuar tashmë nga ky pajisje.',
          },
        }));
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Gabim');

      setStates((prev) => ({
        ...prev,
        [poll.id]: {
          ...prev[poll.id],
          counts: data.counts,
          hasVoted: true,
          userChoice: choice,
          voting: false,
          error: null,
        },
      }));
    } catch {
      setStates((prev) => ({
        ...prev,
        [poll.id]: {
          ...prev[poll.id],
          voting: false,
          error: 'Votimi dështoi. Provoni sërish.',
        },
      }));
    }
  };

  return (
    <main style={styles.main}>
      <div style={styles.bgWrapper}>
        <Image
          src="/bg.png"
          alt="Background"
          fill
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          priority
          quality={85}
        />
        <div style={styles.bgOverlay} />
        <div style={styles.bgRedGradient} />
      </div>

      <div style={styles.particles} aria-hidden>
        {[...Array(8)].map((_, i) => (
          <span key={i} style={{ ...styles.particle, ...particleStyle(i) }} />
        ))}
      </div>

      <div style={styles.stack}>
        {/* Page header */}
        <div style={styles.pageHeader}>
          <span style={styles.badge}>🇦🇱 VOTIM KOMBËTAR</span>
          <h1 style={styles.pageTitle}>Votoni Shqipëri</h1>
          <p style={styles.subtitle}>Çdo zë ka rëndësi. Votoni për çdo pyetje më poshtë.</p>
        </div>

        {loading && (
          <div style={styles.card}>
            <div style={styles.loadingWrap}>
              <div style={styles.spinner} />
              <p style={{ color: '#aaa', marginTop: 12, fontSize: 14 }}>Duke u ngarkuar…</p>
            </div>
          </div>
        )}

        {loadError && (
          <div style={{ ...styles.card, ...styles.errorBox }} role="alert">
            ⚠️ {loadError}
          </div>
        )}

        {!loading &&
          POLLS.map((poll, index) => {
            const st = states[poll.id] ?? emptyState(poll);
            const total = Object.values(st.counts).reduce((a, b) => a + Number(b || 0), 0);

            return (
              <section key={poll.id} style={styles.card} id={poll.id}>
                <div style={styles.flagStripe} />
                <div style={styles.qNumber}>Pyetja {index + 1}</div>
                <h2 style={styles.question}>
                  {poll.question}
                  {poll.highlight ? (
                    <>
                      <br />
                      <span style={styles.highlight}>{poll.highlight}</span>
                    </>
                  ) : null}
                  ?
                </h2>

                {!st.hasVoted && (
                  <div style={styles.btnRow}>
                    {poll.options.map((opt) => {
                      const theme = VARIANT_STYLES[opt.variant];
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={st.voting}
                          onClick={() => castVote(poll, opt.id)}
                          style={{ ...styles.btn, ...theme.base, transform: 'translateY(0)' }}
                          onMouseEnter={(e) =>
                            Object.assign(e.currentTarget.style, theme.hover)
                          }
                          onMouseLeave={(e) =>
                            Object.assign(e.currentTarget.style, {
                              ...theme.base,
                              transform: 'translateY(0)',
                            })
                          }
                          aria-label={`Voto ${opt.label}`}
                        >
                          {st.voting ? <span style={styles.btnSpinner} /> : null}
                          <span style={styles.btnLabel}>{opt.label}</span>
                          {opt.sublabel ? (
                            <span style={styles.btnSub}>{opt.sublabel}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}

                {st.hasVoted && (
                  <div style={styles.results}>
                    <div style={styles.votedBadge}>
                      Keni votuar: <strong>{st.userChoice}</strong>
                    </div>
                    <div style={styles.barSection}>
                      {poll.options.map((opt) => {
                        const count = Number(st.counts[opt.id] ?? 0);
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const theme = VARIANT_STYLES[opt.variant];
                        return (
                          <div key={opt.id} style={styles.barRow}>
                            <div style={styles.barInfo}>
                              <span style={{ color: theme.label, fontWeight: 700 }}>
                                {opt.label}
                              </span>
                              <span style={styles.barPct}>{pct}%</span>
                            </div>
                            <div style={styles.barTrack}>
                              <div
                                style={{
                                  ...styles.barFill,
                                  width: `${pct}%`,
                                  background: theme.bar,
                                  boxShadow: `0 0 12px ${theme.label}99`,
                                }}
                              />
                            </div>
                            <span style={styles.barCount}>
                              {count.toLocaleString()} vota
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p style={styles.totalVotes}>
                      Gjithsej: <strong>{total.toLocaleString()}</strong> votues
                    </p>
                  </div>
                )}

                {st.error && (
                  <div style={styles.errorBox} role="alert">
                    ⚠️ {st.error}
                  </div>
                )}
              </section>
            );
          })}

        <div style={styles.footerCard}>
          <Link href="/Rregullorja" style={styles.rulesLink}>
            Rregullorja
          </Link>
          <p style={styles.footer}>
            Ky votim është anonim. Për çdo pyetje regjistrohet vetëm një votë për pajisje (IP).
          </p>
        </div>
      </div>
    </main>
  );
}

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

const styles: Record<string, React.CSSProperties> = {
  main: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '32px 20px 48px',
    fontFamily: "'Inter', sans-serif",
  },
  bgWrapper: {
    position: 'fixed',
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
  stack: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: 640,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  pageHeader: {
    textAlign: 'center',
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 'clamp(28px, 6vw, 40px)',
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.02em',
    marginBottom: 8,
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
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    letterSpacing: '0.04em',
  },
  card: {
    position: 'relative',
    width: '100%',
    background: 'rgba(10,10,10,0.82)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(200,16,46,0.35)',
    borderRadius: 24,
    padding: '32px 28px',
    boxShadow: '0 0 60px rgba(200,16,46,0.18), 0 32px 80px rgba(0,0,0,0.6)',
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
  },
  qNumber: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 10,
  },
  question: {
    fontSize: 'clamp(18px, 4.5vw, 26px)',
    fontWeight: 800,
    lineHeight: 1.3,
    color: '#fff',
    marginBottom: 24,
    letterSpacing: '-0.02em',
    textAlign: 'center',
  },
  highlight: {
    background: 'linear-gradient(135deg, #c8102e 0%, #f5c518 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
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
    gap: 14,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  btn: {
    flex: 1,
    minWidth: 120,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '22px 16px',
    borderRadius: 16,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    fontFamily: 'inherit',
    position: 'relative',
    overflow: 'hidden',
  },
  btnSpinner: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
  },
  btnLabel: {
    fontSize: 26,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '0.04em',
  },
  btnSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: 500,
    textAlign: 'center',
  },
  results: {
    marginBottom: 4,
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
    marginBottom: 20,
  },
  barSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    marginBottom: 12,
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
    marginTop: 4,
  },
  errorBox: {
    background: 'rgba(200,16,46,0.12)',
    border: '1px solid rgba(200,16,46,0.4)',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 13,
    color: '#fca5a5',
    marginTop: 12,
    textAlign: 'center',
  },
  footerCard: {
    textAlign: 'center',
    padding: '8px 12px 0',
  },
  rulesLink: {
    color: 'rgba(255,255,255,0.75)',
    textDecoration: 'underline',
    fontSize: 16,
    display: 'inline-block',
    marginBottom: 12,
  },
  footer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.03em',
    lineHeight: 1.5,
  },
};
