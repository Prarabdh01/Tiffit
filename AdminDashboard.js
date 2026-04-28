import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

function AdminDashboard({ user }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

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
    if (token) {
      fetchProviders();
    }
  }, [token]);

  const fetchProviders = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(
        'http://localhost:5000/api/admin/providers',
        config
      );

      if (response.data.success) {
        setProviders(response.data.providers || []);
      } else {
        setError(response.data.message || 'Failed to load providers');
      }
    } catch (err) {
      console.error('Error fetching providers:', err);
      setError(err.response?.data?.message || 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const approveProvider = async (providerId) => {
    setActionLoadingId(providerId);
    setError('');

    try {
      const response = await axios.put(
        `http://localhost:5000/api/admin/provider/${providerId}/approve`,
        {},
        config
      );

      if (response.data.success) {
        await fetchProviders();
      } else {
        setError(response.data.message || 'Failed to approve provider');
      }
    } catch (err) {
      console.error('Error approving provider:', err);
      setError(err.response?.data?.message || 'Failed to approve provider');
    } finally {
      setActionLoadingId(null);
    }
  };

  const rejectProvider = async (providerId) => {
    const confirmed = window.confirm(
      'Are you sure you want to reject this provider?'
    );

    if (!confirmed) return;

    setActionLoadingId(providerId);
    setError('');

    try {
      const response = await axios.put(
        `http://localhost:5000/api/admin/provider/${providerId}/reject`,
        {},
        config
      );

      if (response.data.success) {
        await fetchProviders();
      } else {
        setError(response.data.message || 'Failed to reject provider');
      }
    } catch (err) {
      console.error('Error rejecting provider:', err);
      setError(err.response?.data?.message || 'Failed to reject provider');
    } finally {
      setActionLoadingId(null);
    }
  };

  const stats = useMemo(() => {
    const pending = providers.filter((p) => p.status === 'PENDING').length;
    const approved = providers.filter((p) => p.status === 'APPROVED').length;
    const rejected = providers.filter((p) => p.status === 'REJECTED').length;

    return {
      total: providers.length,
      pending,
      approved,
      rejected,
    };
  }, [providers]);

  const filteredProviders = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return providers.filter((provider) => {
      const matchesFilter =
        statusFilter === 'ALL' ? true : provider.status === statusFilter;

      const matchesSearch =
        !searchValue ||
        provider.service_name?.toLowerCase().includes(searchValue) ||
        provider.name?.toLowerCase().includes(searchValue) ||
        provider.email?.toLowerCase().includes(searchValue) ||
        provider.phone?.toLowerCase().includes(searchValue);

      return matchesFilter && matchesSearch;
    });
  }, [providers, statusFilter, searchTerm]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'PENDING':
        return 'status pending';
      case 'APPROVED':
        return 'status approved';
      case 'REJECTED':
        return 'status rejected';
      default:
        return 'status';
    }
  };

  if (!token) {
    return (
      <div className="admin-shell">
        <div className="empty-state">
          <h3>You are not logged in</h3>
          <p>Please login as admin to access the dashboard.</p>
        </div>
      </div>
    );
  }

  if (user?.role && user.role !== 'ADMIN') {
    return (
      <div className="admin-shell">
        <div className="empty-state">
          <h3>Access denied</h3>
          <p>Only admin users can access this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <section className="admin-hero">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h1>Welcome back, {user?.name || 'Admin'}</h1>
          <p className="hero-subtext">
            Review provider applications, monitor approvals, and keep the
            platform curated and trusted.
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={fetchProviders}
          disabled={loading}
          type="button"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Total Providers</span>
          <strong>{stats.total}</strong>
        </div>

        <div className="stat-card pending-card">
          <span>Pending</span>
          <strong>{stats.pending}</strong>
        </div>

        <div className="stat-card approved-card">
          <span>Approved</span>
          <strong>{stats.approved}</strong>
        </div>

        <div className="stat-card rejected-card">
          <span>Rejected</span>
          <strong>{stats.rejected}</strong>
        </div>
      </section>

      <section className="card control-card">
        <div className="control-top">
          <h2>Provider Applications</h2>
          <p>Search and review all provider applications in one place.</p>
        </div>

        <div className="control-bar">
          <div className="filter-tabs">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
              <button
                key={status}
                type="button"
                className={`filter-btn ${
                  statusFilter === status ? 'active' : ''
                }`}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search by service, owner, email, or phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header" style={{ marginBottom: '18px' }}>
          <h2>Applications List</h2>
          <p>
            {filteredProviders.length} matching provider
            {filteredProviders.length !== 1 ? 's' : ''}
          </p>
        </div>

        {error && (
          <div className="empty-state" style={{ marginBottom: '18px' }}>
            <h3>Something went wrong</h3>
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <h3>Loading providers...</h3>
            <p>Please wait while we fetch the latest applications.</p>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="empty-state">
            <h3>No providers found</h3>
            <p>Try changing the status filter or search term.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="provider-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Owner</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProviders.map((provider) => {
                  const isRowLoading = actionLoadingId === provider.id;

                  return (
                    <tr key={provider.id}>
                      <td>
                        <div className="table-primary">
                          {provider.service_name || 'Untitled Service'}
                        </div>
                        <div className="table-secondary">
                          {provider.email || 'No email'}
                        </div>
                      </td>

                      <td>
                        <div className="table-primary">
                          {provider.name || 'Unknown Owner'}
                        </div>
                      </td>

                      <td>
                        <div className="table-primary">
                          {provider.phone || 'No phone'}
                        </div>
                      </td>

                      <td>
                        <span className={getStatusClass(provider.status)}>
                          {provider.status}
                        </span>
                      </td>

                      <td>
                        {provider.status === 'PENDING' ? (
                          <div className="action-group">
                            <button
                              type="button"
                              className="btn btn-secondary small-btn"
                              onClick={() => approveProvider(provider.id)}
                              disabled={isRowLoading}
                            >
                              {isRowLoading ? 'Processing...' : 'Approve'}
                            </button>

                            <button
                              type="button"
                              className="btn btn-danger small-btn"
                              onClick={() => rejectProvider(provider.id)}
                              disabled={isRowLoading}
                            >
                              {isRowLoading ? 'Processing...' : 'Reject'}
                            </button>
                          </div>
                        ) : (
                          <span className="action-done">
                            {provider.status === 'APPROVED'
                              ? 'Approved'
                              : 'Rejected'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;