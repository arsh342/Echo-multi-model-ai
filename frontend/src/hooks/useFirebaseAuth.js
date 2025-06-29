import { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  getIdToken
} from 'firebase/auth';
import { auth } from '../firebase';

const useFirebaseAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithRedirect = async () => {
    try {
      // console.log('Starting Google sign-in popup...');
      const provider = new GoogleAuthProvider();
      // Add scopes if needed
      provider.addScope('email');
      provider.addScope('profile');
      
      // Set custom parameters to prevent automatic redirects
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      // console.log('Sign-in successful:', result.user.email);
    } catch (error) {
      // console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // console.log('Logging out...');
      await signOut(auth);
    } catch (error) {
      // console.error('Logout error:', error);
      throw error;
    }
  };

  const getAccessTokenSilently = async () => {
    if (!user) {
      throw new Error('No user logged in');
    }
    try {
      const token = await getIdToken(user, true); // Force refresh
      return token;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    loginWithRedirect,
    logout,
    getAccessTokenSilently
  };
};

export default useFirebaseAuth; 