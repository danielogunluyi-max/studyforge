'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import LoadingButton from '@/app/_components/loading-button';
import Skeleton from '@/app/_components/skeleton';
import EmptyState from '@/app/_components/empty-state';

type LeaderboardEntry = { id: string; name: string; score: number; notes: number; decks: number };

type CommunityUser = {
  id: string;
  name: string | null;
};

type CommunityLike = {
  id?: string;
  userId: string;
};

type CommunityComment = {
  id: string;
  userId?: string;
  content: string;
  createdAt: string;
  user: CommunityUser;
};

type CommunityPost = {
  id: string;
  userId: string;
  content: string;
  topic: string | null;
  createdAt: string;
  user: CommunityUser;
  likes: CommunityLike[];
  comments: CommunityComment[];
};

function timeAgo(dateValue: string) {
  const date = new Date(dateValue).getTime();
  const seconds = Math.max(1, Math.floor((Date.now() - date) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CommunityPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [likedPostId, setLikedPostId] = useState('');
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  async function loadPosts() {
    try {
      const res = await fetch('/api/community');
      const data = (await res.json()) as { posts?: CommunityPost[] };
      if (res.ok) {
        setPosts(data.posts || []);
      }
    } catch {
      setError('Failed to load community feed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPosts();
    void (async () => {
      try {
        const response = await fetch('/api/leaderboard');
        const data = (await response.json().catch(() => ({}))) as { leaderboard?: LeaderboardEntry[] };
        setLeaderboard(data.leaderboard ?? []);
      } catch {
        setLeaderboard([]);
      }
    })();
    const timer = window.setInterval(() => {
      void loadPosts();
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const currentUserId = session?.user?.id || '';

  async function createPost() {
    if (!content.trim()) return;
    setPosting(true);
    const optimisticPost: CommunityPost = {
      id: `tmp-${Date.now()}`,
      userId: currentUserId,
      content: content.trim(),
      topic: topic.trim() || null,
      createdAt: new Date().toISOString(),
      user: { id: currentUserId, name: session?.user?.name || 'You' },
      likes: [],
      comments: [],
    };

    setPosts((prev) => [optimisticPost, ...prev]);
    setContent('');
    setTopic('');

    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: optimisticPost.content, topic: optimisticPost.topic }),
      });
      const data = (await res.json()) as { post?: CommunityPost };
      if (res.ok && data.post) {
        setPosts((prev) => prev.map((p) => (p.id === optimisticPost.id ? data.post! : p)));
      } else {
        setPosts((prev) => prev.filter((p) => p.id !== optimisticPost.id));
      }
    } catch {
      setPosts((prev) => prev.filter((p) => p.id !== optimisticPost.id));
      setError('Failed to create post');
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike(postId: string) {
    if (!currentUserId) return;

    const targetBefore = posts.find((post) => post.id === postId);
    if (!targetBefore) return;
    const wasLiked = targetBefore.likes.some((like) => like.userId === currentUserId);

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const alreadyLiked = post.likes.some((l) => l.userId === currentUserId);
        return {
          ...post,
          likes: alreadyLiked
            ? post.likes.filter((l) => l.userId !== currentUserId)
            : [...post.likes, { userId: currentUserId }],
        };
      }),
    );

    try {
      await fetch(`/api/community/${postId}/like`, { method: 'POST' });
      setLikedPostId(postId);
      window.setTimeout(() => setLikedPostId(''), 320);
    } catch {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          return {
            ...post,
            likes: wasLiked
              ? [...post.likes.filter((l) => l.userId !== currentUserId), { userId: currentUserId }]
              : post.likes.filter((l) => l.userId !== currentUserId),
          };
        }),
      );
      setError('Failed to update like');
    }
  }

  async function submitComment(postId: string) {
    const draft = commentDrafts[postId]?.trim();
    if (!draft || !currentUserId) return;

    const optimisticComment: CommunityComment = {
      id: `tmp-comment-${Date.now()}`,
      content: draft,
      createdAt: new Date().toISOString(),
      userId: currentUserId,
      user: { id: currentUserId, name: session?.user?.name || 'You' },
    };

    const snapshot = posts;
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, comments: [...post.comments, optimisticComment] }
          : post,
      ),
    );

    try {
      const res = await fetch(`/api/community/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft }),
      });
      const data = (await res.json()) as { comment?: CommunityComment };
      if (res.ok && data.comment) {
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  comments: post.comments.map((c) => (c.id === optimisticComment.id ? data.comment! : c)),
                }
              : post,
          ),
        );
      } else {
        setPosts(snapshot);
      }
    } catch {
      setPosts(snapshot);
      setError('Failed to post comment');
    }
  }

  const sortedPosts = useMemo(() => posts, [posts]);

  return (
    <main className="kv-page kv-animate-in">
      <h1 className="kv-page-title">Community</h1>
      <p className="kv-page-subtitle">Mini Twitter for students. Share ideas, ask questions, help each other.</p>
      {error ? <div className="kv-alert-error kv-animate-in">{error}</div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr min(280px, 30%)', gap: 20, alignItems: 'start' }}>
        <div>
          <section className="kv-card" style={{ marginBottom: 16 }}>
            <label className="kv-label" htmlFor="community-content">Post</label>
        <textarea
          id="community-content"
          className="kv-textarea"
          placeholder="Share a thought, question, or study win..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ minHeight: 120, marginBottom: 12 }}
        />
        <div className="kv-grid-2" style={{ alignItems: 'end' }}>
          <div>
            <label className="kv-label" htmlFor="community-topic">Topic (optional)</label>
            <input
              id="community-topic"
              className="kv-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Biology"
            />
          </div>
          <LoadingButton loading={posting} type="button" fullWidth disabled={!content.trim()} onClick={() => void createPost()}>
            Post
          </LoadingButton>
        </div>
      </section>

      <section className="kv-stagger kv-animate-in" style={{ display: 'grid', gap: 12 }}>
        {loading && (
          <Skeleton variant="list" count={5} />
        )}

        {!loading && sortedPosts.length === 0 && (
          <EmptyState
            icon="🌍"
            title="No posts yet"
            description="Be the first to post something to the community"
          />
        )}

        {sortedPosts.map((post) => {
          const name = post.user.name || 'Student';
          const liked = post.likes.some((l) => l.userId === currentUserId);
          const expanded = !!expandedComments[post.id];

          return (
            <article key={post.id} className={`kv-card kv-card-hover kv-animate-in ${post.id === likedPostId ? 'liked' : ''}`}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '999px',
                    background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-teal))',
                    color: '#0b1020',
                    fontWeight: 900,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>{name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(post.createdAt)}</p>
                </div>
              </div>

              <p style={{ margin: '8px 0', lineHeight: 1.7 }}>{post.content}</p>
              {post.topic && <span className="kv-badge kv-badge-gold">{post.topic}</span>}

              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button className={`${liked ? 'kv-btn-primary' : 'kv-btn-secondary'} ${post.id === likedPostId ? 'liked' : ''}`} onClick={() => void toggleLike(post.id)}>
                  ❤️ {post.likes.length}
                </button>
                <button
                  className="kv-btn-secondary"
                  onClick={() =>
                    setExpandedComments((prev) => ({
                      ...prev,
                      [post.id]: !prev[post.id],
                    }))
                  }
                >
                  💬 {post.comments.length}
                </button>
              </div>

              {expanded && (
                <div className="kv-card-elevated" style={{ marginTop: 12, padding: 14 }}>
                  <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="kv-card-sm" style={{ padding: 10 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>{comment.user.name || 'Student'}</p>
                        <p style={{ margin: '4px 0 0' }}>{comment.content}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="kv-input"
                      value={commentDrafts[post.id] || ''}
                      onChange={(e) =>
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      placeholder="Write a comment..."
                    />
                    <button className="kv-btn-primary" onClick={() => void submitComment(post.id)}>
                      Send
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
        </div>

        {/* Leaderboard sidebar */}
        <aside className="kv-card kv-hide-mobile" style={{ padding: 16, position: 'sticky', top: 80 }}>
          <p style={{ margin: '0 0 12px', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            🏆 Top Students
          </p>
          {leaderboard.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No data yet.</p>
          ) : (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
              {leaderboard.map((entry, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                return (
                  <li key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: idx < 3 ? 18 : 13, fontWeight: 700, minWidth: 24 }}>{medal}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.name}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                        {entry.notes} notes · {entry.decks} decks
                      </p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)' }}>{entry.score}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </aside>
      </div>
      <style jsx>{`
        .liked { animation: kv-bounce-in 0.3s ease; }
      `}</style>
    </main>
  );
}
