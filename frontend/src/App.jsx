import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { 
  Layout, Users, MessageSquare, PieChart, Bot, Settings, LogOut, 
  ChevronRight, Bell, Search, Menu, X, ShieldCheck, GitBranch,
  Smartphone, CreditCard, Plus, Loader2, Eye, EyeOff
} from 'lucide-react'
import useAuthStore from './store/useAuthStore'
import apiClient from './api/client'
import LanguageSwitcher from './components/LanguageSwitcher'
import { useLanguage } from './i18n/index.jsx'

// Pages
import AIAgent from './pages/AIAgent'
import Contacts from './pages/Contacts'

import Analytics from './pages/Analytics'
import Devices from './pages/Devices'
import Subscriptions from './pages/Subscriptions'

const Dashboard = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchOverview = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/analytics/overview')
      setData(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard overview:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [])

  const logStats = data?.logs || []
  const totalSent = logStats.reduce((acc, curr) => acc + parseInt(curr.count), 0)
  const delivered = logStats.find(l => l.status === 'DELIVERED')?.count || 0
  const deliveryRate = totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center space-x-3">
            <span>Dashboard Overview ⚡</span>
          </h2>
          <p className="text-muted-foreground mt-1">Real-time pulse of your automated marketing machine.</p>
        </div>
      </header>


      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}
        {[
          { label: 'Total Messages', value: totalSent.toLocaleString(), change: '+12%', icon: MessageSquare, color: 'primary' },
          { label: 'Active Contacts', value: data?.summary?.totalContacts || 0, change: '+5.4%', icon: Users, color: 'indigo-400' },
          { label: 'AI Responses', value: '89%', change: '+2.1%', icon: Bot, color: 'emerald-400' },
          { label: 'Delivery Rate', value: `${deliveryRate}%`, change: '+0.5%', icon: PieChart, color: 'amber-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border p-6 rounded-2xl hover:border-primary/50 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon size={56} />
            </div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{stat.label}</p>
            <div className="flex items-baseline justify-between mt-2">
              <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                stat.change.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
              }`}>
                {stat.change}
              </span>
            </div>
            <div className="w-full bg-muted h-1 rounded-full mt-4 overflow-hidden">
              <div className="bg-primary h-full group-hover:w-full transition-all duration-700" style={{ width: '60%' }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 gap-8">
        
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-6 text-white">Recent Activities</h3>
          <div className="space-y-6">
            {[
              { title: 'New Contact Added', desc: '+62 812 3456 7890 mapped', time: '2 mins ago', icon: Users },
              { title: 'Campaign Completed', desc: '"Flash Sale" finished', time: '15 mins ago', icon: MessageSquare },
              { title: 'AI Escalation', desc: 'Case #4521 transferred', time: '1 hour ago', icon: Bot },
              { title: 'New Device Linked', desc: 'iPhone 15 Pro - Connected', time: '3 hours ago', icon: Smartphone },
            ].map((activity, i) => (
              <div key={i} className="flex space-x-4 items-start pb-4 border-b border-border last:border-0 border-opacity-30">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 border border-border">
                  <activity.icon size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{activity.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{activity.desc}</p>
                  <p className="text-[9px] text-muted-foreground/50 mt-1 uppercase font-bold tracking-tighter">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-[10px] font-bold text-primary uppercase tracking-widest hover:underline pt-4 border-t border-border border-opacity-20 transition-all">
            View All Activities
          </button>
        </div>
      </div>
    </div>
  )
}

const Login = () => {
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@zevitsoft.com')
  const [password, setPassword] = useState('password')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      console.log('Attempting login...')
      const response = await apiClient.post('/auth/login', { email, password })
      console.log('Login response:', response.data)
      login(response.data.token, response.data.user)
      console.log('Login state updated, navigating to dashboard...')
      navigate('/')
    } catch (err) {
      console.error('Login error:', err)
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

      <div className="w-full max-w-md bg-card border border-border p-10 rounded-3xl shadow-2xl relative z-10 glass border-opacity-50">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/30">
            <ShieldCheck className="text-primary" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ZevitsCRM</h1>
          <p className="text-muted-foreground mt-2 font-medium">Sign in to manage your automation</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium flex items-center space-x-2">
            <X size={16} />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30" 
              placeholder="admin@zevitsoft.com"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Password</label>
              <a href="#" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">Forgot password?</a>
            </div>
            <input 
              type={showPassword ? 'text' : 'password'} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30" 
              placeholder="••••••••"
              required
            />
            <div className="flex items-center space-x-2 mt-2">
              <input 
                type="checkbox" 
                id="show-password"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
                className="w-4 h-4 rounded border-border bg-muted/30 text-primary focus:ring-primary/50 transition-all cursor-pointer"
              />
              <label htmlFor="show-password" className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-white transition-colors">
                Show password
              </label>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-black py-4 rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all mt-4 uppercase tracking-[2px] text-sm flex items-center justify-center space-x-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <span>Sign In</span>}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground font-medium">
          Don't have an account? <a href="#" className="text-primary font-bold hover:underline">Sign Up</a>
        </p>
      </div>
    </div>
  )
}

const AppLayout = ({ children }) => {
  const { logout, user } = useAuthStore()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const location = useLocation()
  const { t } = useLanguage()

  const sidebarItems = [
    { id: 'dashboard', icon: Layout, label: t('navigation.dashboard'), path: '/' },
    { id: 'devices', icon: Smartphone, label: t('navigation.devices'), path: '/devices' },
    { id: 'ai-agent', icon: Bot, label: t('navigation.aiAgent'), path: '/ai-agent' },
    { id: 'contacts', icon: Users, label: t('navigation.contacts'), path: '/contacts' },

    { id: 'analytics', icon: PieChart, label: t('navigation.analytics'), path: '/analytics' },
    { id: 'subscriptions', icon: CreditCard, label: t('navigation.subscriptions'), path: '/subscriptions' },
    { id: 'settings', icon: Settings, label: t('navigation.settings'), path: '/settings' },
  ]

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-24'} border-r border-border bg-card flex flex-col transition-all duration-500 ease-out z-20`}>
        <div className="p-8 flex items-center justify-between">
          {isSidebarOpen ? (
            <h1 className="text-xl font-bold gradient-text truncate tracking-tighter">ZevitsCRM</h1>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black mx-auto">C</div>
          )}
        </div>
        
        <nav className="flex-1 px-4 space-y-2.5 mt-4">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center ${isSidebarOpen ? 'space-x-3 px-4' : 'justify-center'} py-3.5 rounded-2xl transition-all group relative ${
                  isActive 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-white' : 'group-hover:text-primary transition-colors'} />
                {isSidebarOpen && <span className="font-bold text-sm">{item.label}</span>}
                {isActive && isSidebarOpen && <div className="absolute left-[-16px] w-1.5 h-6 bg-primary rounded-r-full"></div>}
              </Link>
            )
          })}
        </nav>

        <div className="p-6 border-t border-border mt-auto">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-3 rounded-xl border border-border hover:bg-muted transition-all text-muted-foreground mb-4"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center p-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors group"
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <header className="h-24 border-b border-border bg-card/30 backdrop-blur-xl flex items-center justify-between px-12 z-10 border-opacity-50">
          <div className="flex items-center space-x-6 bg-muted/20 px-6 py-3 rounded-2xl w-[450px] border border-border/50 focus-within:border-primary/50 transition-all group shadow-inner">
            <Search size={18} className="text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input 
              type="text" 
              placeholder="Search contacts, campaigns, or knowledge..." 
              className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-muted-foreground font-medium"
            />
          </div>
          
          <div className="flex items-center space-x-8">
            <LanguageSwitcher compact />
            <button className="p-3 rounded-2xl bg-muted/30 hover:bg-muted transition-all relative group border border-border">
              <Bell size={20} className="text-muted-foreground group-hover:text-foreground" />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background animate-pulse"></span>
            </button>
            <div className="flex items-center space-x-4 pl-8 border-l border-border">
              <div className="text-right hidden md:block">
                <p className="text-sm font-black text-white tracking-tight uppercase">{user?.name || 'Admin Account'}</p>
                <p className="text-[10px] text-primary font-black tracking-[3px] uppercase opacity-80">{user?.role === 'admin' ? 'SYSTEM ADMIN' : 'ENTERPRISE'}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 p-0.5 shadow-xl shadow-primary/30 transition-all cursor-pointer hover:rotate-3">
                <div className="w-full h-full rounded-[14px] bg-card flex items-center justify-center overflow-hidden">
                   <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&background=181825&color=8b5cf6&bold=true`} alt="User" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 relative z-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  const { isAuthenticated, setUser } = useAuthStore()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const checkMe = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const response = await apiClient.get('/auth/me')
          setUser(response.data)
        } catch (err) {
          console.error('Auth verification failed:', err)
          if (err.response?.status === 401) {
            localStorage.removeItem('token')
          }
        }
      }
      setCheckingAuth(false)
    }
    checkMe()
  }, [setUser])

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route 
        path="/*" 
        element={
          isAuthenticated ? (
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/devices" element={<Devices />} />
                <Route path="/ai-agent" element={<AIAgent />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/settings" element={<div className="text-white text-3xl font-black italic opacity-10 flex h-full items-center justify-center uppercase tracking-[20px]">Construction</div>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppLayout>
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
    </Routes>
  )
}

export default App
