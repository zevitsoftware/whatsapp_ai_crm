import { useState, useEffect } from 'react'
import { 
  Users, Search, Filter, MoreVertical, 
  Upload, Tag, Phone, Trash2, 
  Edit2, CheckSquare, Square, ChevronLeft, ChevronRight,
  Loader2, UserPlus, X, MapPin, MessageSquare, AlertCircle
} from 'lucide-react'
import apiClient from '../api/client'
import { useLanguage } from '../i18n/index.jsx'

const Contacts = () => {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(10)
  const [selectedContacts, setSelectedContacts] = useState([])
  
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
  
  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  
  // Location Data States
  const [provinces, setProvinces] = useState([])
  const [regencies, setRegencies] = useState([])
  const [districts, setDistricts] = useState([])
  const [locLoading, setLocLoading] = useState(false)
  
  // Filter Panel States
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filters, setFilters] = useState({
    province: '',
    regency: '',
    district: '',
    tags: ''
  })
  const [filterProvinces, setFilterProvinces] = useState([])
  const [filterRegencies, setFilterRegencies] = useState([])
  const [filterDistricts, setFilterDistricts] = useState([])
  
  // Chat History Modal States
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const [chatContact, setChatContact] = useState(null)
  const [chatLoading, setChatLoading] = useState(false)

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const params = { page, limit, search }
      
      // Add filter params if set
      if (filters.province) params.provinceId = filters.province
      if (filters.regency) params.regencyId = filters.regency
      if (filters.district) params.districtId = filters.district
      if (filters.tags) params.tags = filters.tags
      
      const response = await apiClient.get('/contacts', { params })
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
  }, [page, search, filters])

  // Reset to page 1 when search or filters change
  useEffect(() => {
    if (page !== 1) setPage(1)
  }, [search, filters])
  
  // Load filter provinces on mount
  useEffect(() => {
    const loadFilterProvinces = async () => {
      try {
        const response = await apiClient.get('/locations/provinces')
        setFilterProvinces(response.data)
      } catch (error) {
        console.error('Failed to load provinces:', error)
      }
    }
    loadFilterProvinces()
  }, [])
  
  const handleFilterProvinceChange = async (provinceId) => {
    setFilters({ ...filters, province: provinceId, regency: '', district: '' })
    if (provinceId) {
      try {
        const response = await apiClient.get('/locations/regencies', { params: { provinceId } })
        setFilterRegencies(response.data)
        setFilterDistricts([])
      } catch (error) {
        console.error('Failed to load regencies:', error)
      }
    } else {
      setFilterRegencies([])
      setFilterDistricts([])
    }
  }
  
  const handleFilterRegencyChange = async (regencyId) => {
    setFilters({ ...filters, regency: regencyId, district: '' })
    if (regencyId) {
      try {
        const response = await apiClient.get('/locations/districts', { params: { regencyId } })
        setFilterDistricts(response.data)
      } catch (error) {
        console.error('Failed to load districts:', error)
      }
    } else {
      setFilterDistricts([])
    }
  }
  
  const clearFilters = () => {
    setFilters({ province: '', regency: '', district: '', tags: '' })
    setFilterRegencies([])
    setFilterDistricts([])
  }
  
  const fetchChatHistory = async (contact) => {
    setChatContact(contact)
    setIsChatHistoryOpen(true)
    setChatLoading(true)
    try {
      const response = await apiClient.get(`/contacts/${contact.id}/chat-history`)
      setChatHistory(response.data.messages || [])
    } catch (error) {
      console.error('Failed to fetch chat history:', error)
      setChatHistory([])
    } finally {
      setChatLoading(false)
    }
  }

  const fetchProvinces = async () => {
    try {
      const response = await apiClient.get('/locations/provinces')
      setProvinces(response.data)
    } catch (error) {
      console.error('Failed to fetch provinces:', error)
    }
  }

  const fetchRegencies = async (provinceId) => {
    if (!provinceId) return setRegencies([])
    try {
      const response = await apiClient.get('/locations/regencies', { params: { provinceId } })
      setRegencies(response.data)
      setDistricts([])
    } catch (error) {
      console.error('Failed to fetch regencies:', error)
    }
  }

  const fetchDistricts = async (regencyId) => {
    if (!regencyId) return setDistricts([])
    try {
      const response = await apiClient.get('/locations/districts', { params: { regencyId } })
      setDistricts(response.data)
    } catch (error) {
      console.error('Failed to fetch districts:', error)
    }
  }

  const openEditModal = async (contact) => {
    const loc = contact.attributes?.locationData || {};
    
    // Map IDs based on the location type
    let provinceId = loc.provinceId || '';
    let regencyId = loc.regencyId || '';
    let districtId = loc.districtId || '';

    // Fallback if full hierarchy is missing but we have the target ID
    if (loc.type === 'REGENCY' && !regencyId) regencyId = loc.id;
    if (loc.type === 'DISTRICT' && !districtId) districtId = loc.id;
    if (loc.type === 'PROVINCE' && !provinceId) provinceId = loc.id;

    // Resolve hierarchy if partially missing (for old data)
    if (districtId && (!regencyId || !provinceId)) {
      try {
        const resp = await apiClient.get(`/locations/districts/${districtId}`)
        regencyId = resp.data.regency_id
        provinceId = resp.data.regency?.province_id || provinceId
      } catch (e) { console.error('District lookup failed', e) }
    }

    if (regencyId && !provinceId) {
      try {
        const resp = await apiClient.get(`/locations/regencies/${regencyId}`)
        provinceId = resp.data.province_id
      } catch (e) { console.error('Regency lookup failed', e) }
    }

    setEditingContact({
      ...contact,
      tempProvince: provinceId,
      tempRegency: regencyId,
      tempDistrict: districtId,
      tempTags: contact.tags ? contact.tags.join(', ') : ''
    })
    
    setIsEditModalOpen(true)
    fetchProvinces()
    
    if (provinceId) fetchRegencies(provinceId)
    if (regencyId) fetchDistricts(regencyId)
  }

  const handleUpdateContact = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Convert to numbers for comparison
      const districtId = editingContact.tempDistrict ? Number(editingContact.tempDistrict) : null
      const regencyId = editingContact.tempRegency ? Number(editingContact.tempRegency) : null
      const provinceId = editingContact.tempProvince ? Number(editingContact.tempProvince) : null

      const selectedDistrict = districtId ? districts.find(d => d.id === districtId) : null
      const selectedRegency = regencyId ? regencies.find(r => r.id === regencyId) : null
      
      let locationPayload = null
      
      if (selectedDistrict) {
        locationPayload = {
          type: 'DISTRICT',
          id: selectedDistrict.id,
          name: `${selectedDistrict.name}, ${selectedRegency?.name || ''}`,
          provinceId: provinceId,
          regencyId: regencyId,
          districtId: selectedDistrict.id
        }
      } else if (selectedRegency) {
        locationPayload = {
          type: 'REGENCY',
          id: selectedRegency.id,
          name: selectedRegency.name,
          provinceId: provinceId,
          regencyId: selectedRegency.id
        }
      }

      const payload = {
        name: editingContact.name,
        tags: editingContact.tempTags.split(',').map(t => t.trim()).filter(t => t),
        location: locationPayload
      }

      await apiClient.put(`/contacts/${editingContact.id}`, payload)
      setIsEditModalOpen(false)
      fetchContacts()
    } catch (error) {
      console.error('Update failed:', error)
      showAlert('Error', 'Failed to update contact. Please check your data.')
    } finally {
      setLoading(false)
    }
  }

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

  const handleBulkDelete = () => {
    if (!selectedContacts.length) return
    showConfirm(
      'Bulk Delete', 
      `Are you sure you want to delete ${selectedContacts.length} contacts? This action is permanent.`,
      performBulkDelete
    )
  }

  const performBulkDelete = async () => {
    try {
      setLoading(true)
      await apiClient.delete('/contacts', { data: { ids: selectedContacts } })
      setSelectedContacts([])
      closeDialog()
      fetchContacts()
    } catch (error) {
      console.error('Bulk delete failed:', error)
      closeDialog()
      showAlert('Error', 'Failed to delete contacts.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id) => {
    showConfirm('Delete Contact', 'Are you sure you want to delete this contact? This action is permanent.', () => performDelete(id))
  }

  const performDelete = async (id) => {
    try {
      setLoading(true)
      await apiClient.delete(`/contacts/${id}`)
      closeDialog()
      fetchContacts()
    } catch (error) {
      console.error('Delete failed:', error)
      closeDialog()
      showAlert('Error', 'Failed to delete contact.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (contact) => {
    try {
      setLoading(true)
      await apiClient.put(`/contacts/${contact.id}`, { isActive: !contact.isActive })
      fetchContacts()
    } catch (error) {
      console.error('Toggle status failed:', error)
      showAlert('Error', 'Failed to update contact status.')
    } finally {
      setLoading(false)
    }
  }

  // Remove the simple handleEditName as it's replaced by openEditModal logic
  // ...

  const { t } = useLanguage()

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center space-x-3">
            <Users className="text-primary" />
            <span>{t('contacts.title')}</span>
          </h2>
          <p className="text-muted-foreground mt-1">{t('contacts.subtitle')}</p>
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
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`p-2.5 rounded-xl border transition-all ${
              isFilterOpen ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/30 text-muted-foreground hover:text-white hover:border-primary/50'
            }`}
          >
            <Filter size={18} />
          </button>
        </div>

        {selectedContacts.length > 0 && (
          <div className="flex items-center space-x-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-lg">{selectedContacts.length} Selected</span>
            <button className="p-2 text-muted-foreground hover:text-white transition-all"><Tag size={18} /></button>
            <button 
              onClick={handleBulkDelete}
              className="p-2 text-muted-foreground hover:text-destructive transition-all"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Advanced Filter Panel */}
      {isFilterOpen && (
        <div className="bg-card border border-border rounded-2xl p-6 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Filter size={16} className="text-primary" />
              <span>Advanced Filters</span>
            </h3>
            <button 
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-primary transition-all"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Province</label>
              <select 
                value={filters.province}
                onChange={(e) => handleFilterProvinceChange(e.target.value)}
                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">All Provinces</option>
                {filterProvinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">City/Regency</label>
              <select 
                value={filters.regency}
                disabled={!filters.province}
                onChange={(e) => handleFilterRegencyChange(e.target.value)}
                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none disabled:opacity-30"
              >
                <option value="">All Cities</option>
                {filterRegencies.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">District</label>
              <select 
                value={filters.district}
                disabled={!filters.regency}
                onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none disabled:opacity-30"
              >
                <option value="">All Districts</option>
                {filterDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tags</label>
              <input 
                type="text"
                value={filters.tags}
                onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
                placeholder="tag1, tag2..."
                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>
        </div>
      )}

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
                          {contact.attributes?.location && (
                            <span className="flex items-center space-x-1 ml-2 text-primary">
                              <MapPin size={10} />
                              <span>{contact.attributes.location}</span>
                            </span>
                          )}
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
                    <button 
                      onClick={() => handleToggleStatus(contact)}
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer hover:scale-105 transition-transform ${
                        contact.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${contact.isActive ? 'bg-emerald-500' : 'bg-muted-foreground'}`}></div>
                      <span>{contact.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                    </button>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end space-x-2">
                       <button 
                         onClick={() => fetchChatHistory(contact)}
                         className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-blue-400 transition-all"
                         title="View Chat History"
                       >
                          <MessageSquare size={16} />
                       </button>
                       <button 
                         onClick={() => openEditModal(contact)}
                         className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-all"
                       >
                          <Edit2 size={16} />
                       </button>
                       <button 
                         onClick={() => handleDelete(contact.id)}
                         className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive transition-all"
                       >
                          <Trash2 size={16} />
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

      {/* Edit Contact Modal */}
      {isEditModalOpen && editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
          
          <div className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-xl font-bold text-white flex items-center space-x-3">
                <Edit2 className="text-primary" size={20} />
                <span>Edit Contact 👤</span>
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-muted-foreground hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateContact} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Full Name</label>
                <input 
                  type="text"
                  value={editingContact.name}
                  onChange={(e) => setEditingContact({...editingContact, name: e.target.value})}
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                  placeholder="Enter name..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Province</label>
                  <select 
                    value={editingContact.tempProvince}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingContact({...editingContact, tempProvince: val, tempRegency: '', tempDistrict: ''});
                      fetchRegencies(val);
                    }}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="">Select Province</option>
                    {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">City/Regency</label>
                  <select 
                    value={editingContact.tempRegency}
                    disabled={!editingContact.tempProvince}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingContact({...editingContact, tempRegency: val, tempDistrict: ''});
                      fetchDistricts(val);
                    }}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none disabled:opacity-30"
                  >
                    <option value="">Select City</option>
                    {regencies.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">District</label>
                  <select 
                    value={editingContact.tempDistrict}
                    disabled={!editingContact.tempRegency}
                    onChange={(e) => setEditingContact({...editingContact, tempDistrict: e.target.value})}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none disabled:opacity-30"
                  >
                    <option value="">Select District</option>
                    {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right block">Tags (comma separated)</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input 
                    type="text"
                    value={editingContact.tempTags}
                    onChange={(e) => setEditingContact({...editingContact, tempTags: e.target.value})}
                    className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                    placeholder="tag1, tag2..."
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:text-white hover:bg-muted/30 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary shadow-lg shadow-primary/20 text-sm font-bold text-white hover:brightness-110 active:scale-95 transition-all flex items-center space-x-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chat History Modal */}
      {isChatHistoryOpen && chatContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsChatHistoryOpen(false)}></div>
          
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-xl font-bold text-white flex items-center space-x-3">
                <MessageSquare className="text-blue-400" size={20} />
                <span>Chat History - {chatContact.name}</span>
              </h3>
              <button 
                onClick={() => setIsChatHistoryOpen(false)}
                className="p-2 text-muted-foreground hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 max-h-[500px] overflow-y-auto space-y-4">
              {chatLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-primary" size={40} />
                </div>
              ) : chatHistory.length > 0 ? (
                chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white ml-auto' 
                        : 'bg-muted/30 text-white border border-border mr-auto'
                    }`}>
                      <p className="text-sm shadow-sm whitespace-pre-wrap">{msg.message}</p>
                      <div className={`text-[9px] mt-2 flex items-center space-x-1 ${
                        msg.role === 'user' ? 'text-white/70 justify-end' : 'text-muted-foreground justify-start'
                      }`}>
                        <span>
                          {msg.createdAt && !isNaN(new Date(msg.createdAt)) 
                            ? new Date(msg.createdAt).toLocaleString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: 'short'
                              })
                            : 'Just now'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No chat history found</p>
                </div>
              )}
            </div>
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

export default Contacts
