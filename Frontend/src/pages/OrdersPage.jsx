import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';

/* ─── Receipt Modal ─── */
function ReceiptModal({ order, onClose }) {
    if (!order) return null;
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => e.target === e.currentTarget && onClose()}
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(6px)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    style={{
                        background: '#fff', borderRadius: '20px', maxWidth: '560px',
                        width: '100%', maxHeight: '90vh', overflowY: 'auto',
                        boxShadow: '0 40px 80px -20px rgba(0,0,0,0.4)'
                    }}
                >
                    {/* Receipt Header */}
                    <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '28px 32px', borderRadius: '20px 20px 0 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>SmartCommerceAI</div>
                                <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>Digital Receipt</div>
                            </div>
                            <button
                                onClick={onClose}
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >✕</button>
                        </div>
                        <div style={{ marginTop: '20px', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order ID</div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981', marginTop: '2px', fontFamily: 'monospace' }}>{order.order_id}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', marginTop: '2px' }}>
                                    {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Est. Delivery</div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', marginTop: '2px' }}>{order.estimated_delivery || '3-5 days'}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '28px 32px' }}>
                        {/* Delivery Info */}
                        <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Delivery Address</div>
                            <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>{order.delivery_address || 'N/A'}</div>
                            {order.delivery_phone && <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}>📱 {order.delivery_phone}</div>}
                        </div>

                        {/* Items */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Item</span>
                                <span>Amount</span>
                            </div>
                            <div style={{ borderTop: '1px solid #e2e8f0' }}>
                                {(order.items || []).map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Qty: {item.quantity} × ₹{item.price}</div>
                                        </div>
                                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>₹{(item.price * item.quantity).toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Totals */}
                        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
                            {order.discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '14px', color: '#10b981' }}>Discount Applied {order.voucher_code && `(${order.voucher_code})`}</span>
                                    <span style={{ fontSize: '14px', color: '#10b981', fontWeight: 600 }}>−₹{order.discount?.toFixed(2)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Total Paid</span>
                                <span style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }}>₹{order.total?.toFixed(2)}</span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>Payment: {order.payment_method || 'Cash on Delivery'}</div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button
                                onClick={() => window.print()}
                                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                            >🖨️ Print Receipt</button>
                            <button
                                onClick={onClose}
                                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                            >Close</button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

/* ─── Status Badge ─── */
function StatusBadge({ status }) {
    const config = {
        'delivered': { bg: '#d1fae5', color: '#065f46', label: '✓ Delivered' },
        'processing': { bg: '#fef3c7', color: '#92400e', label: '⏳ Processing' },
        'shipped': { bg: '#dbeafe', color: '#1e40af', label: '🚚 Shipped' },
        'pending': { bg: '#f3f4f6', color: '#374151', label: '• Pending' },
    };
    const s = config[status?.toLowerCase()] || config['pending'];
    return (
        <span style={{ padding: '4px 10px', borderRadius: '20px', background: s.bg, color: s.color, fontSize: '12px', fontWeight: 700 }}>
            {s.label}
        </span>
    );
}

/* ─── Main Component ─── */
export default function OrdersPage() {
    const { user, isAuthenticated } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) { setLoading(false); return; }
        api.getOrders()
            .then(data => setOrders(data.orders || []))
            .catch(() => setOrders([]))
            .finally(() => setLoading(false));
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
                <div style={{ fontSize: '48px' }}>🔒</div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>Sign in to view orders</h2>
                <Link to="/login" style={{ background: '#0f172a', color: '#fff', padding: '12px 28px', borderRadius: '12px', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ marginBottom: '40px' }}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', textDecoration: 'none', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
                        ← Back to Store
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', letterSpacing: '-1px', margin: 0 }}>My Orders</h1>
                            <p style={{ color: '#64748b', marginTop: '6px', fontSize: '15px' }}>
                                {orders.length > 0 ? `${orders.length} order${orders.length !== 1 ? 's' : ''} placed` : 'Your order history'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
                        <div className="loading-spinner" />
                        <div style={{ color: '#64748b', fontSize: '15px' }}>Loading your orders…</div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && orders.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0' }}
                    >
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
                        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>No orders yet</h2>
                        <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '15px' }}>Looks like you haven't placed any orders. Start shopping!</p>
                        <Link to="/" style={{ background: '#0f172a', color: '#fff', padding: '14px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '15px' }}>
                            Browse Products →
                        </Link>
                    </motion.div>
                )}

                {/* Orders Grid */}
                {!loading && orders.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[...orders].reverse().map((order, i) => (
                            <motion.div
                                key={order.order_id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                style={{
                                    background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0',
                                    overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                    transition: 'box-shadow 0.2s, transform 0.2s',
                                }}
                                whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                            >
                                {/* Order Header */}
                                <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order ID</div>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>{order.order_id}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Placed on</div>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginTop: '2px' }}>
                                                {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
                                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>₹{order.total?.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <StatusBadge status={order.status || 'processing'} />
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            style={{
                                                padding: '8px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                                                background: 'transparent', color: '#0f172a', fontSize: '13px',
                                                fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={e => { e.target.style.background = '#0f172a'; e.target.style.color = '#fff'; e.target.style.borderColor = '#0f172a'; }}
                                            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#0f172a'; e.target.style.borderColor = '#e2e8f0'; }}
                                        >
                                            View Receipt →
                                        </button>
                                    </div>
                                </div>

                                {/* Items Preview */}
                                <div style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {(order.items || []).slice(0, 3).map((item, j) => (
                                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{item.name}</span>
                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>×{item.quantity}</span>
                                            </div>
                                        ))}
                                        {order.items?.length > 3 && (
                                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>+{order.items.length - 3} more</span>
                                        )}
                                    </div>
                                    {order.delivery_address && (
                                        <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '10px' }}>
                                            📍 {order.delivery_address}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Receipt Modal */}
            {selectedOrder && <ReceiptModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
        </div>
    );
}
