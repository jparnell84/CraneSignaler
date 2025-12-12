import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// --- IMPORTANT ---
// Add the Firebase UIDs of your admin users to this array.
const ADMIN_UIDS = [
    'iU4z9ANjBzQ86vViJcnmoWw0tn42', // <-- Replace this with your actual UID
    // 'ANOTHER_ADMIN_USER_ID_HERE',
];

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            // Check if the logged-in user's UID is in the admin list
            setIsAdmin(currentUser ? ADMIN_UIDS.includes(currentUser.uid) : false);
            setLoading(false);
        });

        return unsubscribe; // Cleanup subscription on unmount
    }, []);

    const value = {
        user,
        isAdmin,
        loading,
    };

    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};