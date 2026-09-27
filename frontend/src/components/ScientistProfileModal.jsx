import React from 'react';
import { X, Award, ShieldCheck, Mail, Building2, Cpu, Globe } from 'lucide-react';

export default function ScientistProfileModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-xl p-6 rounded-2xl bg-surface-container-low border border-white/10 shadow-2xl overflow-hidden">
        {/* Glow background */}
        <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-secondary/10 blur-3xl pointer-events-none"></div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-text-tertiary hover:text-white hover:bg-surface-container-high transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="relative flex-shrink-0">
            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-secondary via-primary to-tertiary shadow-xl">
              <img
                src="/assets/scientist_portrait.png"
                alt="Dr. Raman Sharma"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-tertiary text-surface font-bold text-xs" title="MoES Verified Scientist">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>

          <div className="flex flex-col text-center md:text-left gap-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary font-mono uppercase font-semibold">
                MoES Senior Fellow
              </span>
              <span className="px-2 py-0.5 rounded text-xs bg-tertiary/20 text-tertiary font-mono font-semibold">
                Lead Scientist
              </span>
            </div>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">Dr. Raman Sharma</h2>
            <p className="text-sm text-secondary font-medium">Lead Atmospheric Modeler & Meteorological Systems Scientist</p>
            <p className="text-xs text-text-tertiary flex items-center justify-center md:justify-start gap-1 mt-1">
              <Building2 className="w-3.5 h-3.5 text-text-secondary" />
              Ministry of Earth Sciences (MoES) · CPCB Coupled Command
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 my-5">
          <div className="p-3 rounded-xl bg-surface-container-high/60 border border-white/5">
            <div className="flex items-center gap-2 text-xs text-text-tertiary font-mono uppercase">
              <Cpu className="w-4 h-4 text-secondary" /> Core Specialty
            </div>
            <p className="text-sm font-semibold text-text-primary mt-1">WRF-Chem & Aerosol-Radiation Feedback</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-high/60 border border-white/5">
            <div className="flex items-center gap-2 text-xs text-text-tertiary font-mono uppercase">
              <Globe className="w-4 h-4 text-tertiary" /> Domain Focus
            </div>
            <p className="text-sm font-semibold text-text-primary mt-1">Indo-Gangetic Plain Inversion Physics</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest/80 border border-white/5 text-xs text-text-secondary space-y-2">
          <p className="font-semibold text-text-primary flex items-center gap-2">
            <Award className="w-4 h-4 text-secondary" /> Official Credential & Mission Summary
          </p>
          <p>
            Leading the development of AeroSense-Delhi's two-way coupled weather-chemistry forecasting surrogate engine. Focused on early warning detection of boundary layer inversion collapse and stubble plume advection over NCR.
          </p>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10 text-xs text-text-tertiary">
          <span className="flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-secondary" /> raman.sharma@moes.gov.in
          </span>
          <span className="font-mono text-tertiary">SIH Problem #26082 MoES</span>
        </div>
      </div>
    </div>
  );
}
