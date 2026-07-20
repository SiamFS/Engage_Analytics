import React, { useState, useEffect, useCallback, lazy, Suspense, useRef, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Spinner } from 'flowbite-react';
import { Grid, List, ThumbsUp, Clock, ChevronDown, Filter, Eye, User } from 'lucide-react';
import PropTypes from 'prop-types';
import VideoDataService from '../../../utils/VideoDataService';
import ApiService from '../../../utils/ApiService';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { 
  LoadingState, 
  ErrorState, 
  EmptyState 
} from '../../Shared/VideoLoadingStates/VideoLoadingStates';
import getPlaceholderImage from '../../../utils/getPlaceholderImage';
import SkeletonCard from '../../Shared/SkeletonCard/SkeletonCard';

const AdCard = lazy(() => import('../../Shared/AdCard/AdCard'));

const VIDEOS_PER_PAGE = 12;

const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
};

const fuzzyMatch = (text, query) => {
  if (!text || !query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 95;
  if (t.includes(q)) return 85;
  const words = t.split(/\s+/);
  for (const word of words) {
    if (word === q) return 90;
    if (word.startsWith(q)) return 80;
    if (word.includes(q)) return 70;
  }
  if (q.length >= 3) {
    for (const word of words) {
      if (word.length < 3) continue;
      const dist = levenshtein(q, word.substring(0, Math.min(word.length, q.length + 2)));
      if (dist === 1) return 60;
      if (dist === 2 && q.length >= 4) return 50;
    }
    const sub = q.substring(0, q.length - 1);
    if (sub.length >= 3) {
      if (t.includes(sub)) return 45;
      for (const word of words) {
        if (word.includes(sub) || word.startsWith(sub)) return 40;
      }
    }
  }
  return 0;
};

const AdCardPlaceholder = () => <SkeletonCard rounded="rounded-xl" />

const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
};

const VideoListItem = ({ video, onClick }) => (
  <button
    onClick={(e) => onClick(video, e)}
    className="w-full text-left bg-elevated hover:bg-surface-600 rounded-xl overflow-hidden border border-elevated-border hover:border-white/10 transition-all duration-300 group p-0"
    aria-label={`Watch video: ${video.title}`}
    type="button"
  >
    <div className="flex flex-col sm:flex-row">
      <div className="relative w-full sm:w-56 h-40 sm:h-32 shrink-0 overflow-hidden">
        <img 
          src={video.thumbnail_url || getPlaceholderImage(400, 225, video.title)} 
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            if (!e.target.src.includes('placeholder')) {
              e.target.src = getPlaceholderImage(400, 225, video.title);
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="p-4 flex-1 min-w-0">
        <h3 className="text-white font-semibold text-base mb-1 line-clamp-1 group-hover:text-brand-400 transition-colors">
          {video.title}
        </h3>
        {video.uploader_name && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-4 h-4 rounded-full bg-surface-600 flex items-center justify-center shrink-0">
              <User size={9} className="text-gray-300" />
            </div>
            <span className="text-xs text-gray-400 truncate">{video.uploader_name}</span>
          </div>
        )}
        <p className="text-gray-500 text-sm mb-2 line-clamp-2 leading-relaxed">
          {video.description || 'No description'}
        </p>
        <div className="flex items-center text-gray-500 text-xs gap-3">
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {video.views != null ? video.views.toLocaleString() : '0'}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp size={12} />
            {video.likes != null ? video.likes.toLocaleString() : '0'}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatRelativeTime(video.upload_date)}
          </span>
        </div>
      </div>
    </div>
  </button>
);

VideoListItem.propTypes = {
  video: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    title: PropTypes.string,
    description: PropTypes.string,
    thumbnail_url: PropTypes.string,
    views: PropTypes.number,
    likes: PropTypes.number,
    upload_date: PropTypes.string,
    uploader_name: PropTypes.string
  }).isRequired,
  onClick: PropTypes.func.isRequired
};

const Video = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const isAuthenticated = Boolean(user);
  const queryParams = new URLSearchParams(location.search);
  const initialCategory = queryParams.get('category') || '';
  const initialSortOption = queryParams.get('sort') || 'newest';
  const initialType = queryParams.get('type') || '';
  const initialSearchQuery = queryParams.get('q') || '';
  
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [displayedVideos, setDisplayedVideos] = useState([]);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState(initialSortOption);
  const [viewMode, setViewMode] = useState('grid');
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  
  const observer = useRef();
  const lastVideoElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreVideos();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);
  
  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
        observer.current = null;
      }
    };
  }, []);
  
  const fetchVideoData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { publicVideos } = await VideoDataService.fetchVideos();
      setVideos(publicVideos);
      
      const uniqueCategories = [...new Set(publicVideos
        .filter(v => v.category)
        .map(v => v.category))];
      setCategories(uniqueCategories);
      
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError(error.message || 'Failed to load videos. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchVideoData();
  }, [fetchVideoData]);
  
  useEffect(() => {
    if (videos.length === 0) return;
    
    const urlParams = new URLSearchParams(location.search);
    const query = (urlParams.get('q') || '').toLowerCase();
    
    let results = [...videos];
    
    if (query) {
      results = results
        .map(video => {
          const scores = [
            { video, score: fuzzyMatch(video.title || '', query) },
            { video, score: fuzzyMatch(video.description || '', query) },
            { video, score: fuzzyMatch(video.uploader_name || '', query) },
            { video, score: fuzzyMatch(video.category || '', query) },
          ];
          const best = scores.reduce((max, s) => s.score > max.score ? s : max, scores[0]);
          return { video, score: best.score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.video);
    }
    
    if (categoryFilter) {
      results = results.filter(video => video.category === categoryFilter);
    }
    
    if (typeFilter) {
      if (typeFilter === 'foryou') {
        results.sort((a, b) => {
          const dateA = a.upload_date ? new Date(a.upload_date) : new Date(0);
          const dateB = b.upload_date ? new Date(b.upload_date) : new Date(0);
          return dateB - dateA;
        });
      } else if (typeFilter === 'recommended') {
        results.sort((a, b) => (b.views || 0) - (a.views || 0));
      }
    }
    
    switch (sortOption) {
      case 'popular':
        results.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'liked':
        results.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'oldest':
        results.sort((a, b) => {
          const dateA = a.upload_date ? new Date(a.upload_date) : new Date(0);
          const dateB = b.upload_date ? new Date(b.upload_date) : new Date(0);
          return dateA - dateB;
        });
        break;
      case 'newest':
      default:
        results.sort((a, b) => {
          const dateA = a.upload_date ? new Date(a.upload_date) : new Date(0);
          const dateB = b.upload_date ? new Date(b.upload_date) : new Date(0);
          return dateB - dateA;
        });
        break;
    }
    
    setFilteredVideos(results);
    setPage(1);
    
    const initialVideos = results.slice(0, VIDEOS_PER_PAGE);
    setDisplayedVideos(initialVideos);
    setHasMore(initialVideos.length < results.length);
    
    const params = new URLSearchParams();
    if (sortOption && sortOption !== 'newest') params.set('sort', sortOption);
    if (categoryFilter) params.set('category', categoryFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (query) params.set('q', query);
    
    const newUrl = location.pathname + (params.toString() ? `?${params.toString()}` : '');
    window.history.replaceState({}, '', newUrl);
    
  }, [videos, sortOption, categoryFilter, typeFilter, location.search, location.pathname, navigate]);

  useEffect(() => {
    const query = (new URLSearchParams(location.search).get('q') || '').toLowerCase();
    if (!query || !isAuthenticated || filteredVideos.length > 0 || !videos.length) return;

    let cancelled = false;
    const searchBackend = async () => {
      try {
        const resp = await ApiService.get(`search/videos/?filename=${encodeURIComponent(query)}`);
        if (cancelled || !Array.isArray(resp)) return;
        const backend = resp.map(v => ({
          ...VideoDataService.normalizeVideoData(v, v.id),
          _semantic: true,
        }));
        if (backend.length > 0) {
          setFilteredVideos(backend);
          setDisplayedVideos(backend.slice(0, VIDEOS_PER_PAGE));
          setHasMore(backend.length > VIDEOS_PER_PAGE);
        }
      } catch {
        // silently fail
      }
    };
    searchBackend();
    return () => { cancelled = true; };
  }, [filteredVideos.length, location.search, isAuthenticated, videos.length]);
  
  const loadMoreVideos = () => {
    if (!hasMore || loadingMore || filteredVideos.length === 0) return;
    
    setLoadingMore(true);
    
    const nextPage = page + 1;
    const endIndex = nextPage * VIDEOS_PER_PAGE;
    
    const newDisplayedVideos = filteredVideos.slice(0, endIndex);
    setDisplayedVideos(newDisplayedVideos);
    setPage(nextPage);
    setHasMore(endIndex < filteredVideos.length);
    setLoadingMore(false);
  };
  
  const handleSortChange = (option) => {
    setSortOption(option);
  };
  
  const handleCategoryChange = (category) => {
    setCategoryFilter(prev => prev === category ? '' : category);
  };
  
  const handleClearFilters = () => {
    setCategoryFilter('');
    setSortOption('newest');
    setTypeFilter('');
    
    const params = new URLSearchParams(location.search);
    if (searchQuery) {
      params.set('q', searchQuery);
      navigate(`${location.pathname}?${params.toString()}`);
    } else {
      navigate(location.pathname);
    }
  };
  
  const handleVideoInteraction = (video, event) => {
    if (!event.type || event.type === 'click' || (event.type === 'keydown' && event.key === 'Enter')) {
      const navId = video.uuid || video.id;
      navigate(`/video/${navId}`);
    }
  };
  
  if (loading) {
    return <LoadingState />;
  }
  
  if (error) {
    return <ErrorState error={error} onDismiss={() => setError(null)} />;
  }
  
  if (videos.length === 0) {
    return (
      <EmptyState 
        title="No Videos Available" 
        message="There are no public videos available at this time."
      />
    );
  }
  
  return (
    <div className="bg-surface min-h-screen py-6 px-4 md:px-8 w-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white mb-1 truncate">
              {searchQuery ? `Results for "${searchQuery}"` : 'Videos'}
            </h1>
            {(categoryFilter || typeFilter) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {categoryFilter && (
                  <span className="inline-flex items-center gap-1 bg-brand-900/40 text-brand-300 rounded-full px-3 py-1 text-xs font-medium">
                    <Filter size={11} />
                    {categoryFilter}
                  </span>
                )}
                
                {typeFilter && (
                  <span className="inline-flex items-center gap-1 bg-purple-900/40 text-purple-300 rounded-full px-3 py-1 text-xs font-medium capitalize">
                    {typeFilter === 'foryou' ? 'For You' : typeFilter}
                  </span>
                )}
                
                <button
                  onClick={handleClearFilters}
                  className="text-gray-500 hover:text-white text-xs underline underline-offset-2 transition-colors ml-1"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button
              color="gray"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`bg-elevated hover:bg-surface-600 text-white border border-elevated-border focus:ring-0 ${showFilters ? 'ring-1 ring-brand-500' : ''}`}
            >
              <Filter size={15} className="mr-1.5" />
              Filters
              <ChevronDown size={15} className={`ml-1.5 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
            
            <div className="h-6 w-px bg-elevated-border mx-1 hidden md:block" />

            <div className="hidden md:flex bg-elevated rounded-lg border border-elevated-border p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all duration-200 ${viewMode === 'grid' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                aria-label="Grid view"
                type="button"
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all duration-200 ${viewMode === 'list' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                aria-label="List view"
                type="button"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
        
        {showFilters && (
          <div className="bg-elevated backdrop-blur-sm rounded-xl p-5 mb-6 border border-elevated-border shadow-lg animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Sort By</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'newest', label: 'Newest' },
                    { id: 'oldest', label: 'Oldest' },
                    { id: 'popular', label: 'Most Viewed' },
                    { id: 'liked', label: 'Most Liked' }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => handleSortChange(option.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        sortOption === option.id
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-surface-600 text-gray-300 hover:bg-surface-500 hover:text-white'
                      }`}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {categories.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => handleCategoryChange(category)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                          categoryFilter === category
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'bg-surface-600 text-gray-300 hover:bg-surface-500 hover:text-white'
                        }`}
                        type="button"
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <p className="text-gray-500 text-sm mb-6">
          {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'} found
        </p>
        
        {filteredVideos.length === 0 && (
          <EmptyState 
            title={searchQuery ? `No videos found for "${searchQuery}"` : "No videos match your criteria"}
            message="Try adjusting your search or filters"
          />
        )}
        
        {filteredVideos.length > 0 && (
          <Suspense fallback={
            <div className={
              viewMode === 'grid'
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                : "flex flex-col space-y-4"
            }>
              {Array.from({ length: 8 }, (_, i) => `ph-${i}`).map((key) => (
                <AdCardPlaceholder key={key} />
              ))}
            </div>
          }>
            <div className={
              viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" 
                : "flex flex-col space-y-4"
            }>
              {displayedVideos.map((video, index) => {
                const isLastElement = index === displayedVideos.length - 1;
                
                if (viewMode === 'grid') {
                  return (
                    <button
                      key={video.id}
                      ref={isLastElement ? lastVideoElementRef : null}
                      onClick={(e) => handleVideoInteraction(video, e)}
                      onKeyDown={(e) => handleVideoInteraction(video, e)}
                      className="block w-full text-left bg-transparent border-none p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl"
                      aria-label={`Watch video: ${video.title}`}
                    >
                      <AdCard ad={video} />
                    </button>
                  );
                } else {
                  return (
                    <div
                      key={video.id}
                      ref={isLastElement ? lastVideoElementRef : null}
                    >
                      <VideoListItem video={video} onClick={handleVideoInteraction} />
                    </div>
                  );
                }
              })}
            </div>
          </Suspense>
        )}
        
        {loadingMore && (
          <div className="flex justify-center mt-10">
            <Spinner size="xl" className="fill-brand-500" />
          </div>
        )}
        
        {hasMore && !loadingMore && (
          <div className="flex justify-center mt-10">
            <Button 
              color="blue" 
              onClick={loadMoreVideos}
              className="px-8 bg-brand-600 hover:bg-brand-700 focus:ring-0"
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Video;
