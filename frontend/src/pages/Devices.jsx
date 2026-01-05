import { useState, useEffect } from 'react'
import { 
  Smartphone, Plus, RefreshCw, CheckCircle2, 
  AlertCircle, Trash2, X, Loader2, QrCode, 
  Wifi, WifiOff, ShieldCheck, Zap, Eye, EyeOff, MessageSquare
} from 'lucide-react'
import apiClient from '../api/client'
import { useLanguage } from '../i18n/index.jsx'

const Devices = () => {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [qrCode, setQrCode] = useState(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [alias, setAlias] = useState('')
  const [stats, setStats] = useState({ totalMessages: 0, health: 'UNKNOWN' })

  /* Dialog State */
  const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null })

  const showAlert = (title, message) => {
    setDialog({ isOpen: true, type: 'alert', title, message, onConfirm: null })
  }

  const showConfirm = (title, message, onConfirm) => {
    setDialog({ isOpen: true, type: 'confirm', title, message, onConfirm })
  }

  const closeDialog = () => {
    setDialog(prev => ({ ...prev, isOpen: false }))
  }

  // Recent messages state
  const [recentMessages, setRecentMessages] = useState([])

  const fetchStats = async () => {
    try {
      const analyticsRes = await apiClient.get('/analytics/overview');
      
      // Try to check health via the API
      let healthStatus = 'HEALTHY';
      try {
        const healthRes = await fetch(apiClient.defaults.baseURL.replace('/api', '') + '/health');
        healthStatus = healthRes.ok ? 'HEALTHY' : 'DEGRADED';
      } catch {
        // If fetch fails (CORS or network), try via apiClient
        try {
          await apiClient.get('/health');
          healthStatus = 'HEALTHY';
        } catch {
          healthStatus = 'DEGRADED';
        }
      }
      
      setStats({
        totalMessages: analyticsRes.data.summary.totalMessages || 0,
        health: healthStatus
      });
    } catch (error) {
       console.error('Failed to fetch stats:', error);
       setStats(prev => ({ ...prev, health: 'DOWN' }));
    }
  };

  const fetchRecentMessages = async (deviceList) => {
    try {
      // Fetch recent chat logs
      const res = await apiClient.get('/analytics/recent-messages');
      const messages = res.data.messages || [];
      
      // Group messages by device/session
      const grouped = {};
      deviceList.forEach(d => {
        grouped[d.id] = messages.filter(m => m.session === d.id).slice(0, 3);
      });
      setRecentMessages(grouped);
    } catch (error) {
      console.error('Failed to fetch recent messages:', error);
    }
  };

  useEffect(() => {
    fetchStats()
    fetchRecentMessagesGlobal()
  }, [])

  // Fetch recent messages globally (not per device)
  const fetchRecentMessagesGlobal = async () => {
    try {
      const res = await apiClient.get('/analytics/recent-messages');
      const messages = res.data.messages || [];
      setRecentMessages(messages);
    } catch (error) {
      console.error('Failed to fetch recent messages:', error);
    }
  };

  const fetchDevices = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/devices')
      setDevices(response.data)
    } catch (error) {
      console.error('Failed to fetch devices:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [])

  // Auto-poll status when modal is open to close it automatically on success
  useEffect(() => {
    let interval;
    if (isModalOpen && selectedDevice) {
      interval = setInterval(async () => {
        try {
          const response = await apiClient.get('/devices');
          const currentDevices = response.data;
          setDevices(currentDevices);
          
          const updatedDevice = currentDevices.find(d => d.id === selectedDevice.id);
          if (updatedDevice && (updatedDevice.status === 'WORKING' || updatedDevice.status === 'CONNECTED')) {
            clearInterval(interval);
            closeModal();
          }
        } catch (error) {
          console.error('Polling failed:', error);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isModalOpen, selectedDevice]);

  const handleConnect = async (e) => {
    e.preventDefault()
    setQrLoading(true)
    setIsModalOpen(true)
    try {
      const response = await apiClient.post('/devices', { alias })
      const newDevice = response.data
      setAlias('')
      setSelectedDevice(newDevice)
      fetchQr(newDevice.id)
    } catch (error) {
      console.error('Failed to create device:', error)
      setIsModalOpen(false)
    } finally {
      setQrLoading(false)
    }
  }

  const fetchQr = async (deviceId) => {
    setQrLoading(true)
    try {
      const response = await apiClient.get(`/devices/${deviceId}/qr`)
      setQrCode(response.data.qrCode)
    } catch (error) {
      console.error('Failed to fetch QR code:', error)
      setQrCode(null)
    } finally {
      setQrLoading(false)
    }
  }

  const handleDelete = (id) => {
    showConfirm('Delete Device', 'Are you sure you want to disconnect and delete this device? This will stop all automation for this account.', () => performDelete(id))
  }

  const performDelete = async (id) => {
    try {
      await apiClient.delete(`/devices/${id}`)
      setDevices(devices.filter(d => d.id !== id))
      closeDialog()
    } catch (error) {
      console.error('Failed to delete device:', error)
      closeDialog()
      showAlert(t('common.error'), t('common.error'))
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setQrCode(null)
    setSelectedDevice(null)
    fetchDevices() // Refresh list after closing QR modal
  }

  const { t } = useLanguage()

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center space-x-3">
            <Smartphone className="text-primary" />
            <span>{t('devices.title')}</span>
          </h2>
          <p className="text-muted-foreground mt-1">{t('devices.subtitle')}</p>
        </div>
        <button 
           onClick={() => setIsModalOpen(true)}
           className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>{t('devices.addDevice')}</span>
        </button>
      </header>

      {/* Connection Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-card border border-border p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Wifi size={48} /></div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('devices.activeSessions')}</p>
            <h3 className="text-3xl font-bold text-white mt-2">
              {devices.filter(d => d.status === 'CONNECTED' || d.status === 'WORKING').length} 
              <span className="text-xs text-muted-foreground font-medium">/ {devices.length}</span>
            </h3>
         </div>
         <div className="bg-card border border-border p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={48} /></div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('devices.totalMessages')}</p>
            <h3 className="text-3xl font-bold text-emerald-400 mt-2">
               {stats.totalMessages >= 1000 ? `${(stats.totalMessages / 1000).toFixed(1)}k` : stats.totalMessages}
            </h3>
         </div>
         <div className="bg-card border border-border p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ShieldCheck size={48} /></div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Infrastructure Status</p>
            <h3 className="text-xl font-bold text-white mt-2 flex items-center space-x-2">
               <div className={`w-2 h-2 rounded-full animate-pulse ${stats.health === 'HEALTHY' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
               <span>{stats.health}</span>
            </h3>
         </div>
      </div>
      {/* Device List - Slim Rows */}
      <div className="space-y-3 relative min-h-[200px]">
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        )}

        {devices.length > 0 ? (
          devices.map((device, idx) => {
            // Find the most recent message for this specific device
            const latestMsg = recentMessages.find(m => m.deviceId === device.id);
            
            return (
              <div key={device.id} className="bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/50 transition-all group relative overflow-hidden flex items-center">
                {/* Status indicator bar */}
                <div className={`absolute left-0 top-0 w-1 h-full ${
                  device.status === 'CONNECTED' || device.status === 'WORKING' ? 'bg-emerald-500' : 
                  device.status === 'DISCONNECTED' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'
                }`}></div>
                
                {/* Device Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 ml-2 ${
                  device.status === 'CONNECTED' || device.status === 'WORKING' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                    : 'bg-muted/50 border-border text-muted-foreground'
                }`}>
                  <Smartphone size={20} />
                </div>
                
                {/* Device Info */}
                <div className="ml-4 min-w-[180px]">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-white text-sm">{device.metadata?.alias || 'Unnamed Device'}</h4>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                      device.status === 'CONNECTED' || device.status === 'WORKING' ? 'bg-emerald-500/10 text-emerald-500' : 
                      device.status === 'DISCONNECTED' ? 'bg-red-500/10 text-red-500' : 'bg-muted/50 text-muted-foreground'
                    }`}>
                      {device.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {device.updatedAt ? new Date(device.updatedAt).toLocaleTimeString() : 'Never synced'}
                  </p>
                </div>

                {/* Latest Message Preview (on right) */}
                <div className="flex-1 mx-4 min-w-0">
                  {latestMsg ? (
                    <div className="flex items-center space-x-3 p-2 rounded-lg bg-muted/20 border border-border/30">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        {latestMsg.contactName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-white truncate">{latestMsg.contactName}</p>
                          <span className="text-[9px] text-muted-foreground ml-2 shrink-0">
                            {latestMsg.createdAt && !isNaN(new Date(latestMsg.createdAt)) 
                              ? new Date(latestMsg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{latestMsg.message}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground/50 italic">
                      {device.status === 'CONNECTED' || device.status === 'WORKING' ? 'Waiting for messages...' : ''}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 shrink-0">
                  {device.status !== 'CONNECTED' && device.status !== 'WORKING' && (
                    <button 
                      onClick={() => { setSelectedDevice(device); setIsModalOpen(true); fetchQr(device.id); }}
                      className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-all flex items-center space-x-1"
                    >
                      <QrCode size={12} />
                      <span>Connect</span>
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(device.id)}
                    className="p-1.5 rounded-lg border border-destructive/20 text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        ) : !loading && (
          <div className="py-16 bg-card border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center">
             <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4 opacity-20">
                <WifiOff size={28} />
             </div>
             <h3 className="text-lg font-bold text-white mb-2">No Active Connections</h3>
             <p className="text-muted-foreground text-sm max-w-xs">Link your first WhatsApp account to start automating.</p>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl p-8 shadow-2xl relative">
             <button 
                onClick={closeModal}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-white transition-colors"
             >
                <X size={24} />
             </button>

             {selectedDevice ? (
               <div className="text-center">
                  <h3 className="text-2xl font-bold text-white mb-2">Connect WhatsApp</h3>
                  <p className="text-muted-foreground text-sm mb-8">Scan this QR code with your mobile device to establish a secure connection.</p>

                   <div className="bg-white p-4 rounded-2xl mx-auto w-64 h-64 flex items-center justify-center shadow-inner relative overflow-hidden group">
                     {qrLoading ? (
                        <div className="flex flex-col items-center space-y-3">
                           <Loader2 size={32} className="animate-spin text-primary" />
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Generating QR...</p>
                        </div>
                     ) : qrCode ? (
                        <>
                          <img src={qrCode} alt="WhatsApp QR" className="w-full h-full" />
                          <button 
                            onClick={() => { setQrCode(null); fetchQr(selectedDevice.id); }}
                            className="absolute top-2 right-2 p-2 bg-white/90 rounded-lg shadow-lg hover:bg-white transition-all"
                            title="Refresh QR"
                          >
                            <RefreshCw size={16} className="text-primary" />
                          </button>
                        </>
                     ) : (
                        <div className="text-center p-4">
                           <AlertCircle size={32} className="text-destructive mx-auto mb-2" />
                           <p className="text-xs font-bold text-destructive uppercase tracking-tighter mb-3">QR Expired or Failed</p>
                           <button 
                              onClick={async () => {
                                setQrLoading(true);
                                try {
                                  // First check if it's actually connected
                                  const response = await apiClient.get(`/devices/${selectedDevice.id}/qr`).catch(err => err.response);
                                  if (response?.data?.status === 'CONNECTED') {
                                    closeModal();
                                    return;
                                  }

                                  await apiClient.post(`/devices/${selectedDevice.id}/restart`);
                                  await new Promise(resolve => setTimeout(resolve, 2000));
                                  fetchQr(selectedDevice.id);
                                } catch (err) {
                                  console.error('Failed to restart session:', err);
                                  setQrLoading(false);
                                }
                              }}
                              className="mt-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all"
                           >
                              Restart Session
                           </button>
                        </div>
                     )}
                  </div>

                  <div className="mt-8 space-y-4">
                     <div className="flex items-center space-x-3 text-left p-4 bg-muted/50 rounded-2xl border border-border/50">
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">System is waiting for encrypted handshake from <span className="text-white font-bold">WAHA Engine v2.0</span></p>
                     </div>
                  </div>
               </div>
             ) : (
               <form onSubmit={handleConnect} className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">New Connection</h3>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Device Name / Alias</label>
                    <input 
                      type="text" 
                      value={alias}
                      onChange={(e) => setAlias(e.target.value)}
                      placeholder="e.g. Sales Team - iPhone" 
                      className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                      required
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-primary text-primary-foreground font-black py-4 rounded-xl shadow-xl shadow-primary/20 hover:opacity-90 transition-all uppercase tracking-[2px] text-sm"
                  >
                    Start Initialization
                  </button>
               </form>
             )}
          </div>
        </div>
      )}
      {/* Custom Dialog Overlay */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center space-y-4">
                 <div className={`p-3 rounded-full ${dialog.type === 'alert' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                    {dialog.type === 'alert' ? <AlertCircle size={32} /> : <Trash2 size={32} />}
                 </div>
                 <h3 className="text-lg font-bold text-white">
                    {dialog.title}
                 </h3>
                 <p className="text-sm text-muted-foreground">
                    {dialog.message}
                 </p>
                 <div className="flex space-x-3 w-full pt-2">
                    {dialog.type === 'confirm' && (
                       <button 
                         onClick={closeDialog}
                         className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                       >
                         Cancel
                       </button>
                    )}
                    <button 
                      onClick={() => {
                        if (dialog.onConfirm) dialog.onConfirm()
                        else closeDialog()
                      }}
                      className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all ${
                         dialog.type === 'alert' 
                         ? 'bg-primary hover:bg-primary/90' 
                         : 'bg-destructive hover:bg-destructive/90'
                      }`}
                    >
                      {dialog.type === 'confirm' ? 'Delete' : 'Okay'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}

export default Devices
