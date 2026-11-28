import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { postService } from '../services/api';

// Allowed values mirror backend/models/Post.js enums
const PLATFORMS = ['Instagram', 'YouTube', 'LinkedIn', 'Twitter/X', 'TikTok', 'Facebook'];
const CONTENT_TYPES = ['Reel', 'Carousel', 'Video', 'Image', 'Text'];
// Category is free text in the backend; these are offered by default and any
// category already present in the user's posts is added to the lists
const DEFAULT_CATEGORIES = ['Travel', 'Tech', 'Education', 'Community', 'Lifestyle', 'Finance', 'Health'];
const PAGE_SIZE = 20;

const today = () => new Date().toISOString().split('T')[0];

const emptyForm = () => ({
  postId: '',
  date: today(),
  platform: 'Instagram',
  contentType: 'Reel',
  category: 'Travel',
  postingHour: 20,
  captionLength: 120,
  hashtagsCount: 7,
  durationSeconds: 28,
  views: '',
  likes: '',
  comments: '',
  shares: '',
  saves: '',
  reach: '',
});

const formFromPost = (post) => ({
  postId: post.postId,
  date: post.date ? new Date(post.date).toISOString().split('T')[0] : today(),
  platform: post.platform,
  contentType: post.contentType,
  category: post.category,
  postingHour: post.postingHour ?? 0,
  captionLength: post.captionLength ?? 0,
  hashtagsCount: post.hashtagsCount ?? 0,
  durationSeconds: post.durationSeconds ?? 0,
  views: post.views ?? '',
  likes: post.likes ?? '',
  comments: post.comments ?? '',
  shares: post.shares ?? '',
  saves: post.saves ?? '',
  reach: post.reach ?? '',
});

const CONTENT_ICONS = {
  Reel: 'play_circle',
  Carousel: 'view_carousel',
  Video: 'videocam',
  Image: 'image',
  Text: 'article',
};

export default function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTier, setSelectedTier] = useState('All');
  const [sortField, setSortField] = useState('views');
  const [sortAsc, setSortAsc] = useState(false);

  const [page, setPage] = useState(1);
  // Categories seen in any fetched result (the first load is unfiltered, so it sees them all)
  const [knownCategories, setKnownCategories] = useState(DEFAULT_CATEGORIES);

  // Modals & form state (editingId is set when the modal edits an existing post)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const [newPost, setNewPost] = useState(emptyForm);

  // Fetch posts from API
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await postService.getAll({
        search: searchQuery,
        platform: selectedPlatform,
        contentType: selectedType,
        category: selectedCategory,
      });

      if (res.success) {
        setPosts(res.data);
        setKnownCategories((prev) => Array.from(new Set([...prev, ...res.data.map((p) => p.category).filter(Boolean)])));
      }
    } catch (err) {
      setError(err.message || 'Failed to load posts from database');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedPlatform, selectedType, selectedCategory]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Back to the first page whenever the result set changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedPlatform, selectedType, selectedCategory, selectedTier]);

  const filtersActive =
    Boolean(searchQuery) ||
    selectedPlatform !== 'All' ||
    selectedType !== 'All' ||
    selectedCategory !== 'All' ||
    selectedTier !== 'All';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedPlatform('All');
    setSelectedType('All');
    setSelectedCategory('All');
    setSelectedTier('All');
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Delete post
  const handleDeletePost = async (id, postId) => {
    if (!window.confirm(`Delete post "${postId}" from workspace?`)) return;
    try {
      await postService.delete(id);
      setPosts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      setError(`Failed to delete post ${postId}: ${err.message}`);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setNewPost(emptyForm());
    setModalError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (post) => {
    setEditingId(post._id);
    setNewPost(formFromPost(post));
    setModalError('');
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingId(null);
  };

  // Create or update post
  const handleSavePost = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);

    try {
      const payload = {
        date: newPost.date,
        platform: newPost.platform,
        contentType: newPost.contentType,
        category: newPost.category.trim(),
        postingHour: Number(newPost.postingHour),
        captionLength: Number(newPost.captionLength) || 0,
        hashtagsCount: Number(newPost.hashtagsCount) || 0,
        durationSeconds: Number(newPost.durationSeconds) || 0,
        views: Number(newPost.views) || 0,
        likes: Number(newPost.likes) || 0,
        comments: Number(newPost.comments) || 0,
        shares: Number(newPost.shares) || 0,
        saves: Number(newPost.saves) || 0,
        // Reach is never estimated from views: without it engagement rate is 0 (undefined)
        reach: Number(newPost.reach) || 0,
      };

      if (editingId) {
        const res = await postService.update(editingId, payload);
        if (res.success) {
          setPosts((prev) => prev.map((p) => (p._id === editingId ? res.data : p)));
          closeModal();
        }
      } else {
        const res = await postService.create({ ...payload, postId: newPost.postId.trim() || undefined });
        if (res.success) {
          setPosts((prev) => [res.data, ...prev]);
          setKnownCategories((prev) => Array.from(new Set([...prev, res.data.category])));
          closeModal();
        }
      }
    } catch (err) {
      setModalError(err.message || 'Failed to save post');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Client-side sort & tier filtering on fetched posts
  const displayedPosts = posts
    .filter((post) => {
      if (selectedTier === 'All') return true;
      const er = post.engagementRate || 0;
      const tier = er >= 7.0 ? 'High' : er >= 4.0 ? 'Medium' : 'Low';
      return tier === selectedTier;
    })
    .sort((a, b) => {
      const factor = sortAsc ? 1 : -1;
      if (sortField === 'views') return ((a.views || 0) - (b.views || 0)) * factor;
      if (sortField === 'likes') return ((a.likes || 0) - (b.likes || 0)) * factor;
      if (sortField === 'engagementRate') return ((a.engagementRate || 0) - (b.engagementRate || 0)) * factor;
      return 0;
    });

  const pageCount = Math.max(1, Math.ceil(displayedPosts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagePosts = displayedPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filterCategories = [...knownCategories].sort();

  // Engagement-rate tier (High ≥ 7%, Medium ≥ 4%). This is NOT the Dashboard's
  // performance-score tier, so the column is labelled "ER Tier".
  const getTier = (er = 0) => {
    if (er >= 7.0) return 'High';
    if (er >= 4.0) return 'Medium';
    return 'Low';
  };

  return (
    <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
      {/* Page Heading & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-headline-lg text-on-surface">Posts</h1>
          <p className="font-body text-body-md text-text-secondary mt-1">
            Manage, filter, and track performance of published content.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-primary text-on-primary font-label text-title-sm hover:opacity-95 transition-opacity shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Post</span>
          </button>
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="p-4 rounded-lg bg-error-container border border-error/20 text-on-error-container font-body text-body-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchPosts}
            className="px-3 py-1 rounded bg-surface border border-outline text-on-surface hover:bg-surface-elevated font-label text-label-md"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <section className="bg-surface border border-outline-variant rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-text-muted">search</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by post ID, platform or category..."
            className="w-full pl-9 pr-3 py-2 rounded bg-surface-elevated border border-outline text-on-surface font-body text-body-md placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </div>

        {/* Platform */}
        <select
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
          className="w-full px-3 py-2 rounded bg-surface-elevated border border-outline text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
        >
          <option value="All">All Platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* Content Type */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full px-3 py-2 rounded bg-surface-elevated border border-outline text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
        >
          <option value="All">All Types</option>
          {CONTENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Category */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 rounded bg-surface-elevated border border-outline text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
        >
          <option value="All">All Categories</option>
          {filterCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Performance Tier */}
        <select
          value={selectedTier}
          onChange={(e) => setSelectedTier(e.target.value)}
          className="w-full px-3 py-2 rounded bg-surface-elevated border border-outline text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
        >
          <option value="All">All ER Tiers</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </section>

      {/* Loading State */}
      {loading ? (
        <section className="bg-surface border border-outline-variant rounded-lg p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse [animation-delay:200ms]" />
            <span className="w-2.5 h-2.5 rounded-full bg-on-background animate-pulse [animation-delay:400ms]" />
          </div>
          <p className="font-mono text-mono-sm text-text-muted">Loading posts from MongoDB...</p>
        </section>
      ) : displayedPosts.length > 0 ? (
        /* Table Section */
        <section className="bg-surface border border-outline-variant rounded-lg overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-background-secondary">
                  <th className="px-5 py-3 font-label text-label-md uppercase tracking-wider text-text-muted">Post</th>
                  <th className="px-4 py-3 font-label text-label-md uppercase tracking-wider text-text-muted">Platform</th>
                  <th className="px-4 py-3 font-label text-label-md uppercase tracking-wider text-text-muted">Content Type</th>
                  <th className="px-4 py-3 font-label text-label-md uppercase tracking-wider text-text-muted">Category</th>
                  <th className="px-4 py-3 font-label text-label-md uppercase tracking-wider text-text-muted">Date</th>
                  <th
                    onClick={() => handleSort('views')}
                    className="px-4 py-3 font-label text-label-md uppercase tracking-wider text-text-muted text-right cursor-pointer hover:text-on-surface"
                  >
                    Views {sortField === 'views' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th
                    onClick={() => handleSort('likes')}
                    className="px-4 py-3 font-label text-label-md uppercase tracking-wider text-text-muted text-right cursor-pointer hover:text-on-surface"
                  >
                    Likes {sortField === 'likes' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th
                    onClick={() => handleSort('engagementRate')}
                    className="px-4 py-3 font-label text-label-md uppercase tracking-wider text-text-muted text-right cursor-pointer hover:text-on-surface"
                  >
                    Engagement {sortField === 'engagementRate' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-5 py-3 font-label text-label-md uppercase tracking-wider text-text-muted text-right">ER Tier</th>
                  <th className="px-3 py-3 font-label text-label-md uppercase tracking-wider text-text-muted text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {pagePosts.map((post) => {
                  const tier = getTier(post.engagementRate);
                  const formattedDate = post.date ? new Date(post.date).toISOString().split('T')[0] : '—';

                  return (
                    <tr key={post._id} className="hover:bg-surface-elevated/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded bg-surface-elevated border border-outline flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[16px] text-primary">
                              {CONTENT_ICONS[post.contentType] || 'article'}
                            </span>
                          </div>
                          <div className="min-w-0 max-w-[260px]">
                            <p className="font-title text-body-sm text-on-surface truncate">{post.postId}</p>
                            <span className="font-mono text-mono-sm text-text-muted">{post.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-body text-body-sm text-text-secondary">{post.platform}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded bg-background-secondary border border-outline-variant font-mono text-mono-sm text-text-secondary">
                          {post.contentType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-body text-body-sm text-text-secondary">{post.category}</td>
                      <td className="px-4 py-3.5 font-mono text-mono-sm text-text-muted">{formattedDate}</td>
                      <td className="px-4 py-3.5 font-mono text-mono-sm text-on-surface text-right tabular-nums">
                        {(post.views || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-mono-sm text-on-surface text-right tabular-nums">
                        {(post.likes || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-mono-sm text-right tabular-nums text-success">
                        {post.engagementRate || 0}%
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label text-label-md border ${
                            tier === 'High'
                              ? 'bg-success-container text-on-success-container border-success/20'
                              : tier === 'Medium'
                              ? 'bg-warning-container text-on-warning-container border-warning/20'
                              : 'bg-error-container text-on-error-container border-error/20'
                          }`}
                        >
                          {tier}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(post)}
                          title="Edit post"
                          className="text-text-muted hover:text-primary p-1 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post._id, post.postId)}
                          title="Delete post"
                          className="text-text-muted hover:text-error p-1 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="px-5 py-3 border-t border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-body-sm text-text-secondary">
            <span className="font-mono text-mono-sm text-text-muted">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{(currentPage - 1) * PAGE_SIZE + pagePosts.length} of{' '}
              {displayedPosts.length} post{displayedPosts.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 rounded bg-surface-elevated border border-outline text-text-secondary font-label text-label-md disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-2.5 py-1 rounded bg-primary text-on-primary font-label text-label-md tabular-nums">
                {currentPage} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount}
                className="px-2.5 py-1 rounded bg-surface-elevated border border-outline text-text-secondary font-label text-label-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* Empty State */
        <section className="bg-surface border border-outline-variant rounded-lg p-12 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-surface-elevated border border-outline flex items-center justify-center text-text-muted">
            <span className="material-symbols-outlined text-[24px]">search_off</span>
          </div>
          <h2 className="font-title text-headline-md text-on-surface">
            {posts.length === 0 && !filtersActive ? 'No posts yet' : 'No posts match your filters'}
          </h2>
          <p className="font-body text-body-sm text-text-secondary max-w-sm">
            {posts.length === 0 && !filtersActive
              ? 'Upload a CSV dataset or add your first post manually.'
              : 'Try clearing your search query or adjusting the platform, type, category and tier filters.'}
          </p>
          <div className="flex items-center gap-3 mt-2">
            {posts.length === 0 && !filtersActive ? (
              <>
                <Link
                  to="/upload"
                  className="px-4 py-2 rounded bg-primary text-on-primary font-label text-title-sm font-medium hover:opacity-95"
                >
                  Upload CSV
                </Link>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="px-4 py-1.5 rounded bg-surface-elevated border border-outline text-primary font-label text-label-md hover:bg-surface-hover"
                >
                  Add Post
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-1.5 rounded bg-surface-elevated border border-outline text-primary font-label text-label-md hover:bg-surface-hover"
              >
                Reset Filters
              </button>
            )}
          </div>
        </section>
      )}

      {/* Add Post Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-outline rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h2 className="font-title text-headline-md text-on-surface">{editingId ? `Edit Post ${newPost.postId}` : 'Add New Post'}</h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="text-text-muted hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded bg-error-container border border-error/20 text-on-error-container font-body text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSavePost} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-label-md text-text-secondary">Post ID {editingId ? '' : '(Optional)'}</span>
                  <input
                    type="text"
                    placeholder="e.g. P149"
                    value={newPost.postId}
                    disabled={Boolean(editingId)}
                    onChange={(e) => setNewPost({ ...newPost, postId: e.target.value })}
                    className="rounded bg-surface-elevated border border-outline px-3 py-2 text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-label-md text-text-secondary">Category</span>
                  <select
                    value={newPost.category}
                    onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                    className="rounded bg-surface-elevated border border-outline px-3 py-2 text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
                  >
                    {filterCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="font-label text-label-md text-text-secondary">Publish Date</span>
                  <input
                    type="date"
                    required
                    value={newPost.date}
                    onChange={(e) => setNewPost({ ...newPost, date: e.target.value })}
                    className="rounded bg-surface-elevated border border-outline px-3 py-2 text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-label-md text-text-secondary">Platform</span>
                  <select
                    value={newPost.platform}
                    onChange={(e) => setNewPost({ ...newPost, platform: e.target.value })}
                    className="rounded bg-surface-elevated border border-outline px-3 py-2 text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-label-md text-text-secondary">Content Type</span>
                  <select
                    value={newPost.contentType}
                    onChange={(e) => setNewPost({ ...newPost, contentType: e.target.value })}
                    className="rounded bg-surface-elevated border border-outline px-3 py-2 text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
                  >
                    {CONTENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-label-md text-text-secondary">Posting Hour</span>
                  <select
                    value={newPost.postingHour}
                    onChange={(e) => setNewPost({ ...newPost, postingHour: Number(e.target.value) })}
                    className="rounded bg-surface-elevated border border-outline px-3 py-2 text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
                  >
                    {Array.from({ length: 24 }).map((_, h) => (
                      <option key={h} value={h}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-label-md text-text-secondary">Views</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="120000"
                    value={newPost.views}
                    onChange={(e) => setNewPost({ ...newPost, views: e.target.value })}
                    className="rounded bg-surface-elevated border border-outline px-3 py-2 text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-label-md text-text-secondary">Likes</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="8500"
                    value={newPost.likes}
                    onChange={(e) => setNewPost({ ...newPost, likes: e.target.value })}
                    className="rounded bg-surface-elevated border border-outline px-3 py-2 text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-label-md text-text-secondary">Comments</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="320"
                    value={newPost.comments}
                    onChange={(e) => setNewPost({ ...newPost, comments: e.target.value })}
                    className="rounded bg-surface-elevated border border-outline px-3 py-2 text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-label-md text-text-secondary">Shares</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="750"
                    value={newPost.shares}
                    onChange={(e) => setNewPost({ ...newPost, shares: e.target.value })}
                    className="rounded bg-surface-elevated border border-outline px-3 py-2 text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-label-md text-text-secondary">Saves</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="1100"
                    value={newPost.saves}
                    onChange={(e) => setNewPost({ ...newPost, saves: e.target.value })}
                    className="rounded bg-surface-elevated border border-outline px-3 py-2 text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-label-md text-text-secondary">Reach (needed for engagement rate)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="95000"
                    value={newPost.reach}
                    onChange={(e) => setNewPost({ ...newPost, reach: e.target.value })}
                    className="rounded bg-surface-elevated border border-outline px-3 py-2 text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded bg-surface-elevated border border-outline text-text-secondary hover:text-on-surface font-label text-label-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded bg-primary text-on-primary font-label text-label-md font-medium hover:opacity-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingId ? 'Save Changes' : 'Save Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
