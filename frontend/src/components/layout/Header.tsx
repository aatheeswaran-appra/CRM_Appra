import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Menu, User, Settings, LogOut, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { customerService } from '../../services/customerService';
import type { Customer } from '../../types/customer';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Dynamic user initials
  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const userInitials = user?.avatarInitials || getUserInitials(user?.name);
  const displayName = user?.name || 'User';

  // Search filtering calling customerService
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    const debounce = setTimeout(async () => {
      try {
        const results = await customerService.searchCustomers(searchQuery);
        setSearchResults(results || []);
      } catch {
        setSearchError('Search is currently unavailable');
      } finally {
        setIsSearching(false);
        setShowSearchResults(true);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowUserDropdown(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile Menu Toggle & Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Field */}
        <div ref={searchRef} className="relative w-full max-w-md">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0 || searchError) setShowSearchResults(true);
              }}
              placeholder="Search customer name, phone, requirement..."
              className="w-full bg-slate-50/70 border border-slate-200 text-slate-800 text-xs rounded-lg pl-9 pr-8 py-2 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {showSearchResults && (
            <div className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                {isSearching ? 'Searching...' : searchError ? 'Search' : `Results (${searchResults.length})`}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {searchError ? (
                  <div className="p-4 text-center text-xs text-slate-500">{searchError}</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No matching customers found</div>
                ) : (
                  searchResults.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => {
                        setShowSearchResults(false);
                        navigate('/customers');
                      }}
                      className="px-3.5 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-50 last:border-0"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">
                          {customer.initials || getUserInitials(customer.name)}
                        </span>
                        <div>
                          <div className="text-xs font-medium text-slate-900">{customer.name}</div>
                          <div className="text-[11px] text-slate-500">{customer.requirement} · {customer.phone}</div>
                        </div>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {customer.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Dynamic User Profile & Dropdown */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* User Pill */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 py-1 pl-1 pr-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer select-none"
          >
            {/* Dark circular avatar initials matching screenshot */}
            <div className="w-7 h-7 rounded-full bg-[#0b1329] text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {userInitials}
            </div>
            <span className="text-xs font-medium text-slate-800 hidden sm:inline">{displayName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Menu Dropdown */}
          {showUserDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-in fade-in duration-100">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{displayName}</p>
                {user?.email && <p className="text-[11px] text-slate-500 truncate">{user.email}</p>}
              </div>
              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  navigate('/settings');
                }}
                className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                Profile Settings
              </button>
              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  navigate('/settings');
                }}
                className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                Preferences
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={handleLogout}
                className="w-full px-3.5 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-red-500" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
