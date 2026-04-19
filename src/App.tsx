/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { useAuth } from './hooks/useAuth';
import type { User } from './types/shers';

export default function App() {
  const { user, login, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={(token: string, profile: User) => login(token, profile)} />;
  }

  return <Dashboard user={user} onLogout={logout} />;
}
