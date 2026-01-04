import { useState, useEffect } from 'react'
import { 
  BarChart3, PieChart, TrendingUp, Users, MessageSquare, 
  Map, Calendar, Download, RefreshCw, Loader2,
  CheckCircle2, AlertCircle, Clock, Shield
} from 'lucide-react'
import apiClient from '../api/client'

const Analytics = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/analytics/overview')
      setData(response.data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const logStats = data?.logs || []
  const totalSent = logStats.reduce((acc, curr) => acc + parseInt(curr.count), 0)
  const delivered = logStats.find(l => l.status === 'DELIVERED')?.count || 0
  const deliveryRate = totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center space-x-3">
            <BarChart3 className="text-primary" />
            <span>Campaign Analytics 📊</span>
          </h2>
          <p className="text-muted-foreground mt-1">Deep insights into your message delivery and engagement rates.</p>
        </div>
        <div className="flex space-x-3 w-full md:w-auto">
          <button 
            onClick={fetchAnalytics}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-muted text-white rounded-xl border border-border hover:bg-muted/80 transition-all font-bold text-sm"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm">
            <Download size={18} />
            <span>Export Report</span>
          </button>
        </div>
      </header>

      {/* KPI Overviews */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
         {loading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
               <Loader2 className="animate-spin text-primary" size={32} />
            </div>
         )}
         
         {[
           { label: 'Total Messages', value: totalSent.toLocaleString(), icon: MessageSquare, color: 'text-primary' },
           { label: 'Delivery Rate', value: `${deliveryRate}%`, icon: CheckCircle2, color: 'text-emerald-400' },
           { label: 'Active Campaigns', value: data?.summary?.activeCampaigns || 0, icon: TrendingUp, color: 'text-indigo-400' },
           { label: 'Avg Engagement', value: '72.4%', icon: Users, color: 'text-amber-400' },
         ].map((stat, i) => (
           <div key={i} className="bg-card border border-border p-6 rounded-2xl relative overflow-hidden group hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                 <div className={`p-2 rounded-lg bg-muted/50 ${stat.color}`}>
                    <stat.icon size={20} />
                 </div>
                 <div className="flex items-center space-x-1 text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <TrendingUp size={10} />
                    <span>+2.4%</span>
                 </div>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-white mt-1 italic tracking-tighter">{stat.value}</h3>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-muted/20">
                 <div className={`h-full truncate ${stat.color.replace('text', 'bg')}`} style={{ width: '65%' }}></div>
              </div>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Main Chart Section */}
         <div className="lg:col-span-2 space-y-8">
            <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden shadow-2xl">
               <div className="flex justify-between items-center mb-10">
                  <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                     <PieChart size={20} className="text-primary" />
                     <span>Message Delivery Trends</span>
                  </h3>
                  <div className="flex space-x-2 bg-muted/30 p-1 rounded-xl border border-border">
                     <button className="px-3 py-1.5 text-[10px] font-black text-white bg-primary rounded-lg shadow-lg">7D</button>
                     <button className="px-3 py-1.5 text-[10px] font-black text-muted-foreground hover:text-white transition-colors">30D</button>
                  </div>
               </div>
               
               {/* Chart Mockup with high aesthetic */}
               <div className="h-80 w-full relative group">
                  <div className="absolute inset-0 flex items-end justify-between px-4 pb-8 space-x-4">
                     {[45, 78, 52, 91, 64, 85, 42, 67, 95, 30, 55, 76].map((h, i) => (
                        <div key={i} className="flex-1 group/bar relative">
                           <div 
                              className="w-full bg-primary/20 rounded-t-lg group-hover/bar:bg-primary/40 transition-all duration-500 relative"
                              style={{ height: `${h}%` }}
                           >
                              <div 
                                 className="absolute bottom-0 w-full bg-primary rounded-t-lg shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all duration-1000" 
                                 style={{ height: loading ? '0%' : `${h*0.8}%` }}
                              ></div>
                           </div>
                           <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-all bg-white text-black text-[10px] font-black px-2 py-1 rounded shadow-xl whitespace-nowrap z-10 pointer-events-none">
                              {h}k msg
                           </div>
                        </div>
                     ))}
                  </div>
                  <div className="absolute left-0 bottom-0 w-full h-px bg-border/50"></div>
                  <div className="absolute left-0 top-0 h-full w-px bg-border/50"></div>
               </div>
               <div className="flex justify-between mt-4 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
                  <span>Dec 28</span>
                  <span>Dec 30</span>
                  <span>Jan 01</span>
                  <span>Jan 03</span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-card border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-6">Device Status Distribution</h4>
                  <div className="flex items-center justify-center py-8">
                     <div className="w-32 h-32 rounded-full border-[12px] border-primary border-t-transparent border-r-indigo-500 rotate-45 relative flex items-center justify-center">
                        <div className="absolute -rotate-45 text-center">
                           <p className="text-lg font-black text-white">100%</p>
                           <p className="text-[8px] text-muted-foreground uppercase font-bold">Uptime</p>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-3 mt-4">
                     <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter">
                        <div className="flex items-center space-x-2"><div className="w-2 h-2 rounded-full bg-primary"></div><span>ACTIVE</span></div>
                        <span className="text-white">5/5 DEVICES</span>
                     </div>
                  </div>
               </div>
               <div className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-6">
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Efficiency Metrics</h4>
                  <div className="space-y-4">
                     {[
                        { label: 'Avg Latency', value: '420ms', icon: Clock, color: 'text-indigo-400' },
                        { label: 'Auto-Resolved', value: '89.2%', icon: Shield, color: 'text-emerald-400' },
                        { label: 'Blocked Spam', value: '1,242', icon: AlertCircle, color: 'text-destructive' },
                     ].map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/50">
                           <div className="flex items-center space-x-3">
                              <m.icon size={16} className={m.color} />
                              <span className="text-[11px] font-bold text-muted-foreground uppercase">{m.label}</span>
                           </div>
                           <span className="text-sm font-black text-white italic">{m.value}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>

         {/* Sidebar Stats */}
         <div className="space-y-8">
            <div className="bg-gradient-to-br from-indigo-600/20 to-primary/20 border border-primary/20 rounded-3xl p-8 relative overflow-hidden group">
               <Map size={100} className="absolute bottom-[-20px] left-[-20px] text-white/5 group-hover:scale-110 transition-transform duration-700" />
               <div className="relative z-10">
                  <h3 className="text-lg font-bold text-white mb-4">Regional Distribution</h3>
                  <div className="space-y-4">
                     {[
                        { region: 'Jakarta', count: '42%', color: 'bg-primary' },
                        { region: 'West Java', count: '28%', color: 'bg-indigo-400' },
                        { region: 'Central Java', count: '15%', color: 'bg-indigo-600' },
                        { region: 'Other', count: '15%', color: 'bg-muted' },
                     ].map((r, i) => (
                        <div key={i} className="space-y-1.5">
                           <div className="flex justify-between text-[10px] font-bold uppercase">
                              <span className="text-muted-foreground">{r.region}</span>
                              <span className="text-white">{r.count}</span>
                           </div>
                           <div className="w-full bg-card h-1.5 rounded-full border border-border overflow-hidden">
                              <div className={`${r.color} h-full group-hover:shadow-[0_0_8px_rgba(139,92,246,0.3)] transition-all`} style={{ width: r.count }}></div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            <div className="bg-card border border-border rounded-3xl p-8 shadow-xl">
               <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-6 border-b border-border pb-4">Top Performing Keywords</h4>
               <div className="space-y-6">
                  {[
                     { keyword: 'PRICE', hits: '12.4k', growth: '+12%' },
                     { keyword: 'CATALOG', hits: '8.2k', growth: '+8%' },
                     { keyword: 'RESELLER', hits: '5.1k', growth: '+24%' },
                     { keyword: 'HELP', hits: '3.9k', growth: '-2%' },
                  ].map((k, i) => (
                     <div key={i} className="flex items-center justify-between group cursor-default">
                        <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-[10px] font-black text-white group-hover:bg-primary/20 group-hover:text-primary transition-all">
                              {i + 1}
                           </div>
                           <span className="text-xs font-bold text-white group-hover:translate-x-1 transition-transform">{k.keyword}</span>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-black text-white italic">{k.hits}</p>
                           <p className={`text-[9px] font-bold ${k.growth.startsWith('+') ? 'text-emerald-500' : 'text-destructive'}`}>{k.growth}</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}

export default Analytics
