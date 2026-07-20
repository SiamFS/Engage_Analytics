import React, { useState, useEffect, useRef } from "react";
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

const MAX_HISTORY = 5;
const MAX_SUGGESTIONS = 6;
const MAX_CATEGORY_TILES = 8;

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
  
  useEffect(() => {
    loadSearchHistory();
    loadTrendingSearches();
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
  
  const loadTrendingSearches = () => {
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
      
      if (categories.size === 0) {
        throw new Error("No categories found");
      }
      
      setRecommendedCategories(Array.from(categories).slice(0, MAX_CATEGORY_TILES));
      
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
      
      if (Array.isArray(allVideos)) {
        const processedSuggestions = generateSuggestions(allVideos, query);
        setSuggestions(processedSuggestions);
      }
    } catch (e) {
      console.error("Error fetching suggestions:", e);
    } finally {
      setIsLoading(false);
    }
  };
  
  const extractSearchTerms = (videos) => {
    const terms = {
      titles: [],
      categories: [],
      uploaders: []
    };
    
    videos.forEach(video => {
      if (video.title) terms.titles.push(video.title.toLowerCase());
      if (video.category) terms.categories.push(video.category.toLowerCase());
      if (video.uploader_name) terms.uploaders.push(video.uploader_name.toLowerCase());
    });
    
    return terms;
  };

  const scoreMatches = (text, query, baseScore) => {
    if (text.includes(query) && text !== query) {
      return baseScore;
    }
    return 0;
  };

  const generateSuggestions = (videos, query) => {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 0);
    const terms = extractSearchTerms(videos);
    
    const matchScores = [];
    
    terms.titles.forEach(title => {
      const score = scoreMatches(title, queryLower, 100);
      if (score > 0) matchScores.push({ text: title, score });
    });
    
    terms.categories.forEach(category => {
      const score = scoreMatches(category, queryLower, 60);
      if (score > 0) matchScores.push({ text: category, score });
    });
    
    terms.uploaders.forEach(uploader => {
      const score = scoreMatches(uploader, queryLower, 50);
      if (score > 0) matchScores.push({ text: uploader, score });
    });
    
    if (queryTerms.length > 0) {
      processPartialMatches(terms.titles, queryTerms, matchScores);
    }
    
    const uniqueMatches = deduplicateSuggestions(matchScores);
    
    const sortedMatches = [...uniqueMatches].sort((a, b) => b.score - a.score);
    
    return sortedMatches
      .slice(0, MAX_SUGGESTIONS)
      .map(item => item.text);
  };
  
  const processPartialMatches = (terms, queryTerms, results) => {
    terms.forEach(term => {
      const words = term.split(/\s+/);
      checkQueryTermMatches(words, queryTerms, term, results);
    });
  };
  
  const checkQueryTermMatches = (words, queryTerms, term, results) => {
    for (const queryTerm of queryTerms) {
      if (queryTerm.length < 3) continue;
      checkWordsForMatch(words, queryTerm, term, results);
    }
  };
  
  const checkWordsForMatch = (words, queryTerm, term, results) => {
    for (const word of words) {
      const matchFound = checkSingleWordMatch(word, queryTerm, term, results);
      if (matchFound) break;
    }
  };
  
  const checkSingleWordMatch = (word, queryTerm, term, results) => {
    if (word.startsWith(queryTerm)) {
      results.push({ text: term, score: 90 });
      return true;
    }
    
    if (word.includes(queryTerm) && word !== queryTerm) {
      results.push({ text: term, score: 80 });
      return true;
    }
    
    if (queryTerm.length > 3 && word.includes(queryTerm.substring(0, queryTerm.length - 1))) {
      results.push({ text: term, score: 70 });
      return true;
    }
    
    return false;
  };
  
  const deduplicateSuggestions = (suggestions) => {
    const uniqueSuggestions = [];
    const seen = new Set();
    
    suggestions.forEach(item => {
      if (!seen.has(item.text)) {
        seen.add(item.text);
        uniqueSuggestions.push(item);
      }
    });
    
    return uniqueSuggestions;
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
    if (!showSuggestions || !searchRef.current) return null;
    
    return (
      <div 
        className="absolute z-50 mt-2 w-full bg-elevated rounded-lg shadow-xl border border-elevated-border py-2 max-h-96 overflow-y-auto"
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
    if (isCategoriesLoading || !searchRef.current || !showSuggestions) {
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
