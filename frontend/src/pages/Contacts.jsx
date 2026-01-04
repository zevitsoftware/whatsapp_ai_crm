import { useState, useEffect } from 'react'
import { 
  Users, Search, Filter, MoreVertical, 
  Upload, Tag, Phone, Trash2, 
  Edit2, CheckSquare, Square, ChevronLeft, ChevronRight,
  Loader2, UserPlus
} from 'lucide-react'
import apiClient from '../api/client'

const Contacts = () => {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(10)
  const [selectedContacts, setSelectedContacts] = useState([])

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/contacts', {
        params: { page, limit, search }
      })
      setContacts(response.data.contacts)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts()
    }, 500)
    return () => clearTimeout(timer)
  }, [page, search])

  const toggleSelectAll = () => {
    if (selectedContacts.length === contacts.length && contacts.length > 0) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map(c => c.id))
    }
  }

  const toggleSelect = (id) => {
    if (selectedContacts.includes(id)) {
      setSelectedContacts(selectedContacts.filter(item => item !== id))
    } else {
      setSelectedContacts([...selectedContacts, id])
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center space-x-3">
            <Users className="text-primary" />
            <span>Customer Database 👥</span>
          </h2>
          <p className="text-muted-foreground mt-1">Manage and segment your contacts for targeted automation.</p>
        </div>
        <div className="flex space-x-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-muted text-white rounded-xl border border-border hover:bg-muted/80 transition-all text-sm font-bold">
            <Upload size={18} />
            <span>Import CSV</span>
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm">
            <UserPlus size={18} />
            <span>Add Contact</span>
          </button>
        </div>
      </header>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-card border border-border p-4 rounded-2xl space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <button className="p-2.5 rounded-xl border border-border bg-muted/30 text-muted-foreground hover:text-white hover:border-primary/50 transition-all">
            <Filter size={18} />
          </button>
        </div>

        {selectedContacts.length > 0 && (
          <div className="flex items-center space-x-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-lg">{selectedContacts.length} Selected</span>
            <button className="p-2 text-muted-foreground hover:text-white transition-all"><Tag size={18} /></button>
            <button className="p-2 text-muted-foreground hover:text-destructive transition-all"><Trash2 size={18} /></button>
          </div>
        )}
      </div>

      {/* Contact Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 bg-card/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        )}
        
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/10 text-muted-foreground text-[10px] font-bold uppercase tracking-[2px] border-b border-border">
              <th className="px-6 py-4 w-10">
                <button onClick={toggleSelectAll} className="text-primary hover:scale-110 transition-transform">
                  {selectedContacts.length === contacts.length && contacts.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
              </th>
              <th className="px-6 py-4">Contact Detail</th>
              <th className="px-6 py-4">Category / Tags</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {contacts.length > 0 ? (
              contacts.map((contact) => (
                <tr key={contact.id} className={`hover:bg-muted/10 transition-colors ${selectedContacts.includes(contact.id) ? 'bg-primary/5' : ''}`}>
                  <td className="px-6 py-5">
                    <button onClick={() => toggleSelect(contact.id)} className={selectedContacts.includes(contact.id) ? 'text-primary' : 'text-muted-foreground'}>
                      {selectedContacts.includes(contact.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-primary/10">
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{contact.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center space-x-1 mt-0.5">
                          <Phone size={10} />
                          <span>{contact.phoneNumber}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-2">
                      {contact.tags && contact.tags.length > 0 ? (
                        contact.tags.map((tag, i) => (
                          <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-muted-foreground opacity-50 italic">No tags</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      contact.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${contact.isActive ? 'bg-emerald-500' : 'bg-muted-foreground'}`}></div>
                      <span>{contact.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end space-x-2">
                       <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-all">
                          <Edit2 size={16} />
                       </button>
                       <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-white transition-all">
                          <MoreVertical size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : !loading && (
              <tr>
                <td colSpan="5" className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center space-y-3 opacity-20">
                    <Users size={64} />
                    <p className="text-lg font-bold text-white/50">No contacts found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-6 py-5 border-t border-border bg-muted/5 flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">
            Showing <span className="text-white">{contacts.length}</span> of <span className="text-white">{total}</span> contacts
          </p>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-white transition-all disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-bold px-4 text-white">Page {page} of {totalPages || 1}</span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-white transition-all disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contacts
