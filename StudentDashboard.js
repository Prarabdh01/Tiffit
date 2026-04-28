import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './StudentDashboard.css';
import LocationPickerMap from './LocationPickerMap';

function StudentDashboard({ user }) {
  const [providers, setProviders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [plans, setPlans] = useState([]);
  const [latitude, setLatitude] = useState('28.5921');
  const [longitude, setLongitude] = useState('77.2064');
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search');

  // NEW: plan menu preview state
  const [menuPreviewOpen, setMenuPreviewOpen] = useState(false);
  const [selectedPlanForMenu, setSelectedPlanForMenu] = useState(null);
  const [menuPreviewLoading, setMenuPreviewLoading] = useState(false);
  const [menuPreviewData, setMenuPreviewData] = useState({
    MONDAY: '',
    TUESDAY: '',
    WEDNESDAY: '',
    THURSDAY: '',
    FRIDAY: '',
    SATURDAY: '',
    SUNDAY: ''
  });

  const token = localStorage.getItem('token');

  const config = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token]
  );

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  const handleMapPositionChange = ({ lat, lng }) => {
    setLatitude(String(Number(lat).toFixed(6)));
    setLongitude(String(Number(lng).toFixed(6)));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocationLoading(false);
      },
      (error) => {
        console.error('Error fetching current location:', error);
        alert('Unable to fetch current location. Please allow location access.');
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const fetchNearbyProviders = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.get(
        'http://localhost:5000/api/student/nearby-providers',
        {
          params: {
            latitude,
            longitude,
            radius: 2,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setProviders(response.data.providers || []);
        setPlans([]);
        setSelectedProvider(null);
        setMenuPreviewOpen(false);
        setSelectedPlanForMenu(null);
      }
    } catch (err) {
      console.error('Error fetching providers:', err);
      alert(err.response?.data?.message || 'Error fetching providers');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async (provider) => {
    setPlansLoading(true);

    try {
      const response = await axios.get(
        `http://localhost:5000/api/student/plans/${provider.id}`
      );

      if (response.data.success) {
        setPlans(response.data.plans || []);
        setSelectedProvider(provider);
        setMenuPreviewOpen(false);
        setSelectedPlanForMenu(null);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      alert(err.response?.data?.message || 'Error fetching plans');
    } finally {
      setPlansLoading(false);
    }
  };

  const openMenuPreview = async (plan) => {
    setMenuPreviewOpen(true);
    setSelectedPlanForMenu(plan);
    setMenuPreviewLoading(true);

    try {
      const response = await axios.get(
        `http://localhost:5000/api/student/plans/${plan.id}/menu`
      );

      if (response.data.success && response.data.menu) {
        setMenuPreviewData({
          MONDAY: response.data.menu.MONDAY || '',
          TUESDAY: response.data.menu.TUESDAY || '',
          WEDNESDAY: response.data.menu.WEDNESDAY || '',
          THURSDAY: response.data.menu.THURSDAY || '',
          FRIDAY: response.data.menu.FRIDAY || '',
          SATURDAY: response.data.menu.SATURDAY || '',
          SUNDAY: response.data.menu.SUNDAY || ''
        });
      } else {
        setMenuPreviewData({
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
      console.error('Error fetching plan menu:', err);
      alert(err.response?.data?.message || 'Unable to load menu preview');
      setMenuPreviewData({
        MONDAY: '',
        TUESDAY: '',
        WEDNESDAY: '',
        THURSDAY: '',
        FRIDAY: '',
        SATURDAY: '',
        SUNDAY: ''
      });
    } finally {
      setMenuPreviewLoading(false);
    }
  };

  const placeOrder = async (planId, totalAmount) => {
    try {
      const response = await axios.post(
        'http://localhost:5000/api/student/order',
        {
          provider_id: selectedProvider.id,
          plan_id: planId,
          order_type: 'SUBSCRIPTION',
          total_amount: totalAmount,
        },
        config
      );

      if (response.data.success) {
        alert('Order placed successfully!');
        setPlans([]);
        setSelectedProvider(null);
        setMenuPreviewOpen(false);
        setSelectedPlanForMenu(null);
        fetchOrders();
        setActiveTab('orders');
      }
    } catch (err) {
      console.error('Error placing order:', err);
      alert(err.response?.data?.message || 'Failed to place order');
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);

    try {
      const response = await axios.get(
        'http://localhost:5000/api/student/orders',
        config
      );

      if (response.data.success) {
        setOrders(response.data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setOrdersLoading(false);
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

  const mapPosition =
    latitude && longitude
      ? {
          lat: Number(latitude),
          lng: Number(longitude),
        }
      : null;

  const menuDays = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY'
  ];

  return (
    <div className="student-shell">
      <section className="student-hero">
        <div>
          <p className="eyebrow">Student Dashboard</p>
          <h1>Welcome back, {user?.name || 'Student'}</h1>
          <p className="hero-subtext">
            Discover approved homemade tiffin providers, compare plans, and keep
            track of all your subscriptions in one place.
          </p>
        </div>

        <div className="hero-badge-card">
          <div className="hero-badge-item">
            <span className="hero-badge-label">Active view</span>
            <strong>{activeTab === 'search' ? 'Provider Search' : 'My Orders'}</strong>
          </div>
          <div className="hero-badge-item">
            <span className="hero-badge-label">Results loaded</span>
            <strong>{providers.length}</strong>
          </div>
          <div className="hero-badge-item">
            <span className="hero-badge-label">Orders tracked</span>
            <strong>{orders.length}</strong>
          </div>
        </div>
      </section>

      <div className="student-tabs">
        <button
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          Find Providers
        </button>
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          My Orders
        </button>
      </div>

      {activeTab === 'search' && (
        <>
          <section className="card search-card">
            <div className="card-header">
              <div>
                <h2>Search Nearby Providers</h2>
                <p>Search approved tiffin services near your current location.</p>
              </div>
              <div className="pill">
                {providers.length} result{providers.length !== 1 ? 's' : ''} found
              </div>
            </div>

            <form className="search-form" onSubmit={fetchNearbyProviders}>
              <div className="form-group">
                <label htmlFor="latitude">Latitude</label>
                <input
                  id="latitude"
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="Enter latitude"
                />
              </div>

              <div className="form-group">
                <label htmlFor="longitude">Longitude</label>
                <input
                  id="longitude"
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="Enter longitude"
                />
              </div>

              <button
                type="button"
                className="btn btn-secondary search-btn"
                onClick={handleUseCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? 'Fetching location...' : 'Use Current Location'}
              </button>

              <button
                type="submit"
                className="btn btn-primary search-btn"
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search Nearby'}
              </button>
            </form>

            <div style={{ marginTop: '20px' }}>
              <LocationPickerMap
                position={mapPosition}
                setPosition={handleMapPositionChange}
              />
            </div>
          </section>

          <section>
            <div className="section-head">
              <div>
                <h2>Nearby Providers</h2>
                <p>Compare providers by cuisine, distance, and rating.</p>
              </div>
            </div>

            {providers.length > 0 ? (
              <div className="provider-grid">
                {providers.map((provider) => (
                  <div key={provider.id} className="provider-card">
                    <div className="provider-card-top">
                      <div>
                        <h3>{provider.service_name}</h3>
                        <p className="muted">by {provider.name}</p>
                      </div>
                      <span className="pill">{provider.distance} km</span>
                    </div>

                    <div className="provider-meta">
                      <div className="meta-item">
                        <span className="meta-label">Cuisine</span>
                        <strong>{provider.cuisine_type || 'Home-style meals'}</strong>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Rating</span>
                        <strong>
                          {provider.avg_rating
                            ? `${Number(provider.avg_rating).toFixed(1)} / 5`
                            : 'Not rated yet'}
                        </strong>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Phone</span>
                        <strong>{provider.phone}</strong>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Service radius</span>
                        <strong>{provider.service_radius_km || 2} km</strong>
                      </div>
                    </div>

                    <button
                      className="btn btn-secondary full-width"
                      onClick={() => fetchPlans(provider)}
                    >
                      View Plans
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>No providers yet</h3>
                <p>Search nearby to discover approved tiffin services in your area.</p>
              </div>
            )}
          </section>

          <section className="plans-section">
            <div className="section-head">
              <div>
                <h2>Subscription Plans</h2>
                <p>Choose a subscription plan that fits your daily routine.</p>
              </div>
            </div>

            {plansLoading ? (
              <div className="empty-state">
                <h3>Loading plans...</h3>
                <p>Please wait while we fetch plans for the selected provider.</p>
              </div>
            ) : plans.length > 0 ? (
              <div className="plan-grid">
                {plans.map((plan) => (
                  <div key={plan.id} className="plan-card">
                    <div className="plan-top">
                      <div>
                        <h3>{plan.title}</h3>
                        <p className="muted">
                          {plan.description || 'Flexible subscription plan'}
                        </p>
                      </div>
                      <span className="price-pill">₹{plan.price}</span>
                    </div>

                    <div className="plan-details">
                      <div className="meta-item">
                        <span className="meta-label">Meal type</span>
                        <strong>{plan.meal_type}</strong>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Duration</span>
                        <strong>
                          {plan.duration_days
                            ? `${plan.duration_days} days`
                            : plan.duration_type}
                        </strong>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Provider</span>
                        <strong>{selectedProvider?.service_name || '-'}</strong>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gap: '10px'
                      }}
                    >
                      <button
                        className="btn btn-secondary full-width"
                        onClick={() => openMenuPreview(plan)}
                      >
                        View Daily Menu
                      </button>

                      <button
                        className="btn btn-primary full-width"
                        onClick={() => placeOrder(plan.id, plan.price)}
                      >
                        Subscribe Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedProvider ? (
              <div className="empty-state">
                <h3>No plans available</h3>
                <p>This provider has not added any subscription plans yet.</p>
              </div>
            ) : (
              <div className="empty-state">
                <h3>Select a provider</h3>
                <p>Click “View Plans” on a provider card to browse available subscriptions.</p>
              </div>
            )}
          </section>

          {menuPreviewOpen && selectedPlanForMenu && (
            <section className="card" style={{ marginTop: '24px' }}>
              <div className="card-header">
                <div>
                  <h2>Daily Menu Preview</h2>
                  <p>
                    {selectedPlanForMenu.title} from{' '}
                    {selectedProvider?.service_name || 'selected provider'}
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => setMenuPreviewOpen(false)}
                >
                  Close
                </button>
              </div>

              {menuPreviewLoading ? (
                <div className="empty-state">
                  <h3>Loading menu...</h3>
                  <p>Please wait while we fetch the daily menu for this plan.</p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '16px'
                  }}
                >
                  {menuDays.map((day) => (
                    <div
                      key={day}
                      style={{
                        border: '1px solid #ece7e1',
                        borderRadius: '18px',
                        padding: '16px',
                        background: '#fffdfa'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#8a8f98',
                          marginBottom: '8px'
                        }}
                      >
                        {day}
                      </div>
                      <p
                        style={{
                          margin: 0,
                          color: '#1f2937',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {menuPreviewData[day] || 'No items added for this day yet.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {activeTab === 'orders' && (
        <section className="card orders-card">
          <div className="card-header">
            <div>
              <h2>My Orders</h2>
              <p>Track your current and past tiffin subscriptions.</p>
            </div>
          </div>

          {ordersLoading ? (
            <div className="empty-state">
              <h3>Loading orders...</h3>
              <p>Please wait while we fetch your order history.</p>
            </div>
          ) : orders.length > 0 ? (
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order.id} className="order-row">
                  <div className="order-main">
                    <h3>{order.service_name}</h3>
                    <p className="muted">{order.plan_title || 'No plan selected'}</p>
                  </div>

                  <div className="order-info">
                    <div className="order-info-item">
                      <span className="meta-label">Provider</span>
                      <strong>{order.provider_name}</strong>
                    </div>
                    <div className="order-info-item">
                      <span className="meta-label">Amount</span>
                      <strong>₹{order.total_amount}</strong>
                    </div>
                    <div className="order-info-item">
                      <span className="meta-label">Payment</span>
                      <strong>{order.payment_status}</strong>
                    </div>
                    <div className="order-info-item">
                      <span className="meta-label">Status</span>
                      <span className={getStatusClass(order.order_status)}>
                        {order.order_status.replaceAll('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No orders yet</h3>
              <p>Browse nearby providers and place your first tiffin order.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default StudentDashboard;