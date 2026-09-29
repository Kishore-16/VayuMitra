'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Bot,
  User,
  X,
  Send,
  Volume2,
  VolumeX,
  RotateCcw,
  Minimize2,
  Maximize2,
  Mic,
  MicOff,
  Flame,
  CloudFog,
  ShieldAlert,
  SlidersHorizontal,
  Compass,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AerosolFeedbackDiagnostic, CPCBStation, HourlyForecastPoint, InversionSounding, TabId } from '@/lib/types'
import type { GrapStage } from '@/lib/aqi'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  source?: 'openrouter' | 'moes_expert_engine'
}

interface VayuMitraAssistantProps {
  point: HourlyForecastPoint
  sounding: InversionSounding
  feedback: AerosolFeedbackDiagnostic
  hour: number
  tab: TabId
  station: CPCBStation | null
  stations: CPCBStation[]
  fires: any[]
  trajectories: any[]
  anomalies: any[]
  stage: GrapStage
}

const PRESET_PROMPTS = [
  { label: 'Why is AQI high at night?', icon: CloudFog, prompt: 'Why is AQI projected to be higher during nocturnal hours?' },
  { label: 'Explain Thermal Inversion', icon: Info, prompt: 'Explain atmospheric thermal inversion sounding profile simply with a real world analogy.' },
  { label: 'Stubble Smoke Arrival ETA', icon: Flame, prompt: 'What is the current status of Punjab/Haryana stubble burning fires and smoke ETA to Delhi?' },
  { label: 'GRAP Rules in Force', icon: ShieldAlert, prompt: 'What statutory GRAP emergency restrictions apply to citizens and vehicles right now?' },
  { label: 'Sandbox Guidance', icon: SlidersHorizontal, prompt: 'How can I use the What-If Sandbox to calculate avoided PM2.5 concentrations?' },
]

export function VayuMitraAssistant({
  point,
  sounding,
  feedback,
  hour,
  tab,
  station,
  stations,
  fires,
  trajectories,
  anomalies,
  stage,
}: VayuMitraAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initial welcome message
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome_msg',
      role: 'assistant',
      content: `### 🍃 **Namaste! I am VayuMitra — Your MoES AI Assistant**

I am grounded directly in live weather, OpenMeteo, WAQI, CAMS, and 72-hour coupled forecast data for Delhi-NCR.

#### 📊 **Current Live Pulse (Hour +${hour}h)**:
* **Air Quality**: AQI **${point.aqi}** (${point.aqi_category}) · $PM_{2.5}$: **${point.pm25} µg/m³**
* **Planetary Boundary Layer**: **${point.pbl_height_m} m AGL**
* **Active GRAP Enforcement**: **${stage.name}**

Ask me anything about air quality, atmospheric soundings, stubble fire plumes, or GRAP directives!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'moes_expert_engine',
    },
  ])

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, loading])

  // Speak response using Web Speech API if voice is toggled
  const speakText = (text: string, msgId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel()
      setSpeakingMsgId(null)
      return
    }

    window.speechSynthesis.cancel()
    
    // Clean markdown symbols for speech synthesis
    const cleanText = text
      .replace(/#{1,6}\s?/g, '')
      .replace(/\*{1,2}/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[\$\|>-]/g, ' ')

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    
    utterance.onend = () => setSpeakingMsgId(null)
    utterance.onerror = () => setSpeakingMsgId(null)

    setSpeakingMsgId(msgId)
    window.speechSynthesis.speak(utterance)
  }

  // Voice dictation / Speech Recognition
  const toggleListening = () => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice dictation is not supported in this browser.')
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognition.start()
  }

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input
    if (!query.trim() || loading) return

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput('')
    setLoading(true)

    // Build context object matching strict types
    const context = {
      tab,
      hour,
      point,
      sounding,
      feedback,
      grapStage: stage,
      station: station ?? undefined,
      firesCount: fires.length,
      totalFrpMw: Math.round(fires.reduce((acc, f) => acc + (f.frp || f.mean_frp_mw || 0), 0)),
      trajectoriesCount: trajectories.length,
      anomaliesCount: anomalies.length,
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          context,
        }),
      })

      if (!res.ok) throw new Error('Failed to get response')

      const data = await res.json()
      const assistantMsg: Message = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'I am having trouble analyzing the data right now.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source,
      }

      setMessages((prev) => [...prev, assistantMsg])

      // Auto read if voice mode enabled
      if (voiceEnabled) {
        speakText(assistantMsg.content, assistantMsg.id)
      }
    } catch (err) {
      console.error(err)
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: '⚠️ Unable to connect to VayuMitra engine. Please check your internet connection or backend service.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Format simple markdown into JSX elements
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n')
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="my-2 text-base font-bold text-sky">{parseInline(line.replace('### ', ''))}</h3>
      }
      if (line.startsWith('#### ')) {
        return <h4 key={idx} className="my-1.5 text-sm font-semibold text-emerald">{parseInline(line.replace('#### ', ''))}</h4>
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="my-2 border-l-2 border-sky/50 bg-sky/5 px-3 py-2 text-xs italic text-slate-200 rounded-r-md">
            {parseInline(line.replace('> ', ''))}
          </blockquote>
        )
      }
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const itemText = line.trim().replace(/^[\*\-]\s*/, '')
        return (
          <div key={idx} className="my-1 flex items-start gap-2 text-xs">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-sky" />
            <span>{parseInline(itemText)}</span>
          </div>
        )
      }
      if (/^\d+\.\s/.test(line.trim())) {
        return (
          <div key={idx} className="my-1 flex items-start gap-2 text-xs">
            <span className="font-semibold text-sky">{line.trim().match(/^\d+\./)?.[0]}</span>
            <span>{parseInline(line.trim().replace(/^\d+\.\s*/, ''))}</span>
          </div>
        )
      }
      if (!line.trim()) return <div key={idx} className="h-1.5" />

      return <p key={idx} className="my-1 text-xs leading-relaxed text-slate-200">{parseInline(line)}</p>
    })
  }

  const parseInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\$\w+\$?)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[11px] text-sky">{part.slice(1, -1)}</code>
      }
      return part
    })
  }

  return (
    <>
      {/* 🍃 Sticky Floating Launcher Badge */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
          {/* Quick Dynamic Badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-sky/30 bg-[#0b1329]/90 px-3 py-1.5 text-xs font-semibold text-sky shadow-xl backdrop-blur-md animate-bounce">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald" />
            </span>
            <span>VayuMitra AI</span>
            <span className="text-[10px] text-slate-400">· {stage.name.replace('Stage ', '')}</span>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-3 rounded-full bg-gradient-to-r from-emerald to-sky p-3.5 text-slate-950 shadow-2xl shadow-emerald/30 transition-all hover:scale-105 hover:brightness-110 active:scale-95"
            aria-label="Open VayuMitra AI Assistant"
          >
            <div className="relative flex items-center justify-center">
              <Sparkles className="size-6 text-slate-950 animate-pulse" />
            </div>
            <span className="pr-1 text-sm font-extrabold tracking-wide text-slate-950">Ask VayuMitra</span>
          </button>
        </div>
      )}

      {/* 📱 Floating Glassmorphism Chat Drawer */}
      {isOpen && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-[9999] flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#091022]/95 shadow-2xl backdrop-blur-2xl transition-all duration-300',
            isExpanded ? 'h-[85vh] w-[92vw] max-w-4xl sm:w-[650px]' : 'h-[620px] w-[92vw] max-w-md sm:w-[420px]'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-[#0d162d]/90 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald to-sky text-slate-950 shadow-md">
                <Bot className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-extrabold tracking-wide text-white">VayuMitra AI</h2>
                  <span className="rounded bg-emerald/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald">MoES 15+ yrs</span>
                </div>
                <p className="text-[11px] text-slate-400">Atmospheric & AQI Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                title={voiceEnabled ? 'Mute AI Voice' : 'Enable AI Voice readout'}
                className={cn(
                  'rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white',
                  voiceEnabled && 'bg-emerald/20 text-emerald'
                )}
              >
                {voiceEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse Drawer' : 'Expand Drawer'}
                className="hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white sm:block"
              >
                {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
              <button
                onClick={() => {
                  setMessages([
                    {
                      id: `reset_${Date.now()}`,
                      role: 'assistant',
                      content: 'Conversation reset. How may I assist you with Delhi-NCR air quality today?',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ])
                }}
                title="Reset conversation"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Active Context Bar */}
          <div className="flex flex-wrap items-center justify-between gap-1 border-b border-white/5 bg-[#070c1a] px-3 py-1.5 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Compass className="size-3 text-sky" />
              <span>View: <strong className="text-white">{tab.toUpperCase()}</strong></span>
              <span>· Hour <strong className="text-white">+{hour}h</strong></span>
              {station && <span>· Station: <strong className="text-sky">{station.name}</strong></span>}
            </div>
            <div className="flex items-center gap-1 font-semibold text-emerald">
              <span className="size-1.5 rounded-full bg-emerald animate-pulse" />
              <span>Live Grounded</span>
            </div>
          </div>

          {/* Message List */}
          <div className="scrollbar-thin flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex flex-col gap-1', msg.role === 'user' ? 'items-end' : 'items-start')}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                  {msg.role === 'user' ? (
                    <>
                      <span>You</span>
                      <User className="size-3 text-sky" />
                    </>
                  ) : (
                    <>
                      <Bot className="size-3 text-emerald" />
                      <span>VayuMitra</span>
                      {msg.source && (
                        <span className="rounded bg-sky/10 px-1 text-[9px] text-sky">
                          {msg.source === 'openrouter' ? 'LLM' : 'MoES Engine'}
                        </span>
                      )}
                    </>
                  )}
                  <span>· {msg.timestamp}</span>
                </div>

                <div
                  className={cn(
                    'relative max-w-[90%] rounded-2xl p-3 text-xs leading-relaxed shadow-lg',
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-sky/90 to-indigo/90 text-white rounded-br-xs'
                      : 'border border-white/10 bg-[#0f1933]/90 text-slate-100 rounded-bl-xs'
                  )}
                >
                  {renderMarkdown(msg.content)}

                  {msg.role === 'assistant' && (
                    <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-1.5 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 text-emerald font-medium">
                        <CheckCircle2 className="size-3" /> Grounded in OpenMeteo & WRF-Chem
                      </span>
                      <button
                        onClick={() => speakText(msg.content, msg.id)}
                        className={cn(
                          'flex items-center gap-1 rounded px-1.5 py-0.5 transition hover:bg-white/10',
                          speakingMsgId === msg.id && 'text-emerald font-bold'
                        )}
                      >
                        <Volume2 className="size-3" />
                        {speakingMsgId === msg.id ? 'Stop' : 'Listen'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex flex-col gap-1 items-start">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Bot className="size-3 text-emerald animate-spin" />
                  <span>VayuMitra analyzing atmospheric profile…</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0f1933]/90 p-3 text-xs text-slate-400 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-sky animate-ping" />
                  <span>Processing soundings & forecast metrics…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Preset Prompts */}
          <div className="border-t border-white/5 bg-[#070c1a]/80 p-2">
            <p className="mb-1.5 px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Suggested Questions</p>
            <div className="scrollbar-thin flex gap-1.5 overflow-x-auto pb-1">
              {PRESET_PROMPTS.map((item, idx) => {
                const Icon = item.icon
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.prompt)}
                    disabled={loading}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-[#0e172e] px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-sky/40 hover:bg-sky/10 hover:text-white"
                  >
                    <Icon className="size-3 text-sky" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-white/10 bg-[#0d162d] p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleListening}
                title="Voice Dictation"
                className={cn(
                  'rounded-xl border border-white/10 p-2.5 text-slate-400 transition hover:bg-white/10 hover:text-white',
                  isListening && 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                )}
              >
                {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask VayuMitra about air quality, inversion, fires..."
                disabled={loading}
                className="flex-1 rounded-xl border border-white/10 bg-[#060b17] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-sky focus:outline-none focus:ring-1 focus:ring-sky"
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald to-sky text-slate-950 shadow-md transition disabled:opacity-40 hover:brightness-110"
              >
                <Send className="size-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
