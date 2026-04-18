'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PlayerNav() {
  const path = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-800 bg-black/95 backdrop-blur-sm">
      <Link
        href="/design"
        className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${path === '/design' ? 'text-crimson' : 'text-gray-600 hover:text-gray-400'}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
        </svg>
        <span className="text-xs font-bold uppercase tracking-wide">Design</span>
      </Link>
      <Link
        href="/vote"
        className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${path === '/vote' ? 'text-crimson' : 'text-gray-600 hover:text-gray-400'}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span className="text-xs font-bold uppercase tracking-wide">Vote</span>
      </Link>
    </div>
  );
}
