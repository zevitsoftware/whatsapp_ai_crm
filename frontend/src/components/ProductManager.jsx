import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Calendar, Tag, CheckCircle, Image as ImageIcon, Loader2, Edit3 } from 'lucide-react'
import apiClient from '../api/client'

const ProductManager = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  
  // Dialog State
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm', // 'confirm' or 'alert'
    onConfirm: null
  })

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    discount: '',
    promoEndDate: '',
    description: '',
    isPrimary: false,
    image: null
  })

  // Fetch Products
  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/products')
      setProducts(response.data)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const [showSuccess, setShowSuccess] = useState(false)

  const resetForm = () => {
    setEditingProduct(null)
    setFormData({ title: '', price: '', discount: '', promoEndDate: '', description: '', isPrimary: false, image: null })
    setImagePreview(null)
  }

  const handleEditClick = (product, e) => {
    if (e) e.stopPropagation()
    setEditingProduct(product)
    setFormData({
      title: product.title,
      price: product.price,
      discount: product.discount || '',
      promoEndDate: product.promoEndDate ? new Date(product.promoEndDate).toISOString().split('T')[0] : '',
      description: product.description,
      isPrimary: product.isPrimary,
      image: null
    })
    const rootUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api$/, '')
    setImagePreview(product.imagePath ? `${rootUrl}${product.imagePath}` : null)
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleDeleteClick = (id, e) => {
    if (e) e.stopPropagation()
    setDialog({
      isOpen: true,
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      type: 'confirm',
      onConfirm: () => performDelete(id)
    })
  }

  const performDelete = async (id) => {
    try {
      await apiClient.delete(`/products/${id}`)
      fetchProducts()
      triggerSuccess()
    } catch (error) {
      console.error('Delete failed:', error)
      showAlertDialog('Error', 'Failed to delete product')
    }
  }

  const triggerSuccess = () => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const showAlertDialog = (title, message) => {
    setDialog({
      isOpen: true,
      title,
      message,
      type: 'alert',
      onConfirm: null
    })
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 1024 * 1024) return showAlertDialog('File Too Large', 'Max image size is 1MB')
      
      setFormData({ ...formData, image: file })
      
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const data = new FormData()
    data.append('title', formData.title)
    data.append('price', formData.price)
    data.append('discount', formData.discount || '')
    data.append('promoEndDate', formData.promoEndDate || '')
    data.append('description', formData.description)
    data.append('isPrimary', formData.isPrimary)
    if (formData.image) data.append('image', formData.image)

    try {
      if (editingProduct) {
        await apiClient.put(`/products/${editingProduct.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        await apiClient.post('/products', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
      setIsModalOpen(false)
      fetchProducts()
      resetForm()
      triggerSuccess()
    } catch (error) {
      console.error('Save failed:', error)
      showAlertDialog('Error', 'Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 relative">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-24 right-8 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-[60] animate-in slide-in-from-right-10 duration-300">
           <CheckCircle size={20} />
           <span className="font-bold text-sm">Action successful!</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
           <h3 className="text-xl font-bold text-white">Product Catalog 🏷️</h3>
           <p className="text-sm text-white/40 mt-1">Sync your products to the AI knowledge base automatically.</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {loading && products.length === 0 ? (
        <div className="flex justify-center p-12">
           <Loader2 className="animate-spin text-white opacity-50 block" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <div 
              key={product.id} 
              onClick={(e) => handleEditClick(product, e)}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:border-indigo-500/50 hover:bg-white/[0.07] transition-all cursor-pointer shadow-xl"
            >
              {/* Image Area */}
              <div className="h-44 bg-black/20 relative">
                {product.imagePath ? (
                  <img 
                    src={`${(import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api$/, '')}${product.imagePath}`} 
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = 'https://placehold.co/400x300?text=No+Image';
                    }} 
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-white/20">
                    <ImageIcon size={40} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
                   <div className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 scale-90 group-hover:scale-100 transition-transform">
                      <Edit3 size={14} /> Quick Edit
                   </div>
                </div>
                
                {product.isPrimary && (
                   <span className="absolute top-3 left-3 bg-indigo-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-indigo-500/40 z-10">
                     <CheckCircle size={10} /> Best Seller
                   </span>
                )}
              </div>
              
              {/* Content */}
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                   <h4 className="font-bold text-lg text-white/90 truncate pr-2 group-hover:text-indigo-400 transition-colors">{product.title}</h4>
                   <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleEditClick(product, e)}
                        className="p-1.5 transition-colors bg-white/10 rounded-lg hover:text-indigo-400"
                        title="Edit Product"
                      >
                         <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteClick(product.id, e)}
                        className="p-1.5 transition-colors bg-white/10 rounded-lg hover:text-red-400"
                        title="Delete Product"
                      >
                         <Trash2 size={16} />
                      </button>
                   </div>
                </div>
                
                <div className="flex items-center justify-between">
                   <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-emerald-400">Rp {Number(product.price).toLocaleString('id-ID')}</span>
                      {product.discount > 0 && (
                         <span className="text-xs text-red-400/70 line-through">
                           {product.discount < 100 
                              ? `${product.discount}%` 
                              : `Rp ${Number(product.discount).toLocaleString('id-ID')}`}
                         </span>
                      )}
                   </div>
                   
                   {product.promoEndDate && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
                         <Calendar size={10} />
                         Ends: {new Date(product.promoEndDate).toLocaleDateString()}
                      </div>
                   )}
                </div>
                
                <p className="text-xs leading-relaxed text-white/40 line-clamp-3 min-h-[45px]">
                  {product.description || 'No description provided.'}
                </p>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                   <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Knowledge Ready</span>
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                </div>
              </div>
            </div>
          ))}
          
          {products.length === 0 && !loading && (
             <div className="col-span-full border border-dashed border-white/10 rounded-3xl p-16 text-center text-white/40">
                <Tag className="mx-auto mb-4 opacity-20" size={48} />
                <h4 className="text-white/60 font-bold mb-1">Catalog is empty</h4>
                <p className="text-sm">Manage your collections here for the AI to train on them.</p>
             </div>
          )}
        </div>
      )}

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl scale-in-center">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                 <h2 className="text-xl font-bold text-white">{editingProduct ? 'Edit Product 🔧' : 'New Product ✨'}</h2>
                 <p className="text-xs text-white/40 mt-0.5">{editingProduct ? 'Updating your existing catalog entry.' : 'Adding a new item to your AI knowledge base.'}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                 <Plus className="rotate-45" size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
              
              {/* Image Upload Area */}
              <div className="flex flex-col items-center">
                 <label className="relative cursor-pointer group">
                    <div className={`w-40 h-40 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${!imagePreview ? 'hover:border-indigo-500 hover:bg-indigo-500/5 bg-white/5' : 'border-indigo-500 bg-black'}`}>
                       {imagePreview ? (
                          <img src={imagePreview} className="w-full h-full object-cover" />
                       ) : (
                          <>
                             <div className="p-3 bg-white/5 rounded-full mb-2 group-hover:bg-indigo-500/20 transition-colors">
                                <ImageIcon className="text-white/40 group-hover:text-indigo-400" size={24} />
                             </div>
                             <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Select Image</span>
                          </>
                       )}
                       
                       {imagePreview && (
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-xs font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-lg">Change Photo</span>
                         </div>
                       )}
                    </div>
                    <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleImageChange} />
                 </label>
                 <p className="text-[10px] text-white/20 mt-3 font-medium">PNG or JPG, Max 1MB</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Product Title</label>
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
                    placeholder="e.g. Essential Oil Lavendar"  
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Base Price (Rp)</label>
                      <input 
                        type="number" 
                        required
                        value={formData.price}
                        onChange={e => setFormData({...formData, price: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/10 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                        placeholder="50000"  
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Discount (Value/%)</label>
                      <input 
                        type="number" 
                        value={formData.discount}
                        onChange={e => setFormData({...formData, discount: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/10 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                        placeholder="0"  
                      />
                   </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Promo Effective Until</label>
                  <div className="relative">
                     <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                     <input 
                       type="date" 
                       value={formData.promoEndDate}
                       onChange={e => setFormData({...formData, promoEndDate: e.target.value})}
                       className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 icon-invert font-medium"
                     />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Deep Description (AI Training)</label>
                  <textarea 
                    required
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500 transition-all text-sm leading-relaxed"
                    placeholder="Include detailed benefits, ingredients, and usage instructions. These will be used by the AI Agent to answer customer queries."  
                  />
                </div>

                <label className="flex items-center gap-3 bg-white/5 p-4 rounded-xl cursor-pointer hover:bg-white/[0.08] border border-white/5 transition-colors group">
                   <div className={`w-5 h-5 rounded border ${formData.isPrimary ? 'bg-indigo-600 border-indigo-600' : 'border-white/20'} flex items-center justify-center transition-all`}>
                      {formData.isPrimary && <CheckCircle size={14} className="text-white" />}
                   </div>
                   <input 
                     type="checkbox"
                     checked={formData.isPrimary}
                     onChange={e => setFormData({...formData, isPrimary: e.target.checked})}
                     className="hidden" 
                   />
                   <div>
                      <span className="text-sm font-bold text-white/80 block group-hover:text-white transition-colors">Primary Showcase Item</span>
                      <span className="text-[10px] text-white/30 font-medium">Highlight this item in your AI catalogs and testing.</span>
                   </div>
                </label>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-4 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all border border-white/5 active:scale-95"
                >
                  Discard
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all flex justify-center items-center gap-2 shadow-xl shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
                >
                  {loading && <Loader2 className="animate-spin" size={16} />}
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Dialog */}
      {dialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl scale-in-center">
            <div className="p-6 text-center">
              <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${dialog.type === 'confirm' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                {dialog.type === 'confirm' ? <Calendar size={24} /> : <Trash2 size={24} />}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{dialog.title}</h3>
              <p className="text-white/60 mb-6 text-sm">{dialog.message}</p>
              
              <div className="flex gap-3">
                {dialog.type === 'confirm' ? (
                  <>
                    <button 
                      onClick={() => setDialog({ ...dialog, isOpen: false })}
                      className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors text-sm font-bold"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        dialog.onConfirm();
                        setDialog({ ...dialog, isOpen: false });
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors text-sm font-bold"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setDialog({ ...dialog, isOpen: false })}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors text-sm font-bold"
                  >
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductManager
