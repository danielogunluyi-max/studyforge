'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import Skeleton from '@/app/_components/skeleton';

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
    <main className="kv-page" style={{ padding: '24px 16px 100px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div className="kv-crumb">Kyvex / <b>Community</b></div>
        <h1 className="kv-title" style={{ marginTop: 14 }}>Community</h1>
        <p className="kv-sub" style={{ marginTop: 10 }}>Mini Twitter for students. Share ideas, ask questions, help each other.</p>
        {error ? <p className="kv-meta" style={{ marginTop: 12, color: '#E5484D' }}>{error}</p> : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr min(280px, 30%)', gap: 28, alignItems: 'start', marginTop: 28 }}>
          <div>
            <label className="kv-meta" htmlFor="community-content">Post</label>
            <textarea
              id="community-content"
              className="kv-field"
              placeholder="Share a thought, question, or study win..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ minHeight: 120, marginTop: 8 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label className="kv-meta" htmlFor="community-topic">Topic (optional)</label>
                <input
                  id="community-topic"
                  className="kv-field"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Biology"
                  style={{ marginTop: 8 }}
                />
              </div>
              <button
                type="button"
                className="kv-btn"
                disabled={!content.trim() || posting}
                onClick={() => void createPost()}
              >
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              {loading ? <Skeleton variant="list" count={5} /> : null}
              {!loading && sortedPosts.length === 0 ? (
                <p className="kv-sub" style={{ marginTop: 16 }}>No posts yet. Be the first to post something to the community.</p>
              ) : null}

              {sortedPosts.map((post) => {
                const name = post.user.name || 'Student';
                const liked = post.likes.some((l) => l.userId === currentUserId);
                const expanded = !!expandedComments[post.id];

                return (
                  <div key={post.id} className="kv-row" style={{ alignItems: 'flex-start' }}>
                    <span className="kv-avatar" aria-hidden>{name.charAt(0).toUpperCase()}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="kv-row-title">{name}</div>
                      <p className="kv-meta" style={{ marginTop: 4 }}>{timeAgo(post.createdAt)}</p>
                      <p className="kv-sub" style={{ marginTop: 8, maxWidth: 'none' }}>{post.content}</p>
                      {post.topic ? (
                        <div className="kv-row-sub">
                          {/^[A-Z]{3,4}\d[A-Z]$/i.test(post.topic.trim()) ? (
                            <span className="kv-chip kv-chip-course">{post.topic}</span>
                          ) : (
                            <span className="kv-chip">{post.topic}</span>
                          )}
                        </div>
                      ) : null}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button type="button" className={liked ? 'kv-btn-ghost on' : 'kv-btn-ghost'} onClick={() => void toggleLike(post.id)}>
                          Like {post.likes.length}
                        </button>
                        <button
                          type="button"
                          className="kv-btn-ghost"
                          onClick={() =>
                            setExpandedComments((prev) => ({
                              ...prev,
                              [post.id]: !prev[post.id],
                            }))
                          }
                        >
                          Comments {post.comments.length}
                        </button>
                      </div>
                      {expanded ? (
                        <div style={{ marginTop: 12 }}>
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="kv-row">
                              <div>
                                <div className="kv-row-title">{comment.user.name || 'Student'}</div>
                                <p className="kv-sub" style={{ marginTop: 4, maxWidth: 'none' }}>{comment.content}</p>
                              </div>
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <input
                              className="kv-field"
                              value={commentDrafts[post.id] || ''}
                              onChange={(e) =>
                                setCommentDrafts((prev) => ({
                                  ...prev,
                                  [post.id]: e.target.value,
                                }))
                              }
                              placeholder="Write a comment..."
                            />
                            <button type="button" className="kv-btn-ghost" onClick={() => void submitComment(post.id)}>
                              Send
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="kv-hide-mobile">
            <p className="kv-meta">Top students</p>
            {leaderboard.length === 0 ? (
              <p className="kv-sub" style={{ marginTop: 10 }}>No data yet.</p>
            ) : (
              leaderboard.map((entry, idx) => (
                <div key={entry.id} className="kv-row">
                  <span className="kv-meta num">{idx + 1}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="kv-row-title">{entry.name}</div>
                    <div className="kv-row-sub">
                      <span className="kv-chip num">{entry.notes} notes</span>
                      <span className="kv-chip num">{entry.decks} decks</span>
                    </div>
                  </div>
                  <span className="kv-row-side num">{entry.score}</span>
                </div>
              ))
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
