import { useState, useEffect, useRef } from 'react'
import { 
  Bot, Sparkles, Database, Shield, Zap, Settings2, Plus, 
  FileText, Trash2, CheckCircle2, AlertCircle, Loader2,
  Lock, Edit3, RefreshCw
} from 'lucide-react'
import apiClient from '../api/client'

const AIAgent = () => {
  const [activeTab, setActiveTab] = useState('knowledge')
  const [loading, setLoading] = useState(false)
  const [knowledgeBase, setKnowledgeBase] = useState([])
  const fileInputRef = useRef(null)

  /* Dialog State */
  const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', message: '', onConfirm: null })

  const showAlert = (message) => {
    setDialog({ isOpen: true, type: 'alert', message, onConfirm: null })
  }

  const showConfirm = (message, onConfirm) => {
    setDialog({ isOpen: true, type: 'confirm', message, onConfirm })
  }

  const closeDialog = () => {
    setDialog(prev => ({ ...prev, isOpen: false }))
  }

  const fetchKnowledgeBase = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/knowledge-base')
      const formattedData = response.data.map(file => ({
        id: file.id,
        name: file.originalName,
        size: (file.fileSize / (1024 * 1024)).toFixed(2) + ' MB',
        status: file.status,
        date: file.createdAt.split('T')[0]
      }))
      setKnowledgeBase(formattedData)
    } catch (error) {
      console.error('Failed to fetch knowledge base:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKnowledgeBase()
  }, [])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validation
    const allowedTypes = ['application/pdf', 'text/plain']
    if (!allowedTypes.includes(file.type)) {
      showAlert('Only .PDF and .TXT files are allowed')
      return
    }

    if (file.size > 2.5 * 1024 * 1024) { // 2.5MB
      showAlert('File size must be less than 2.5MB')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Add as local state first for immediate UI feedback
      const tempId = 'temp-' + Date.now()
      const tempFile = {
        id: tempId,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        status: 'PROCESSING',
        date: new Date().toISOString().split('T')[0]
      }
      setKnowledgeBase(prev => [tempFile, ...prev])

      const response = await apiClient.post('/knowledge-base/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      // Replace temp file with real one from server
      setKnowledgeBase(prev => prev.map(f => 
        f.id === tempId ? {
          id: response.data.id,
          name: response.data.originalName,
          size: (response.data.fileSize / (1024 * 1024)).toFixed(2) + ' MB',
          status: response.data.status,
          date: response.data.createdAt.split('T')[0]
        } : f
      ))

      // Poll for status update if it's still processing
      if (response.data.status === 'PROCESSING') {
        setTimeout(fetchKnowledgeBase, 6000)
      }

    } catch (error) {
      console.error('Upload failed:', error)
      showAlert(error.response?.data?.error || 'Upload failed')
      fetchKnowledgeBase() // Refresh to clean up temp state
    }
  }

  const handleDelete = (id) => {
    showConfirm('Are you sure you want to remove this training data?', async () => {
      try {
        await apiClient.delete(`/knowledge-base/${id}`)
        setKnowledgeBase(prev => prev.filter(f => f.id !== id))
        closeDialog()
      } catch (error) {
        console.error('Delete failed:', error)
        closeDialog()
        showAlert('Failed to delete file')
      }
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 relative">
      {/* Custom Dialog Overlay */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center space-y-4">
                 <div className={`p-3 rounded-full ${dialog.type === 'alert' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                    {dialog.type === 'alert' ? <AlertCircle size={32} /> : <Bot size={32} />}
                 </div>
                 <h3 className="text-lg font-bold text-white">
                    {dialog.type === 'alert' ? 'Notice' : 'Confirmation'}
                 </h3>
                 <p className="text-sm text-muted-foreground">
                    {dialog.message}
                 </p>
                 <div className="flex space-x-3 w-full pt-2">
                    {dialog.type === 'confirm' && (
                       <button 
                         onClick={closeDialog}
                         className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                       >
                         Cancel
                       </button>
                    )}
                    <button 
                      onClick={() => {
                        if (dialog.onConfirm) dialog.onConfirm()
                        else closeDialog()
                      }}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all ${
                         dialog.type === 'alert' 
                         ? 'bg-destructive hover:bg-destructive/90' 
                         : 'bg-primary hover:bg-primary/90'
                      }`}
                    >
                      {dialog.type === 'confirm' ? 'Confirm' : 'Okay'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center space-x-3">
            <Bot className="text-primary" />
            <span>AI Sales Brain 🧠</span>
          </h2>
          <p className="text-muted-foreground mt-1">Your 10-Year Experienced Sales Expert. Trained to close and assist.</p>
        </div>
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>Sales Agent Active</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex space-x-1 p-1 bg-card border border-border rounded-xl w-fit">
        {[
          { id: 'knowledge', label: 'Knowledge Base', icon: Database },
          { id: 'config', label: 'Sales Tuning', icon: Settings2 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id 
              ? 'bg-primary text-primary-foreground shadow-lg' 
              : 'text-muted-foreground hover:text-white hover:bg-muted'
            }`}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Forms/Lists */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'config' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-border bg-muted/30">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Sparkles size={18} className="text-primary" />
                  <span>Expert Sales Tuning</span>
                </h3>
              </div>
              <div className="p-8 space-y-8">
                <div className="bg-primary/5 border border-primary/20 p-8 rounded-2xl relative">
                  <div className="absolute top-4 right-4 text-primary opacity-20"><Bot size={48} /></div>
                  <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-3">Active Sales Strategy</h4>
                  <p className="text-2xl font-black text-white leading-tight mb-4">Master Sales Strategist</p>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Your agent is operating with a **10-Year Experience Professional Persona**. It is hard-coded to prioritize lead conversion while maintaining high rapport with customers.
                    </p>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary/10">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Technique</p>
                          <p className="text-xs font-bold text-white uppercase">Consultative Selling</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Objective</p>
                          <p className="text-xs font-bold text-white uppercase">High Conversion</p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-border bg-muted/30 flex justify-between items-end">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Database size={18} className="text-primary" />
                    <span>Sales Knowledge Base</span>
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Supported: .PDF, .TXT (Max 2.5MB)</p>
                </div>
                <div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf,.txt"
                    onChange={handleFileUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current.click()}
                    className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-xl flex items-center space-x-2 font-bold hover:opacity-90 transition-all"
                  >
                    <Plus size={14} />
                    <span>Add Training Data</span>
                  </button>
                </div>
              </div>
              <div className="p-0 overflow-x-auto min-h-[300px]">
                {loading && knowledgeBase.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Loader2 className="animate-spin mb-4 text-primary" size={32} />
                    <p className="text-sm font-medium">Loading training data...</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-muted/10 text-muted-foreground text-[10px] font-bold uppercase tracking-[2px] border-b border-border">
                        <th className="px-6 py-4">Context Source</th>
                        <th className="px-6 py-4">Size</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {knowledgeBase.length > 0 ? (
                        knowledgeBase.map((file, i) => (
                          <tr key={i} className="hover:bg-muted/10 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-primary shadow-inner">
                                  <FileText size={16} />
                                </div>
                                <span className="text-sm font-bold text-white">{file.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-muted-foreground font-medium">{file.size}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                file.status === 'VECTORIZED' ? 'bg-emerald-500/10 text-emerald-500' : 
                                file.status === 'ERROR' ? 'bg-destructive/10 text-destructive' :
                                'bg-amber-500/10 text-amber-500'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${file.status === 'VECTORIZED' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                                <span>{file.status}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleDelete(file.id)}
                                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-20 text-center text-muted-foreground text-sm font-medium">
                            No training data uploaded yet. <br/>
                            <span className="text-[10px] opacity-50 uppercase tracking-widest mt-2 block">Upload files to train your Sales Brain</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Summaries/States */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-primary/20 to-indigo-500/20 border border-primary/20 rounded-2xl p-8 relative overflow-hidden group shadow-2xl">
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Shield size={20} className="text-primary" />
                <span>Escalation Protocol</span>
              </h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                The Sales Brain handles initial inquiry and qualification. If a high-value lead is detected, a human notification is triggered.
              </p>
              <div className="mt-6 flex items-center space-x-3 text-[11px] text-emerald-400 font-black bg-emerald-500/10 w-fit px-3 py-1.5 rounded-lg border border-emerald-500/20 tracking-widest">
                <CheckCircle2 size={14} />
                <span>94% LEAD ACCURACY</span>
              </div>
            </div>
            {/* Decal icon */}
            <Bot size={100} className="absolute bottom-[-30px] right-[-30px] text-white/5 group-hover:scale-110 transition-transform duration-700" />
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl relative overflow-hidden">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-60">Sales Performance</h3>
                <RefreshCw size={14} className="text-muted-foreground hover:rotate-180 transition-all duration-500 cursor-pointer" />
             </div>
             <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground font-medium">Conversations Handled</span>
                    <span className="text-white font-black">1.2K / 5K</span>
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                    <div className="bg-primary h-full shadow-[0_0_8px_rgba(139,92,246,0.5)]" style={{ width: '24%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground font-medium">Auto-Reply Success</span>
                    <span className="text-white font-black">98% / 100%</span>
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                    <div className="bg-indigo-400 h-full shadow-[0_0_8px_rgba(129,140,248,0.5)]" style={{ width: '98%' }}></div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIAgent
