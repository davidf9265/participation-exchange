import type { Metadata } from 'next';
import { SidebarNav } from '@/components/sidebar-nav';
import { VIEWER_CU } from '@/lib/viewer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Participation Exchange',
  description: 'Secondary marketplace for credit union loan participations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="sidebar-brand">
              Participation <span>Exchange</span>
            </div>
            <div className="sidebar-section">Invest</div>
            <SidebarNav />
            <div className="sidebar-user">
              <span className="avatar avatar-sm">{VIEWER_CU.initials}</span>
              <span className="stack">
                <span className="name">{VIEWER_CU.shortName}</span>
                <span className="desk">{VIEWER_CU.desk}</span>
              </span>
            </div>
          </aside>

          <div>
            <header className="topbar">
              <span className="dot" aria-hidden />
              Buying as {VIEWER_CU.name} · {VIEWER_CU.desk}
            </header>
            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
