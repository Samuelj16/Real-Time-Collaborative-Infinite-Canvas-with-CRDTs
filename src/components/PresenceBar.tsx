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
    <div className="presence-bar absolute z-30 flex items-center gap-2 p-2 bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm rounded-2xl">
      {/* WebSocket Status Indicator */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border ${
          isConnected
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}
        title={isConnected ? 'Connected to WebSocket sync server' : 'WebSocket disconnected (offline local mode)'}
      >
        {isConnected ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
        <span className="text-[11px] font-mono">{isConnected ? 'Live Sync' : 'Offline'}</span>
      </div>

      <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

      {/* Avatar Stack */}
      <div className="flex items-center gap-1.5">
        {/* Local user pill */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 border text-xs"
          style={{ borderColor: currentUser.color }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: currentUser.color }}
          />
          <span className="font-medium text-slate-800">{currentUser.name} (You)</span>
        </div>

        {/* Remote Collaborators */}
        {peers.slice(0, 3).map(peer => (
          <div
            key={peer.id}
            className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 border text-xs"
            style={{ borderColor: peer.color }}
            title={`Collaborator: ${peer.name}`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: peer.color }}
            />
            <span className="font-medium text-slate-700">{peer.name}</span>
          </div>
        ))}

        {peers.length === 0 && (
          <div className="flex items-center gap-1 text-[11px] text-slate-500 px-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Just you for now</span>
          </div>
        )}
      </div>
    </div>
  );
};

