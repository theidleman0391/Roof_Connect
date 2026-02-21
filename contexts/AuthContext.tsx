import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Sales Agent' | 'Manager';
    avatar: string;
    agentId: string;
}

interface AuthContextType {
    user: UserProfile | null;
    session: Session | null;
    updateUser: (data: Partial<UserProfile>) => Promise<void>;
    isAdmin: boolean;
    isAuthenticated: boolean;
    login: (email: string) => Promise<void>; // Request magic link or just helper
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
            } else if (data) {
                setUser({
                    id: data.id,
                    name: data.full_name || data.email?.split('@')[0] || 'User',
                    email: data.email || '',
                    role: (data.role as any) || 'Sales Agent',
                    avatar: data.avatar_url || '',
                    agentId: data.agent_id || 'AGT-' + userId.slice(0, 6).toUpperCase()
                });
            }
        } catch (error) {
            console.error('Error in fetchProfile:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateUser = async (data: Partial<UserProfile>) => {
        if (!user) return;

        try {
            const updates = {
                full_name: data.name,
                avatar_url: data.avatar,
                // agent_id and role might be restricted in real app but allowing here
                agent_id: data.agentId,
                role: data.role
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            setUser(prev => prev ? { ...prev, ...data } : null);
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const login = async (email: string) => {
        // Placeholder if we want to trigger magic link from context, 
        // but typically login is handled in Login.tsx directly via supabase.auth.signInWith...
        // keeping interface for compatibility if needed.
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        } finally {
            setUser(null);
            setSession(null);
        }
    };

    const isAdmin = user?.role === 'Admin' || user?.role === 'Manager';
    const isAuthenticated = !!session;

    return (
        <AuthContext.Provider value={{ user, session, updateUser, isAdmin, isAuthenticated, login, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};