import { useState, useEffect, useCallback, useRef } from 'react'
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  Handle,
  Position
} from 'reactflow'
import 'reactflow/dist/style.css'
import { 
  MessageSquare, List, GitBranch, Zap, Save, Play, 
  Plus, Box, Info, X, Search, Filter, Trash2, 
  Edit2, MoreVertical, Loader2, ChevronRight
} from 'lucide-react'
import apiClient from '../api/client'

// Custom Node Components for ReactFlow
const MessageNode = ({ data }) => (
  <div className="px-4 py-3 shadow-xl rounded-xl bg-card border-[1.5px] border-primary/30 min-w-[200px] relative">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-primary" />
    <div className="flex items-center space-x-2 mb-2 border-b border-border pb-2">
      <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
        <MessageSquare size={14} />
      </div>
      <span className="text-xs font-bold text-white uppercase tracking-wider">Send Message</span>
    </div>
    <div className="text-[11px] text-muted-foreground line-clamp-2">
      {data.label || 'No message content...'}
    </div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary" />
  </div>
)

const OptionNode = ({ data }) => (
  <div className="px-4 py-3 shadow-xl rounded-xl bg-card border-[1.5px] border-emerald-500/30 min-w-[200px] relative">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-emerald-500" />
    <div className="flex items-center space-x-2 mb-2 border-b border-border pb-2">
      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-500">
        <List size={14} />
      </div>
      <span className="text-xs font-bold text-white uppercase tracking-wider">Option Menu</span>
    </div>
    <div className="space-y-1 mt-2">
      {data.options?.map((opt, i) => (
        <div key={i} className="flex justify-between items-center text-[10px] bg-muted/50 px-2 py-1 rounded">
          <span className="text-muted-foreground mr-2">{i + 1}.</span>
          <span className="text-white font-medium truncate">{opt}</span>
          <Handle 
            type="source" 
            position={Position.Right} 
            id={`option-${i}`} 
            style={{ top: 'auto', right: -12, borderRadius: 2 }}
            className="w-2.5 h-4 bg-emerald-500 border-none" 
          />
        </div>
      ))}
    </div>
  </div>
)

const TriggerNode = ({ data }) => (
  <div className="px-6 py-4 shadow-2xl rounded-2xl bg-gradient-to-br from-primary to-indigo-600 border-none min-w-[180px] relative text-center">
    <div className="flex flex-col items-center space-y-2">
       <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
          <Zap size={24} className="text-white fill-white" />
       </div>
       <span className="text-sm font-bold text-white uppercase tracking-widest">Trigger</span>
       <span className="text-[10px] text-white/70">{data.triggerType || 'On Keyword'}</span>
    </div>
    <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-4 border-indigo-600" />
  </div>
)

const nodeTypes = {
  message: MessageNode,
  option: OptionNode,
  trigger: TriggerNode,
}

const initialNodes = [
  { id: '1', type: 'trigger', position: { x: 250, y: 50 }, data: { triggerType: 'Incoming Message' } },
]

const FlowBuilder = () => {
  const [activeTab, setActiveTab] = useState('rules') // 'canvas' or 'rules'
  const reactFlowWrapper = useRef(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState(null)
  
  // Rules State
  const [rules, setRules] = useState([])
  const [rulesLoading, setRulesLoading] = useState(true)

  const fetchRules = async () => {
    setRulesLoading(true)
    try {
      const response = await apiClient.get('/auto-replies')
      setRules(response.data)
    } catch (error) {
      console.error('Failed to fetch rules:', error)
    } finally {
      setRulesLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'rules') fetchRules()
  }, [activeTab])

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  const onNodeClick = (event, node) => setSelectedNode(node)

  const addNode = (type) => {
    const id = `${nodes.length + 1}`
    const newNode = {
      id,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: `New ${type} node`,
        options: type === 'option' ? ['Option A', 'Option B'] : undefined
      },
    }
    setNodes((nds) => nds.concat(newNode))
  }

  const handleDeleteRule = async (id) => {
    if (!confirm('Are you sure you want to delete this rule?')) return
    try {
      await apiClient.delete(`/auto-replies/${id}`)
      setRules(rules.filter(r => r.id !== id))
    } catch (error) {
      console.error('Failed to delete rule:', error)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-10">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center space-x-3">
            <GitBranch className="text-primary" />
            <span>Automation Hub ⚙️</span>
          </h2>
          <p className="text-muted-foreground mt-1">Design complex response flows or simple keyword triggers.</p>
        </div>
        <div className="flex bg-card border border-border p-1 rounded-xl">
           <button 
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'rules' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
           >
              Keyword Rules
           </button>
           <button 
              onClick={() => setActiveTab('canvas')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'canvas' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
           >
              Visual Flow Builder
           </button>
        </div>
      </header>

      {activeTab === 'canvas' ? (
        <div className="h-[calc(100vh-280px)] flex flex-col space-y-4">
           <div className="flex-1 flex space-x-6 overflow-hidden">
             {/* Toolbox */}
             <aside className="w-64 bg-card border border-border rounded-2xl p-6 flex flex-col space-y-6 shrink-0 shadow-lg">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest text-opacity-50 mb-4">Node Library</h3>
                  <div className="space-y-3">
                    {[
                      { type: 'trigger', label: 'Trigger Node', icon: Zap, color: 'bg-primary' },
                      { type: 'message', label: 'Send Message', icon: MessageSquare, color: 'bg-blue-400' },
                      { type: 'option', label: 'Numbered Options', icon: List, color: 'bg-emerald-400' },
                      { type: 'action', label: 'CRM Action', icon: Box, color: 'bg-indigo-400' },
                    ].map((item) => (
                      <button
                        key={item.type}
                        onClick={() => addNode(item.type)}
                        className="w-full flex items-center space-x-3 p-3 bg-muted/30 border border-border rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all group text-left"
                      >
                        <div className={`p-2 rounded-lg ${item.color} text-white shadow-lg`}>
                          <item.icon size={16} />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground group-hover:text-white transition-colors">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button className="w-full py-3 bg-primary text-primary-foreground text-xs font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all uppercase tracking-widest mt-auto">
                   <Save size={14} className="inline mr-2" />
                   Publish Flow
                </button>
             </aside>

             {/* Canvas Area */}
             <div className="flex-1 bg-card border border-border rounded-2xl relative shadow-2xl overflow-hidden group" ref={reactFlowWrapper}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  onNodeClick={onNodeClick}
                  fitView
                >
                  <Background color="#313244" gap={24} size={1} />
                  <Controls className="bg-muted border border-border rounded-xl shadow-xl" />
                  <MiniMap 
                    style={{ background: '#181825', border: '1px solid #313244', borderRadius: '12px' }} 
                    maskColor="rgba(139, 92, 246, 0.05)"
                    nodeColor="#8b5cf6"
                  />
                </ReactFlow>

                {selectedNode && (
                  <div className="absolute top-6 right-6 w-80 bg-card border border-border rounded-2xl shadow-2xl z-20 animate-in slide-in-from-right-10 duration-300">
                     <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Properties</h4>
                        <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-muted rounded-md text-muted-foreground"><X size={16} /></button>
                     </div>
                     <div className="p-6 space-y-6">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Content Text</label>
                          <textarea 
                            className="w-full bg-muted/30 border border-border rounded-xl p-3 text-xs text-white focus:ring-1 focus:ring-primary outline-none h-32 resize-none font-medium"
                            value={selectedNode.data.label}
                            onChange={(e) => {
                              const newLabel = e.target.value
                              setNodes(nds => nds.map(node => node.id === selectedNode.id ? { ...node, data: { ...node.data, label: newLabel } } : node))
                            }}
                          />
                        </div>
                        <div className="pt-4 border-t border-border flex justify-between">
                           <button className="text-[10px] font-bold text-destructive hover:underline uppercase tracking-widest">Delete Node</button>
                           <button className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">Duplicate</button>
                        </div>
                     </div>
                  </div>
                )}
             </div>
           </div>
        </div>
      ) : (
        <div className="space-y-6">
           <div className="flex flex-col md:flex-row justify-between items-center bg-card border border-border p-4 rounded-2xl space-y-4 md:space-y-0 shadow-sm">
              <div className="flex items-center space-x-4 w-full md:w-auto">
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input type="text" placeholder="Search rules..." className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <button className="p-2.5 rounded-xl border border-border bg-muted/30 text-muted-foreground hover:text-white transition-all"><Filter size={18} /></button>
              </div>
              <button className="flex items-center space-x-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all text-sm">
                <Plus size={18} />
                <span>New Rule</span>
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative min-h-[400px]">
              {rulesLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
                  <Loader2 className="animate-spin text-primary" size={40} />
                </div>
              )}

              {rules.length > 0 ? (
                rules.map((rule) => (
                  <div key={rule.id} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all group relative overflow-hidden flex flex-col shadow-sm">
                    <div className={`absolute top-0 right-0 p-4 ${rule.isActive ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                       <Zap size={20} className={rule.isActive ? 'fill-emerald-500/20' : ''} />
                    </div>
                    
                    <div className="mb-4">
                       <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                         rule.matchType === 'EXACT' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted border-border text-muted-foreground'
                       } tracking-widest mr-2 uppercase`}>{rule.matchType}</span>
                       <h4 className="text-lg font-bold text-white inline-block mt-2">"{rule.keyword}"</h4>
                    </div>

                    <div className="p-4 bg-muted/30 border border-border rounded-xl mb-6 flex-1">
                       <div className="flex items-center space-x-2 text-muted-foreground mb-2">
                          <MessageSquare size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Auto Response</span>
                       </div>
                       <p className="text-xs text-white line-clamp-3 leading-relaxed font-normal">{rule.responseText}</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                       <div className="flex space-x-2">
                          <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-all"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteRule(rule.id)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive transition-all"><Trash2 size={16} /></button>
                       </div>
                       <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold text-muted-foreground italic">Priority {rule.priority}</span>
                          <button className={`w-8 h-4 rounded-full relative transition-colors ${rule.isActive ? 'bg-primary' : 'bg-muted'}`}>
                             <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${rule.isActive ? 'right-0.5' : 'left-0.5'}`}></div>
                          </button>
                       </div>
                    </div>
                  </div>
                ))
              ) : !rulesLoading && (
                <div className="col-span-full py-20 bg-card border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center">
                   <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 opacity-20"><Box size={32} /></div>
                   <h3 className="text-xl font-bold text-white mb-2">No Automation Rules</h3>
                   <p className="text-muted-foreground text-sm max-w-xs">Create your first keyword trigger to automate responses to common questions.</p>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  )
}

export default FlowBuilder
