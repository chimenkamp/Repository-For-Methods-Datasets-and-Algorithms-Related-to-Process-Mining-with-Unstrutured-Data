import { Link, useLocation } from 'react-router-dom';
import { useAppState, useAppDispatch, actions } from '@/lib';
import '@/styles/header.css';

/**
 * Search input with minimal design
 */
function SearchBox() {
  const { filters } = useAppState();
  const dispatch = useAppDispatch();

  const handleChange = (e) => {
    dispatch(actions.setFilters({ searchQuery: e.target.value }));
  };

  const handleClear = () => {
    dispatch(actions.setFilters({ searchQuery: '' }));
  };

  return (
    <div className="search-box">
      <svg
        className="search-box__icon"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        className="search-box__input"
        placeholder="Search methods..."
        value={filters.searchQuery || ''}
        onChange={handleChange}
        aria-label="Search methods"
      />
      {filters.searchQuery && (
        <button
          className="search-box__clear"
          onClick={handleClear}
          aria-label="Clear search"
          type="button"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * Refined header component
 */
export default function Header() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__brand">
          <div className="header__logo">PM</div>
          <div>
            <div className="header__title">Process Mining Methods</div>
            <div className="header__subtitle">for Unstructured Data</div>
          </div>
        </Link>

        <div className="header__search">
          <SearchBox />
        </div>

        <nav className="header__nav">
          <Link
            to="/"
            className={`header__nav-link ${isActive('/') ? 'header__nav-link--active' : ''}`}
          >
            Explorer
          </Link>
          <Link
            to="/relationships"
            className={`header__nav-link ${isActive('/relationships') ? 'header__nav-link--active' : ''}`}
          >
            Graph
          </Link>
          <Link
            to="/about"
            className={`header__nav-link ${isActive('/about') ? 'header__nav-link--active' : ''}`}
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
