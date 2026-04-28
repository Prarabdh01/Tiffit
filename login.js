import React, { useState } from 'react';
import axios from 'axios';
import './login.css';

function Login({ onLogin, onSwitchToRegister }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (message) {
      setMessage('');
      setMessageType('');
    }
  };

  const fillAdminDemo = () => {
    setFormData({
      email: 'admin@tiffin.com',
      password: 'admin123',
    });
    setMessage('');
    setMessageType('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/login',
        formData
      );

      if (response.data.success) {
        const { token, user } = response.data;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        setMessage('Login successful');
        setMessageType('success');

        if (onLogin) {
          onLogin(user, token);
        }
      } else {
        setMessage(response.data.message || 'Login failed');
        setMessageType('error');
      }
    } catch (err) {
      console.error('Login error:', err);
      setMessage(err.response?.data?.message || 'Invalid credentials');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-layout">
        <div className="auth-brand-panel">
          <p className="auth-eyebrow">Tiffi</p>
          <h1>Fresh meals, smoother operations, better tiffin discovery.</h1>
          <p className="auth-brand-text">
            Log in to discover nearby tiffin services, manage meal plans, or
            review provider approvals.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-card">
              <strong>For students</strong>
              <span>Find nearby tiffin providers and place subscription orders.</span>
            </div>

            <div className="auth-feature-card">
              <strong>For providers</strong>
              <span>Create plans, manage orders, and grow your meal service.</span>
            </div>

            <div className="auth-feature-card">
              <strong>For admins</strong>
              <span>Review applications and keep the platform trusted.</span>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <p className="auth-mini">Welcome back</p>
            <h2>Login to your account</h2>
            <p>Enter your email and password to continue.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {message && (
              <div className={`auth-message ${messageType}`}>
                {message}
              </div>
            )}

            <div className="auth-form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="auth-btn auth-btn-primary"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="auth-footer">
            <span>Don’t have an account?</span>
            <button
              type="button"
              className="auth-link-btn"
              onClick={onSwitchToRegister}
            >
              Create account
            </button>
          </div>

          <div className="auth-demo-box">
            <p><strong>Admin demo</strong></p>
            <span>Email: admin@tiffin.com</span>
            <span>Password: admin123</span>
            <button
              type="button"
              className="auth-link-btn"
              onClick={fillAdminDemo}
            >
              Use demo credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;