import { useState, useEffect } from 'react'
import { 
  CreditCard, CheckCircle2, QrCode, Zap, Shield, 
  Crown, Star, Package, Download, Terminal, X, ArrowRight,
  Loader2, AlertCircle
} from 'lucide-react'
import apiClient from '../api/client'
import useAuthStore from '../store/useAuthStore'
import { useLanguage } from '../i18n/index.jsx'

const Subscriptions = () => {
  const { user } = useAuthStore()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [userStatus, setUserStatus] = useState(null)
  const [paymentData, setPaymentData] = useState(null)
  const [paymentLoading, setPaymentLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [plansRes, statusRes] = await Promise.all([
        apiClient.get('/subscriptions/packages'),
        apiClient.get('/subscriptions/status')
      ])
      setPlans(plansRes.data)
      setUserStatus(statusRes.data)
    } catch (error) {
      console.error('Failed to fetch subscription data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleChoosePlan = async (plan) => {
    setSelectedPlan(plan)
    setPaymentLoading(true)
    setShowPaymentModal(true)
    try {
      const response = await apiClient.post('/subscriptions/choose', { packageId: plan.id })
      setPaymentData(response.data)
    } catch (error) {
      console.error('Failed to initiate payment:', error)
      setShowPaymentModal(false)
    } finally {
      setPaymentLoading(false)
    }
  }

  const getPlanIcon = (type) => {
    switch (type) {
      case 'FREE': return Package
      case 'PRO': return Zap
      case 'ENTERPRISE': return Crown
      default: return Star
    }
  }

  const getPlanColor = (type) => {
    switch (type) {
      case 'FREE': return 'bg-muted'
      case 'PRO': return 'bg-primary'
      case 'ENTERPRISE': return 'bg-indigo-600'
      default: return 'bg-muted'
    }
  }

  const { t } = useLanguage()

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center space-x-3">
            <CreditCard className="text-primary" />
            <span>{t('subscriptions.title')}</span>
          </h2>
          <p className="text-muted-foreground mt-1">{t('subscriptions.subtitle')}</p>
        </div>
        <div className="flex space-x-2 bg-card border border-border p-1.5 rounded-2xl">
           <button className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-xl shadow-lg">Monthly</button>
           <button className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-white transition-colors">Yearly (Save 20%)</button>
        </div>
      </header>

      {/* Current Subscription Status */}
      <div className="bg-gradient-to-r from-primary/10 to-indigo-600/10 border border-primary/20 rounded-3xl p-8 relative overflow-hidden group">
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
            <div className="flex items-center space-x-6">
               <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20 rotate-3">
                  <Star size={32} />
               </div>
               <div>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-wider">
                    {userStatus?.subscriptionType || 'FREE'} PLAN
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Status: <span className="text-primary font-bold">{userStatus?.subscriptionStatus || 'INACTIVE'}</span>
                    {userStatus?.subscriptionExpiresAt && (
                      <span className="ml-2">| Expires: {new Date(userStatus.subscriptionExpiresAt).toLocaleDateString()}</span>
                    )}
                  </p>
               </div>
            </div>
            <div className="flex space-x-4">
               <button className="px-6 py-3 bg-white text-black text-sm font-black rounded-xl hover:scale-[1.05] transition-transform">
                  Upgrade Now
               </button>
            </div>
         </div>
         <Star size={120} className="absolute top-[-20px] right-[-20px] text-white/5 group-hover:rotate-45 transition-transform duration-1000" />
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-3xl">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        )}
        
        {plans.map((plan) => {
          const Icon = getPlanIcon(plan.type)
          const color = getPlanColor(plan.type)
          const isCurrent = userStatus?.subscriptionType === plan.type

          return (
            <div key={plan.id} className={`flex flex-col rounded-3xl border border-border bg-card p-8 group relative ${
              plan.type === 'PRO' ? 'ring-2 ring-primary border-transparent' : ''
            }`}>
              {plan.type === 'PRO' && (
                 <div className="absolute top-0 right-0 p-3">
                    <span className="text-[10px] font-black uppercase bg-primary text-white px-3 py-1 rounded-full shadow-lg">Best Value</span>
                 </div>
              )}

              <div className="mb-8">
                 <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white mb-6 shadow-xl shadow-primary/20`}>
                    <Icon size={26} />
                 </div>
                 <h4 className="text-xl font-bold text-white mb-1">{plan.name}</h4>
                 <p className="text-xs text-muted-foreground">{plan.description}</p>
              </div>

              <div className="flex items-baseline mb-8">
                 <span className="text-3xl font-black text-white">IDR {parseInt(plan.price).toLocaleString()}</span>
                 <span className="text-xs text-muted-foreground ml-1">/ month</span>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                 {plan.features?.map((feature, i) => (
                    <li key={i} className="flex items-start space-x-3 text-xs text-muted-foreground font-medium">
                       <CheckCircle2 size={16} className="text-primary shrink-0" />
                       <span>{feature}</span>
                    </li>
                 ))}
              </ul>

              <button 
                 onClick={() => handleChoosePlan(plan)}
                 disabled={isCurrent}
                 className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                   isCurrent 
                   ? 'bg-muted text-muted-foreground cursor-default' 
                   : plan.type === 'PRO'
                   ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]' 
                   : 'bg-muted text-foreground hover:bg-muted/80'
                 }`}
              >
                 {isCurrent ? 'Current Plan' : 'Select Plan'}
              </button>
            </div>
          )
        })}
      </div>

      {/* QRIS Payment Modal */}
      {showPaymentModal && selectedPlan && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            <div className="absolute inset-0 bg-background/95 backdrop-blur-md" onClick={() => setShowPaymentModal(false)}></div>
            <div className="bg-card border border-border w-full max-w-xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden animate-in slide-in-from-bottom-20 duration-500">
               
               <div className="flex h-full min-h-[500px]">
                  {/* Left Column: Summary */}
                  <div className="w-[45%] bg-muted/30 p-10 border-r border-border hidden sm:flex flex-col">
                     <div className={`w-14 h-14 rounded-2xl ${getPlanColor(selectedPlan.type)} flex items-center justify-center text-white mb-6`}>
                        {(() => { const Icon = getPlanIcon(selectedPlan.type); return <Icon size={28} /> })()}
                     </div>
                     <h3 className="text-xl font-bold text-white mb-2">{selectedPlan.name}</h3>
                     <p className="text-[11px] text-muted-foreground leading-relaxed">{selectedPlan.description}</p>
                     
                     <div className="mt-10 pt-10 border-t border-border/50">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Payment</p>
                        <h4 className="text-3xl font-black text-white">IDR {parseInt(selectedPlan.price).toLocaleString()}</h4>
                     </div>

                     <div className="mt-auto pt-10 flex items-center space-x-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 w-fit px-3 py-1.5 rounded-xl">
                        <Shield size={12} />
                        <span>SECURE TRANSACTION</span>
                     </div>
                  </div>

                  {/* Right Column: QRIS */}
                  <div className="flex-1 p-10 flex flex-col items-center justify-center">
                     <div className="w-full flex justify-between items-center mb-10 sm:hidden">
                        <h3 className="text-lg font-bold text-white">Payment</h3>
                        <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-muted rounded-full text-muted-foreground">
                           <X size={20} />
                        </button>
                     </div>

                     <div className="text-center mb-8">
                        <p className="text-xs font-bold text-primary italic uppercase tracking-[3px] mb-2">SCAN TO PAY</p>
                        <h4 className="text-2xl font-black text-white italic underline decoration-primary decoration-4 underline-offset-8 uppercase italic">QRIS DYNAMIC</h4>
                     </div>

                     <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-primary/10 mb-8 transform hover:scale-[1.03] transition-transform cursor-pointer relative group">
                        <div className="w-48 h-48 bg-muted overflow-hidden rounded-xl border-4 border-white flex items-center justify-center">
                           {paymentLoading ? (
                             <Loader2 size={32} className="animate-spin text-primary" />
                           ) : paymentData?.qrisImage ? (
                             <img src={paymentData.qrisImage} alt="Payment QR" className="w-full h-full" />
                           ) : (
                              <div className="text-center p-4">
                                <AlertCircle size={24} className="text-destructive mx-auto mb-2" />
                                <p className="text-[10px] font-bold text-destructive uppercase">Failed to load QR</p>
                              </div>
                           )}
                        </div>
                     </div>

                     <div className="w-full space-y-4">
                        <div className="p-4 rounded-2xl bg-muted/50 border border-border flex items-center justify-between">
                           <div className="flex items-center space-x-3">
                              <Terminal size={16} className="text-muted-foreground" />
                              <span className="text-[10px] font-bold text-white">ID: {paymentData?.transactionId?.split('-')[0] || '...'}</span>
                           </div>
                           <span className="text-[10px] font-bold text-amber-500 animate-pulse">WAITING</span>
                        </div>
                        <p className="text-center text-[10px] text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                           Payment will be automatically detected. Please do not close this window.
                        </p>
                     </div>

                     <button 
                        onClick={() => setShowPaymentModal(false)}
                        className="mt-8 text-xs font-bold text-muted-foreground hover:text-white transition-colors flex items-center space-x-2"
                     >
                        <span>Cancel Transaction</span>
                        <ArrowRight size={14} />
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  )
}

export default Subscriptions
