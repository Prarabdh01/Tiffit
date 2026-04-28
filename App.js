import React, { useState, useEffect } from 'react';
import Login from './components/login';
import Register from './components/register';
import Navbar from './components/navbar';
import StudentDashboard from './components/StudentDashboard';
import ProviderDashboard from './components/ProviderDashboard';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('login');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      setCurrentUser(JSON.parse(user));
      setCurrentPage('dashboard');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setCurrentPage('login');
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    setCurrentPage('dashboard');
  };

  const handleRegister = () => {
    setCurrentPage('login');
  };

  if (!currentUser) {
    return (
      <>
        {currentPage === 'login' ? (
          <Login
            onLogin={handleLogin}
            onSwitchToRegister={() => setCurrentPage('register')}
          />
        ) : (
          <Register onSwitchToLogin={handleRegister} />
        )}
      </>
    );
  }

  return (
    <>
      <Navbar user={currentUser} onLogout={handleLogout} />

      {currentUser.role === 'STUDENT' && (
        <StudentDashboard user={currentUser} />
      )}

      {currentUser.role === 'PROVIDER' && (
        <ProviderDashboard user={currentUser} />
      )}

      {currentUser.role === 'ADMIN' && (
        <AdminDashboard user={currentUser} />
      )}
    </>
  );
}

export default App;