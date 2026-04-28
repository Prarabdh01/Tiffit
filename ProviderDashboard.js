import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './ProviderDashboard.css';

function ProviderDashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [myPlans, setMyPlans] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meal_type: 'LUNCH',
    duration_type: 'MONTH',
    duration_days: 30,
    price: ''
  });

  const [activeTab, setActiveTab] = useState('plans');
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // NEW: menu editor state
  const [menuEditorOpen, setMenuEditorOpen] = useState(false);
  const [menuPlan, setMenuPlan] = useState(null);
  const [menuData, setMenuData] = useState({
    MONDAY: '',
    TUESDAY: '',
    WEDNESDAY: '',
    THURSDAY: '',
    FRIDAY: '',
    SATURDAY: '',
    SUNDAY: ''
  });
  const [menuSaving, setMenuSaving] = useState(false);
  const [activeMenuDay, setActiveMenuDay] = useState('MONDAY');

  const token = localStorage.getItem('token');

  const config = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),
    [token]
  );

  useEffect(() => {
    if (activeTab === 'plans') {
      fetchMyPlans();
    } else if (activeTab === 'orders') {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  const clearMessage = () => {
    setMessage({ type: '', text: '' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'duration_days'
          ? Number(value)
          : name === 'price'
          ? value
          : value
    }));
  };

  const fetchMyPlans = async () => {
    try {
      clearMessage();
      setPlansLoading(true);

      const res = await axios.get(
        'http://localhost:5000/api/provider/plans',
        config
      );

      if (res.data.success) {
        setMyPlans(res.data.plans || []);
      } else {
        showMessage('error', res.data.message || 'Failed to load your plans.');
      }
    } catch (err) {
      console.error('Error fetching my plans:', err);
      showMessage(
        'error',
        err.response?.data?.message || 'Failed to load your plans.'
      );
    } finally {
      setPlansLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      clearMessage();
      setOrdersLoading(true);

      const response = await axios.get(
        'http://localhost:5000/api/provider/orders',
        config
      );

      if (response.data.success) {
        setOrders(response.data.orders || []);
      } else {
        showMessage('error', response.data.message || 'Failed to load orders.');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      showMessage(
        'error',
        err.response?.data?.message || 'Failed to load orders.'
      );
    } finally {
      setOrdersLoading(false);
    }
  };

  const createPlan = async (e) => {
    e.preventDefault();
    clearMessage();

    if (!formData.title.trim()) {
      showMessage('error', 'Plan title is required.');
      return;
    }

    if (!formData.price || Number(formData.price) <= 0) {
      showMessage('error', 'Enter a valid price greater than 0.');
      return;
    }

    if (!formData.duration_days || Number(formData.duration_days) <= 0) {
      showMessage('error', 'Enter valid duration days.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        duration_days: Number(formData.duration_days)
      };

      const response = await axios.post(
        'http://localhost:5000/api/provider/plans',
        payload,
        config
      );

      if (response.data.success) {
        showMessage('success', 'Plan created successfully.');
        setFormData({
          title: '',
          description: '',
          meal_type: 'LUNCH',
          duration_type: 'MONTH',
          duration_days: 30,
          price: ''
        });
        fetchMyPlans();
      } else {
        showMessage('error', response.data.message || 'Failed to create plan.');
      }
    } catch (err) {
      console.error('Error creating plan:', err);
      showMessage(
        'error',
        err.response?.data?.message || 'Failed to create plan.'
      );
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    clearMessage();

    try {
      setUpdatingOrderId(orderId);

      const response = await axios.put(
        `http://localhost:5000/api/provider/orders/${orderId}/status`,
        { status },
        config
      );

      if (response.data.success) {
        showMessage(
          'success',
          response.data.message || `Order updated to ${formatStatus(status)}.`
        );
        fetchOrders();
      } else {
        showMessage('error', response.data.message || 'Failed to update status.');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      showMessage(
        'error',
        err.response?.data?.message || 'Failed to update status.'
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'PLACED':
        return 'status placed';
      case 'ACCEPTED':
        return 'status accepted';
      case 'PREPARING':
        return 'status preparing';
      case 'OUT_FOR_DELIVERY':
        return 'status out';
      case 'DELIVERED':
        return 'status delivered';
      case 'CANCELLED':
        return 'status cancelled';
      default:
        return 'status';
    }
  };

  const formatStatus = (status) => {
    return status.replaceAll('_', ' ').toLowerCase();
  };

  const pendingOrders = orders.filter(
    (order) => order.order_status === 'PLACED'
  ).length;
  const activeOrders = orders.filter((order) =>
    ['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(order.order_status)
  ).length;

  // NEW: open menu editor for a plan
  const openMenuEditor = async (plan) => {
    clearMessage();
    setMenuPlan(plan);
    setMenuEditorOpen(true);
    setActiveMenuDay('MONDAY');

    try {
      const res = await axios.get(
        `http://localhost:5000/api/provider/plans/${plan.id}/menu`,
        config
      );

      if (res.data.success && res.data.menu) {
        setMenuData({
          MONDAY: res.data.menu.MONDAY || '',
          TUESDAY: res.data.menu.TUESDAY || '',
          WEDNESDAY: res.data.menu.WEDNESDAY || '',
          THURSDAY: res.data.menu.THURSDAY || '',
          FRIDAY: res.data.menu.FRIDAY || '',
          SATURDAY: res.data.menu.SATURDAY || '',
          SUNDAY: res.data.menu.SUNDAY || ''
        });
      } else {
        setMenuData({
          MONDAY: '',
          TUESDAY: '',
          WEDNESDAY: '',
          THURSDAY: '',
          FRIDAY: '',
          SATURDAY: '',
          SUNDAY: ''
        });
      }
    } catch (err) {
      console.error('Error fetching menu:', err);
      showMessage(
        'error',
        err.response?.data?.message || 'Failed to load menu for this plan.'
      );
    }
  };

  const handleMenuChange = (day, value) => {
    setMenuData((prev) => ({
      ...prev,
      [day]: value
    }));
  };

  const saveMenu = async () => {
    if (!menuPlan) return;
    clearMessage();
    setMenuSaving(true);

    try {
      const payload = { menu: menuData };

      const res = await axios.post(
        `http://localhost:5000/api/provider/plans/${menuPlan.id}/menu`,
        payload,
        config
      );

      if (res.data.success) {
        showMessage('success', 'Menu saved successfully.');
        setMenuEditorOpen(false);
      } else {
        showMessage('error', res.data.message || 'Failed to save menu.');
      }
    } catch (err) {
      console.error('Error saving menu:', err);
      showMessage(
        'error',
        err.response?.data?.message || 'Failed to save menu.'
      );
    } finally {
      setMenuSaving(false);
    }
  };

  return (
    <div className="provider-shell">
      <div className="provider-hero">
        <div>
          <p className="eyebrow">Provider workspace</p>
          <h1>Welcome back, {user?.name || 'Provider'}</h1>
          <p className="hero-subtext">
            Manage your subscription plans, monitor student orders, and keep your
            tiffin service running smoothly from one place.
          </p>
        </div>

        <div className="hero-stats">
          <div className="hero-stat-card">
            <span>Total Plans</span>
            <strong>{myPlans.length}</strong>
          </div>
          <div className="hero-stat-card">
            <span>Pending Orders</span>
            <strong>{pendingOrders}</strong>
          </div>
          <div className="hero-stat-card">
            <span>Active Orders</span>
            <strong>{activeOrders}</strong>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`dashboard-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="provider-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          Plans
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
      </div>

      {activeTab === 'plans' && (
        <div className="plans-layout">
          <div className="card">
            <div className="card-header">
              <h2>Create Plan</h2>
              <p>Add a new meal plan for students to subscribe to.</p>
            </div>

            <form className="plan-form" onSubmit={createPlan}>
              <div className="form-group full-span">
                <label htmlFor="title">Plan Title</label>
                <input
                  id="title"
                  type="text"
                  name="title"
                  placeholder="e.g. Monthly Veg Lunch"
                  value={formData.title}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group full-span">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Briefly describe what is included in this plan"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="meal_type">Meal Type</label>
                <select
                  id="meal_type"
                  name="meal_type"
                  value={formData.meal_type}
                  onChange={handleChange}
                >
                  <option value="LUNCH">Lunch</option>
                  <option value="DINNER">Dinner</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="duration_type">Duration Type</label>
                <select
                  id="duration_type"
                  name="duration_type"
                  value={formData.duration_type}
                  onChange={handleChange}
                >
                  <option value="WEEK">Week</option>
                  <option value="MONTH">Month</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="duration_days">Duration Days</label>
                <input
                  id="duration_days"
                  type="number"
                  min="1"
                  name="duration_days"
                  value={formData.duration_days}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="price">Price (₹)</label>
                <input
                  id="price"
                  type="number"
                  min="1"
                  step="0.01"
                  name="price"
                  placeholder="Enter plan price"
                  value={formData.price}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group full-span">
                <button
                  type="submit"
                  className="btn btn-primary full-width"
                  disabled={loading}
                >
                  {loading ? 'Creating Plan...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Your Plans</h2>
              <p>All plans currently available to students.</p>
            </div>

            {plansLoading ? (
              <p className="muted">Loading plans...</p>
            ) : myPlans.length === 0 ? (
              <div className="empty-state">
                <h3>No plans created yet</h3>
                <p>Create your first subscription plan to start receiving orders.</p>
              </div>
            ) : (
              <div className="plans-grid">
                {myPlans.map((plan) => (
                  <div className="plan-card" key={plan.id}>
                    <div className="plan-card-top">
                      <div>
                        <h3>{plan.title}</h3>
                        <p className="muted">{plan.meal_type}</p>
                      </div>
                      <span className="price-pill">₹{plan.price}</span>
                    </div>

                    <div className="plan-meta">
                      <div className="meta-row">
                        <span>Duration</span>
                        <strong>
                          {plan.duration_days} days ({plan.duration_type})
                        </strong>
                      </div>
                      <div className="meta-row">
                        <span>Meal Type</span>
                        <strong>{plan.meal_type}</strong>
                      </div>
                      <div className="meta-row">
                        <span>Created</span>
                        <strong>
                          {plan.created_at
                            ? new Date(plan.created_at).toLocaleDateString()
                            : '-'}
                        </strong>
                      </div>
                    </div>

                    <div className="plan-actions">
                      <button
                        type="button"
                        className="btn btn-secondary full-width"
                        onClick={() => openMenuEditor(plan)}
                      >
                        Manage Daily Menu
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="card">
          <div className="card-header">
            <h2>Incoming Orders</h2>
            <p>Track new requests and update order status quickly.</p>
          </div>

          {ordersLoading ? (
            <p className="muted">Loading orders...</p>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <h3>No orders yet</h3>
              <p>Wait for students to place orders on your subscription plans.</p>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <div className="order-card" key={order.id}>
                  <div className="order-card-top">
                    <div>
                      <h3>Order #{order.id}</h3>
                      <p className="muted">
                        {order.student_name} • {order.student_phone}
                      </p>
                    </div>
                    <span className={getStatusClass(order.order_status)}>
                      {formatStatus(order.order_status)}
                    </span>
                  </div>

                  <div className="order-grid">
                    <div className="order-item">
                      <span>Plan</span>
                      <strong>{order.plan_title || '-'}</strong>
                    </div>

                    <div className="order-item">
                      <span>Amount</span>
                      <strong>₹{order.total_amount}</strong>
                    </div>

                    <div className="order-item">
                      <span>Order Type</span>
                      <strong>{order.order_type || '-'}</strong>
                    </div>

                    <div className="order-item">
                      <span>Date</span>
                      <strong>
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString()
                          : '-'}
                      </strong>
                    </div>

                    <div className="order-item full-span">
                      <span>Delivery Address</span>
                      <strong>
                        {[order.line1, order.line2].filter(Boolean).join(', ') ||
                          '-'}
                      </strong>
                    </div>
                  </div>

                  {order.order_status === 'PLACED' && (
                    <div className="order-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={updatingOrderId === order.id}
                        onClick={() => updateOrderStatus(order.id, 'ACCEPTED')}
                      >
                        {updatingOrderId === order.id ? 'Updating...' : 'Accept'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={updatingOrderId === order.id}
                        onClick={() => updateOrderStatus(order.id, 'REJECTED')}
                      >
                        {updatingOrderId === order.id ? 'Updating...' : 'Reject'}
                      </button>
                    </div>
                  )}

                  {order.order_status === 'ACCEPTED' && (
                    <div className="order-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={updatingOrderId === order.id}
                        onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                      >
                        {updatingOrderId === order.id
                          ? 'Updating...'
                          : 'Mark Preparing'}
                      </button>
                    </div>
                  )}

                  {order.order_status === 'PREPARING' && (
                    <div className="order-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={updatingOrderId === order.id}
                        onClick={() =>
                          updateOrderStatus(order.id, 'OUT_FOR_DELIVERY')
                        }
                      >
                        {updatingOrderId === order.id
                          ? 'Updating...'
                          : 'Out for Delivery'}
                      </button>
                    </div>
                  )}

                  {order.order_status === 'OUT_FOR_DELIVERY' && (
                    <div className="order-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={updatingOrderId === order.id}
                        onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                      >
                        {updatingOrderId === order.id
                          ? 'Updating...'
                          : 'Mark Delivered'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {menuEditorOpen && menuPlan && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h2>Daily Menu for {menuPlan.title}</h2>
            <p>Define what students will get on each day for this plan.</p>
          </div>

          <div className="menu-editor">
            <div className="menu-days">
              {[
                'MONDAY',
                'TUESDAY',
                'WEDNESDAY',
                'THURSDAY',
                'FRIDAY',
                'SATURDAY',
                'SUNDAY'
              ].map((day) => (
                <button
                  key={day}
                  type="button"
                  className={`menu-day-btn ${
                    activeMenuDay === day ? 'active' : ''
                  }`}
                  onClick={() => setActiveMenuDay(day)}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>

            <div className="menu-day-content">
              <label
                style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}
              >
                Items for {activeMenuDay}
              </label>
              <textarea
                style={{
                  marginTop: 8,
                  minHeight: 120,
                  padding: 12,
                  borderRadius: 14,
                  border: '1px solid #ddd6cf',
                  background: '#fffdfb',
                  fontSize: 14,
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                placeholder="Example: Dal, rice, roti, sabzi, salad..."
                value={menuData[activeMenuDay] || ''}
                onChange={(e) => handleMenuChange(activeMenuDay, e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveMenu}
                disabled={menuSaving}
              >
                {menuSaving ? 'Saving...' : 'Save Menu'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMenuEditorOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProviderDashboard;