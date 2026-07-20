import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp, 
  ArrowUp,
  Tag
} from "lucide-react";
import VideoService from "../../../utils/VideoService";
import ApiService from "../../../utils/ApiService";
import { AuthContext } from "../../../contexts/AuthProvider/AuthProvider";

const MAX_HISTORY = 5;
const MAX_SUGGESTIONS = 6;
const MAX_CATEGORY_TILES = 8;
const MAX_TITLES_SCANNED = 200;

const SearchBar = ({ 
  className = "", 
  placeholder = "Search...", 
  onSearch,
  initialValue = "",
  showTrending = true,
  autoFocus = false,
  showCategoryTiles = true
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [recommendedCategories, setRecommendedCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  
  const searchRef = useRef(null);
  const suggestionBoxRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isAuthenticated = Boolean(user);
  
  useEffect(() => {
    loadSearchHistory();
    loadTrendingSearches();
  }, []);

  useEffect(() => {
    if (showCategoryTiles) {
      fetchRecommendedCategories();
    }
  }, [showCategoryTiles]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionBoxRef.current && 
        !suggestionBoxRef.current.contains(event.target) &&
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    
    const debounceTimer = setTimeout(() => fetchSuggestions(searchQuery), 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);
  
  useEffect(() => {
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);
  
  const loadSearchHistory = () => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory).slice(0, MAX_HISTORY));
      } catch (e) {
        console.error("Error loading search history:", e);
        setSearchHistory([]);
      }
    }
  };
  
  const loadTrendingSearches = async () => {
    try {
      const trendingVideos = await ApiService.get('trending-videos/?limit=10');
      if (Array.isArray(trendingVideos) && trendingVideos.length > 0) {
        const terms = new Set();
        trendingVideos.forEach(v => {
          if (v.title) {
            v.title.toLowerCase().split(/\s+/).filter(w => w.length > 3).forEach(w => terms.add(w));
          }
          if (v.category && v.category.trim()) {
            terms.add(v.category.trim().toLowerCase());
          }
        });
        const sorted = Array.from(terms).slice(0, 5);
        if (sorted.length > 0) {
          setTrendingSearches(sorted);
          return;
        }
      }
    } catch {
      // fallback to defaults
    }
    setTrendingSearches([
      "popular videos", 
      "latest uploads",
      "tutorial",
      "gaming",
      "music videos"
    ]);
  };
  
  const fetchRecommendedCategories = async () => {
    setIsCategoriesLoading(true);
    
    try {
      const [recRes, trendRes, recentRes] = await Promise.allSettled([
        ApiService.get('recommendations/?limit=5'),
        ApiService.get('trending-videos/?limit=10'),
        ApiService.get('recent-videos/?limit=10'),
      ]);
      
      const categories = new Set();
      [recRes, trendRes, recentRes].forEach(res => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          res.value.forEach(video => {
            if (video.category?.trim()) {
              categories.add(video.category.trim());
            }
          });
        }
      });
      
      if (categories.size > 0) {
        setRecommendedCategories(Array.from(categories).slice(0, MAX_CATEGORY_TILES));
      } else {
        setRecommendedCategories(["Entertainment", "Education", "Sports", "Music", "Technology", "Comedy"]);
      }
      
    } catch (e) {
      console.error("Error fetching recommended categories:", e);
      setRecommendedCategories(["Entertainment", "Education", "Sports", "Music", "Technology", "Comedy"]);
    } finally {
      setIsCategoriesLoading(false);
    }
  };
  
  const fetchSuggestions = async (query) => {
    setIsLoading(true);
    
    try {
      const allVideos = await VideoService.getVideoFeed();
      const clientSuggestions = Array.isArray(allVideos)
        ? generateSuggestions(allVideos, query)
        : [];

      if (clientSuggestions.length >= 3) {
        setSuggestions(clientSuggestions);
      } else if (isAuthenticated) {
        try {
          const searchResp = await ApiService.get(
            `search/videos/?filename=${encodeURIComponent(query)}`
          );
          const backendResults = Array.isArray(searchResp) ? searchResp : [];
          const merged = new Map();
          clientSuggestions.forEach((s, i) => merged.set(s, { text: s, score: 2000 - i }));
          backendResults.slice(0, MAX_SUGGESTIONS).forEach(v => {
            const text = v.title || v.filename || '';
            if (text && !merged.has(text)) {
              merged.set(text, { text, score: 500 });
            }
          });
          const sorted = Array.from(merged.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_SUGGESTIONS)
            .map(e => e.text);
          setSuggestions(sorted);
        } catch {
          setSuggestions(clientSuggestions);
        }
      } else {
        setSuggestions(clientSuggestions);
      }
    } catch (e) {
      console.error("Error fetching suggestions:", e);
      if (isAuthenticated) {
        try {
          const searchResp = await ApiService.get(
            `search/videos/?filename=${encodeURIComponent(query)}`
          );
          const backendResults = Array.isArray(searchResp) ? searchResp : [];
          setSuggestions(backendResults.slice(0, MAX_SUGGESTIONS).map(v => v.title || v.filename).filter(Boolean));
        } catch {
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

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

  // --- TIER 1: Exact/strict matches (scores 2000-2999) ---
  const scoreExactTitle = (text, queryLower) => {
    if (text === queryLower) return 2100;
    const words = text.split(/\s+/);
    if (words.some(w => w === queryLower)) return 2080;
    if (words.some(w => w.startsWith(queryLower) && w.length <= queryLower.length + 3)) return 2060;
    if (text.includes(queryLower)) return 2040;
    return 0;
  };

  const scoreExactCategory = (category, queryLower) => {
    const words = category.split(/[\s-]+/);
    if (words.some(w => w === queryLower)) return 2020;
    if (words.some(w => w.startsWith(queryLower))) return 2010;
    if (category.includes(queryLower)) return 2000;
    return 0;
  };

  const scoreExactUploader = (uploader, queryLower) => {
    const parts = uploader.split(/[\s@.]+/);
    if (parts.some(p => p === queryLower)) return 1990;
    if (parts.some(p => p.startsWith(queryLower))) return 1980;
    return 0;
  };

  // --- TIER 2: Fuzzy matches (scores 1000-1999) ---
  const scoreWordMatch = (word, queryLower) => {
    if (word.length < 3 || queryLower.length < 3) return 0;
    const dist = levenshtein(queryLower, word.substring(0, Math.min(word.length, queryLower.length + 2)));
    if (dist === 1) return 1600;
    if (dist === 2 && queryLower.length >= 4) return 1500;
    if (queryLower.length >= 4) {
      const sub = queryLower.substring(0, queryLower.length - 1);
      if (word.includes(sub) || word.startsWith(sub)) return 1400;
    }
    return 0;
  };

  const scoreFuzzyTitle = (title, queryLower) => {
    const words = title.split(/\s+/);
    let best = 0;
    for (const word of words) {
      const s = scoreWordMatch(word, queryLower);
      if (s > best) best = s;
    }
    if (best > 0) return best;
    for (const word of words) {
      if (word.length < 3 || queryLower.length < 3) continue;
      if (word.includes(queryLower.substring(0, Math.min(queryLower.length, word.length)))) return 1300;
    }
    return 0;
  };

  const scoreFuzzyCategory = (category, queryLower) => {
    const words = category.split(/[\s-]+/);
    for (const word of words) {
      const s = scoreWordMatch(word, queryLower);
      if (s > 0) return s - 300;
    }
    return 0;
  };

  const scoreFuzzyUploader = (uploader, queryLower) => {
    const parts = uploader.split(/[\s@.]+/);
    for (const part of parts) {
      const s = scoreWordMatch(part, queryLower);
      if (s > 0) return s - 500;
    }
    return 0;
  };

  // --- TIER 3: Semantic/backend matches (scores 100-999) ---
  // Handled in fetchSuggestions — backend results get score 500

  const extractSearchTerms = (videos) => {
    const terms = { titles: [], categories: [], uploaders: [] };
    videos.forEach(video => {
      if (video.title) terms.titles.push(video.title.toLowerCase());
      if (video.category) terms.categories.push(video.category.toLowerCase());
      if (video.uploader_name) terms.uploaders.push(video.uploader_name.toLowerCase());
    });
    return terms;
  };

  const generateSuggestions = (videos, query) => {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 0);
    const terms = extractSearchTerms(videos);
    const matchScores = new Map();

    const addMatch = (text, score) => {
      const existing = matchScores.get(text) || 0;
      matchScores.set(text, Math.max(existing, score));
    };

    const scanTitles = terms.titles.slice(0, MAX_TITLES_SCANNED);
    const scanCategories = [...new Set(terms.categories)].slice(0, 100);
    const scanUploaders = [...new Set(terms.uploaders)].slice(0, 50);

    // Tier 1: Exact matches per title word
    for (const title of scanTitles) {
      const s = scoreExactTitle(title, queryLower);
      if (s > 0) { addMatch(title, s); continue; }
      for (const qt of queryTerms) {
        const ws = scoreExactTitle(title, qt);
        if (ws > 0) addMatch(title, ws - 50);
      }
      if (matchScores.size >= MAX_SUGGESTIONS * 3) break;
    }

    // Tier 1: Exact matches for categories
    for (const category of scanCategories) {
      const s = scoreExactCategory(category, queryLower);
      if (s > 0) { addMatch(category, s); continue; }
      for (const qt of queryTerms) {
        const ws = scoreExactCategory(category, qt);
        if (ws > 0) addMatch(category, ws - 50);
      }
    }

    // Tier 1: Exact matches for uploaders  
    for (const uploader of scanUploaders) {
      const s = scoreExactUploader(uploader, queryLower);
      if (s > 0) { addMatch(uploader, s); }
    }

    // Tier 2: Fuzzy matches for titles (only if not enough exact matches)
    const exactCount = matchScores.size;
    if (exactCount < MAX_SUGGESTIONS) {
      for (const title of scanTitles) {
        if (matchScores.has(title)) continue;
        const s = scoreFuzzyTitle(title, queryLower);
        if (s > 0) addMatch(title, s);
        for (const qt of queryTerms) {
          const ws = scoreFuzzyTitle(title, qt);
          if (ws > 0) addMatch(title, ws - 50);
        }
        if (matchScores.size >= MAX_SUGGESTIONS * 2) break;
      }

      for (const category of scanCategories) {
        if (matchScores.has(category)) continue;
        const s = scoreFuzzyCategory(category, queryLower);
        if (s > 0) addMatch(category, s);
      }

      for (const uploader of scanUploaders) {
        if (matchScores.has(uploader)) continue;
        const s = scoreFuzzyUploader(uploader, queryLower);
        if (s > 0) addMatch(uploader, s);
      }
    }

    return Array.from(matchScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_SUGGESTIONS)
      .map(([text]) => text);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };
  
  const performSearch = (query) => {
    if (searchHistory[0] !== query) {
      setSearchHistory(prev => [
        query, 
        ...prev.filter(item => item !== query)
      ].slice(0, MAX_HISTORY));
    }
    
    setShowSuggestions(false);
    
    if (onSearch) {
      onSearch(query);
    } else {
      navigate(`/videos?q=${encodeURIComponent(query)}`);
    }
  };
  
  const navigateToCategory = (category) => {
    navigate(`/videos?category=${encodeURIComponent(category)}`);
  };
  
  const clearSearch = () => {
    setSearchQuery('');
    searchRef.current?.focus();
  };
  
  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    performSearch(suggestion);
  };
  
  const renderSuggestionsList = () => {
    if (!showSuggestions) return null;
    
    return (
      <div 
        className="absolute z-[60] mt-2 w-full bg-elevated rounded-lg shadow-xl border border-elevated-border py-2 max-h-80 overflow-y-auto custom-scrollbar"
        ref={suggestionBoxRef}
      >
        {isLoading && (
          <div className="px-4 py-2 text-gray-400 text-center">
            Loading suggestions...
          </div>
        )}
        
        {!isLoading && searchHistory.length > 0 && !searchQuery && (
          <div className="mb-2">
            <div className="px-4 py-1 text-xs text-gray-500">Recent searches</div>
            {searchHistory.map((item) => (
              <button
                key={`history-item-${item.replace(/\s+/g, '-')}`}
                className="w-full px-4 py-2 hover:bg-surface-600 cursor-pointer flex items-center justify-between text-gray-300 hover:text-white transition-colors text-left"
                onClick={() => handleSuggestionClick(item)}
              >
                <div className="flex items-center">
                  <Clock className="mr-3 w-4 h-4 text-gray-500" />
                  <span>{item}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery(item);
                    searchRef.current?.focus();
                  }}
                  className="text-brand-400 hover:text-brand-300"
                  aria-label="Use this search term"
                >
                  <ArrowUp className="w-4 h-4 transform rotate-45" />
                </button>
              </button>
            ))}
            <div className="border-t border-elevated-border my-1"></div>
          </div>
        )}

        {!isLoading && suggestions.length > 0 && (
          <div className="mb-2">
            {suggestions.map((suggestion) => (
              <button
                key={`suggestion-item-${suggestion.replace(/\s+/g, '-')}`}
                className="w-full px-4 py-2 hover:bg-surface-600 cursor-pointer flex items-center text-gray-300 hover:text-white transition-colors text-left"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <Search className="mr-3 w-4 h-4 text-gray-500" />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        )}

        {!isLoading && showTrending && !searchQuery && trendingSearches.length > 0 && (
          <div>
            <div className="px-4 py-1 text-xs text-gray-500">Trending</div>
            {trendingSearches.map((trend) => (
              <button
                key={`trend-item-${trend.replace(/\s+/g, '-')}`}
                className="w-full px-4 py-2 hover:bg-surface-600 cursor-pointer flex items-center text-gray-300 hover:text-white transition-colors text-left"
                onClick={() => handleSuggestionClick(trend)}
              >
                <TrendingUp className="mr-3 w-4 h-4 text-gray-500" />
                <span>{trend}</span>
              </button>
            ))}
          </div>
        )}
        
        {!isLoading && searchQuery && suggestions.length === 0 && (
          <div className="px-4 py-3 text-gray-400 text-center">
            No matching suggestions
          </div>
        )}
      </div>
    );
  };
  
  const renderCategoryTiles = () => {
    if (isCategoriesLoading || !showSuggestions) {
      return null;
    }
    
    if (recommendedCategories.length === 0) {
      return null;
    }
    
    return (
      <div className="mt-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {recommendedCategories.map((category) => (
            <button
              key={`category-${category.replace(/\s+/g, '-')}`}
              className="px-4 py-2 bg-surface-600 hover:bg-brand-600 rounded-full text-sm text-gray-200 transition-colors duration-300 flex items-center"
              onClick={() => navigateToCategory(category)}
            >
              <Tag className="mr-1 w-4 h-4" />
              {category}
            </button>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="relative">
      <form 
        onSubmit={handleSubmit} 
        className={`relative transition-all duration-300 ${isSearchFocused ? 'scale-[1.02]' : ''} ${className}`}
        ref={searchRef}
      >
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          
          <input
            type="text" role="searchbox"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full py-2 pl-10 pr-10 bg-elevated border border-elevated-border focus:border-brand-500 rounded-full text-white placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-brand-500/50 shadow-lg"
            onFocus={() => {
              setIsSearchFocused(true);
              setShowSuggestions(true);
            }}
            autoFocus={autoFocus}
          />
          
          {searchQuery && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <button
                type="button"
                onClick={clearSearch}
                className="text-gray-400 hover:text-white transition-colors mr-1"
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
              
            </div>
          )}
        </div>
      </form>

      {renderSuggestionsList()}
      
      {showCategoryTiles && renderCategoryTiles()}
    </div>
  );
};

SearchBar.propTypes = {
  className: PropTypes.string,
  placeholder: PropTypes.string,
  onSearch: PropTypes.func,
  initialValue: PropTypes.string,
  showTrending: PropTypes.bool,
  autoFocus: PropTypes.bool,
  showCategoryTiles: PropTypes.bool
};

export default SearchBar;
