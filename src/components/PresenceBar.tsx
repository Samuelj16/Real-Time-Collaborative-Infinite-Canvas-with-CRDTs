import React from 'react';
import { Users, Wifi, WifiOff } from 'lucide-react';
import { UserPresence } from '../types/canvas';

interface PresenceBarProps {
  currentUser: { id: string; name: string; color: string };
  peers: UserPresence[];
  isConnected: boolean;
}

export const PresenceBar: React.FC<PresenceBarProps> = ({
  currentUser,
  peers,
  isConnected,
}) => {
  return (
    <div className="absolute top-4 left-4 z-30 flex items-center gap-2 p-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-2xl rounded-2xl">
      {/* WebSocket Status Indicator */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border ${
          isConnected
            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
            : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
        }`}
        title={isConnected ? 'Connected to WebSocket sync server' : 'WebSocket disconnected (offline local mode)'}
      >
        {isConnected ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
        <span className="text-[11px] font-mono">{isConnected ? 'Live Sync' : 'Offline'}</span>
      </div>

      <div className="w-[1px] h-5 bg-slate-800 mx-0.5" />

      {/* Avatar Stack */}
      <div className="flex items-center gap-1.5">
        {/* Local user pill */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-800/80 border text-xs"
          style={{ borderColor: currentUser.color }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: currentUser.color }}
          />
          <span className="font-medium text-slate-200">{currentUser.name} (You)</span>
        </div>

        {/* Remote Collaborators */}
        {peers.map(peer => (
          <div
            key={peer.id}
            className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-800/50 border text-xs"
            style={{ borderColor: peer.color }}
            title={`Collaborator: ${peer.name}`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: peer.color }}
            />
            <span className="font-medium text-slate-300">{peer.name}</span>
          </div>
        ))}

        {peers.length === 0 && (
          <div className="flex items-center gap-1 text-[11px] text-slate-500 px-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Open another tab to collaborate!</span>
          </div>
        )}
      </div>
    </div>
  );
};

