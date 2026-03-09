'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Database, Users, Brain, Activity, Play, Upload, RefreshCw,
  LogOut, BarChart3, Globe, Zap, AlertTriangle, CheckCircle,
  XCircle, Clock, Loader2, ChevronRight, Terminal, Heart,
  TrendingUp, Cpu, Server, GitBranch, Eye
} from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: BarChart3  },
  { id: 'pipeline',  label: 'Pipeline',  icon: Activity   },
  { id: 'health',    label: 'Health',    icon: Heart      },
  { id: 'dataset',   label: 'Dataset',   icon: Database   },
  { id: 'scans',     label: 'Scans',     icon: Eye        },
  { id: 'users',     label: 'Users',     icon: Users      },
  { id: 'logs',      label: 'Logs',      icon: Terminal   },
]

const STATUS_COLORS: Record<string, string> = {
  pending:  '#f59e0b',
  running:  '#3b82f6',
  done:     '#10b981',
  failed:   '#f43f5e',
  completed:'#10b981',
}

const STATUS_ICONS: Record<string, any> = {
  pending:  Clock,
  running:  Loader2,
  done:     CheckCircle,
  failed:   XCircle,
  completed:CheckCircle,
}

function StatusBadge({ status }: { status: string }) {
  const Icon = STATUS_ICONS[status] || Clock
  const color = STATUS_COLORS[status] || '#6b7280'
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      <Icon className={`w-3 h-3 ${status === 'running' ? 'animate-spin' : ''}`}/>
      {status}
    </span>
  )
}

function StatCard({ label, value, sub, color, icon: Icon }: any) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-text-muted font-medium uppercase tracking-wide">{label}</p>
        {Icon && <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }}/>
        </div>}
      </div>
      <p className="text-3xl font-black text-text-primary">{value ?? '—'}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  )
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"/>
    </span>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [health, setHealth] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [triggering, setTriggering] = useState<string|null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const logsRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null)

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const [pipelineRes, logsRes, healthRes] = await Promise.all([
        fetch('/api/pipeline'),
        fetch('/api/logs'),
        fetch('/api/health'),
      ])
      if (pipelineRes.ok) setData(await pipelineRes.json())
      if (logsRes.ok)     setLogs((await logsRes.json()).logs || [])
      if (healthRes.ok)   setHealth((await healthRes.json()).runs || [])
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh every 15s when pipeline is running
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchData(true), 15000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, fetchData])

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current && tab === 'logs') {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs, tab])

  const triggerJob = async (job_type: string) => {
    setTriggering(job_type)
    try {
      await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger', job_type }),
      })
      await fetchData()
    } catch {}
    setTriggering(null)
  }

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/')
  }

  const jobs = data?.jobs || []
  const dataset = data?.dataset || []
  const scans = data?.scans || []
  const profiles = data?.profiles || []

  const runningJobs = jobs.filter((j: any) => j.status === 'running').length
  const pendingJobs = jobs.filter((j: any) => j.status === 'pending').length

  const datasetStats = dataset.reduce((a: any, i: any) => {
    const k = `${i.media_type}_${i.label}`; a[k] = (a[k] || 0) + 1; return a
  }, {})
  const pieData = Object.entries(datasetStats).map(([k, v]) => ({
    name: k.replace('_', ' '), value: v as number,
    color: k.includes('ai') ? '#f43f5e' : '#10b981'
  }))
  const dedupCount  = dataset.filter((i: any) => i.is_deduplicated).length
  const uploadedCount = dataset.filter((i: any) => i.hf_dataset_id && !i.hf_dataset_id.includes('queued')).length

  const recentJobTrend = [...jobs].slice(-20).map((j: any, i: number) => ({
    n: i, status: j.status,
    duration: j.duration_ms ? Math.round(j.duration_ms / 1000) : 0
  }))

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Shield className="w-8 h-8 text-white animate-pulse"/>
        </div>
        <p className="text-text-muted text-sm">Loading admin panel...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 bg-surface border-r border-border flex flex-col fixed h-full z-10">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Shield className="w-4 h-4 text-white"/>
            </div>
            <div>
              <p className="text-sm font-bold gradient-text">DETECTAI</p>
              <p className="text-[10px] text-text-muted">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${tab === t.id ? 'bg-primary/15 text-primary' : 'text-text-muted hover:text-text-primary hover:bg-white/5'}`}>
              <t.icon className="w-4 h-4"/>
              {t.label}
              {t.id === 'pipeline' && (runningJobs > 0) && (
                <span className="ml-auto flex items-center gap-1"><LiveDot/></span>
              )}
              {t.id === 'pipeline' && pendingJobs > 0 && (
                <span className="ml-auto text-[10px] bg-amber/20 text-amber px-1.5 py-0.5 rounded-full">{pendingJobs}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className={`w-2 h-2 rounded-full ${runningJobs > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-text-muted'}`}/>
            <span className="text-xs text-text-muted">{runningJobs > 0 ? `${runningJobs} job(s) running` : 'Idle'}</span>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-rose hover:bg-rose/10 transition-colors">
            <LogOut className="w-4 h-4"/> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-56 flex-1 p-6 space-y-6 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-text-primary capitalize">{tab}</h1>
            <p className="text-text-muted text-sm mt-0.5">
              {tab === 'pipeline' && `${jobs.length} total jobs · ${runningJobs} running · ${pendingJobs} pending`}
              {tab === 'dataset'  && `${dataset.length} items · ${dedupCount} deduplicated`}
              {tab === 'overview' && 'Real-time platform metrics'}
              {tab === 'health'   && `${health.length} recent pipeline runs`}
              {tab === 'logs'     && `${logs.length} recent log entries`}
              {tab === 'scans'    && `${scans.length} user scans`}
              {tab === 'users'    && `${profiles.length} registered users`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all
                ${autoRefresh ? 'border-emerald/40 text-emerald bg-emerald/10' : 'border-border text-text-muted'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald animate-pulse' : 'bg-text-muted'}`}/>
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
            <button onClick={() => fetchData()} disabled={refreshing}
              className="flex items-center gap-2 bg-surface border border-border hover:border-primary/40 text-text-secondary px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}/>
              Refresh
            </button>
          </div>
        </div>

        {/* ── OVERVIEW ──────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Jobs"     value={jobs.length}     icon={Cpu}      color="#7c3aed" sub={`${runningJobs} running`}/>
              <StatCard label="Dataset Items"  value={dataset.length}  icon={Database}  color="#10b981" sub={`${dedupCount} deduplicated`}/>
              <StatCard label="Total Scans"    value={scans.length}    icon={Brain}     color="#3b82f6" sub="user detection scans"/>
              <StatCard label="Users"          value={profiles.length} icon={Users}     color="#f59e0b" sub="registered accounts"/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Job status breakdown */}
              <div className="bg-surface border border-border rounded-2xl p-5">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary"/> Job Status Breakdown
                </h3>
                {['done','running','pending','failed'].map(s => {
                  const count = jobs.filter((j: any) => j.status === s).length
                  const pct = jobs.length ? Math.round((count/jobs.length)*100) : 0
                  return (
                    <div key={s} className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-text-secondary">{s}</span>
                        <span className="text-text-muted">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-surface-active rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: STATUS_COLORS[s] }}/>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Dataset distribution */}
              <div className="bg-surface border border-border rounded-2xl p-5">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald"/> Dataset Distribution
                </h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                        {pieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color}/>)}
                      </Pie>
                      <Tooltip formatter={(v: any, n: any) => [v, n]} contentStyle={{ background:'#1a1a2e', border:'1px solid #333', borderRadius:8, fontSize:12 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-text-muted text-sm py-12 text-center">No dataset items yet</p>}
              </div>
            </div>

            {/* Quick pipeline trigger */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber"/> Quick Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                {['scrape','clean','augment','upload'].map(type => (
                  <button key={type} onClick={() => triggerJob(type)} disabled={!!triggering}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:border-primary/40 text-sm text-text-secondary hover:text-text-primary transition-all disabled:opacity-50">
                    {triggering === type ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Play className="w-3.5 h-3.5 text-primary"/>}
                    Run {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PIPELINE ──────────────────────────────────────── */}
        {tab === 'pipeline' && (
          <div className="space-y-5">
            {/* Trigger buttons */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary"/> Trigger Jobs
                </h3>
                {runningJobs > 0 && <div className="flex items-center gap-2 text-xs text-emerald"><LiveDot/> Pipeline active</div>}
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { type:'scrape',  label:'Scrape Data',    icon: Globe,     color:'#10b981' },
                  { type:'clean',   label:'Clean & Dedupe', icon: Brain,     color:'#3b82f6' },
                  { type:'augment', label:'Augment',        icon: TrendingUp,color:'#f59e0b' },
                  { type:'upload',  label:'Upload to HF',   icon: Upload,    color:'#7c3aed' },
                ].map(({ type, label, icon: Icon, color }) => (
                  <button key={type} onClick={() => triggerJob(type)} disabled={!!triggering}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 hover:scale-105"
                    style={{ borderColor: `${color}40`, color, background: `${color}10` }}>
                    {triggering === type ? <Loader2 className="w-4 h-4 animate-spin"/> : <Icon className="w-4 h-4"/>}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Jobs table */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-text-primary">All Jobs</h3>
                <span className="text-xs text-text-muted">{jobs.length} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      {['Type','Status','Priority','Duration','Result','Created'].map(h => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.slice(0, 50).map((job: any) => (
                      <tr key={job.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-text-primary capitalize">{job.job_type}</span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={job.status}/></td>
                        <td className="px-4 py-3 text-text-muted">{job.priority}</td>
                        <td className="px-4 py-3 text-text-muted text-xs">
                          {job.duration_ms ? `${(job.duration_ms/1000).toFixed(1)}s` : '—'}
                        </td>
                        <td className="px-4 py-3 text-text-muted text-xs max-w-[200px] truncate">
                          {job.result ? JSON.stringify(job.result).slice(0,80) : job.error || '—'}
                        </td>
                        <td className="px-4 py-3 text-text-muted text-xs">
                          {new Date(job.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {jobs.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-text-muted">No jobs yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── HEALTH ──────────────────────────────────────── */}
        {tab === 'health' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Runs"   value={health.length}                                                     icon={GitBranch} color="#7c3aed"/>
              <StatCard label="Successful"   value={health.filter((r:any) => r.status==='completed').length}           icon={CheckCircle} color="#10b981"/>
              <StatCard label="Failed"       value={health.filter((r:any) => r.status==='failed').length}              icon={XCircle} color="#f43f5e"/>
              <StatCard label="Items Scraped" value={health.reduce((a:any,r:any) => a+(r.items_scraped||0), 0)}        icon={Database} color="#3b82f6"/>
            </div>

            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-text-primary">Pipeline Run History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      {['Run ID','Status','Jobs','Scraped','Cleaned','Uploaded','Duration','Started'].map(h => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {health.slice(0,30).map((run: any) => {
                      const dur = run.completed_at && run.started_at
                        ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)
                        : null
                      return (
                        <tr key={run.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 text-text-muted font-mono text-xs">{run.run_id?.slice(0,8)}...</td>
                          <td className="px-4 py-3"><StatusBadge status={run.status}/></td>
                          <td className="px-4 py-3 text-text-secondary">{run.jobs_processed || 0}/{(run.jobs_processed||0)+(run.jobs_failed||0)}</td>
                          <td className="px-4 py-3 text-emerald">{run.items_scraped || 0}</td>
                          <td className="px-4 py-3 text-primary">{run.items_cleaned || 0}</td>
                          <td className="px-4 py-3 text-secondary">{run.items_uploaded || 0}</td>
                          <td className="px-4 py-3 text-text-muted">{dur ? `${dur}s` : run.status==='running' ? '⏳' : '—'}</td>
                          <td className="px-4 py-3 text-text-muted text-xs">{new Date(run.started_at).toLocaleString()}</td>
                        </tr>
                      )
                    })}
                    {health.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-text-muted">No runs yet — pipeline will start automatically within 15 minutes</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── DATASET ──────────────────────────────────────── */}
        {tab === 'dataset' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Items"   value={dataset.length}  icon={Database}   color="#10b981"/>
              <StatCard label="Deduplicated"  value={dedupCount}      icon={CheckCircle} color="#3b82f6"/>
              <StatCard label="Uploaded to HF" value={uploadedCount}  icon={Upload}      color="#7c3aed"/>
              <StatCard label="Sources"       value={new Set(dataset.map((i:any)=>i.source_name)).size} icon={Globe} color="#f59e0b"/>
            </div>

            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex justify-between items-center">
                <h3 className="font-semibold text-text-primary">Dataset Items</h3>
                <span className="text-xs text-text-muted">Latest 200</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      {['Source','Type','Label','Split','Confidence','Dedup','HF','Created'].map(h => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.slice(0,100).map((item: any) => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-text-secondary font-medium">{item.source_name}</td>
                        <td className="px-4 py-3 text-text-muted">{item.media_type}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.label === 'ai' ? 'bg-rose/10 text-rose' : 'bg-emerald/10 text-emerald'}`}>
                            {item.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-muted text-xs">{item.split}</td>
                        <td className="px-4 py-3 text-text-muted">{item.confidence ? (item.confidence*100).toFixed(0)+'%' : '—'}</td>
                        <td className="px-4 py-3">{item.is_deduplicated ? <CheckCircle className="w-4 h-4 text-emerald"/> : <Clock className="w-4 h-4 text-amber"/>}</td>
                        <td className="px-4 py-3 text-text-muted text-xs">{item.hf_dataset_id ? '✓' : '—'}</td>
                        <td className="px-4 py-3 text-text-muted text-xs">{new Date(item.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {dataset.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-text-muted">No items yet — trigger a scrape job</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SCANS ──────────────────────────────────────── */}
        {tab === 'scans' && (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold text-text-primary">User Scans</h3></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">{['Media','Verdict','Confidence','User','Date'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {scans.slice(0,50).map((s: any) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-text-secondary capitalize">{s.media_type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.verdict==='AI'?'bg-rose/10 text-rose':s.verdict==='HUMAN'?'bg-emerald/10 text-emerald':'bg-amber/10 text-amber'}`}>{s.verdict}</span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{s.confidence_score ? `${(s.confidence_score*100).toFixed(0)}%` : '—'}</td>
                    <td className="px-4 py-3 text-text-muted text-xs font-mono">{s.user_id?.slice(0,12)}...</td>
                    <td className="px-4 py-3 text-text-muted text-xs">{new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {scans.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-text-muted">No scans yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── USERS ──────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold text-text-primary">Registered Users</h3></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">{['Name','Email','Plan','Scans','Joined'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {profiles.slice(0,50).map((u: any) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-text-primary">{u.display_name || '—'}</td>
                    <td className="px-4 py-3 text-text-muted">{u.email}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium capitalize">{u.plan || 'free'}</span></td>
                    <td className="px-4 py-3 text-text-muted">{u.scan_count || 0}</td>
                    <td className="px-4 py-3 text-text-muted text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {profiles.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-text-muted">No users yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── LOGS ──────────────────────────────────────── */}
        {tab === 'logs' && (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary"/> Live Pipeline Logs
                </h3>
                <div className="flex items-center gap-2">
                  {autoRefresh && <div className="flex items-center gap-1.5 text-xs text-emerald"><LiveDot/> Live</div>}
                  <span className="text-xs text-text-muted">{logs.length} entries</span>
                </div>
              </div>
              <div ref={logsRef} className="h-[500px] overflow-y-auto font-mono text-xs p-4 space-y-1 bg-black/20">
                {logs.length === 0 && (
                  <p className="text-text-muted py-4 text-center">No logs yet — pipeline will log here when running</p>
                )}
                {logs.map((log: any) => (
                  <div key={log.id} className={`flex gap-3 py-0.5 ${
                    log.level==='error' ? 'text-rose' : log.level==='warn' ? 'text-amber' : log.level==='debug' ? 'text-text-muted' : 'text-text-secondary'
                  }`}>
                    <span className="text-text-disabled shrink-0 w-20">{new Date(log.created_at).toLocaleTimeString()}</span>
                    <span className={`shrink-0 w-10 font-bold ${log.level==='error'?'text-rose':log.level==='warn'?'text-amber':'text-primary'}`}>
                      [{log.level?.toUpperCase().slice(0,4)}]
                    </span>
                    <span className="flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
