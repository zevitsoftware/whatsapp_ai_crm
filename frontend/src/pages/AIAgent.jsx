import { useState, useEffect, useRef } from 'react'
import { 
  Bot, Sparkles, Database, Shield, Zap, Settings2, Plus, 
  FileText, Trash2, CheckCircle2, AlertCircle, Loader2,
  Lock, Edit3, RefreshCw, Send, MessageSquare, User, ShoppingBag
} from 'lucide-react'
import apiClient from '../api/client'
import ProductManager from '../components/ProductManager'
import { useLanguage } from '../i18n/index.jsx'

const AIAgent = () => {
  const [activeTab, setActiveTab] = useState('knowledge')
  const [loading, setLoading] = useState(false)
  const [knowledgeBase, setKnowledgeBase] = useState([])
  const [knowledgeSummary, setKnowledgeSummary] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [allProducts, setAllProducts] = useState([]) // For resolving product cards
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)
  const fileInputRef = useRef(null)
  
  // Tuning State
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [isPromptSaving, setIsPromptSaving] = useState(false)

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

  // Poll for updates if any file is processing
  useEffect(() => {
    if (activeTab === 'knowledge') {
       const processingFiles = knowledgeBase.some(f => f.status === 'PROCESSING')
       if (!processingFiles) return
   
       const interval = setInterval(() => {
         fetchKnowledgeBase(true)
       }, 3000)
   
       return () => clearInterval(interval)
    }
  }, [knowledgeBase, activeTab])

  useEffect(() => {
    if (activeTab === 'tuning') {
      fetchTemplates();
      fetchAgentConfig();
    }
  }, [activeTab])

  const fetchTemplates = async () => {
    try {
      const response = await apiClient.get('/agent/templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchAgentConfig = async () => {
    try {
      const response = await apiClient.get('/agent/config');
      if (response.data) {
        setCustomPrompt(response.data.customPrompt);
        setSelectedTemplateId(response.data.templateId || '');
      }
    } catch (error) {
      console.error('Failed to fetch agent config:', error);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setIsPromptSaving(true);
      await apiClient.post('/agent/config', {
        templateId: selectedTemplateId,
        customPrompt
      });
      showAlert('Agent personality saved successfully!');
    } catch (error) {
       console.error('Failed to save agent config:', error);
       showAlert('Failed to save agent config.');
    } finally {
      setIsPromptSaving(false);
    }
  };

  const handleApplyTemplate = (template) => {
     setSelectedTemplateId(template.id);
     setCustomPrompt(template.content);
  };

  const fetchKnowledgeBase = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const response = await apiClient.get('/knowledge-base')
      const formattedData = response.data.map(file => ({
        id: file.id,
        name: file.originalName,
        size: (file.fileSize / (1024 * 1024)).toFixed(2) + ' MB',
        status: file.status,
        date: file.createdAt.split('T')[0]
      }))
      setKnowledgeBase(formattedData)
      
      // Check if we need to refresh summary (transitions from PROCESSING -> VECTORIZED)
      const wasProcessing = knowledgeBase.some(f => f.status === 'PROCESSING');
      const isNowProcessing = formattedData.some(f => f.status === 'PROCESSING');
      
      if (wasProcessing && !isNowProcessing) {
        fetchKnowledgeSummary();
      }

    } catch (error) {
      console.error('Failed to fetch knowledge base:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const fetchKnowledgeSummary = async () => {
    try {
      const response = await apiClient.get('/knowledge-base/summary')
      setKnowledgeSummary(response.data.summary || '')
    } catch (error) {
      console.error('Failed to fetch knowledge summary:', error)
    }
  }


  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setChatLoading(true)

    try {
      // Build conversation history (exclude the current message we just added)
      const history = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const response = await apiClient.post('/ai/test-chat', { 
        message: userMessage,
        history: history
      })
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.answer }])
    } catch (error) {
      console.error('Chat failed:', error)
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error answering that.', isError: true }])
    } finally {
      setChatLoading(false)
    }
  }

  useEffect(() => {
    // Scroll to bottom of chat
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

   const fetchAllProducts = async () => {
    try {
      const response = await apiClient.get('/products')
      setAllProducts(response.data)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }

  useEffect(() => {
    fetchKnowledgeBase()
    fetchKnowledgeSummary()
    fetchAllProducts()
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
  const { t } = useLanguage()

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
                    {dialog.type === 'alert' ? t('common.error') : t('common.confirm')}
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
                         {t('common.cancel')}
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
                      {dialog.type === 'confirm' ? t('common.confirm') : 'OK'}
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
            <span>{t('aiAgent.title')}</span>
          </h2>
          <p className="text-muted-foreground mt-1">{t('aiAgent.subtitle')}</p>
        </div>
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>{t('common.active')}</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex space-x-1 p-1 bg-card border border-border rounded-xl w-fit">
        {[
          { id: 'knowledge', label: t('aiAgent.tabs.knowledgeBase'), icon: Database },
          { id: 'summary', label: t('aiAgent.tabs.knowledgeSummary'), icon: Sparkles },
          { id: 'products', label: t('aiAgent.tabs.productCatalog'), icon: ShoppingBag },
          { id: 'tuning', label: t('aiAgent.tabs.agentTuning'), icon: Settings2 },
          { id: 'test', label: t('aiAgent.tabs.testAgent'), icon: MessageSquare },
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

      <div className="grid grid-cols-1 gap-8">
        {/* Main Content Area */}
        <div className="space-y-6">

          {activeTab === 'products' && (
             <ProductManager />
          )}
          {activeTab === 'tuning' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
               {/* Template List */}
               <div className="md:col-span-1 space-y-4">
                  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl p-6">
                     <h3 className="text-lg font-bold text-white flex items-center space-x-2 mb-4">
                        <Edit3 size={18} className="text-primary" />
                        <span>Core Templates</span>
                     </h3>
                     <div className="space-y-3">
                        {templates.length > 0 ? (
                           templates.map(tpl => (
                              <button
                                 key={tpl.id}
                                 onClick={() => handleApplyTemplate(tpl)}
                                 className={`w-full text-left p-4 rounded-xl border transition-all ${
                                    selectedTemplateId === tpl.id 
                                    ? 'bg-primary/10 border-primary ring-1 ring-primary' 
                                    : 'bg-muted/20 border-border hover:border-white/20'
                                 }`}
                              >
                                 <div className="font-bold text-sm text-white mb-1">{tpl.name}</div>
                                 <div className="text-[10px] text-muted-foreground line-clamp-2">{tpl.description}</div>
                                 <div className="mt-2 text-[9px] font-black uppercase tracking-wider text-primary/80">{tpl.category}</div>
                              </button>
                           ))
                        ) : (
                           <div className="text-center py-10 opacity-30">
                              <Bot size={32} className="mx-auto mb-2" />
                              <p className="text-[10px] font-bold uppercase">No templates found</p>
                           </div>
                        )}
                     </div>
                  </div>
                  
                  <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-6">
                     <h4 className="text-indigo-400 font-bold text-xs uppercase mb-2">Editor Tip</h4>
                     <p className="text-[10px] text-indigo-300/80 leading-relaxed">
                        Use variables like <code className="bg-black/20 px-1 rounded text-white font-mono">{`\${contactName}`}</code> and <code className="bg-black/20 px-1 rounded text-white font-mono">{`\${contactLocation}`}</code> to personalize your bot's greetings dynamically!
                     </p>
                  </div>
               </div>

               {/* Editor Area */}
               <div className="md:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-xl flex flex-col h-[75vh]">
                  <div className="p-6 border-b border-border bg-muted/30 flex justify-between items-center">
                     <div>
                        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                           <Zap size={18} className="text-primary" />
                           <span>Sales Personality Tuning</span>
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Directly control how your AI thinks and sells</p>
                     </div>
                     <button
                        onClick={handleSaveConfig}
                        disabled={isPromptSaving || !customPrompt.trim()}
                        className="bg-primary text-primary-foreground px-6 py-2 rounded-xl flex items-center space-x-2 font-bold hover:opacity-90 transition-all disabled:opacity-50"
                     >
                        {isPromptSaving ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                        <span>Save Sales Personality</span>
                     </button>
                  </div>
                  <div className="flex-1 p-0 relative group">
                     <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Define your agent's personality and rules here..."
                        className="w-full h-full bg-transparent p-8 text-sm text-white/90 font-mono leading-relaxed resize-none outline-none focus:bg-white/[0.02] transition-colors"
                     />
                     <div className="absolute bottom-4 right-4 pointer-events-none text-white/10 group-focus-within:text-primary/20 transition-colors">
                        <Edit3 size={120} />
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl h-[75vh] flex flex-col">
              <div className="p-6 border-b border-border bg-muted/30">
                 <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <MessageSquare size={18} className="text-primary" />
                    <span>Test Your Agent</span>
                 </h3>
                 <p className="text-xs text-muted-foreground mt-1">Chat with your trained agent to verify its knowledge and responses.</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                 {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 space-y-4">
                       <Bot size={48} className="text-primary" />
                       <div>
                          <p className="font-bold text-white">Ready to Chat</p>
                          <p className="text-xs text-muted-foreground max-w-xs mx-auto">Ask questions about your uploaded documents to test the RAG (Retrieval Augmented Generation) capabilities.</p>
                       </div>
                    </div>
                 ) : (
                    chatMessages.map((msg, idx) => (
                       <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex max-w-[80%] space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border text-white'
                             }`}>
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                             </div>
                              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                                 msg.role === 'user' 
                                 ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                                 : msg.isError 
                                    ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-sm'
                                    : 'bg-muted/50 border border-border text-white rounded-tl-sm'
                              }`}>
                                 {msg.content.split(/(\[PRODUCT_CARD: [a-f0-9-]+\])/g).map((part, pIdx) => {
                                    const match = part.match(/\[PRODUCT_CARD: ([a-f0-9-]+)\]/)
                                    if (match) {
                                       const productId = match[1]
                                       const product = allProducts.find(p => p.id === productId)
                                       if (!product) return null

                                       const rootUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api$/, '')

                                       return (
                                          <div key={pIdx} className="my-3 max-w-[280px] bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                             <div className="h-32 bg-muted relative">
                                                <img 
                                                   src={`${rootUrl}${product.imagePath}`} 
                                                   alt={product.title}
                                                   className="w-full h-full object-cover"
                                                   onError={(e) => { e.target.src = 'https://placehold.co/400x300/1e1e1e/white?text=No+Image' }}
                                                />
                                                {product.isPrimary && (
                                                   <div className="absolute top-2 left-2 bg-indigo-600 text-[8px] font-black uppercase px-2 py-1 rounded-md shadow-lg text-white">
                                                      Featured
                                                   </div>
                                                )}
                                             </div>
                                             <div className="p-3 space-y-1">
                                                <h4 className="font-bold text-white text-xs truncate">{product.title}</h4>
                                                <p className="text-primary font-black text-sm">Rp {Number(product.price).toLocaleString('id-ID')}</p>
                                                <p className="text-[10px] text-white/40 line-clamp-2 leading-tight">{product.description}</p>
                                             </div>
                                          </div>
                                       )
                                    }
                                    return <span key={pIdx} className="whitespace-pre-wrap">{part}</span>
                                 })}
                              </div>
                          </div>
                       </div>
                    ))
                 )}
                 {chatLoading && (
                    <div className="flex justify-start">
                       <div className="flex space-x-3">
                          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 text-white">
                             <Bot size={16} />
                          </div>
                          <div className="bg-muted/30 border border-border px-4 py-3 rounded-2xl rounded-tl-sm flex items-center space-x-2">
                             <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                             <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                             <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                       </div>
                    </div>
                 )}
                 <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-border bg-card">
                 <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <input 
                       type="text" 
                       value={chatInput}
                       onChange={e => setChatInput(e.target.value)}
                       placeholder="Type your message here..."
                       className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    />
                    <button 
                       type="submit" 
                       disabled={!chatInput.trim() || chatLoading}
                       className="bg-primary text-primary-foreground p-3 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                       <Send size={20} />
                    </button>
                 </form>
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
          
          {activeTab === 'summary' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl min-h-[500px] flex flex-col">
              <div className="p-6 border-b border-border bg-muted/30 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Sparkles size={18} className="text-primary" />
                    <span>AI Knowledge Summary</span>
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">What the AI actually understands from your data</p>
                </div>
                <button 
                  onClick={fetchKnowledgeSummary}
                  className="p-2 text-muted-foreground hover:text-primary transition-colors"
                  title="Refresh Summary"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
              <div className="p-8 flex-1">
                {knowledgeSummary ? (
                  <div className="prose prose-invert max-w-none">
                    <div className="bg-muted/20 border border-border/50 rounded-xl p-6 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                      {knowledgeSummary}
                    </div>
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                          <h4 className="text-xs font-black text-primary uppercase mb-2">Confidence Level</h4>
                          <div className="flex items-center space-x-2">
                             <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: '92%' }}></div>
                             </div>
                             <span className="text-[10px] font-bold text-white">92%</span>
                          </div>
                       </div>
                       <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                          <h4 className="text-xs font-black text-emerald-500 uppercase mb-2">Context Strength</h4>
                          <div className="flex items-center space-x-2">
                             <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: '85%' }}></div>
                             </div>
                             <span className="text-[10px] font-bold text-white">High</span>
                          </div>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                    <div className="p-4 rounded-full bg-muted/20 text-muted-foreground">
                      <FileText size={40} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold">No Summary Available</h4>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                        Upload and vectorize your training data first. The AI will automatically summarize it for you.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AIAgent
