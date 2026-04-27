'use client'
import { Check, X, Minus, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'

const FEATURES = [
  { name: 'Text AI Detection',           aiscern: true,    gptzero: true,    turnitin: true,         originality: true  },
  { name: 'Image Deepfake Detection',     aiscern: true,    gptzero: false,   turnitin: false,        originality: false },
  { name: 'Audio AI Detection',           aiscern: true,    gptzero: false,   turnitin: false,        originality: false },
  { name: 'Video Deepfake Detection',     aiscern: true,    gptzero: false,   turnitin: false,        originality: false },
  { name: 'Multi-modal Batch Analysis',   aiscern: true,    gptzero: false,   turnitin: 'partial',    originality: false },
  { name: 'Sentence-Level Heatmap',       aiscern: true,    gptzero: true,    turnitin: false,        originality: true  },
  { name: 'API Access',                   aiscern: true,    gptzero: true,    turnitin: true,         originality: true  },
  { name: 'Free Tier Available',          aiscern: true,    gptzero: true,    turnitin: false,        originality: false },
  { name: 'Starting Price',               aiscern: 'Free',  gptzero: '$10/mo',turnitin: '$30/mo',     originality: '$14.95/mo' },
  { name: 'Text Detection Accuracy',      aiscern: '85%+',  gptzero: '98%',   turnitin: '85%',        originality: '99%' },
  { name: 'Real-time Detection',          aiscern: true,    gptzero: true,    turnitin: false,        originality: true  },
  { name: 'URL Scanner',                  aiscern: true,    gptzero: false,   turnitin: false,        originality: true  },
  { name: 'PDF Export',                   aiscern: true,    gptzero: true,    turnitin: true,         originality: true  },
]

const COLS = [
  { key: 'aiscern',     label: 'Aiscern',      highlight: true  },
  { key: 'gptzero',     label: 'GPTZero',      highlight: false },
  { key: 'turnitin',    label: 'Turnitin',     highlight: false },
  { key: 'originality', label: 'Originality',  highlight: false },
]

function CellValue({ v, isDetectai }: { v: boolean | string; isDetectai?: boolean }) {
  if (typeof v === 'string') return (
    <span className={`text-sm font-semibold ${isDetectai ? 'text-primary' : 'text-text-secondary'}`}>{v}</span>
  )
  if (v === true)  return <Check className={`w-5 h-5 mx-auto ${isDetectai ? 'text-primary' : 'text-green-400'}`} />
  if (v === false) return <X className="w-4 h-4 mx-auto text-text-muted/30" />
  return <Minus className="w-4 h-4 mx-auto text-amber-400" />
}

/** Mobile card — shows Aiscern vs one competitor */
function MobileCompareCard({ col }: { col: typeof COLS[0] }) {
  const [expanded, setExpanded] = useState(false)
  const PREVIEW_COUNT = 5
  const rows = FEATURES.slice(0, expanded ? FEATURES.length : PREVIEW_COUNT)

  return (
    <div className={`rounded-2xl border overflow-hidden ${col.highlight ? 'border-primary/30 shadow-lg shadow-primary/10' : 'border-border'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${col.highlight ? 'bg-primary/10' : 'bg-surface'}`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${col.highlight ? 'text-primary' : 'text-text-secondary'}`}>
            {col.label}
          </span>
          {col.highlight && (
            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">Our pick</span>
          )}
        </div>
        <span className="text-xs text-text-muted">vs Aiscern</span>
      </div>

      {/* Feature rows */}
      <div className="divide-y divide-border/40">
        {rows.map(row => {
          const aiscernVal = (row as any)['aiscern']
          const colVal     = (row as any)[col.key]
          return (
            <div key={row.name} className="flex items-center justify-between px-4 py-2.5 text-xs">
              <span className="text-text-muted flex-1 pr-2">{row.name}</span>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="flex flex-col items-center gap-0.5 w-12">
                  <span className="text-[9px] text-primary/60 font-bold uppercase">Us</span>
                  <CellValue v={aiscernVal} isDetectai />
                </div>
                <div className="flex flex-col items-center gap-0.5 w-12">
                  <span className="text-[9px] text-text-muted/60 font-bold uppercase">{col.label.slice(0,6)}</span>
                  <CellValue v={colVal} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Expand toggle */}
      {FEATURES.length > PREVIEW_COUNT && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-text-muted hover:text-primary transition-colors border-t border-border/40 font-medium"
        >
          {expanded ? 'Show less' : `Show ${FEATURES.length - PREVIEW_COUNT} more`}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  )
}

export default function ComparisonTable() {
  return (
    <section className="py-12 sm:py-20 px-4">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-3"
        >
          <div className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest">
            Competitive Edge
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black">
            The <span className="gradient-text">Only Platform</span> That Detects All 4 Media Types
          </h2>
          <p className="text-text-muted text-sm sm:text-base max-w-xl mx-auto">
            While others focus on text alone, Aiscern covers text, images, audio, and video — all in one platform.
          </p>
        </motion.div>

        {/* ── Mobile: stacked competitor cards ── */}
        <div className="sm:hidden space-y-3">
          {COLS.filter(c => !c.highlight).map(col => (
            <MobileCompareCard key={col.key} col={col} />
          ))}
        </div>

        {/* ── Desktop: full comparison table ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="hidden sm:block overflow-x-auto rounded-2xl border border-border"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-text-muted text-sm font-medium w-52">Feature</th>
                {COLS.map(col => (
                  <th key={col.key} className={`p-4 text-center ${col.highlight ? 'bg-primary/10 border-x border-primary/20' : ''}`}>
                    <span className={`text-sm font-bold ${col.highlight ? 'text-primary' : 'text-text-secondary'}`}>
                      {col.label}
                    </span>
                    {col.highlight && (
                      <div className="text-xs text-primary/60 font-normal mt-0.5">✦ Our pick</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((row, i) => (
                <tr key={row.name} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-surface/30' : ''}`}>
                  <td className="p-4 text-sm text-text-secondary">{row.name}</td>
                  {COLS.map(col => (
                    <td key={col.key} className={`p-4 text-center ${col.highlight ? 'bg-primary/5 border-x border-primary/10' : ''}`}>
                      <CellValue v={(row as any)[col.key]} isDetectai={col.highlight} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <p className="text-center text-xs text-text-muted">
          * Comparison based on publicly available pricing and features as of 2026. Partial = limited functionality.
        </p>
      </div>
    </section>
  )
}
