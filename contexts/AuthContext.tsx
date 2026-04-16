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
    loading: boolean;
    updateUser: (data: Partial<UserProfile>) => Promise<void>;
    isAdmin: boolean;
    isAuthenticated: boolean;
    login: (email: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

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
            const updates: Record<string, any> = {};
            if (data.name !== undefined) updates.full_name = data.name;
            if (data.avatar !== undefined) updates.avatar_url = data.avatar;

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            setUser(prev => prev ? { ...prev, name: data.name ?? prev.name, avatar: data.avatar ?? prev.avatar } : null);
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    };

    const login = async (_email: string) => {
        // Reserved for future magic-link flow
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
        <AuthContext.Provider value={{ user, session, loading, updateUser, isAdmin, isAuthenticated, login, logout }}>
            {children}
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
