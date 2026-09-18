import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Clock,
  BarChart2,
  Settings,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Follow-ups', path: '/follow-ups', icon: Clock },
    { name: 'Reports', path: '/reports', icon: BarChart2 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-[185px] bg-[#0b1329] text-slate-300 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-30 border-r border-slate-800/40">
      {/* Top Brand Section */}
      <div className="flex flex-col">
        <div className="px-5 pt-5 pb-4 border-b border-slate-800/40 flex items-center justify-between">
          <div>
            <div className="flex items-baseline">
              <span className="text-lg font-bold text-white tracking-tight">Appra</span>
              <span className="text-xs font-semibold text-slate-400 ml-1.5">CRM</span>
            </div>
            <p className="text-[10px] text-slate-400 font-normal tracking-wide mt-0.5 whitespace-nowrap">
              Leads · Follow-ups · Growth
            </p>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items - ONLY the 5 required pages */}
        <nav className="px-2.5 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={onCloseMobile}
                className={clsx(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative',
                  isActive
                    ? 'bg-[#152243] text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                )}
              >
                {/* Active left indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-500 rounded-r" />
                )}

                <div className="flex items-center gap-2.5">
                  <Icon
                    className={clsx(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  <span>{item.name}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Motivation Quote matching screenshot */}
      <div className="p-4 border-t border-slate-800/40">
        <p className="text-[11px] text-slate-400 italic leading-relaxed font-serif">
          &ldquo;More
          <br />
          Conversations
          <br />
          More Opportunities&rdquo;
        </p>
        <span className="text-[10px] text-slate-400 font-sans mt-2 block">— Appra</span>
      </div>
    </aside>
  );
};
