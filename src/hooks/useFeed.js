import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '@/api/dataClient';
import { REACTION_KEYS, emptyReactions } from '@/lib/reactions';
import { DEFAULT_VISIBILITY } from '@/lib/postVisibility';

const PAGE_SIZE = 10;
// Reaction buttons stay locked this long after a tap, so fast repeated taps
// can never fire a burst of writes.
const ACTION_THROTTLE_MS = 500;

// One reaction per member per post. Rows written before the type field existed
// carry no type and read as a plain 'like'.
function summarizeLikes(rows, userId) {
  const counts = { like: 0, love: 0, care: 0 };
  rows.forEach((row) => {
    const type = REACTION_KEYS.includes(row.type) ? row.type : 'like';
    counts[type] += 1;
  });
  const mine = rows.find((row) => row.user_id === userId);
  return {
    counts,
    total: rows.length,
    mine: mine ? (REACTION_KEYS.includes(mine.type) ? mine.type : 'like') : '',
    rowId: mine?.id || null,
  };
}

function summarizeVotes(rows, userId) {
  const mine = rows.find((row) => row.user_id === userId);
  return {
    score: rows.reduce((total, row) => total + (row.value || 0), 0),
    mine: mine?.value || 0,
    rowId: mine?.id || null,
  };
}

export default function useFeed(user, batchId, labFilter = '', academyScope = false) {
  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState({});
  const [votes, setVotes] = useState({});
  const [commentVotes, setCommentVotes] = useState({});
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  // Mirrors of the interaction maps keep rapid taps reading the freshest numbers
  // without another server round-trip.
  const likesRef = useRef({});
  const votesRef = useRef({});
  const commentVotesRef = useRef({});
  const throttleRef = useRef({});

  const throttled = (key) => {
    const now = Date.now();
    if (now - (throttleRef.current[key] || 0) < ACTION_THROTTLE_MS) return true;
    throttleRef.current[key] = now;
    return false;
  };

  const commitLikes = (postId, value) => {
    likesRef.current = { ...likesRef.current, [postId]: value };
    setLikes(likesRef.current);
  };

  const commitVotes = (postId, value) => {
    votesRef.current = { ...votesRef.current, [postId]: value };
    setVotes(votesRef.current);
  };

  const commitCommentVotes = (commentId, value) => {
    commentVotesRef.current = { ...commentVotesRef.current, [commentId]: value };
    setCommentVotes(commentVotesRef.current);
  };

  const hydrate = useCallback(
    async (rows) => {
      const ids = rows.map((row) => row.id);
      if (ids.length === 0) return;

      // Three batched reads for the whole page — never one per post, never one
      // per reaction.
      // Each read is capped at 500 rows TOTAL across the loaded page of posts
      // (not per post). On an unusually busy page, reactions/votes/comments
      // past the cap are missing from the counts until a reload — revisit if
      // a page of posts regularly exceeds ~500 of any one of them combined.
      const [likePage, votePage, commentPage] = await Promise.all([
        db.entities.PostLike.filter({ post_id: { $in: ids } }, { limit: 500 }),
        db.entities.PostVote.filter({ post_id: { $in: ids } }, { limit: 500 }),
        db.entities.PostComment.filter({ post_id: { $in: ids } }, { sort: 'created_date', limit: 500 }),
      ]);

      const likeItems = likePage.items || [];
      const voteItems = votePage.items || [];
      const commentItems = commentPage.items || [];

      // Comment votes need the comment ids, so this one follows the batch above.
      // Same explicit 500-row cap as the reads above, shared across every
      // comment on the page — past it, comment vote counts are incomplete.
      const commentIds = commentItems.map((row) => row.id);
      const commentVoteItems = commentIds.length
        ? (
            await db.entities.CommentVote.filter(
              { comment_id: { $in: commentIds } },
              { limit: 500 }
            )
          ).items || []
        : [];

      const likeMap = {};
      const voteMap = {};
      const commentMap = {};
      const commentVoteMap = {};
      ids.forEach((id) => {
        likeMap[id] = summarizeLikes(likeItems.filter((row) => row.post_id === id), user?.id);
        voteMap[id] = summarizeVotes(voteItems.filter((row) => row.post_id === id), user?.id);
        commentMap[id] = commentItems.filter((row) => row.post_id === id);
      });
      commentIds.forEach((id) => {
        commentVoteMap[id] = summarizeVotes(
          commentVoteItems.filter((row) => row.comment_id === id),
          user?.id
        );
      });

      likesRef.current = { ...likesRef.current, ...likeMap };
      votesRef.current = { ...votesRef.current, ...voteMap };
      commentVotesRef.current = { ...commentVotesRef.current, ...commentVoteMap };
      setLikes(likesRef.current);
      setVotes(votesRef.current);
      setCommentVotes(commentVotesRef.current);
      setComments((prev) => ({ ...prev, ...commentMap }));
    },
    [user?.id]
  );

  // Wall scope: everything in the batch, or only posts written by members of a
  // single lab (the author_lab snapshot each post carries).
  const scopeQuery = (batch) => (labFilter ? { batch, author_lab: labFilter } : { batch });

  // Academy scope ignores the batch entirely: Post read RLS already lets any
  // approved member read visibility:'academy' posts from every batch, so the
  // wall only has to ask for them.
  const pageQuery = () => (academyScope ? { visibility: 'academy' } : scopeQuery(batchId));

  // Author photos for a whole page in ONE query — never one lookup per post.
  const attachAuthors = useCallback(async (rows) => {
    const ids = [...new Set(rows.map((row) => row.created_by_id).filter(Boolean))];
    if (ids.length === 0) return rows;
    try {
      const res = await db.functions.invoke('getProfile', { user_ids: ids });
      const authors = res.data?.authors;
      const byId = new Map((authors || []).map((author) => [author.id, author]));
      return rows.map((row) => {
        const author = byId.get(row.created_by_id);
        return {
          ...row,
          author_avatar: author?.avatar_url || '',
          author_name: row.author_name || author?.full_name || '',
        };
      });
    } catch (err) {
      return rows;
    }
  }, []);

  const load = useCallback(async () => {
    if (!batchId && !academyScope) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const page = await db.entities.Post.filter(pageQuery(), { sort: '-created_date', limit: PAGE_SIZE });
      const rows = await attachAuthors(page.items || []);
      setPosts(rows);
      setCursor(page.next_cursor || null);
      setHasMore(!!page.has_more);
      await hydrate(rows);
    } catch (err) {
      setError(err.message || 'Could not load the wall');
    }
    setLoading(false);
  }, [hydrate, batchId, labFilter, academyScope, attachAuthors]);

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id, load]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await db.entities.Post.filter(
        pageQuery(),
        { sort: '-created_date', limit: PAGE_SIZE, cursor }
      );
      const rows = await attachAuthors(page.items || []);
      setPosts((prev) => [...prev, ...rows]);
      setCursor(page.next_cursor || null);
      setHasMore(!!page.has_more);
      await hydrate(rows);
    } finally {
      // Always release the lock, even when the page fetch or hydration fails,
      // so the feed can never get stuck refusing to load more.
      setLoadingMore(false);
    }
  };

  const createPost = async ({ content, image_uri, visibility }) => {
    const row = await db.entities.Post.create({
      content,
      image_uri: image_uri || '',
      batch: batchId,
      visibility: visibility || DEFAULT_VISIBILITY,
      author_name: user.full_name || user.email || '',
      author_lab: user.lab || '',
    });
    const [withAuthor] = await attachAuthors([row]);
    // The post is always created in the member's own batch, whatever wall is
    // on screen — but it only joins this list if it belongs on this wall. On
    // the Academy wall that means academy visibility; a batch/lab post waits
    // on its own wall instead of appearing here by mistake.
    if (!academyScope || (visibility || DEFAULT_VISIBILITY) === 'academy') {
      setPosts((prev) => [withAuthor, ...prev]);
    }
    commitLikes(row.id, emptyReactions());
    commitVotes(row.id, { score: 0, mine: 0, rowId: null });
    setComments((prev) => ({ ...prev, [row.id]: [] }));
    return row;
  };

  // Text-only edit: the attached image is never touched. The edited flag is
  // set server-side so the card can show its "Edited" label on every device.
  const updatePost = async (postId, content) => {
    await db.entities.Post.update(postId, { content, edited: true });
    setPosts((prev) =>
      prev.map((row) => (row.id === postId ? { ...row, content, edited: true } : row))
    );
  };

  const deletePost = async (postId) => {
    await db.entities.Post.delete(postId);
    setPosts((prev) => prev.filter((row) => row.id !== postId));
  };

  // One reaction per member per post, never two rows: the same reaction toggles
  // the row away, a different reaction updates it in place, and a first tap
  // creates it. Optimistic, with a rollback if the write is refused.
  const setReaction = async (postId, type) => {
    if (throttled(`react:${postId}`)) return;
    const current = likesRef.current[postId] || emptyReactions();
    const removing = current.mine === type;

    const counts = { ...current.counts };
    if (current.mine) counts[current.mine] = Math.max(0, counts[current.mine] - 1);
    if (!removing) counts[type] = (counts[type] || 0) + 1;
    const optimistic = {
      counts,
      total: Object.values(counts).reduce((sum, value) => sum + value, 0),
      mine: removing ? '' : type,
      rowId: current.rowId,
    };
    commitLikes(postId, optimistic);

    try {
      if (removing && current.rowId) {
        await db.entities.PostLike.delete(current.rowId);
        commitLikes(postId, { ...optimistic, rowId: null });
      } else if (current.rowId) {
        await db.entities.PostLike.update(current.rowId, { type });
      } else {
        // Defensive check so a stale page can never add a second row.
        const existing = await db.entities.PostLike.filter(
          { post_id: postId, user_id: user.id },
          { limit: 1 }
        );
        const row = existing.items?.[0];
        if (row) {
          await db.entities.PostLike.update(row.id, { type });
          commitLikes(postId, { ...optimistic, rowId: row.id });
        } else {
          const created = await db.entities.PostLike.create({
            post_id: postId,
            user_id: user.id,
            type,
          });
          commitLikes(postId, { ...optimistic, rowId: created.id });
          db.functions.invoke('notify', { action: 'post_like', post_id: postId }).catch(() => {});
        }
      }
    } catch (err) {
      commitLikes(postId, current);
      throw err;
    }
  };

  // Optimistic vote: same pattern — one write, local score, rollback on error.
  const toggleVote = async (postId, value) => {
    if (throttled(`vote:${postId}`)) return;
    const current = votesRef.current[postId] || { score: 0, mine: 0, rowId: null };
    const nextMine = current.mine === value ? 0 : value;
    const optimistic = {
      score: current.score - current.mine + nextMine,
      mine: nextMine,
      rowId: current.rowId,
    };
    commitVotes(postId, optimistic);

    try {
      if (current.mine === value && current.rowId) {
        await db.entities.PostVote.delete(current.rowId);
        commitVotes(postId, { ...optimistic, rowId: null });
      } else if (current.rowId) {
        await db.entities.PostVote.update(current.rowId, { value });
      } else {
        // Defensive check so a stale page can never add a second row:
        // if a row already exists server-side, toggle against it instead.
        const existing = await db.entities.PostVote.filter(
          { post_id: postId, user_id: user.id },
          { limit: 1 }
        );
        const row = existing.items?.[0];
        if (row && row.value === value) {
          await db.entities.PostVote.delete(row.id);
          commitVotes(postId, { score: current.score - (row.value || 0), mine: 0, rowId: null });
        } else if (row) {
          await db.entities.PostVote.update(row.id, { value });
          commitVotes(postId, {
            score: current.score - (row.value || 0) + value,
            mine: value,
            rowId: row.id,
          });
        } else {
          const created = await db.entities.PostVote.create({
            post_id: postId,
            user_id: user.id,
            value,
          });
          commitVotes(postId, { ...optimistic, rowId: created.id });
        }
      }
    } catch (err) {
      commitVotes(postId, current);
      throw err;
    }
  };

  const addComment = async (postId, body, parentId) => {
    if (parentId) {
      const parent = await db.entities.PostComment.get(parentId).catch(() => null);
      if (!parent || parent.post_id !== postId) {
        throw new Error('That reply is no longer available.');
      }
    }
    // A comment belongs to the post's wall, not the commenter's: stamp it with
    // the post's batch and a copy of the post's visibility. On an academy post
    // that is what lets members of other batches read and write the thread —
    // PostComment RLS opens comments whose post_visibility is 'academy' to any
    // approved member, while every other visibility stays batch-scoped. The
    // author snapshots below stay the commenter's own.
    const post = posts.find((row) => row.id === postId);
    const row = await db.entities.PostComment.create({
      post_id: postId,
      body,
      parent_id: parentId || '',
      batch: post?.batch || batchId,
      post_visibility: post ? post.visibility || 'batch' : 'batch',
      author_name: user.full_name || user.email || '',
      author_lab: user.lab || '',
    });
    db.functions.invoke('notify', { action: 'post_comment', comment_id: row.id }).catch(() => {});
    if (parentId) {
      // A reply also notifies the parent comment's author (the server skips
      // it when that author is the post author — post_comment covered them).
      db.functions.invoke('notify', { action: 'comment_reply', comment_id: row.id }).catch(() => {});
    }
    commitCommentVotes(row.id, { score: 0, mine: 0, rowId: null });
    setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), row] }));
    return row;
  };

  // Same optimistic pattern as posts, one row per member per comment.
  const toggleCommentVote = async (commentId, value) => {
    if (throttled(`cvote:${commentId}`)) return;
    const current = commentVotesRef.current[commentId] || { score: 0, mine: 0, rowId: null };
    const nextMine = current.mine === value ? 0 : value;
    const optimistic = {
      score: current.score - current.mine + nextMine,
      mine: nextMine,
      rowId: current.rowId,
    };
    commitCommentVotes(commentId, optimistic);

    try {
      if (current.mine === value && current.rowId) {
        await db.entities.CommentVote.delete(current.rowId);
        commitCommentVotes(commentId, { ...optimistic, rowId: null });
      } else if (current.rowId) {
        await db.entities.CommentVote.update(current.rowId, { value });
      } else {
        // Defensive check so a stale page can never add a second row:
        // if a row already exists server-side, toggle against it instead.
        const existing = await db.entities.CommentVote.filter(
          { comment_id: commentId, user_id: user.id },
          { limit: 1 }
        );
        const row = existing.items?.[0];
        if (row && row.value === value) {
          await db.entities.CommentVote.delete(row.id);
          commitCommentVotes(commentId, {
            score: current.score - (row.value || 0),
            mine: 0,
            rowId: null,
          });
        } else if (row) {
          await db.entities.CommentVote.update(row.id, { value });
          commitCommentVotes(commentId, {
            score: current.score - (row.value || 0) + value,
            mine: value,
            rowId: row.id,
          });
        } else {
          const created = await db.entities.CommentVote.create({
            comment_id: commentId,
            user_id: user.id,
            value,
          });
          commitCommentVotes(commentId, { ...optimistic, rowId: created.id });
        }
      }
    } catch (err) {
      commitCommentVotes(commentId, current);
      throw err;
    }
  };

  // Removing a comment lifts its replies to the top level so no reply vanishes.
  const deleteComment = async (postId, commentId) => {
    await db.entities.PostComment.delete(commentId);
    setComments((prev) => ({
      ...prev,
      [postId]: (prev[postId] || [])
        .filter((row) => row.id !== commentId)
        .map((row) => (row.parent_id === commentId ? { ...row, parent_id: '' } : row)),
    }));
  };

  return {
    posts,
    likes,
    votes,
    commentVotes,
    comments,
    loading,
    loadingMore,
    hasMore,
    error,
    load,
    loadMore,
    createPost,
    updatePost,
    deletePost,
    setReaction,
    toggleVote,
    addComment,
    toggleCommentVote,
    deleteComment,
  };
}