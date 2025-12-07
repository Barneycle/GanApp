import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SearchService } from '../../services/searchService';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { Search, Calendar, FileText, User, Clock, MapPin, Filter, X } from 'lucide-react';

export const GlobalSearch = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    types: ['event', 'survey', 'user'],
    status: '',
    role: ''
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);
  const isVisible = usePageVisibility();
  const suggestionsRef = useRef(null);

  useEffect(() => {
    // Load suggestions when query changes
    if (query.length >= 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(async () => {
        const result = await SearchService.getSuggestions(query, 10);
        if (result.suggestions) {
          setSuggestions(result.suggestions);
          setShowSuggestions(true);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim() || !isVisible) return;

    try {
      setLoading(true);
      setError(null);
      setShowSuggestions(false);

      const result = await SearchService.globalSearch(searchQuery, {
        types: filters.types,
        status: filters.status || undefined,
        role: filters.role || undefined
      });

      if (result.error) {
        setError(result.error);
      } else {
        setResults(result.results || []);
      }
    } catch (err) {
      setError(err?.message || 'Failed to perform search');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion);
  };

  const handleResultClick = (result) => {
    if (result.type === 'event') {
      navigate(`/events`);
    } else if (result.type === 'survey') {
      navigate(`/survey-management`);
    } else if (result.type === 'user') {
      navigate(`/admin`);
    }
  };

  const getResultIcon = (type) => {
    switch (type) {
      case 'event':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'survey':
        return <FileText className="w-5 h-5 text-green-600" />;
      case 'user':
        return <User className="w-5 h-5 text-purple-600" />;
      default:
        return <Search className="w-5 h-5 text-slate-600" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">
            Global Search
          </h1>
          <p className="text-slate-600">Search across events, surveys, and users</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative" ref={suggestionsRef}>
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search events, surveys, users..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                className="w-full pl-12 pr-12 py-4 text-lg border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg border border-slate-200 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Search Types</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.types.includes('event')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters(prev => ({ ...prev, types: [...prev.types, 'event'] }));
                      } else {
                        setFilters(prev => ({ ...prev, types: prev.types.filter(t => t !== 'event') }));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-slate-700">Events</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.types.includes('survey')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters(prev => ({ ...prev, types: [...prev.types, 'survey'] }));
                      } else {
                        setFilters(prev => ({ ...prev, types: prev.types.filter(t => t !== 'survey') }));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-slate-700">Surveys</span>
                </label>
                {(user?.role === 'admin' || user?.role === 'organizer') && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.types.includes('user')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ ...prev, types: [...prev.types, 'user'] }));
                        } else {
                          setFilters(prev => ({ ...prev, types: prev.types.filter(t => t !== 'user') }));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-slate-700">Users</span>
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {filters.types.includes('user') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">User Role</label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="organizer">Organizer</option>
                  <option value="participant">Participant</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Searching...</p>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </h2>
            </div>

            {results.map((result, index) => (
              <div
                key={`${result.type}-${result.id}-${index}`}
                onClick={() => handleResultClick(result)}
                className="bg-white rounded-xl shadow-lg border border-slate-100 p-6 hover:shadow-xl transition-shadow cursor-pointer"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getResultIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800">{result.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        result.type === 'event' ? 'bg-blue-100 text-blue-800' :
                        result.type === 'survey' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {result.type}
                      </span>
                    </div>
                    {result.description && (
                      <p className="text-slate-600 mb-3 line-clamp-2">{result.description}</p>
                    )}
                    {result.metadata && (
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        {result.metadata.start_date && (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDate(result.metadata.start_date)}
                          </div>
                        )}
                        {result.metadata.venue && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {result.metadata.venue}
                          </div>
                        )}
                        {result.metadata.status && (
                          <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                            {result.metadata.status}
                          </span>
                        )}
                        {result.metadata.role && (
                          <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                            {result.metadata.role}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && query && results.length === 0 && !error && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Results Found</h3>
            <p className="text-slate-600">Try adjusting your search query or filters.</p>
          </div>
        )}

        {/* Initial State */}
        {!loading && !query && results.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Start Searching</h3>
            <p className="text-slate-600">Enter a search query above to find events, surveys, or users.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default GlobalSearch;

