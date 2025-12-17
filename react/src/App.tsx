import React, { useState, useEffect, useCallback } from 'react';
import {
  TapsilatProvider,
  useTapsilatOrder,
  useTapsilatSubscription,
  useTapsilatOrganization,
  useTapsilatHealth,
  useTapsilatPaymentTerm,
  useTapsilatWebhook,
} from '@tapsilat/tapsilat-react';
import type { Order, OrganizationSettings } from '@tapsilat/tapsilat-react';
import './App.css';

// --- Components ---

const StatusBadge = ({ status }: { status?: string | number }) => {
  let type = '';
  const s = String(status ?? '').toLowerCase();
  
  const successList = ['completed', 'active', 'succeeded', 'paid', 'approved'];
  const warningList = ['pending', 'processing', 'created'];
  const dangerList = ['failed', 'cancelled', 'refunded', 'rejected', 'terminated'];

  if (successList.includes(s)) type = 'success';
  else if (warningList.includes(s)) type = 'warning';
  else if (dangerList.includes(s)) type = 'danger';
  
  return <span className={`badge ${type}`}>{status || 'UNKNOWN'}</span>;
};

const JSONView = ({ data }: { data: unknown }) => (
  <pre>{JSON.stringify(data, null, 2)}</pre>
);

// --- Views ---

const Overview = () => {
  const { checkHealth } = useTapsilatHealth();
  const { fetchSettings } = useTapsilatOrganization();
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);

  useEffect(() => {
    let mounted = true;
    checkHealth()
      .then((res) => { if(mounted) setHealth(res); })
      .catch(console.error);
    fetchSettings()
      .then((res) => { if(mounted) setSettings(res); })
      .catch(console.error);
    return () => { mounted = false; };
  }, [checkHealth, fetchSettings]);

  return (
    <div className="grid-3">
      <div className="card">
        <h2>System Status</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: 12, height: 12, borderRadius: '50%', 
            background: health?.status === 'ok' ? 'var(--success-color)' : 'var(--danger-color)' 
          }} />
          <span>{health?.status === 'ok' ? 'Operational' : 'Issues Detected'}</span>
        </div>
        <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Server Time: {health?.timestamp || '-'}
        </p>
      </div>

      <div className="card">
        <h2>Organization Settings</h2>
        {settings ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
             <div><strong>TTL:</strong> {settings.ttl}s</div>
             <div><strong>Retry Count:</strong> {settings.retry_count}</div>
             <div><strong>Payment Allowed:</strong> {settings.allow_payment ? 'Yes' : 'No'}</div>
          </div>
        ) : 'Loading...'}
      </div>
    </div>
  );
};

// --- Webhook Tool ---

const WebhookTester = () => {
  const { verifyWebhook, lastVerification, error } = useTapsilatWebhook();
  const [payload, setPayload] = useState('');
  const [signature, setSignature] = useState('');
  const [secret, setSecret] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const isValid = await verifyWebhook({ payload, signature, secret });
      alert(isValid ? 'Signature is VALID ✅' : 'Signature is INVALID ❌');
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="card">
      <h3>Webhook Signature Tester</h3>
      <p className="text-secondary" style={{ marginBottom: '1rem' }}>
        Verify Tapsilat webhook signatures client-side.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
        <div>
          <label>Webhook Secret</label>
          <input className="input" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Your webhook secret" />
        </div>
        <div>
          <label>Signature Header</label>
          <input className="input" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="x-tapsilat-signature" />
        </div>
        <div>
          <label>Payload (JSON)</label>
          <textarea 
            className="input" 
            style={{ minHeight: '150px', fontFamily: 'monospace' }}
            value={payload} 
            onChange={(e) => setPayload(e.target.value)} 
            placeholder='{"event": "..."}'
          />
        </div>
        
        <button className="btn btn-primary" onClick={handleVerify} disabled={verifying || !secret || !signature || !payload}>
          {verifying ? 'Verifying...' : 'Verify Signature'}
        </button>

        {lastVerification && (
          <div className={`alert ${lastVerification.isValid ? 'alert-success' : 'alert-danger'}`} style={{ marginTop: '1rem', padding: '1rem', borderRadius: '4px', background: lastVerification.isValid ? '#d4edda' : '#f8d7da', color: lastVerification.isValid ? '#155724' : '#721c24' }}>
            <strong>Result:</strong> {lastVerification.isValid ? 'Valid Signature' : 'Invalid Signature'}
          </div>
        )}
        
        {error && (
           <div style={{ marginTop: '1rem', color: 'red' }}>
             Error: {error.message}
           </div>
        )}
      </div>
    </div>
  );
};

// --- Create Views ---

const CreateOrderView = ({ onBack, onCreate }: { onBack: () => void; onCreate: () => void }) => {
  const { createOrder } = useTapsilatOrder();
  const [loading, setLoading] = useState(false);
  
  // Buyer State with Defaults
  const [buyer, setBuyer] = useState({
      name: 'John',
      surname: 'Doe',
      email: 'john.doe@example.com',
      phone: '+905555555555',
      identityNumber: '11111111111',
      address: 'Nispetiye Mah. Nispetiye Cad. No: 1',
      city: 'Istanbul',
      country: 'Turkey',
      zipCode: '34340'
  });

  // Basket State with Defaults
  const [items, setItems] = useState([
      { id: 'item1', name: 'Test Product 1', price: 100, type: 'PHYSICAL', category: 'Electronics', quantity: 1 },
      { id: 'item2', name: 'Test Product 2', price: 50,  type: 'VIRTUAL',  category: 'Software', quantity: 1 }
  ]);

  const [description, setDescription] = useState('React SDK Test Order');
  const [currency, setCurrency] = useState('TRY');

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleAddItem = () => {
      setItems([...items, { 
          id: `item-${Date.now()}`, 
          name: 'New Item', 
          price: 10, 
          type: 'PHYSICAL', 
          category: 'General', 
          quantity: 1 
      }]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: value };
      setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
      setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          await createOrder({
              amount: totalAmount,
              currency: currency as any,
              locale: 'tr',
              metadata: [{ key: 'description', value: description }],
              buyer: {
                  name: buyer.name,
                  surname: buyer.surname,
                  email: buyer.email,
                  gsm_number: buyer.phone,
                  identity_number: buyer.identityNumber,
                  registration_address: buyer.address,
                  city: buyer.city,
                  country: buyer.country,
                  ip: '127.0.0.1'
              },
              billing_address: {
                  contact_name: `${buyer.name} ${buyer.surname}`,
                  city: buyer.city,
                  country: buyer.country,
                  address: buyer.address,
                  zip_code: buyer.zipCode,
                  billing_type: 'PERSONAL'
              },
              shipping_address: {
                  contact_name: `${buyer.name} ${buyer.surname}`,
                  city: buyer.city,
                  country: buyer.country,
                  address: buyer.address,
                  zip_code: buyer.zipCode
              },
              basket_items: items.map(item => ({
                  id: item.id,
                  name: item.name,
                  category1: item.category,
                  item_type: item.type as any,
                  price: item.price,
                  quantity: item.quantity
              })),
              payment_success_url: window.location.origin + '/payment/success',
              payment_failure_url: window.location.origin + '/payment/failure',
              enabled_installments: [1, 2, 3, 6, 9, 12]
          });
          alert('Order created successfully!');
          onCreate();
      } catch (e: any) {
          console.error(e);
          alert(`Failed: ${e.message}`);
      } finally {
          setLoading(false);
      }
  };

  return (
      <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Create New Order</h3>
            <button className="btn btn-secondary" onClick={onBack}>Cancel</button>
          </div>
          <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  {/* Buyer Info */}
                  <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <h4>Buyer Information</h4>
                      <label>Name</label>
                      <input className="input" value={buyer.name} onChange={e => setBuyer({...buyer, name: e.target.value})} />
                      <label>Surname</label>
                      <input className="input" value={buyer.surname} onChange={e => setBuyer({...buyer, surname: e.target.value})} />
                      <label>Email</label>
                      <input className="input" value={buyer.email} onChange={e => setBuyer({...buyer, email: e.target.value})} />
                      <label>Phone</label>
                      <input className="input" value={buyer.phone} onChange={e => setBuyer({...buyer, phone: e.target.value})} />
                      <label>Identity / Tax ID</label>
                      <input className="input" value={buyer.identityNumber} onChange={e => setBuyer({...buyer, identityNumber: e.target.value})} />
                      <label>Address</label>
                      <input className="input" value={buyer.address} onChange={e => setBuyer({...buyer, address: e.target.value})} />
                  </div>

                  {/* Order Defaults */}
                  <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                     <h4>Order Settings</h4>
                     <label>Currency</label>
                     <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
                         <option value="TRY">TRY</option>
                         <option value="USD">USD</option>
                         <option value="EUR">EUR</option>
                     </select>
                     <label>Description</label>
                     <input className="input" value={description} onChange={e => setDescription(e.target.value)} />
                     
                     <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                         <h3>Total: {totalAmount} {currency}</h3>
                     </div>
                  </div>
              </div>

              {/* Basket Items */}
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h4>Basket Items</h4>
                    <button type="button" className="btn btn-secondary" onClick={handleAddItem}>+ Add Item</button>
                  </div>
                  <div className="table-responsive">
                      <table className="table">
                          <thead>
                              <tr>
                                  <th>Name</th>
                                  <th>Price</th>
                                  <th>Qty</th>
                                  <th>Category</th>
                                  <th>Type</th>
                                  <th>Action</th>
                              </tr>
                          </thead>
                          <tbody>
                              {items.map((item, idx) => (
                                  <tr key={item.id}>
                                      <td><input className="input" value={item.name} onChange={e => handleUpdateItem(idx, 'name', e.target.value)} /></td>
                                      <td><input className="input" type="number" value={item.price} onChange={e => handleUpdateItem(idx, 'price', parseFloat(e.target.value))} style={{width:'80px'}} /></td>
                                      <td><input className="input" type="number" value={item.quantity} onChange={e => handleUpdateItem(idx, 'quantity', parseInt(e.target.value))} style={{width:'60px'}} /></td>
                                      <td><input className="input" value={item.category} onChange={e => handleUpdateItem(idx, 'category', e.target.value)} /></td>
                                      <td>
                                          <select className="input" value={item.type} onChange={e => handleUpdateItem(idx, 'type', e.target.value)}>
                                              <option value="PHYSICAL">Physical</option>
                                              <option value="VIRTUAL">Virtual</option>
                                          </select>
                                      </td>
                                      <td>
                                          <button type="button" className="btn btn-secondary" style={{color:'red'}} onClick={() => handleRemoveItem(idx)}>X</button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                      {loading ? 'Creating Order...' : `Create Order (${totalAmount} ${currency})`}
                  </button>
              </div>
          </form>
      </div>
  )
};

const CreateSubscriptionView = ({ onBack, onCreate }: { onBack: () => void; onCreate: () => void }) => {
    const { createSubscription } = useTapsilatSubscription();
    const [loading, setLoading] = useState(false);
    
    const [plan, setPlan] = useState({
        title: 'Premium Plan',
        amount: 50,
        period: 30,
        currency: 'TRY'
    });

    const [subscriber, setSubscriber] = useState({
        firstName: 'Sub',
        lastName: 'Scriber',
        email: 'sub@example.com',
        phone: '+905555555555',
        identityNumber: '11111111111',
        address: 'Nispetiye Mah. Nispetiye Cad. No: 1',
        city: 'Istanbul',
        country: 'Turkey',
        zipCode: '34340'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createSubscription({
                title: plan.title,
                amount: plan.amount,
                period: plan.period,
                currency: plan.currency,
                cycle: 12, // Default 1 year
                payment_date: 1,
                user: {
                    first_name: subscriber.firstName,
                    last_name: subscriber.lastName,
                    email: subscriber.email,
                    phone: subscriber.phone,
                    address: subscriber.address,
                    city: subscriber.city,
                    country: subscriber.country,
                    zip_code: subscriber.zipCode,
                    identity_number: subscriber.identityNumber
                },
                billing: {
                    contact_name: `${subscriber.firstName} ${subscriber.lastName}`,
                    city: subscriber.city,
                    country: subscriber.country,
                    address: subscriber.address,
                    zip_code: subscriber.zipCode
                },
                success_url: window.location.origin + '/payment/success',
                failure_url: window.location.origin + '/payment/failure'
            });
            alert('Subscription created successfully!');
            onCreate();
        } catch (e: any) {
             console.error(e);
             alert(`Failed: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Create New Subscription</h3>
                <button className="btn btn-secondary" onClick={onBack}>Cancel</button>
            </div>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    
                    {/* Plan Settings */}
                    <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                        <h4>Plan Details</h4>
                        <label>Title</label>
                        <input className="input" value={plan.title} onChange={e => setPlan({...plan, title: e.target.value})} />
                        <label>Amount</label>
                        <input className="input" type="number" value={plan.amount} onChange={e => setPlan({...plan, amount: parseFloat(e.target.value)})} />
                        <label>Currency</label>
                        <select className="input" value={plan.currency} onChange={e => setPlan({...plan, currency: e.target.value})}>
                            <option value="TRY">TRY</option>
                            <option value="USD">USD</option>
                        </select>
                        <label>Period (Days)</label>
                        <input className="input" type="number" value={plan.period} onChange={e => setPlan({...plan, period: parseInt(e.target.value)})} />
                    </div>

                    {/* Subscriber Info */}
                    <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                        <h4>Subscriber Information</h4>
                        <label>First Name</label>
                        <input className="input" value={subscriber.firstName} onChange={e => setSubscriber({...subscriber, firstName: e.target.value})} />
                         <label>Last Name</label>
                        <input className="input" value={subscriber.lastName} onChange={e => setSubscriber({...subscriber, lastName: e.target.value})} />
                        <label>Email</label>
                        <input className="input" type="email" value={subscriber.email} onChange={e => setSubscriber({...subscriber, email: e.target.value})} />
                        <label>Phone</label>
                        <input className="input" value={subscriber.phone} onChange={e => setSubscriber({...subscriber, phone: e.target.value})} />
                         <label>Identity Number</label>
                        <input className="input" value={subscriber.identityNumber} onChange={e => setSubscriber({...subscriber, identityNumber: e.target.value})} />
                    </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Creating Subscription...' : 'Create Subscription'}
                    </button>
                </div>
            </form>
        </div>
    )
};

// --- Order Views ---

const OrderDetailView = ({ order: initialOrder, onBack }: { order: any; onBack: () => void }) => {
  const {
    fetchOrderTransactions,
    fetchOrderSubmerchants,
    cancelOrder,
    refundOrder,
    terminateOrder,
    manualCallback,
    fetchOrder
  } = useTapsilatOrder();

  const { createTerm, deleteTerm, updateTerm, refundTerm } = useTapsilatPaymentTerm();

  const [order, setOrder] = useState(initialOrder); // Local state to update order details
  const [transactions, setTransactions] = useState<any[]>([]);
  const [submerchants, setSubmerchants] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'transactions' | 'submerchants' | 'actions' | 'terms'>('info');
  const [actionLoading, setActionLoading] = useState(false);

  // Refresh order details when performing actions
  const refreshOrderDetails = useCallback(async () => {
    try {
        const updated = await fetchOrder(order.reference_id || order.referenceId);
        // Merge with existing to keep any extra properties not in SDK type if any
        setOrder({ ...order, ...updated });
    } catch (e) {
        console.error("Failed to refresh order", e);
    }
  }, [fetchOrder, order]);

  useEffect(() => {
    if (activeTab === 'transactions') {
        setLoadingTx(true);
        fetchOrderTransactions(order.reference_id || order.referenceId)
            .then((txs) => setTransactions(txs || []))
            .catch((e) => {
                console.error(e);
                alert('Failed to load transactions');
            })
            .finally(() => setLoadingTx(false));
    } else if (activeTab === 'submerchants') {
        setLoadingSub(true);
        // fetchOrderSubmerchants might depend on pagination, here we fetch generic
        fetchOrderSubmerchants({ page: 1, per_page: 50 })
            .then((res: any) => setSubmerchants(res.data || []))
            .catch((e) => {
                 console.error(e);
                 // Some endpoints might 404 if no submerchants, ignore or alert
            })
            .finally(() => setLoadingSub(false));
    }
  }, [activeTab, fetchOrderTransactions, fetchOrderSubmerchants, order.referenceId, order.reference_id]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setActionLoading(true);
    try {
      await cancelOrder(order.reference_id || order.referenceId);
      alert('Order cancelled successfully');
      refreshOrderDetails();
    } catch (e: any) {
      alert(`Cancel failed: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    const amountStr = prompt('Enter refund amount:');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return alert('Invalid amount');

    setActionLoading(true);
    try {
      await refundOrder({
        reference_id: order.reference_id || order.referenceId,
        amount
      });
      alert('Refund processed successfully');
      refreshOrderDetails();
    } catch (e: any) {
      alert(`Refund failed: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminate = async () => {
    if (!confirm('Are you sure you want to TERMINATE this order? This action is irreversible.')) return;
    setActionLoading(true);
    try {
      await terminateOrder({
        reference_id: order.reference_id || order.referenceId,
        reason: 'Admin termination'
      });
      alert('Order terminated');
      onBack();
    } catch (e: any) {
      alert(`Terminate failed: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualCallback = async () => {
    setActionLoading(true);
    try {
      await manualCallback(order.reference_id || order.referenceId);
      alert('Manual callback triggered');
    } catch (e: any) {
      alert(`Callback failed: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTerm = async () => {
      const amountStr = prompt('Enter term amount:');
      if (!amountStr) return;
      const amount = parseFloat(amountStr);
      
      const dueDate = prompt('Enter due date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
      if (!dueDate) return;

      setActionLoading(true);
      try {
          await createTerm({
              order_id: order.order_id || order.id,
              term_reference_id: `term-${Math.floor(Math.random()*10000)}`,
              amount,
              due_date: dueDate,
              term_sequence: (order.payment_terms?.length || 0) + 1,
              required: true,
              status: 'pending'
          });
          alert('Term created');
          refreshOrderDetails();
      } catch (e: any) {
          alert(`Create term failed: ${e.message}`);
      } finally {
          setActionLoading(false);
      }
  };

  const handleUpdateTerm = async (termRefId: string, currentAmount: number) => {
    const amountStr = prompt('Enter new amount:', String(currentAmount));
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    
    setActionLoading(true);
    try {
        await updateTerm({
            term_reference_id: termRefId,
            amount
        });
        alert('Term updated');
        refreshOrderDetails();
    } catch (e: any) {
        alert(`Update term failed: ${e.message}`);
    } finally {
        setActionLoading(false);
    }
  };

  const handleRefundTerm = async (termRefId: string) => {
    const amountStr = prompt('Enter refund amount for this term:');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);

    setActionLoading(true);
    try {
        await refundTerm({
            term_id: termRefId,
            amount
        });
        alert('Term refunded');
        refreshOrderDetails();
    } catch (e: any) {
        alert(`Refund term failed: ${e.message}`);
    } finally {
        setActionLoading(false);
    }
  };

  const handleDeleteTerm = async (termRefId: string) => {
      if(!confirm('Delete this term?')) return;
      setActionLoading(true);
      try {
          await deleteTerm({ term_reference_id: termRefId });
          alert('Term deleted');
          refreshOrderDetails();
      } catch (e: any) {
          alert(`Delete term failed: ${e.message}`);
      } finally {
          setActionLoading(false);
      }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginRight: '1rem' }}>
          &larr; Back
        </button>
        <h3>Order Details: {order.reference_id || order.referenceId}</h3>
        <div style={{ marginLeft: 'auto' }}>
            <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
        <button 
          className={`btn ${activeTab === 'info' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('info')}
          style={{ marginRight: '0.5rem' }}
        >
          Info
        </button>
        <button 
          className={`btn ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('transactions')}
          style={{ marginRight: '0.5rem' }}
        >
          Transactions
        </button>
        <button 
          className={`btn ${activeTab === 'submerchants' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('submerchants')}
          style={{ marginRight: '0.5rem' }}
        >
          Submerchants
        </button>
        <button 
          className={`btn ${activeTab === 'terms' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('terms')}
          style={{ marginRight: '0.5rem' }}
        >
          Payment Terms
        </button>
        <button 
          className={`btn ${activeTab === 'actions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('actions')}
        >
          Actions
        </button>
      </div>

      {activeTab === 'info' && (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <h4>Buyer</h4>
                    <JSONView data={order.buyer} />
                </div>
                <div>
                    <h4>Payment</h4>
                    <p>Amount: {order.amount} {order.currency}</p>
                    <p>Paid: {order.paid_amount}</p>
                    <p>Unpaid: {order.unpaid_amount}</p>
                    {order.checkout_url && (
                        <p><a href={order.checkout_url} target="_blank" rel="noreferrer">Checkout Link</a></p>
                    )}
                </div>
            </div>
        </div>
      )}

      {activeTab === 'submerchants' && (
        <div>
           {loadingSub ? <p>Loading...</p> : (
             <div className="table-responsive">
               <table className="table">
                 <thead>
                   <tr>
                     <th>ID</th>
                     <th>Name</th>
                     <th>Type</th>
                     <th>Amount</th>
                   </tr>
                 </thead>
                 <tbody>
                    {submerchants.map((s, i) => (
                      <tr key={s.id || s.sub_merchant_id || i}>
                        <td>{s.id || s.sub_merchant_id}</td>
                        <td>{s.name || s.sub_merchant_name || 'N/A'}</td>
                        <td>{s.type || s.sub_merchant_type || 'N/A'}</td>
                        <td>{s.amount}</td>
                      </tr>
                    ))}
                    {submerchants.length === 0 && <tr><td colSpan={4}>No submerchants found</td></tr>}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      )}

      {activeTab === 'terms' && (
          <div>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom: '1rem'}}>
                  <h4>Payment Terms</h4>
                  <button className="btn btn-primary" onClick={handleCreateTerm} disabled={actionLoading}>+ Add Term</button>
              </div>
              
              {!order.payment_terms || order.payment_terms.length === 0 ? <p>No payment terms configured.</p> : (
                  <div className="table-responsive">
                      <table className="table">
                          <thead>
                              <tr>
                                  <th>Ref ID</th>
                                  <th>Seq</th>
                                  <th>Amount</th>
                                  <th>Due Date</th>
                                  <th>Status</th>
                                  <th>Action</th>
                              </tr>
                          </thead>
                          <tbody>
                              {order.payment_terms.map((t: any) => (
                                  <tr key={t.term_reference_id}>
                                      <td>{t.term_reference_id}</td>
                                      <td>{t.term_sequence}</td>
                                      <td>{t.amount}</td>
                                      <td>{t.due_date}</td>
                                      <td><StatusBadge status={t.status} /></td>
                                      <td>
                                          <div style={{ display: 'flex', gap: '5px' }}>
                                            <button className="btn btn-secondary" style={{fontSize: '0.8rem'}} onClick={() => handleUpdateTerm(t.term_reference_id, t.amount)}>Upds</button>
                                            <button className="btn btn-secondary" style={{fontSize: '0.8rem'}} onClick={() => handleRefundTerm(t.term_reference_id)}>Ref</button>
                                            <button className="btn btn-secondary" style={{fontSize: '0.8rem', color: 'var(--danger-color)'}} onClick={() => handleDeleteTerm(t.term_reference_id)}>Del</button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'transactions' && (
        <div>
          {loadingTx ? <p>Loading...</p> : (
             <div className="table-responsive">
             <table className="table">
               <thead>
                 <tr>
                   <th>ID</th>
                   <th>Type</th>
                   <th>Amount</th>
                   <th>Status</th>
                   <th>Date</th>
                 </tr>
               </thead>
               <tbody>
                 {transactions.map((tx: any, i) => (
                   <tr key={i}>
                     <td>{tx.transaction_id || tx.id}</td>
                     <td>{tx.type}</td>
                     <td>{tx.amount}</td>
                     <td><StatusBadge status={tx.status} /></td>
                     <td>{tx.created_at}</td>
                   </tr>
                 ))}
                 {transactions.length === 0 && <tr><td colSpan={5}>No transactions found</td></tr>}
               </tbody>
             </table>
           </div>
          )}
        </div>
      )}

      {activeTab === 'actions' && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-warning" onClick={handleManualCallback} disabled={actionLoading}>
                Trigger Callback
            </button>
            <button className="btn" style={{ backgroundColor: '#dc3545', color: '#fff' }} onClick={handleCancel} disabled={actionLoading}>
                Cancel Order
            </button>
            <button className="btn" style={{ backgroundColor: '#dc3545', color: '#fff' }} onClick={handleRefund} disabled={actionLoading}>
                Refund Amount
            </button>
            <button className="btn" style={{ backgroundColor: '#000', color: '#fff' }} onClick={handleTerminate} disabled={actionLoading}>
                Terminate Order
            </button>
        </div>
      )}
    </div>
  );
};

const OrdersView = () => {
  const { listOrders } = useTapsilatOrder();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
      start_date: '',
      end_date: '',
      status: '',
      organization_id: ''
  });

  const refreshOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Pass filters to listOrders
      const params: any = { page: 1, per_page: 10 };
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.status) params.status = filters.status;
      if (filters.organization_id) params.organization_id = filters.organization_id;

      const res = await listOrders(params);

      // Manual map
      const raw = res as any;
      const orderData = raw.rows || raw.data || [];
      setOrders(orderData);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      alert("Failed to fetch orders: " + msg);
    } finally {
      setLoading(false);
    }
  }, [listOrders, filters.status, filters.start_date, filters.end_date, filters.organization_id]); 

  useEffect(() => {
    // Initial load
    refreshOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleFilterSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      refreshOrders();
  };

  if (showCreate) {
      return <CreateOrderView onBack={() => setShowCreate(false)} onCreate={() => { setShowCreate(false); refreshOrders(); }} />;
  }

  if (selectedOrder) {
      return <OrderDetailView order={selectedOrder} onBack={() => { setSelectedOrder(null); refreshOrders(); }} />;
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Orders</h3>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Order
        </button>
      </div>

      <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', backgroundColor: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px' }}>
          <input type="date" value={filters.start_date} onChange={e => setFilters({...filters, start_date: e.target.value})} placeholder="Start Date" style={{padding:'0.25rem'}} />
          <input type="date" value={filters.end_date} onChange={e => setFilters({...filters, end_date: e.target.value})} placeholder="End Date" style={{padding:'0.25rem'}} />
          <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} style={{padding:'0.25rem'}}>
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="CREATED">Created</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
          </select>
          <input type="text" value={filters.organization_id} onChange={e => setFilters({...filters, organization_id: e.target.value})} placeholder="Org ID" style={{padding:'0.25rem'}} />
          <button type="submit" className="btn btn-secondary" disabled={loading}>Filter</button>
          <button type="button" className="btn btn-secondary" onClick={refreshOrders} disabled={loading}>Refresh</button>
      </form>

      {orders.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
          No orders found.
        </p>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Reference</th>
                <th>Buyer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                 const anyOrder = o as any; 
                 return (
                <tr key={anyOrder.id || anyOrder.order_id || Math.random()}>
                  <td>{anyOrder.id}</td>
                  <td>{anyOrder.reference_id || anyOrder.referenceId}</td>
                  <td>{anyOrder.buyer?.name} {anyOrder.buyer?.surname}</td>
                  <td>{anyOrder.total || anyOrder.amount} {anyOrder.currency}</td>
                  <td><StatusBadge status={anyOrder.status} /></td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => setSelectedOrder(anyOrder)}>
                        View
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// --- Subscription Views ---

const SubscriptionDetailView = ({ sub, onBack }: { sub: any; onBack: () => void }) => {
    const { 
        fetchSubscription, 
        cancelSubscription, 
        redirectSubscription 
    } = useTapsilatSubscription();

    const [details, setDetails] = useState(sub);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        // Fetch fresh details if possible, or just use passed prop
        // The list API provided basic details, fetchSubscription might provide more
        if (sub.reference_id || sub.id) {
            setLoading(true);
            // Assuming we prefer reference_id, but API might use id? 
            // The SDK fetchSubscription takes SubscriptionGetRequest which needs reference_id I think?
            const ref = sub.reference_id || sub.id;
            fetchSubscription({ reference_id: ref })
                .then(res => setDetails(res))
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [sub, fetchSubscription]);

    const handleCancel = async () => {
        if(!confirm('Cancel subscription?')) return;
        setActionLoading(true);
        try {
            await cancelSubscription({ reference_id: details.reference_id || details.id });
            alert('Subscription cancelled');
            onBack();
        } catch(e: any) {
            alert(`Failed: ${e.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRedirect = async () => {
        setActionLoading(true);
        try {
            const res = await redirectSubscription({ subscription_id: details.reference_id || details.id });
            if (res.url) {
                window.open(res.url, '_blank');
            } else {
                alert('No redirect URL returned');
            }
        } catch(e: any) {
            alert(`Failed: ${e.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <button className="btn btn-secondary" onClick={onBack} style={{ marginRight: '1rem' }}>
                  &larr; Back
                </button>
                <h3>Subscription: {details.reference_id}</h3>
                <div style={{ marginLeft: 'auto' }}>
                    <StatusBadge status={details.status} />
                </div>
            </div>
            
            {loading ? <p>Loading details...</p> : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                             <h4>Plan</h4>
                             <p>{details.title || details.plan_name}</p>
                             <p>Period: {details.period} {details.period_unit || 'days'}</p>
                             <p>Price: {details.price} {details.currency}</p>
                        </div>
                        <div>
                            <h4>Customer</h4>
                            {details.subscriber ? <JSONView data={details.subscriber} /> : <p>N/A</p>}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleRedirect}
                            disabled={actionLoading}
                        >
                            Go to Subscription Page
                        </button>
                        <button 
                            className="btn" 
                            style={{ backgroundColor: '#dc3545', color: '#fff' }} 
                            onClick={handleCancel}
                            disabled={actionLoading}
                        >
                            Cancel Subscription
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

const SubscriptionsView = () => {
    const { listSubscriptions } = useTapsilatSubscription();
    const [subs, setSubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSub, setSelectedSub] = useState<any>(null);
    const [showCreate, setShowCreate] = useState(false);

    const refreshSubs = useCallback(() => {
        setLoading(true);
        listSubscriptions().then(res => {
            setSubs((res as any).rows || (res as any).data || []);
        }).catch(console.error)
        .finally(() => setLoading(false));
    }, [listSubscriptions]);

    useEffect(() => {
        refreshSubs();
    }, [refreshSubs]);

    if (showCreate) {
        return <CreateSubscriptionView onBack={() => setShowCreate(false)} onCreate={() => { setShowCreate(false); refreshSubs(); }} />;
    }

    if (selectedSub) {
        return <SubscriptionDetailView sub={selectedSub} onBack={() => { setSelectedSub(null); refreshSubs(); }} />;
    }

    return (
        <div>
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3>Subscriptions</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Sub</button>
                        <button className="btn btn-secondary" onClick={refreshSubs} disabled={loading}>
                            {loading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Reference ID</th>
                                <th>Plan</th>
                                <th>Status</th>
                                <th>Period</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subs.map((s) => (
                                <tr key={s.reference_id || s.id}>
                                    <td>{s.reference_id}</td>
                                    <td>{s.title}</td>
                                    <td><StatusBadge status={s.status} /></td>
                                    <td>{s.period} days</td>
                                    <td>
                                        <button className="btn btn-secondary" onClick={() => setSelectedSub(s)}>
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {subs.length === 0 && <tr><td colSpan={5}>No subscriptions found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Main App Shell ---

const Dashboard = () => {
  const [view, setView] = useState('overview');

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">Tapsilat React</div>
        <nav className="nav-menu">
          <button className={`nav-item ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>
            Overview
          </button>
          <button className={`nav-item ${view === 'orders' ? 'active' : ''}`} onClick={() => setView('orders')}>
            Orders
          </button>
          <button className={`nav-item ${view === 'subscriptions' ? 'active' : ''}`} onClick={() => setView('subscriptions')}>
            Subscriptions
          </button>
          <button className={`nav-item ${view === 'webhooks' ? 'active' : ''}`} onClick={() => setView('webhooks')}>
            Webhook Tool
          </button>
        </nav>
      </aside>
      <main className="main-content">
        {view === 'overview' && <Overview />}
        {view === 'orders' && <OrdersView />}
        {view === 'subscriptions' && <SubscriptionsView />}
        {view === 'webhooks' && <WebhookTester />}
      </main>
    </div>
  );
};

function App() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    // Sanitize token: remove whitespace and 'Bearer ' prefix
    const cleanToken = token.trim().replace(/^Bearer\s+/i, '');
    
    if (cleanToken.length < 10) {
        alert('Token is too short');
        return;
    }

    // Basic character validation (alphanumeric, dot, dash, underscore)
    // allowing standard JWT charset (Base64Url)
    if (!/^[a-zA-Z0-9._-]+$/.test(cleanToken)) {
        alert('Token contains invalid characters. Please enter only the token string (without "Bearer " prefix) and ensure no extra spaces.');
        return;
    }

    setToken(cleanToken);
    setAuthed(true);
  };

  if (!authed) {
    return (
      <div className="auth-container">
        <form className="auth-card" onSubmit={handleLogin}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Tapsilat Dashboard</h2>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Bearer Token</label>
            <input 
              className="input" 
              type="password" 
              placeholder="Enter your API token" 
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} type="submit">
            Connect
          </button>
        </form>
      </div>
    );
  }

  return (
    <TapsilatProvider config={{ bearerToken: token, baseURL: 'https://panel.tapsilat.dev/api/v1' }}>
      <Dashboard />
    </TapsilatProvider>
  );
}

export default App;
