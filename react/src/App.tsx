import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TapsilatProvider,
  useTapsilatOrder,
  useTapsilatSubscription,
  useTapsilatOrganization,
  useTapsilatHealth,
  useTapsilatPaymentTerm,
  useTapsilatWebhook,
  type OrderCreateRequest,
} from '@tapsilat/tapsilat-react';
import './App.css';

// --- Utils ---
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
};

const StatusBadge = ({ status }: { status?: string | number }) => {
  let color = 'secondary';
  const s = String(status || '').toLowerCase();
  
  if (['paid', 'success', 'active', 'completed', 'approved'].some(x => s.includes(x))) color = 'success';
  else if (['msg', 'fail', 'cancel', 'reject', 'suspend'].some(x => s.includes(x))) color = 'danger';
  else if (['wait', 'pending', 'process'].some(x => s.includes(x))) color = 'warning';
  else if (['info', 'new'].some(x => s.includes(x))) color = 'info';

  return <span className={`badge bg-${color}`}>{status || 'UNKNOWN'}</span>;
};

// --- Views ---

const ShopView = () => {
    const { createOrder } = useTapsilatOrder();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // State
    const [cart, setCart] = useState([
        { id: 1, name: "Premium Widget", price: 100.0, quantity: 1 }
    ]);
    const [settings, setSettings] = useState({
        conversationId: "CONV_" + Math.floor(Date.now() / 1000),
        description: "Order via React Dashboard",
        locale: "tr",
        currency: "TRY",
        force3d: true,
        installment: 1
    });
    const [billing, setBilling] = useState({
        contactName: "John Doe",
        email: "john@example.com",
        phone: "5551234567",
        vat: "11111111111",
        address: "Besiktas Main St",
        city: "Istanbul",
        zip: "34000",
        sameAddress: true
    });

    // Helpers
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    const addItem = () => {
        const id = cart.length > 0 ? Math.max(...cart.map(i=>i.id)) + 1 : 1;
        setCart([...cart, { id, name: "New Item", price: 50, quantity: 1 }]);
    };
    
    const updateItem = (id: number, field: string, val: any) => {
        setCart(cart.map(i => i.id === id ? { ...i, [field]: val } : i));
    };
    
    const removeItem = (id: number) => setCart(cart.filter(i => i.id !== id));
    
    const handleCreate = async () => {
        setLoading(true);
        try {
           const payload: OrderCreateRequest = {
               amount: total,
               currency: settings.currency as any,
               locale: settings.locale,
               conversation_id: settings.conversationId,
               description: settings.description,
               three_d_force: settings.force3d,
               enabled_installments: [1, 2, 3, 6, 9, 12],
               payment_success_url: window.location.origin + "/payment/success",
               payment_failure_url: window.location.origin + "/payment/failure",
               basket_items: cart.map(i => ({
                   id: String(i.id),
                   name: i.name,
                   category1: "General",
                   item_type: "PHYSICAL",
                   price: i.price * i.quantity,
                   quantity: 1
               })),
               buyer: {
                   name: billing.contactName.split(" ")[0] || "John",
                   surname: billing.contactName.split(" ")[1] || "Doe",
                   email: billing.email,
                   gsm_number: billing.phone,
                   identity_number: billing.vat,
                   registration_address: billing.address,
                   city: billing.city,
                   country: "Turkey",
                   ip: "127.0.0.1"
               },
               billing_address: {
                   contact_name: billing.contactName,
                   city: billing.city,
                   country: "Turkey",
                   address: billing.address,
                   zip_code: billing.zip
               },
               shipping_address: { // Simplified same address logic
                   contact_name: billing.contactName,
                   city: billing.city,
                   country: "Turkey",
                   address: billing.address,
                   zip_code: billing.zip
               }
           }; 
           
           const res = await createOrder(payload);
           if (res.checkout_url) {
               window.location.href = res.checkout_url;
           } else {
               alert("Order Created! Ref: " + res.reference_id);
           }
        } catch(e: any) {
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Create New Order</h2>
            <div className="card p-4">
                <div className="shop-indicator">
                    <div className={`shop-ind-item ${step >= 1 ? 'active' : ''}`}>1</div>
                    <div className={`shop-ind-item ${step >= 2 ? 'active' : ''}`}>2</div>
                    <div className={`shop-ind-item ${step >= 3 ? 'active' : ''}`}>3</div>
                </div>
                
                {/* Step 1 */}
                <div className={`shop-step ${step === 1 ? 'active' : ''}`}>
                    <div className="d-flex justify-content-between mb-3">
                        <h4>Cart & Settings</h4>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setSettings({...settings, conversationId: "CONV_"+Date.now()})}>Randomize</button>
                    </div>
                    
                    <div className="row g-3 mb-3">
                        <div className="col-md-6">
                            <label className="form-label">Conversation ID</label>
                            <input className="form-control" value={settings.conversationId} onChange={e=>setSettings({...settings, conversationId: e.target.value})} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Currency</label>
                            <select className="form-select" value={settings.currency} onChange={e=>setSettings({...settings, currency: e.target.value})}>
                                <option value="TRY">TRY</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">3D Secure</label>
                            <div className="form-check form-switch mt-2">
                                <input className="form-check-input" type="checkbox" checked={settings.force3d} onChange={e=>setSettings({...settings, force3d: e.target.checked})} />
                            </div>
                        </div>
                    </div>
                    
                    {/* Cart */}
                    <table className="table table-sm">
                        <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th></th></tr></thead>
                        <tbody>
                            {cart.map(item => (
                                <tr key={item.id}>
                                    <td><input className="form-control form-control-sm" value={item.name} onChange={e=>updateItem(item.id, 'name', e.target.value)} /></td>
                                    <td><input type="number" className="form-control form-control-sm" value={item.price} onChange={e=>updateItem(item.id, 'price', parseFloat(e.target.value))} /></td>
                                    <td><input type="number" className="form-control form-control-sm" value={item.quantity} onChange={e=>updateItem(item.id, 'quantity', parseInt(e.target.value))} /></td>
                                    <td><button className="btn btn-sm text-danger" onClick={()=>removeItem(item.id)}>x</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button className="btn btn-sm btn-outline-primary mb-3" onClick={addItem}>+ Add Item</button>
                    
                    <div className="text-end border-top pt-3">
                        <h4>Total: {formatCurrency(total, settings.currency)}</h4>
                        <button className="btn btn-primary" onClick={()=>setStep(2)}>Next: Address</button>
                    </div>
                </div>

                {/* Step 2 */}
                <div className={`shop-step ${step === 2 ? 'active' : ''}`}>
                    <h4>Billing Info</h4>
                    <div className="row g-2">
                         <div className="col-6"><input className="form-control" placeholder="Name" value={billing.contactName} onChange={e=>setBilling({...billing, contactName: e.target.value})} /></div>
                         <div className="col-6"><input className="form-control" placeholder="Email" value={billing.email} onChange={e=>setBilling({...billing, email: e.target.value})} /></div>
                         <div className="col-6"><input className="form-control" placeholder="Phone" value={billing.phone} onChange={e=>setBilling({...billing, phone: e.target.value})} /></div>
                         <div className="col-12"><input className="form-control" placeholder="Address" value={billing.address} onChange={e=>setBilling({...billing, address: e.target.value})} /></div>
                         <div className="col-4"><input className="form-control" placeholder="City" value={billing.city} onChange={e=>setBilling({...billing, city: e.target.value})} /></div>
                    </div>
                    <div className="mt-3 d-flex justify-content-between">
                        <button className="btn btn-secondary" onClick={()=>setStep(1)}>Back</button>
                        <button className="btn btn-primary" onClick={()=>setStep(3)}>Next: Payment</button>
                    </div>
                </div>
                
                {/* Step 3 */}
                <div className={`shop-step ${step === 3 ? 'active' : ''}`}>
                     <h4>Finalize</h4>
                     <p>Ready to create order of <b>{formatCurrency(total, settings.currency)}</b>.</p>
                     <div className="mt-3 d-flex justify-content-between">
                        <button className="btn btn-secondary" onClick={()=>setStep(2)}>Back</button>
                        <button className="btn btn-success" onClick={handleCreate} disabled={loading}>{loading ? 'Creating...' : 'Create Order'}</button>
                    </div>
                </div>

            </div>
        </div>
    );
};

const OrdersView = () => {
    const { listOrders, fetchOrder, cancelOrder, refundOrder } = useTapsilatOrder();
    const [orders, setOrders] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState({ refId: '', orgId: '' });
    
    // Deail Modal
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res: any = await listOrders({ 
                page, 
                per_page: 10,
                organization_id: filter.orgId,
                related_reference_id: filter.refId
            });
            setOrders(res.items || res.rows || []);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, [listOrders, page, filter]); // eslint-disable-line

    useEffect(() => { loadOrders(); }, [loadOrders]);

    const openDetail = async (refId: string) => {
        setDetailLoading(true); 
        try {
            const data = await fetchOrder(refId); 
            setSelectedOrder(data);
        } catch(e) { alert("Failed to load detail"); }
        finally { setDetailLoading(false); }
    };
    
    // Actions
    const handleCancel = async () => {
        if(!selectedOrder || !confirm("Cancel order?")) return;
        try { await cancelOrder(selectedOrder.reference_id); alert("Cancelled!"); openDetail(selectedOrder.reference_id); loadOrders(); }
        catch(e: any) { alert(e.message); }
    };
    
     const handleRefund = async () => {
        if(!selectedOrder) return;
        const amt = prompt("Amount?");
        if(!amt) return;
        try { await refundOrder({ reference_id: selectedOrder.reference_id, amount: parseFloat(amt) }); alert("Refunded!"); openDetail(selectedOrder.reference_id); }
        catch(e: any) { alert(e.message); }
    };

    return (
        <div>
           <div className="d-flex justify-content-between mb-3">
               <h2>Order List</h2>
               <button className="btn btn-primary btn-sm" onClick={loadOrders}>Refresh</button>
           </div>
           
           <div className="card p-3 mb-3 bg-light">
               <div className="row g-2">
                   <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Ref ID" value={filter.refId} onChange={e=>setFilter({...filter, refId: e.target.value})} /></div>
                   <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Org ID" value={filter.orgId} onChange={e=>setFilter({...filter, orgId: e.target.value})} /></div>
                   <div className="col-md-2"><button className="btn btn-secondary btn-sm w-100" onClick={loadOrders}>Filter</button></div>
               </div>
           </div>

           <div className="card p-0">
               <table className="table table-hover mb-0">
                   <thead className="table-light"><tr><th>Ref ID</th><th>Amount</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                   <tbody>
                       {loading ? <tr><td colSpan={5} className="text-center">Loading...</td></tr> : 
                        orders.map(o => (
                           <tr key={o.reference_id}>
                               <td className="font-monospace">{o.reference_id}</td>
                               <td>{o.amount} {o.currency}</td>
                               <td><StatusBadge status={o.status} /></td>
                               <td>{o.created_at}</td>
                               <td><button className="btn btn-sm btn-info" onClick={()=>openDetail(o.reference_id)}>View</button></td>
                           </tr>
                       ))}
                   </tbody>
               </table>
               <div className="card-footer d-flex justify-content-between">
                   <button className="btn btn-sm btn-outline-secondary" disabled={page<=1} onClick={()=>setPage(page-1)}>Prev</button>
                   <span>Page {page}</span>
                   <button className="btn btn-sm btn-outline-secondary" onClick={()=>setPage(page+1)}>Next</button>
               </div>
           </div>
           
           {/* Detail Modal Overlay (Custom simple modal for React example without Bootstrap JS dependency) */}
           {selectedOrder && (
               <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                   <div className="modal-dialog modal-xl">
                       <div className="modal-content">
                           <div className="modal-header">
                               <h5 className="modal-title">Order: {selectedOrder.reference_id}</h5>
                               <button className="btn-close" onClick={()=>setSelectedOrder(null)}></button>
                           </div>
                           <div className="modal-body">
                               {detailLoading ? "Refreshing..." : (
                                   <div className="row">
                                       <div className="col-md-6">
                                           <h6>Basic Info</h6>
                                           <table className="table table-sm table-bordered">
                                               <tbody>
                                                   <tr><th>Status</th><td><StatusBadge status={selectedOrder.status} /></td></tr>
                                                   <tr><th>Amount</th><td>{selectedOrder.amount} {selectedOrder.currency}</td></tr>
                                                   <tr><th>Conversation</th><td>{selectedOrder.conversation_id}</td></tr>
                                               </tbody>
                                           </table>
                                           <div className="d-flex gap-2">
                                               <button className="btn btn-danger btn-sm" onClick={handleCancel}>Cancel</button>
                                               <button className="btn btn-warning btn-sm" onClick={handleRefund}>Refund</button>
                                           </div>
                                       </div>
                                       <div className="col-md-6">
                                            <h6>Raw Data</h6>
                                            <pre style={{maxHeight:'200px', overflow:'auto', fontSize:'0.7rem'}}>{JSON.stringify(selectedOrder, null, 2)}</pre>
                                       </div>
                                   </div>
                               )}
                           </div>
                       </div>
                   </div>
               </div>
           )}
        </div>
    );
};

const SubscriptionsView = () => {
    const { listSubscriptions, createSubscription, cancelSubscription } = useTapsilatSubscription();
    const [subs, setSubs] = useState<any[]>([]);
    
    useEffect(() => { 
        listSubscriptions().then((res:any) => setSubs(res.items||res.rows||[])); 
    }, [listSubscriptions]); // eslint-disable-line

    const handleCreate = async () => {
        try {
            const res = await createSubscription({
                title: "Gold Plan", amount: 49.90, period: 30, currency: "TRY",
                success_url: "http://localhost", failure_url: "http://localhost",
                user: { email: "sub@test.com", first_name: "Sub", last_name: "User", phone: "5551112233" },
                billing: { contact_name: "Sub User", city: "Istanbul", country: "Turkey", address: "Sisli", zip_code: "34000" }
            });
            if(res.checkout_url) window.location.href = res.checkout_url;
        } catch(e: any) { alert(e.message); }
    };
    
    const handleCancel = async (id: string) => {
        if(!confirm("Cancel?")) return;
        try { await cancelSubscription({ reference_id: id }); alert("Cancelled"); }
        catch(e: any) { alert(e.message); }
    };

    return (
        <div>
            <div className="d-flex justify-content-between mb-3">
                <h2>Subscriptions</h2>
                <button className="btn btn-primary" onClick={handleCreate}>+ New Subscription</button>
            </div>
            <div className="card">
                <div className="list-group list-group-flush">
                    {subs.map(s => (
                        <div key={s.reference_id} className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <h5 className="mb-1">{s.title} ({s.reference_id})</h5>
                                <small>Status: {s.status} | Period: {s.period} days | Amount: {s.amount}</small>
                            </div>
                            <button className="btn btn-sm btn-danger" onClick={()=>handleCancel(s.reference_id)}>Cancel</button>
                        </div>
                    ))}
                    {subs.length===0 && <div className="p-3 text-center">No subscriptions</div>}
                </div>
            </div>
        </div>
    );
};

const SubmerchantsView = () => {
    const { fetchOrderSubmerchants } = useTapsilatOrder();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetchOrderSubmerchants({ page: 1, per_page: 20 })
            .then((res: any) => setItems(res.items || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [fetchOrderSubmerchants]); // eslint-disable-line

    return (
        <div>
            <h2>Submerchants</h2>
            <div className="card">
                <table className="table table-striped">
                    <thead><tr><th>ID</th><th>Type</th><th>Name</th><th>Email</th><th>Status</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={5}>Loading...</td></tr> : 
                         items.map((s,i) => (
                             <tr key={i}>
                                 <td className="font-monospace">{s.submerchant_id}</td>
                                 <td>{s.type}</td>
                                 <td>{s.name}</td>
                                 <td>{s.email}</td>
                                 <td><StatusBadge status={s.status===1?'Active':'Inactive'} /></td>
                             </tr>
                         ))}
                         {items.length===0 && !loading && <tr><td colSpan={5}>No data</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const OrganizationView = () => {
    const { fetchSettings } = useTapsilatOrganization();
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => { fetchSettings().then(setSettings).catch(console.error); }, [fetchSettings]); // eslint-disable-line

    return (
        <div>
            <h2>Organization Settings</h2>
            <div className="card p-4">
                {settings ? (
                    <table className="table table-bordered">
                        <tbody>
                            <tr><th>Org ID</th><td>{settings.organization_id}</td></tr>
                            <tr><th>Name</th><td>{settings.name}</td></tr>
                            <tr><th>Status</th><td>{settings.status}</td></tr>
                            <tr><th>Created At</th><td>{settings.created_at}</td></tr>
                        </tbody>
                    </table>
                ) : <p>Loading...</p>}
            </div>
        </div>
    );
};

const WebhookView = () => {
    // Note: React app usually can't monitor server-side webhooks unless there's a backend endpoint
    // We will assume simpler client-side verify tool or static placeholder
    return (
        <div>
            <h2>Webhook Monitor</h2>
            <div className="card p-4">
                <p>Webhook monitoring requires a backend polling endpoint. This is a React SPA.</p>
                <div className="alert alert-info">Use the PHP/Go examples or a real backend to receive webhooks.</div>
            </div>
        </div>
    );
};

// --- App Shell ---

function DashboardShell() {
    const [view, setView] = useState('shop');
    
    const renderView = () => {
        switch(view) {
            case 'shop': return <ShopView />;
            case 'orders': return <OrdersView />;
            case 'subscriptions': return <SubscriptionsView />;
            case 'submerchants': return <SubmerchantsView />;
            case 'organization': return <OrganizationView />;
            case 'webhooks': return <WebhookView />;
            default: return <ShopView />;
        }
    };

    return (
        <div>
            <nav className="sidebar">
                <a href="#" className="brand"><i className="fas fa-cubes me-2"></i> Tapsilat React</a>
                <div className="nav-menu">
                    <button className={`nav-item ${view==='shop'?'active':''}`} onClick={()=>setView('shop')}><i className="fas fa-shopping-cart"></i> New Order</button>
                    <button className={`nav-item ${view==='orders'?'active':''}`} onClick={()=>setView('orders')}><i className="fas fa-list"></i> Orders</button>
                    <button className={`nav-item ${view==='subscriptions'?'active':''}`} onClick={()=>setView('subscriptions')}><i className="fas fa-sync"></i> Subscriptions</button>
                    <button className={`nav-item ${view==='submerchants'?'active':''}`} onClick={()=>setView('submerchants')}><i className="fas fa-store"></i> Submerchants</button>
                    <button className={`nav-item ${view==='organization'?'active':''}`} onClick={()=>setView('organization')}><i className="fas fa-building"></i> Organization</button>
                    <button className={`nav-item ${view==='webhooks'?'active':''}`} onClick={()=>setView('webhooks')}><i className="fas fa-broadcast-tower"></i> Webhooks</button>
                </div>
            </nav>
            <main className="main-content">
                {renderView()}
            </main>
        </div>
    );
}

function App() {
  const [token, setToken] = useState('');
  const [isAuth, setIsAuth] = useState(false);

  if(!isAuth) {
      return (
          <div className="auth-container">
              <div className="auth-card">
                  <h3 className="text-center mb-4">Tapsilat Dashboard</h3>
                  <div className="mb-3">
                      <label>API Key (Bearer Token)</label>
                      <input className="form-control" type="password" value={token} onChange={e=>setToken(e.target.value)} />
                  </div>
                  <button className="btn btn-primary w-100" onClick={()=>setIsAuth(true)}>Connect</button>
              </div>
          </div>
      );
  }

  return (
    <TapsilatProvider config={{ bearerToken: token, baseURL: 'https://panel.tapsilat.dev/api/v1' }}>
      <DashboardShell />
    </TapsilatProvider>
  );
}

export default App;
