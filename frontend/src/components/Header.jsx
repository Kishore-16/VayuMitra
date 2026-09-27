import React, { useState } from 'react';
import ScientistProfileModal from './ScientistProfileModal';
import { Activity, Globe, Shield, RefreshCw } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, onRefresh, isRefreshing }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lang, setLang] = useState('EN');

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-surface/90 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 flex items-center justify-between">
        {/* Left: Emblem & Brand Title */}
        <div className="flex items-center gap-3 min-w-max">
          <div className="flex items-center gap-2">
            <img
              src="/assets/emblem.png"
              alt="AeroSense Delhi Brand Emblem"
              className="h-9 w-auto object-contain drop-shadow"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-text-primary tracking-tight">AeroSense</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary-container/40 text-secondary uppercase font-mono font-semibold">
                  Delhi NCR
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex h-1.5 w-4 rounded-full overflow-hidden">
                  <span className="w-1/3 bg-[#FF9933]"></span>
                  <span className="w-1/3 bg-white"></span>
                  <span className="w-1/3 bg-[#138808]"></span>
                </div>
                <span className="text-[11px] text-text-tertiary">MoES · CPCB Coupled System</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="hidden lg:flex items-center p-1 rounded-full bg-surface-container-lowest/90 border border-white/5">
          <button
            onClick={() => setActiveTab('command')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'command'
                ? 'bg-primary-container text-white font-semibold shadow-md'
                : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'
            }`}
          >
            Official Command Center
          </button>
          <button
            onClick={() => setActiveTab('plume')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'plume'
                ? 'bg-primary-container text-white font-semibold shadow-md'
                : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'
            }`}
          >
            Stubble Plume Tracker
          </button>
          <button
            onClick={() => setActiveTab('inversion')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'inversion'
                ? 'bg-primary-container text-white font-semibold shadow-md'
                : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'
            }`}
          >
            Inversion & Boundary Layer
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'public'
                ? 'bg-primary-container text-white font-semibold shadow-md'
                : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'
            }`}
          >
            Public Citizen View
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'admin'
                ? 'bg-primary-container text-white font-semibold shadow-md'
                : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'
            }`}
          >
            Data Health (Admin)
          </button>
        </nav>

        {/* Right: Controls & Scientist Profile */}
        <div className="flex items-center gap-3">
          {/* Telemetry Status */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low border border-white/5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
            </span>
            <span className="text-xs text-text-secondary font-mono">
              Coupled Run: 06:00 UTC · Live Feed
            </span>
          </div>

          {/* Trigger Refresh */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary transition-all"
            title="Run Fresh Forecast Cycle"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Language Switch */}
          <button
            onClick={() => setLang(lang === 'EN' ? 'HI' : 'EN')}
            className="px-2.5 py-1 rounded-lg text-xs font-mono bg-surface-container-high text-text-secondary hover:text-white transition-colors"
          >
            {lang === 'EN' ? 'EN | हिं' : 'हिं | EN'}
          </button>

          {/* Scientist Profile Card Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-full bg-surface-container-high hover:bg-surface-container-highest border border-white/10 transition-all text-left"
          >
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-text-primary leading-tight">Dr. Raman Sharma</p>
              <p className="text-[10px] text-text-tertiary leading-tight">Lead Modeler</p>
            </div>
            <img
              src="/assets/scientist_portrait.png"
              alt="Dr. Raman Sharma"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-secondary/50"
            />
          </button>
        </div>
      </header>

      {/* Profile Modal */}
      <ScientistProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
