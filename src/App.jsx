import React from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext.jsx';
import {
  DesktopBottomBar,
  DesktopSidebar,
  MobileBottomDock,
} from './components/NavigationAndMiniPlayer.jsx';
import { FullScreenPlayer } from './components/FullScreenPlayer.jsx';
import { AddToPlaylistModal } from './components/Modals.jsx';
import { HomeView } from './components/views/HomeView.jsx';
import { ExploreView } from './components/views/ExploreView.jsx';
import { RadioView } from './components/views/RadioView.jsx';
import { LibraryView } from './components/views/LibraryView.jsx';
import { SearchView } from './components/views/SearchView.jsx';

function MuscifyShell() {
  const { activeTab } = usePlayer();

  return (
    <div className="relative min-h-[100dvh] h-[100dvh] bg-[#07060a] text-white flex overflow-hidden">
      {/* Blurred Luxury Linear Gradient Backdrop */}
      <div
        className="fixed inset-0 pointer-events-none bg-[linear-gradient(135deg,#07060a_0%,#191020_28%,#261617_54%,#0f1821_82%,#07060a_100%)]"
        aria-hidden="true"
      />
      <div
        className="fixed -inset-24 pointer-events-none blur-[96px] opacity-85 bg-[linear-gradient(125deg,rgba(212,175,55,0.22)_0%,rgba(142,45,86,0.32)_35%,rgba(28,58,84,0.30)_68%,rgba(184,132,70,0.22)_100%)]"
        aria-hidden="true"
      />
      <div
        className="fixed -inset-24 pointer-events-none blur-[115px] opacity-65 bg-[linear-gradient(315deg,rgba(10,8,14,0.85)_0%,rgba(196,144,76,0.20)_40%,rgba(104,30,66,0.28)_72%,rgba(9,11,17,0.85)_100%)]"
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 pointer-events-none bg-black/30"
        aria-hidden="true"
      />

      <DesktopSidebar />

      <main className="relative z-10 flex-1 h-full overflow-y-auto no-scrollbar">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-5">
          {activeTab === 'home' && <HomeView />}
          {activeTab === 'explore' && <ExploreView />}
          {activeTab === 'radio' && <RadioView />}
          {activeTab === 'library' && <LibraryView />}
          {activeTab === 'search' && <SearchView />}
        </div>
      </main>

      <MobileBottomDock />
      <DesktopBottomBar />
      <FullScreenPlayer />
      <AddToPlaylistModal />
    </div>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <MuscifyShell />
    </PlayerProvider>
  );
}
