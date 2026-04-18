import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';

export default function CheckoutPage() {
    const { user, isAuthenticated, refreshCart, refreshUser } = useAuth();
    const [cart, setCart] = useState({ items: [], total: 0, item_count: 0 });
    const [loading, setLoading] = useState(true);
    const [placing, setPlacing] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(null);
    const [error, setError] = useState('');
    const [deliveryInfo, setDeliveryInfo] = useState({
        fullName: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        saveAddress: true,
    });
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            loadCart();
            if (user) {
                setDeliveryInfo({
                    fullName: user.name || '',
                    addressLine1: user.address || '',
                    addressLine2: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    phone: user.phone || '',
                });
            }
        } else {
            setLoading(false);
        }
    }, [isAuthenticated, user]);

    const loadCart = async () => {
        try {
            const data = await api.getCart();
            setCart(data);
            if (data.items.length === 0 && !orderPlaced) {
                navigate('/cart');
            }
        } catch {
            navigate('/cart');
        } finally {
            setLoading(false);
        }
    };

    const handlePlaceOrder = async () => {
        setError('');

        const fullAddress = `${deliveryInfo.fullName}, ${deliveryInfo.addressLine1} ${deliveryInfo.addressLine2}, ${deliveryInfo.city}, ${deliveryInfo.state} ${deliveryInfo.zipCode}`.trim();
        if (!deliveryInfo.addressLine1.trim() || !deliveryInfo.city.trim() || !deliveryInfo.zipCode.trim() || !deliveryInfo.fullName.trim()) {
            setError('Please provide full name, address line 1, city, and zip code');
            return;
        }
        if (!deliveryInfo.phone.trim()) {
            setError('Please provide a phone number');
            return;
        }

        const savedVoucherStr = localStorage.getItem('smartcommerce_voucher');
        let discount = 0;
        let voucherCode = null;
        if (savedVoucherStr) {
            try {
                const bestVoucher = JSON.parse(savedVoucherStr);
                if (bestVoucher && bestVoucher.savings) {
                    discount = bestVoucher.savings;
                    voucherCode = bestVoucher.code;
                }
            } catch (e) {}
        }

        setPlacing(true);
        try {
            const data = await api.placeOrder(fullAddress, deliveryInfo.phone, discount, voucherCode, deliveryInfo.saveAddress);
            setOrderPlaced(data.order);
            localStorage.removeItem('smartcommerce_voucher'); // Clear voucher
            await refreshCart();
            await refreshUser();
        } catch (err) {
            setError(err.message || 'Failed to place order. Please try again.');
        } finally {
            setPlacing(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="auth-page">
                <div className="auth-container animate-in" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}></div>
                    <h2 style={{ marginBottom: 12 }}>Please sign in</h2>
                    <Link to="/login" className="auth-submit-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="loading-container" style={{ minHeight: '60vh' }}>
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading checkout...</div>
            </div>
        );
    }

    // Order confirmed state
    if (orderPlaced) {
        return (
            <div className="checkout-page" style={{ padding: '60px 20px', background: '#f8fafc' }}>
                <div className="checkout-container animate-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div className="order-success" style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ width: '64px', height: '64px', background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', margin: '0 auto 16px' }}>
                            ✓
                        </div>
                        <h1 style={{ fontSize: '28px', color: '#0f172a', fontWeight: 700, marginBottom: '8px' }}>Order Confirmed</h1>
                        <p style={{ color: '#64748b' }}>Thank you! Your order has been placed successfully.</p>
                    </div>

                    <div id="digital-receipt" style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)', position: 'relative', overflow: 'hidden' }}>
                        {/* Receipt Header */}
                        <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '24px', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>SmartCommerceAI</div>
                                    <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Digital Receipt</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>Order ID</div>
                                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{orderPlaced.order_id}</div>
                                </div>
                            </div>
                        </div>

                        {/* Customer Details */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '24px', marginBottom: '24px' }}>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Billed To</div>
                                <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>{user?.name || 'Customer'}</div>
                                <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, marginTop: '4px' }}>{orderPlaced.delivery_address}</div>
                                <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}>{orderPlaced.delivery_phone}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Order Info</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ color: '#64748b', fontSize: '14px' }}>Date:</span> <span style={{ color: '#0f172a', fontSize: '14px', fontWeight: 500 }}>{new Date(orderPlaced.created_at).toLocaleDateString()}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ color: '#64748b', fontSize: '14px' }}>Est. Delivery:</span> <span style={{ color: '#0f172a', fontSize: '14px', fontWeight: 500 }}>{orderPlaced.estimated_delivery}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b', fontSize: '14px' }}>Payment:</span> <span style={{ color: '#0f172a', fontSize: '14px', fontWeight: 500 }}>{orderPlaced.payment_method}</span></div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>
                                <div style={{ flex: 2 }}>Item</div>
                                <div style={{ flex: 1, textAlign: 'center' }}>Qty</div>
                                <div style={{ flex: 1, textAlign: 'right' }}>Amount</div>
                            </div>
                            {orderPlaced.items.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '12px', color: '#0f172a' }}>
                                    <div style={{ flex: 2, fontWeight: 500 }}>{item.name}</div>
                                    <div style={{ flex: 1, textAlign: 'center', color: '#475569' }}>{item.quantity}</div>
                                    <div style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>₹{(item.price * item.quantity).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div style={{ marginLeft: 'auto', width: '200px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569', marginBottom: '8px' }}>
                                <span>Subtotal</span>
                                <span style={{ fontWeight: 500, color: '#0f172a' }}>₹{(orderPlaced.total + (orderPlaced.discount || 0)).toFixed(2)}</span>
                            </div>
                            {orderPlaced.discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#10b981', marginBottom: '8px' }}>
                                    <span>Discount</span>
                                    <span style={{ fontWeight: 500 }}>-₹{orderPlaced.discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, color: '#0f172a', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                                <span>Total</span>
                                <span>₹{orderPlaced.total.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Decor */}
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }} className="no-print">
                        <button 
                            onClick={() => window.print()}
                            style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', color: '#0f172a', padding: '14px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                            onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                            onMouseOut={(e) => e.target.style.background = '#fff'}
                        >
                            Download Receipt
                        </button>
                        <Link to="/" style={{ flex: 1, background: '#111', color: '#fff', padding: '14px', borderRadius: '12px', fontWeight: 600, textDecoration: 'none', textAlign: 'center', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            Continue Shopping
                        </Link>
                    </div>
                </div>

                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        #digital-receipt, #digital-receipt * { visibility: visible; }
                        #digital-receipt { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                        .no-print { display: none !important; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <div className="checkout-container animate-in">
                <div className="cart-header">
                    <Link to="/cart" className="auth-back-link">← Back to Cart</Link>
                    <h1 className="cart-title">
                        Checkout
                    </h1>
                </div>

                {error && (
                    <div className="auth-error">
                        <span></span> {error}
                    </div>
                )}

                <div className="checkout-layout">
                    <div className="checkout-form-section">
                        {/* Delivery Information */}
                        <div className="checkout-section-card">
                            <h3 className="checkout-section-title">Delivery Information</h3>
                            <div className="form-group">
                                <label className="form-label" htmlFor="checkout-fullname">Full Name *</label>
                                <input
                                    id="checkout-fullname"
                                    className="form-input"
                                    placeholder="Enter your full name"
                                    value={deliveryInfo.fullName}
                                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, fullName: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="checkout-address1">Address Line 1 *</label>
                                <input
                                    id="checkout-address1"
                                    className="form-input"
                                    placeholder="House number, street name"
                                    value={deliveryInfo.addressLine1}
                                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, addressLine1: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="checkout-address2">Address Line 2 (Optional)</label>
                                <input
                                    id="checkout-address2"
                                    className="form-input"
                                    placeholder="Apartment, suite, etc."
                                    value={deliveryInfo.addressLine2}
                                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, addressLine2: e.target.value }))}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="checkout-city">City *</label>
                                    <input
                                        id="checkout-city"
                                        className="form-input"
                                        placeholder="City"
                                        value={deliveryInfo.city}
                                        onChange={(e) => setDeliveryInfo(prev => ({ ...prev, city: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="checkout-state">State *</label>
                                    <input
                                        id="checkout-state"
                                        className="form-input"
                                        placeholder="State"
                                        value={deliveryInfo.state}
                                        onChange={(e) => setDeliveryInfo(prev => ({ ...prev, state: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="checkout-zip">PIN / ZIP Code *</label>
                                <input
                                    id="checkout-zip"
                                    className="form-input"
                                    placeholder="PIN Code"
                                    value={deliveryInfo.zipCode}
                                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="checkout-phone">Phone Number *</label>
                                <input
                                    id="checkout-phone"
                                    className="form-input"
                                    placeholder="Enter your phone number"
                                    value={deliveryInfo.phone}
                                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, phone: e.target.value }))}
                                    required
                                />
                            </div>
                            
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={deliveryInfo.saveAddress}
                                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, saveAddress: e.target.checked }))}
                                    style={{ width: '16px', height: '16px', accentColor: '#111' }}
                                />
                                <span style={{ fontSize: '14px', color: '#4B5563', fontWeight: 500 }}>Save this address for future orders</span>
                            </label>
                        </div>

                        {/* Payment Method */}
                        <div className="checkout-section-card">
                            <h3 className="checkout-section-title">Payment Method</h3>
                            <div className="payment-method-card active">
                                <div className="payment-method-radio">
                                    <div className="radio-dot"></div>
                                </div>
                                <div className="payment-method-info">
                                    <div className="payment-method-name">Cash on Delivery</div>
                                    <div className="payment-method-desc">Pay with cash when your order is delivered to your doorstep</div>
                                </div>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="checkout-section-card">
                            <h3 className="checkout-section-title">Items ({cart.item_count})</h3>
                            <div className="checkout-items">
                                {cart.items.map((item, i) => (
                                    <div key={i} className="checkout-item">
                                        <div className="checkout-item-info">
                                            <div className="checkout-item-name">{item.name}</div>
                                            <div className="checkout-item-qty">Qty: {item.quantity}</div>
                                        </div>
                                        <div className="checkout-item-price">₹{(item.price * item.quantity).toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="checkout-summary-section">
                        <div className="cart-summary-card">
                            <h3 className="cart-summary-title">Order Total</h3>
                            <div className="cart-summary-row">
                                <span>Subtotal</span>
                                <span>₹{cart.total.toFixed(2)}</span>
                            </div>
                            <div className="cart-summary-row">
                                <span>Shipping</span>
                                <span className="free-shipping">FREE</span>
                            </div>
                            <div className="cart-summary-row">
                                <span>Payment</span>
                                <span>COD</span>
                            </div>
                            {(() => {
                                const savedVoucherStr = localStorage.getItem('smartcommerce_voucher');
                                let discount = 0;
                                if (savedVoucherStr) {
                                    try { discount = JSON.parse(savedVoucherStr).savings || 0; } catch {}
                                }
                                const finalTotal = Math.max(0, cart.total - discount);
                                return (
                                    <>
                                        {discount > 0 && (
                                            <div className="cart-summary-row" style={{ color: '#10b981', fontWeight: 600 }}>
                                                <span>Discount Applied</span>
                                                <span>-₹{discount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="cart-summary-divider"></div>
                                        <div className="cart-summary-row cart-summary-total">
                                            <span>Total</span>
                                            <span>₹{finalTotal.toFixed(2)}</span>
                                        </div>
                                    </>
                                );
                            })()}
                            <button
                                className="checkout-btn place-order-btn"
                                onClick={handlePlaceOrder}
                                disabled={placing}
                                id="place-order-btn"
                            >
                                {placing ? (
                                    <>
                                        <span className="btn-spinner"></span>
                                        Placing Order...
                                    </>
                                ) : (
                                    <>Place Order — ₹{Math.max(0, cart.total - (JSON.parse(localStorage.getItem('smartcommerce_voucher') || '{}').savings || 0)).toFixed(2)}</>
                                )}
                            </button>
                            <div className="cod-notice">
                                <span></span> Your order is secure. Pay only on delivery.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
