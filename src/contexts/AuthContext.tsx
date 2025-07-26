import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string, role: 'owner' | 'manager') => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string, role: 'owner' | 'manager') => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    // 1. Fetch root user doc to get restaurantId
    const rootUserDoc = await getDoc(doc(db, 'users', uid));
    if (!rootUserDoc.exists()) throw new Error('User data not found (root)');
    const { restaurantId } = rootUserDoc.data();
    // 2. Fetch user profile from correct restaurant
    const userDoc = await getDoc(doc(db, 'restaurantProfile', restaurantId, 'users', uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.role !== role) {
        throw new Error('Invalid role selected');
      }
      setCurrentUser({
        uid: uid,
        email: userCredential.user.email!,
        role: userData.role,
        restaurantId,
      });
    } else {
      throw new Error('User data not found (profile)');
    }
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        // 1. Fetch root user doc to get restaurantId
        const rootUserDoc = await getDoc(doc(db, 'users', uid));
        if (!rootUserDoc.exists()) {
          setCurrentUser(null);
          setLoading(false);
          return;
        }
        const { restaurantId } = rootUserDoc.data();
        // 2. Fetch user profile from correct restaurant
        const userDoc = await getDoc(doc(db, 'restaurantProfile', restaurantId, 'users', uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser({
            uid: uid,
            email: user.email!,
            role: userData.role,
            restaurantId,
          });
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 