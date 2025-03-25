import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getCurrentUser, signIn, signOut, signUp } from '@/services/supabaseService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  displayName: string | null;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function extractDisplayName(user: User | null): string | null {
  if (!user?.email) return null;
  // Extract name from email (everything before @)
  const name = user.email.split('@')[0];
  // Capitalize first letter and replace dots/underscores with spaces
  return name
    .split(/[._]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    setDisplayName(extractDisplayName(user));
  }, [user]);

  async function checkUser() {
    try {
      const { user, error } = await getCurrentUser();
      if (error) throw error;
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn(email: string, password: string) {
    try {
      setError(null);
      const { user, error } = await signIn(email, password);
      if (error) throw error;
      setUser(user);
    } catch (error) {
      console.error('Error signing in:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign in');
      throw error;
    }
  }

  async function handleSignUp(email: string, password: string) {
    try {
      setError(null);
      const { user, error } = await signUp(email, password);
      if (error) throw error;
      setUser(user);
    } catch (error) {
      console.error('Error signing up:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign up');
      throw error;
    }
  }

  async function handleSignOut() {
    try {
      setError(null);
      const { error } = await signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign out');
      throw error;
    }
  }

  const value = {
    user,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    error,
    displayName,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
