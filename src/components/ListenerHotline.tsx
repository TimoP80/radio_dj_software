import React, { useState } from 'react';
import {
  PhoneCall,
  PhoneOff,
  Send,
  MessageSquare,
  Sparkles,
  Heart,
  Radio,
  User,
  Flame,
  Mic,
  Disc3,
} from 'lucide-react';
import { DJMessage } from '../types';
import { audioEngine } from '../services/audioEngine';

interface ListenerHotlineProps {
  messages: DJMessage[];
  isDJSpeaking: boolean;
  onSendListenerMessage: (text: string, callerName?: string) => void;
  onCallStation: () => void;
  isCalling: boolean;
  onEndCall: () => void;
}

const QUICK_REQUESTS = [
  { label: '🚀 Drop an 80s Synth banger', text: 'Hey DJ Nova, can you drop a high-octane 80s synthwave track with heavy driving bass?' },
  { label: '☕ Late-Night Coding Shoutout', text: 'Shoutout to everyone burning the midnight oil coding right now! Play something smooth for focus.' },
  { label: '🎷 Shift vibe to Midnight Jazz', text: 'Nova, the rain is hitting the window... can we switch the dial to some smoky midnight jazz?' },
  { label: '❓ Obscure Vinyl Lore', text: 'What is the most interesting secret or trivia about the record you have spinning right now?' },
  { label: '🌧️ Mood Weather Forecast', text: 'DJ Nova, give us the late-night Mood Weather Forecast for our current vibe!' },
];

export const ListenerHotline: React.FC<ListenerHotlineProps> = ({
  messages,
  isDJSpeaking,
  onSendListenerMessage,
  onCallStation,
  isCalling,
  onEndCall,
}) => {
  const [inputText, setInputText] = useState('');
  const [callerName, setCallerName] = useState('Alex from Chicago');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendListenerMessage(inputText.trim(), callerName || 'Studio Caller');
    setInputText('');
  };

  const handleQuickRequest = (reqText: string) => {
    onSendListenerMessage(reqText, callerName || 'Midnight Listener');
  };

  return (
    <div
      id="listener-hotline"
      className="flex flex-col h-[520px] rounded-3xl border border-slate-800 bg-slate-900/40 shadow-2xl backdrop-blur-md overflow-hidden"
    >
      {/* Hotline Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <PhoneCall className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <span>Listener Lounge</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">1-800-MIDNIGHT • LIVE HOTLINE</p>
          </div>
        </div>

        {/* Live Call-In Button */}
        {isCalling ? (
          <button
            id="btn-end-call"
            onClick={onEndCall}
            className="flex items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500 active:scale-95 animate-pulse"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            <span>HANG UP</span>
          </button>
        ) : (
          <button
            id="btn-call-station"
            onClick={onCallStation}
            className="flex items-center gap-1.5 rounded-full bg-purple-600 hover:bg-purple-500 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-600/20 transition active:scale-95 border border-purple-400/30"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span>CALL IN</span>
          </button>
        )}
      </div>

      {/* Calling Alert Banner */}
      {isCalling && (
        <div className="flex items-center justify-between bg-purple-950/60 border-b border-purple-500/30 px-6 py-2.5 text-xs text-purple-200 animate-pulse">
          <span className="font-mono font-bold flex items-center gap-2">
            <Radio className="h-3.5 w-3.5 text-purple-400" />
            LINE 1 CONNECTED — ON-AIR WITH DJ NOVA
          </span>
          <span className="text-[10px] uppercase font-mono tracking-wider text-purple-300">Live Call</span>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-8">
            <MessageSquare className="h-8 w-8 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-400">Hotline is quiet right now.</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Send a song request, dedication, or question for DJ Nova to react live on-air!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1.5 ${
                msg.sender === 'nova' ? 'items-start' : 'items-end'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                {msg.sender === 'nova' ? (
                  <span className="font-bold text-purple-400">🎙️ DJ NOVA (ON-AIR)</span>
                ) : (
                  <span className="font-bold text-pink-400">
                    @{msg.callerName ? msg.callerName.toLowerCase().replace(/\s+/g, '_') : 'listener'}
                  </span>
                )}
                <span>• {msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[85%] p-3.5 text-sm leading-relaxed shadow-lg ${
                  msg.sender === 'nova'
                    ? 'bg-slate-950/80 text-slate-200 rounded-2xl rounded-tl-none border border-purple-500/20'
                    : 'bg-slate-800/60 text-slate-200 rounded-2xl rounded-tr-none border border-slate-700/40'
                }`}
              >
                <p>{msg.text}</p>
                {msg.nowPlayingBanner && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-xs font-mono text-purple-300">
                    {msg.nowPlayingBanner}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Request Chips */}
      <div className="border-t border-slate-800/80 bg-slate-950/40 px-4 py-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-mono text-slate-500 shrink-0 font-bold uppercase mr-1">
            REQUESTS:
          </span>
          {QUICK_REQUESTS.map((qr, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickRequest(qr.text)}
              disabled={isDJSpeaking}
              className="shrink-0 rounded-full bg-slate-800/80 hover:bg-slate-700/80 px-3 py-1 text-[11px] font-medium text-slate-300 hover:text-white transition disabled:opacity-50 border border-slate-700/40"
            >
              {qr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input Footer */}
      <form onSubmit={handleSend} className="border-t border-slate-800 bg-slate-950/80 p-4 flex gap-2.5">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a track request, dedication, or shoutout..."
          className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 placeholder:italic outline-hidden focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isDJSpeaking}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-500 active:scale-95 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

