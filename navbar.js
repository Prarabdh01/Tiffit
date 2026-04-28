import React from 'react';

function Navbar({ user, onLogout }) {
  const roleLabel =
    user?.role === 'ADMIN'
      ? 'Admin'
      : user?.role === 'PROVIDER'
      ? 'Provider'
      : 'Student';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'rgba(255, 250, 247, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #f0e4db',
        boxShadow: '0 8px 24px rgba(31, 41, 55, 0.05)'
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#ff6b4a',
              marginBottom: '6px'
            }}
          >
            Tiffin Service Platform
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap'
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                color: '#1f2937',
                lineHeight: 1.2
              }}
            >
              Welcome, {user?.name || 'User'}
            </h2>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 12px',
                borderRadius: '999px',
                background: '#fff1ec',
                color: '#ff6b4a',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              {roleLabel}
            </span>
          </div>

          <p
            style={{
              margin: '8px 0 0',
              color: '#6b7280',
              fontSize: '14px'
            }}
          >
            {user?.email || 'Signed in'}
          </p>
        </div>

        <button
          onClick={onLogout}
          type="button"
          style={{
            border: 'none',
            borderRadius: '14px',
            height: '44px',
            padding: '0 18px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            background: '#ff6b4a',
            color: '#ffffff',
            boxShadow: '0 12px 24px rgba(255, 107, 74, 0.24)'
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;