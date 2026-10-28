'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { containsProfanity } from '@/lib/filter';

interface CommentItem {
  _id: string;
  text: string;
  authorName: string;
  authorAvatarSeed: string;
  stance?: 'doreheqjen' | 'rrezimin' | 'te-dyja' | 'tjeter' | string | null;
  parentId?: string | null;
  likes: number;
  createdAt: string;
  replies?: CommentItem[];
}

interface UserLimit {
  maxPerDay: number;
  usedToday: number;
  remainingToday: number;
}

const STANCES = [
  { id: 'rrezimin', label: 'Rrëzimin e sistemit', color: '#ef4444' },
  { id: 'doreheqjen', label: 'Dorëheqjen e qeverisë', color: '#f59e0b' },
  { id: 'te-dyja', label: 'Të dyja bashkë', color: '#a855f7' },
  { id: 'tjeter', label: 'Analizë tjetër', color: '#3b82f6' },
] as const;

const AVATAR_COLORS = [
  'linear-gradient(135deg, #dc2626, #7f1d1d)',
  'linear-gradient(135deg, #d97706, #78350f)',
  'linear-gradient(135deg, #059669, #064e3b)',
  'linear-gradient(135deg, #2563eb, #1e3a8a)',
  'linear-gradient(135deg, #7c3aed, #4c1d95)',
  'linear-gradient(135deg, #0891b2, #164e63)',
];

function getAvatarBg(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Tani';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `para ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `para ${hours} orësh`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `para ${days} ditësh`;
  return date.toLocaleDateString('sq-AL', { month: 'short', day: 'numeric' });
}

export default function DebateView() {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [limit, setLimit] = useState<UserLimit>({
    maxPerDay: 3,
    usedToday: 0,
    remainingToday: 3,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [selectedStance, setSelectedStance] = useState<string>('rrezimin');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Reply state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyAuthors, setReplyAuthors] = useState<Record<string, string>>({});
  const [replySubmitting, setReplySubmitting] = useState<Record<string, boolean>>({});

  // Likes
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [filterMode, setFilterMode] = useState<'newest' | 'popular'>('newest');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('votoni_liked_comments');
      if (stored) setLikedMap(JSON.parse(stored));
    } catch {}
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch('/api/comments', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dështoi ngarkimi i komenteve.');
      setComments(data.comments || []);
      if (data.limit) setLimit(data.limit);
    } catch (err: any) {
      setError(err.message || 'Gabim gjatë lidhjes me serverin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const mainInputHasProfanity = useMemo(() => {
    return containsProfanity(text) || containsProfanity(authorName);
  }, [text, authorName]);

  const activeReplyId = replyingToId;
  const replyInputHasProfanity = useMemo(() => {
    if (!activeReplyId) return false;
    const rText = replyTexts[activeReplyId] || '';
    const rAuthor = replyAuthors[activeReplyId] || '';
    return containsProfanity(rText) || containsProfanity(rAuthor);
  }, [activeReplyId, replyTexts, replyAuthors]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;

    if (limit.remainingToday <= 0) {
      setFeedback({
        type: 'error',
        text: 'Keni arritur limitin prej 3 komenteve për sot me këtë pajisje/IP. Provoni sërish nesër!',
      });
      return;
    }

    if (mainInputHasProfanity) {
      setFeedback({
        type: 'error',
        text: 'Komenti juaj përmban fjalë të papërshtatshme ose fyese dhe nuk lejohet.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          authorName: authorName.trim() || undefined,
          stance: selectedStance,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ndodhi një problem gjatë postimit.');

      setComments((prev) => [data.comment, ...prev]);
      setText('');
      setFeedback({
        type: 'success',
        text: 'Komenti juaj u publikua me sukses në mënyrë plotësisht anonime!',
      });

      if (typeof data.remainingToday === 'number') {
        setLimit((prev) => ({
          ...prev,
          usedToday: prev.maxPerDay - data.remainingToday,
          remainingToday: data.remainingToday,
        }));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Gabim gjatë dërgimit.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    const rText = (replyTexts[parentId] || '').trim();
    if (!rText || replySubmitting[parentId]) return;

    if (limit.remainingToday <= 0) {
      alert('Keni arritur limitin ditor prej 3 komenteve/përgjigjeve për sot me këtë pajisje.');
      return;
    }

    if (containsProfanity(rText)) {
      alert('Përgjigja përmban fjalor të papërshtatshëm që nuk lejohet.');
      return;
    }

    setReplySubmitting((prev) => ({ ...prev, [parentId]: true }));

    try {
      const rAuthor = (replyAuthors[parentId] || '').trim();
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rText,
          authorName: rAuthor || undefined,
          parentId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dështoi postimi i përgjigjes.');

      setComments((prev) =>
        prev.map((c) => {
          if (c._id === parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), data.comment],
            };
          }
          return c;
        })
      );

      setReplyTexts((prev) => ({ ...prev, [parentId]: '' }));
      setReplyingToId(null);

      if (typeof data.remainingToday === 'number') {
        setLimit((prev) => ({
          ...prev,
          usedToday: prev.maxPerDay - data.remainingToday,
          remainingToday: data.remainingToday,
        }));
      }
    } catch (err: any) {
      alert(err.message || 'Gabim gjatë dërgimit të përgjigjes.');
    } finally {
      setReplySubmitting((prev) => ({ ...prev, [parentId]: false }));
    }
  };

  const handleLike = async (commentId: string) => {
    if (likedMap[commentId]) return;

    const updateLikes = (list: CommentItem[]): CommentItem[] => {
      return list.map((c) => {
        if (c._id === commentId) return { ...c, likes: c.likes + 1 };
        if (c.replies && c.replies.length > 0) return { ...c, replies: updateLikes(c.replies) };
        return c;
      });
    };

    setComments((prev) => updateLikes(prev));
    const nextLiked = { ...likedMap, [commentId]: true };
    setLikedMap(nextLiked);
    try {
      localStorage.setItem('votoni_liked_comments', JSON.stringify(nextLiked));
    } catch {}

    try {
      await fetch('/api/comments/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      });
    } catch {}
  };

  const sortedComments = useMemo(() => {
    const copy = [...comments];
    if (filterMode === 'popular') return copy.sort((a, b) => b.likes - a.likes);
    return copy.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [comments, filterMode]);

  return (
    <div style={styles.pageWrapper}>
      {/* Background Graphic */}
      <div style={styles.bgGraphic}>
        <Image
          src="/bg.png"
          alt="Protesta Shqiperi"
          fill
          priority
          quality={85}
          style={{ objectFit: 'cover', objectPosition: 'center', opacity: 0.18, filter: 'grayscale(100%)' }}
        />
        <div style={styles.bgOverlay} />
        <div style={styles.bgGlow} />
      </div>

      {/* Main Container - Centered with reliable mobile margins & padding */}
      <main style={styles.mainContainer}>

        {/* ─── Hero Question Card ────────────────────────────────────── */}
        <section style={styles.questionCard}>
          <div style={styles.cardTopAccent} />

          <div style={styles.badgeWrapper}>
            <span style={styles.categoryBadge}>
              <span style={styles.pulsingDot} />
              🇦🇱 PYETJA KOMBËTARE E DITËS
            </span>
          </div>

          <h1 style={styles.questionTitle}>
            Pse po protestojnë sot studentët dhe populli në Shqipëri: kërkojnë thjesht doreheqjen e qeverisë, apo rrezimin e të gjithë sistemit?
          </h1>

          <div style={styles.statsRow}>
            <div style={styles.statPill}>
              <span style={styles.greenDot} />
              <span>{comments.length} mendime të shprehura</span>
            </div>
            <div style={styles.limitPill}>
              Limit: 3 komente në ditë për pajisje
            </div>
          </div>
        </section>

        {/* ─── Comment Input Card ────────────────────────────────────── */}
        <section style={styles.inputCard}>
          <div style={styles.inputHeaderRow}>
            <div>
              <h2 style={styles.inputCardTitle}>
                ✍️ Shpreh mendimin tënd anonimisht
              </h2>
              <p style={styles.inputCardSubtitle}>
                Mendimi juaj regjistrohet menjëherë në bazën e të dhënave.
              </p>
            </div>
            <span
              style={{
                ...styles.remainingBadge,
                background: limit.remainingToday > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: limit.remainingToday > 0 ? '#34d399' : '#f87171',
                border: `1px solid ${limit.remainingToday > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              Mbetur sot: {limit.remainingToday} / {limit.maxPerDay}
            </span>
          </div>

          {/* Limit Exceeded Notice */}
          {limit.remainingToday <= 0 && (
            <div style={styles.limitNoticeBox}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>
                ⚠️ Keni arritur limitin maksimal prej 3 komenteve për sot.
              </strong>
              <span>
                Për të mbrojtur debatin nga spam-i, sistemi lejon deri në 3 komente në ditë për pajisje (IP). Provoni sërish nesër!
              </span>
            </div>
          )}

          {/* Feedback message */}
          {feedback && (
            <div
              style={{
                ...styles.feedbackBox,
                background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                color: feedback.type === 'success' ? '#6ee7b7' : '#fca5a5',
              }}
            >
              {feedback.text}
            </div>
          )}

          <form onSubmit={handleSubmitComment} style={{ width: '100%' }}>
            {/* Stance Selector */}
            <div style={{ marginBottom: '18px' }}>
              <label style={styles.fieldLabel}>Zgjidhni këndvështrimin tuaj:</label>
              <div style={styles.stanceGrid}>
                {STANCES.map((s) => {
                  const isSelected = selectedStance === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStance(s.id)}
                      style={{
                        ...styles.stanceButton,
                        background: isSelected
                          ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: isSelected
                          ? '1px solid #ef4444'
                          : '1px solid rgba(255, 255, 255, 0.12)',
                        color: isSelected ? '#ffffff' : '#cbd5e1',
                        boxShadow: isSelected ? '0 4px 18px rgba(220, 38, 38, 0.45)' : 'none',
                        fontWeight: isSelected ? 700 : 500,
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Nickname Field */}
            <div style={{ marginBottom: '18px' }}>
              <div style={styles.fieldHeader}>
                <label htmlFor="authorInput" style={styles.fieldLabel}>
                  Emri ose Nofka (Opsionale)
                </label>
                <span style={styles.fieldHint}>Lihet bosh për &quot;Qytetar Anonim&quot;</span>
              </div>
              <input
                id="authorInput"
                type="text"
                maxLength={40}
                placeholder="psh. Student nga Tirana, Qytetar, apo bosh..."
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                disabled={limit.remainingToday <= 0 || submitting}
                style={styles.textInput}
              />
            </div>

            {/* Comment Textarea */}
            <div style={{ marginBottom: '18px' }}>
              <div style={styles.fieldHeader}>
                <label htmlFor="commentText" style={styles.fieldLabel}>
                  Mendimi ose Analiza juaj
                </label>
                <span style={{ ...styles.fieldHint, color: text.length > 900 ? '#f59e0b' : 'rgba(255,255,255,0.45)' }}>
                  {text.length} / 1000
                </span>
              </div>
              <textarea
                id="commentText"
                rows={4}
                maxLength={1000}
                required
                placeholder="Pse mendoni se po protestohet sot? Çfarë duhet të ndryshojë? Shprehuni lirshëm..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={limit.remainingToday <= 0 || submitting}
                style={styles.textareaInput}
              />
            </div>

            {/* Profanity Warning */}
            {mainInputHasProfanity && (
              <div style={styles.profanityWarningBox}>
                🚫 <strong>Fjalor i papërshtatshëm:</strong> Janë zbuluar fjalë fyese (p.sh. ropt, qifja, kurven, loqe, karo, picke). Ju lutemi pastroni fjalorin që të lejohet postimi.
              </div>
            )}

            {/* ─── Submit Button Centered with Generous Space ─────── */}
            <div style={styles.submitBtnContainer}>
              <button
                type="submit"
                disabled={!text.trim() || limit.remainingToday <= 0 || submitting || mainInputHasProfanity}
                style={{
                  ...styles.submitButton,
                  opacity: (!text.trim() || limit.remainingToday <= 0 || submitting || mainInputHasProfanity) ? 0.45 : 1,
                  cursor: (!text.trim() || limit.remainingToday <= 0 || submitting || mainInputHasProfanity) ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? (
                  <>
                    <span style={styles.spinnerSmall} />
                    <span>Duke u publikuar…</span>
                  </>
                ) : (
                  <>
                    <span>Publiko Komentin</span>
                    <svg style={{ width: 18, height: 18, transform: 'rotate(45deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* ─── Comments Feed ─────────────────────────────────────────── */}
        <section style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Header Row */}
          <div style={styles.feedHeaderRow}>
            <h3 style={styles.feedTitle}>
              💬 Diskutimet ({comments.length})
            </h3>
            <div style={styles.filterToggle}>
              <button
                type="button"
                onClick={() => setFilterMode('newest')}
                style={{
                  ...styles.filterBtn,
                  background: filterMode === 'newest' ? '#dc2626' : 'transparent',
                  color: filterMode === 'newest' ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  fontWeight: filterMode === 'newest' ? 700 : 500,
                }}
              >
                Më të rejat
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('popular')}
                style={{
                  ...styles.filterBtn,
                  background: filterMode === 'popular' ? '#dc2626' : 'transparent',
                  color: filterMode === 'popular' ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  fontWeight: filterMode === 'popular' ? 700 : 500,
                }}
              >
                Më të pëlqyerat
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={styles.emptyCard}>
              <div style={styles.spinnerLarge} />
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '12px' }}>
                Duke ngarkuar komentet e qytetarëve…
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ ...styles.emptyCard, borderColor: 'rgba(220, 38, 38, 0.4)' }}>
              <p style={{ color: '#fca5a5', fontWeight: 600, marginBottom: '10px' }}>⚠️ {error}</p>
              <button onClick={fetchComments} style={styles.retryBtn}>Riprovo</button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && comments.length === 0 && (
            <div style={styles.emptyCard}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🗣️</div>
              <h4 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 700, margin: '0 0 6px' }}>
                Nuk ka ende asnjë koment
              </h4>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>
                Bëhu i pari që shpreh mendimin për këtë pyetje madhore!
              </p>
            </div>
          )}

          {/* Comments List */}
          {!loading &&
            sortedComments.map((comment) => {
              const stanceObj = STANCES.find((s) => s.id === comment.stance);
              const isReplying = replyingToId === comment._id;
              const isLiked = !!likedMap[comment._id];
              const repliesCount = comment.replies?.length || 0;

              return (
                <article key={comment._id} style={styles.commentCard}>
                  {/* Top author row */}
                  <div style={styles.authorRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          ...styles.avatarCircle,
                          background: getAvatarBg(comment.authorAvatarSeed || comment._id),
                        }}
                      >
                        {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={styles.authorNameText}>
                            {comment.authorName || 'Qytetar Anonim'}
                          </span>
                          <span style={styles.anonBadge}>Anonim</span>
                        </div>
                        <span style={styles.timeAgoText}>{timeAgo(comment.createdAt)}</span>
                      </div>
                    </div>

                    {stanceObj && (
                      <span
                        style={{
                          ...styles.stanceBadge,
                          borderColor: `${stanceObj.color}50`,
                          color: stanceObj.color,
                          background: `${stanceObj.color}15`,
                        }}
                      >
                        {stanceObj.label}
                      </span>
                    )}
                  </div>

                  {/* Comment Text */}
                  <p style={styles.commentBodyText}>{comment.text}</p>

                  {/* Actions Row */}
                  <div style={styles.commentActionsRow}>
                    <button
                      type="button"
                      onClick={() => handleLike(comment._id)}
                      style={{
                        ...styles.actionBtn,
                        color: isLiked ? '#f87171' : 'rgba(255,255,255,0.6)',
                        background: isLiked ? 'rgba(220, 38, 38, 0.15)' : 'transparent',
                      }}
                    >
                      <span>{isLiked ? '❤️' : '🤍'}</span>
                      <span style={{ fontWeight: 600 }}>{comment.likes}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReplyingToId((curr) => (curr === comment._id ? null : comment._id))}
                      style={{
                        ...styles.actionBtn,
                        color: isReplying ? '#ffffff' : 'rgba(255,255,255,0.6)',
                        background: isReplying ? 'rgba(255,255,255,0.1)' : 'transparent',
                      }}
                    >
                      <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      <span>Përgjigju</span>
                    </button>

                    {repliesCount > 0 && (
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                        {repliesCount} {repliesCount === 1 ? 'përgjigje' : 'përgjigje'}
                      </span>
                    )}
                  </div>

                  {/* ─── Inline Reply Box ─────────────────────────────── */}
                  {isReplying && (
                    <div style={styles.replyBox}>
                      <div style={styles.replyBoxHeader}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
                          Përgjigju ndaj {comment.authorName || 'Qytetar Anonim'}:
                        </span>
                        <button
                          type="button"
                          onClick={() => setReplyingToId(null)}
                          style={styles.closeReplyBtn}
                        >
                          ✕ Mbyll
                        </button>
                      </div>

                      <input
                        type="text"
                        maxLength={35}
                        placeholder="Emri juaj (opsionale)..."
                        value={replyAuthors[comment._id] || ''}
                        onChange={(e) => setReplyAuthors((prev) => ({ ...prev, [comment._id]: e.target.value }))}
                        style={{ ...styles.textInput, height: '42px', marginBottom: '10px', fontSize: '13px' }}
                      />

                      <textarea
                        rows={2}
                        maxLength={600}
                        placeholder="Shkruani përgjigjen tuaj..."
                        value={replyTexts[comment._id] || ''}
                        onChange={(e) => setReplyTexts((prev) => ({ ...prev, [comment._id]: e.target.value }))}
                        style={{ ...styles.textareaInput, minHeight: '80px', fontSize: '13px', marginBottom: '10px' }}
                      />

                      {replyInputHasProfanity && (
                        <p style={{ color: '#f87171', fontSize: '11px', margin: '0 0 8px' }}>
                          ⚠️ Përmban fjalor të papërshtatshëm që nuk lejohet.
                        </p>
                      )}

                      <div style={styles.replyBoxFooter}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                          Limit: {limit.remainingToday}/3 sot
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setReplyingToId(null)}
                            style={styles.cancelBtn}
                          >
                            Anulo
                          </button>
                          <button
                            type="button"
                            disabled={!(replyTexts[comment._id] || '').trim() || replySubmitting[comment._id] || replyInputHasProfanity || limit.remainingToday <= 0}
                            onClick={() => handleSubmitReply(comment._id)}
                            style={styles.sendReplyBtn}
                          >
                            {replySubmitting[comment._id] ? 'Duke dërguar…' : 'Dërgo Përgjigjen'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─── Threaded Replies ─────────────────────────────── */}
                  {repliesCount > 0 && (
                    <div style={styles.repliesList}>
                      {comment.replies!.map((reply) => {
                        const isReplyLiked = !!likedMap[reply._id];
                        return (
                          <div key={reply._id} style={styles.replyCard}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div
                                  style={{
                                    ...styles.avatarCircle,
                                    width: '24px',
                                    height: '24px',
                                    fontSize: '11px',
                                    background: getAvatarBg(reply.authorAvatarSeed || reply._id),
                                  }}
                                >
                                  {reply.authorName ? reply.authorName.charAt(0).toUpperCase() : 'A'}
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
                                  {reply.authorName || 'Qytetar Anonim'}
                                </span>
                              </div>
                              <span style={styles.timeAgoText}>{timeAgo(reply.createdAt)}</span>
                            </div>

                            <p style={{ ...styles.commentBodyText, fontSize: '13px', margin: '0 0 8px', paddingLeft: '32px' }}>
                              {reply.text}
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '32px' }}>
                              <button
                                type="button"
                                onClick={() => handleLike(reply._id)}
                                style={{
                                  ...styles.actionBtn,
                                  fontSize: '12px',
                                  padding: '2px 8px',
                                  color: isReplyLiked ? '#f87171' : 'rgba(255,255,255,0.6)',
                                }}
                              >
                                <span>{isReplyLiked ? '❤️' : '🤍'}</span>
                                <span>{reply.likes}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
        </section>

        {/* Footer info & Rules */}
        <footer style={styles.footerContainer}>
          <Link href="/Rregullorja" style={styles.footerLink}>
            Rregullorja & Politika e Anonimatit
          </Link>
          <p style={styles.footerNote}>
            Ky portal mbron të drejtën e shprehjes së lirë të çdo qytetari. Çdo pajisje lejohet të publikojë deri në 3 komente në ditë.
          </p>
          <p style={styles.copyrightText}>
            &copy; {new Date().getFullYear()} Votoni Shqipëri. Të gjitha të drejtat të rezervuara.
          </p>
        </footer>
      </main>
    </div>
  );
}

// ─── Pro-Level Responsive Styles with Guaranteed Mobile Margins ─────────────────
const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    position: 'relative',
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#07080b',
    color: '#f1f5f9',
    overflowX: 'hidden',
  },
  bgGraphic: {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
  },
  bgOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at top, rgba(14, 18, 28, 0.94) 0%, rgba(7, 8, 11, 0.98) 100%)',
  },
  bgGlow: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '700px',
    height: '400px',
    background: 'radial-gradient(ellipse at center, rgba(220, 38, 38, 0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  mainContainer: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: '640px',
    padding: '32px 18px 48px', // Guaranteed 18px horizontal padding on all devices!
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    margin: '0 auto',
  },
  questionCard: {
    position: 'relative',
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: '24px',
    background: 'rgba(14, 18, 28, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(220, 38, 38, 0.35)',
    padding: '28px 22px 24px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 35px rgba(220, 38, 38, 0.18)',
    textAlign: 'center',
    overflow: 'hidden',
  },
  cardTopAccent: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    height: '3px',
    background: 'linear-gradient(90deg, transparent, #ef4444, transparent)',
  },
  badgeWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  categoryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: '999px',
    background: 'rgba(220, 38, 38, 0.16)',
    border: '1px solid rgba(220, 38, 38, 0.45)',
    color: '#ff6b80',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  pulsingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#ef4444',
  },
  questionTitle: {
    fontSize: 'clamp(18px, 4.8vw, 24px)',
    fontWeight: 800,
    lineHeight: 1.5,
    color: '#ffffff',
    textAlign: 'center',
    margin: '0 0 20px',
    letterSpacing: '-0.01em',
  },
  statsRow: {
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    paddingTop: '16px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  statPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '999px',
    padding: '6px 14px',
    fontSize: '12px',
    color: '#cbd5e1',
    fontWeight: 500,
  },
  greenDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: '#10b981',
  },
  limitPill: {
    background: 'rgba(220, 38, 38, 0.18)',
    border: '1px solid rgba(220, 38, 38, 0.35)',
    borderRadius: '999px',
    padding: '6px 14px',
    fontSize: '12px',
    color: '#fca5a5',
    fontWeight: 600,
  },
  inputCard: {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: '24px',
    background: 'rgba(12, 16, 25, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    padding: '26px 20px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
  },
  inputHeaderRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  inputCardTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#ffffff',
    margin: '0 0 4px',
    letterSpacing: '-0.01em',
  },
  inputCardSubtitle: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.45)',
    margin: 0,
  },
  remainingBadge: {
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
  },
  limitNoticeBox: {
    marginBottom: '18px',
    padding: '14px 16px',
    borderRadius: '16px',
    background: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    color: '#fcd34d',
    fontSize: '13px',
    lineHeight: 1.5,
    textAlign: 'center',
  },
  feedbackBox: {
    marginBottom: '18px',
    padding: '14px 16px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 600,
    textAlign: 'center',
    lineHeight: 1.5,
  },
  fieldHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    color: '#e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  fieldHint: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  stanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginTop: '8px',
  },
  stanceButton: {
    minHeight: '44px',
    padding: '10px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    width: '100%',
    height: '48px',
    padding: '0 16px', // Generous padding for placeholder!
    borderRadius: '14px',
    background: '#131826',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    color: '#ffffff',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border 0.2s ease',
  },
  textareaInput: {
    width: '100%',
    minHeight: '120px',
    padding: '14px 16px', // Generous padding for placeholder!
    borderRadius: '14px',
    background: '#131826',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    color: '#ffffff',
    fontSize: '14px',
    lineHeight: 1.6,
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'vertical',
  },
  profanityWarningBox: {
    padding: '12px 14px',
    borderRadius: '12px',
    background: 'rgba(220, 38, 38, 0.2)',
    border: '1px solid rgba(220, 38, 38, 0.5)',
    color: '#fca5a5',
    fontSize: '12px',
    lineHeight: 1.5,
    textAlign: 'center',
    marginBottom: '16px',
  },
  submitBtnContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '22px',
    width: '100%',
  },
  submitButton: {
    width: '100%',
    maxWidth: '340px',
    height: '52px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    border: 'none',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 800,
    boxShadow: '0 8px 28px rgba(220, 38, 38, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    letterSpacing: '0.02em',
    transition: 'all 0.2s ease',
  },
  spinnerSmall: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    border: '2px solid #ffffff',
    borderTopColor: 'transparent',
    animation: 'spin 0.8s linear infinite',
  },
  spinnerLarge: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid #ef4444',
    borderTopColor: 'transparent',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
  },
  feedHeaderRow: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  feedTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#ffffff',
    margin: 0,
  },
  filterToggle: {
    display: 'flex',
    gap: '4px',
    background: '#121622',
    padding: '4px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  filterBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  emptyCard: {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: '20px',
    background: 'rgba(12, 16, 24, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '36px 20px',
    textAlign: 'center',
  },
  retryBtn: {
    padding: '8px 18px',
    borderRadius: '10px',
    background: '#dc2626',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
  },
  commentCard: {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: '20px',
    background: 'rgba(14, 18, 28, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    padding: '20px 18px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
  },
  authorRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '12px',
  },
  avatarCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 800,
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
  },
  authorNameText: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '0.01em',
  },
  anonBadge: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.45)',
    background: 'rgba(255,255,255,0.06)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  timeAgoText: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
  },
  stanceBadge: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: '999px',
    border: '1px solid transparent',
    flexShrink: 0,
  },
  commentBodyText: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#e2e8f0',
    margin: '0 0 14px',
    whiteSpace: 'pre-line',
    wordBreak: 'break-word',
  },
  commentActionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '12px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  replyBox: {
    marginTop: '16px',
    padding: '16px',
    borderRadius: '16px',
    background: '#131826',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  replyBoxHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  closeReplyBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '12px',
    cursor: 'pointer',
  },
  replyBoxFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '4px',
  },
  cancelBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '12px',
    cursor: 'pointer',
  },
  sendReplyBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
    border: 'none',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
  },
  repliesList: {
    marginTop: '16px',
    paddingTop: '14px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  replyCard: {
    borderRadius: '14px',
    background: 'rgba(18, 24, 36, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderLeft: '2px solid rgba(239, 68, 68, 0.65)',
    padding: '12px 14px',
    marginLeft: '10px',
  },
  footerContainer: {
    width: '100%',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  footerLink: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: '13px',
    textDecoration: 'underline',
    fontWeight: 600,
  },
  footerNote: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.4)',
    maxWidth: '380px',
    lineHeight: 1.5,
    margin: 0,
  },
  copyrightText: {
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.3)',
    margin: 0,
  },
};
