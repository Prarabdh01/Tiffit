import React, { useState } from 'react';
import axios from 'axios';
import './register.css';
import LocationPickerMap from './LocationPickerMap';

function Register({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'STUDENT',
    service_name: '',
    latitude: '',
    longitude: '',
  });

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const clearMessage = () => {
    setMessage('');
    setMessageType('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (message) {
      clearMessage();
    }
  };

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;

    setFormData((prev) => ({
      ...prev,
      role: selectedRole,
      ...(selectedRole !== 'PROVIDER'
        ? {
            service_name: '',
            latitude: '',
            longitude: '',
          }
        : {}),
    }));

    if (message) {
      clearMessage();
    }
  };

  const handleMapPositionChange = (position) => {
    setFormData((prev) => ({
      ...prev,
      latitude: position.lat.toFixed(6),
      longitude: position.lng.toFixed(6),
    }));

    if (message) {
      clearMessage();
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser');
      setMessageType('error');
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        clearMessage();
        setLocationLoading(false);
      },
      (error) => {
        console.error('Location error:', error);
        setMessage('Unable to fetch current location. Please allow location access or choose from the map.');
        setMessageType('error');
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessage();

    if (!formData.name.trim()) {
      setMessage('Name is required');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setMessage('Email is required');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (!formData.phone.trim()) {
      setMessage('Phone number is required');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (!formData.password.trim()) {
      setMessage('Password is required');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (formData.role === 'PROVIDER') {
      if (!formData.service_name.trim()) {
        setMessage('Service name is required for providers');
        setMessageType('error');
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role,
      };

      if (formData.role === 'PROVIDER') {
        payload.service_name = formData.service_name.trim();
        payload.latitude = formData.latitude === '' ? 0 : Number(formData.latitude);
        payload.longitude = formData.longitude === '' ? 0 : Number(formData.longitude);
      }

      const response = await axios.post(
        'http://localhost:5000/api/auth/register',
        payload
      );

      if (response.data.success) {
        setMessage('Registration successful! Please login.');
        setMessageType('success');

        setTimeout(() => {
          if (onSwitchToLogin) onSwitchToLogin();
        }, 1200);
      } else {
        setMessage(response.data.message || 'Registration failed');
        setMessageType('error');
      }
    } catch (err) {
      console.error('Register error:', err);
      setMessage(err.response?.data?.message || 'Registration failed');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const mapPosition =
    formData.latitude !== '' && formData.longitude !== ''
      ? {
          lat: Number(formData.latitude),
          lng: Number(formData.longitude),
        }
      : null;

  return (
    <div className="auth-shell">
      <div className="auth-layout">
        <div className="auth-brand-panel">
          <p className="auth-eyebrow">Join Tiffi</p>
          <h1>Fresh homemade meals, delivered with trust.</h1>
          <p className="auth-brand-text">
            Register as a student to discover meal subscriptions or as a provider
            to publish your tiffin service.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-card">
              <strong>Nearby tiffin discovery</strong>
              <span>Students can browse approved providers close to their location.</span>
            </div>
            <div className="auth-feature-card">
              <strong>Provider onboarding</strong>
              <span>Create your service, set your location, and start receiving orders.</span>
            </div>
            <div className="auth-feature-card">
              <strong>Admin-reviewed quality</strong>
              <span>Every provider goes through an approval flow before appearing live.</span>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <p className="auth-mini">Get started</p>
            <h2>Create your account</h2>
            <p>Fill in your details to join the platform.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-row">
              <div className="auth-form-group">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="auth-form-group">
                <label htmlFor="phone">Phone number</label>
                <input
                  id="phone"
                  type="text"
                  name="phone"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="auth-form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="auth-form-row">
              <div className="auth-form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div className="auth-form-group">
                <label htmlFor="role">Register as</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleRoleChange}
                >
                  <option value="STUDENT">Student</option>
                  <option value="PROVIDER">Provider</option>
                </select>
              </div>
            </div>

            {formData.role === 'PROVIDER' && (
              <>
                <div className="auth-form-group">
                  <label htmlFor="service_name">Service name</label>
                  <input
                    id="service_name"
                    type="text"
                    name="service_name"
                    placeholder="Enter your tiffin service name"
                    value={formData.service_name}
                    onChange={handleChange}
                  />
                </div>

                <div className="auth-form-group">
                  <label>Select service location</label>
                  <button
                    type="button"
                    className="auth-btn"
                    onClick={handleUseCurrentLocation}
                    disabled={locationLoading}
                    style={{
                      background: '#fff4ee',
                      color: '#ff6b4a',
                      border: '1px solid #ffdacc',
                    }}
                  >
                    {locationLoading ? 'Fetching current location...' : 'Use Current Location'}
                  </button>
                </div>

                <div className="auth-form-group">
                  <label>Pick on map</label>
                  <LocationPickerMap
                    position={mapPosition}
                    setPosition={handleMapPositionChange}
                  />
                </div>

                <div className="auth-form-row">
                  <div className="auth-form-group">
                    <label htmlFor="latitude">Latitude</label>
                    <input
                      id="latitude"
                      type="number"
                      step="0.000001"
                      name="latitude"
                      placeholder="Latitude"
                      value={formData.latitude}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="longitude">Longitude</label>
                    <input
                      id="longitude"
                      type="number"
                      step="0.000001"
                      name="longitude"
                      placeholder="Longitude"
                      value={formData.longitude}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </>
            )}

            {message && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: messageType === 'success' ? '#dcfce7' : '#fee2e2',
                  color: messageType === 'success' ? '#166534' : '#b91c1c',
                  border:
                    messageType === 'success'
                      ? '1px solid #bbf7d0'
                      : '1px solid #fecaca',
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              className="auth-btn auth-btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Register now'}
            </button>
          </form>

          <div className="auth-footer">
            <span>Already have an account?</span>
            <button
              type="button"
              className="auth-link-btn"
              onClick={onSwitchToLogin}
            >
              Login here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;