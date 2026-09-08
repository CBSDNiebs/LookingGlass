import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ObservationFlow from './components/ObservationFlow';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setAuthError(null);
      
      if (authUser && authUser.email) {
        // Automatically allow the root admin
        if (authUser.email.toLowerCase() === 'jacobn@cbk12.com') {
          setUser(authUser);
          setLoading(false);
          return;
        }

        try {
          // Check if user is in the staff list
          const staffDoc = await getDoc(doc(db, 'staff', authUser.email.toLowerCase()));
          if (staffDoc.exists()) {
            setUser(authUser);
          } else {
            await signOut(auth);
            setUser(null);
            setAuthError("Your email is not listed in the staff directory. Please contact your administrator to get access.");
          }
        } catch (error) {
          console.error("Error verifying access:", error);
          await signOut(auth);
          setUser(null);
          setAuthError("Failed to verify access. Please try again.");
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Only the root admin (jacobn@cbk12.com) can access the admin panel for now
  const isAdmin = user?.email === 'jacobn@cbk12.com';

  return (
    <BrowserRouter>
      {authError && (
        <div className="fixed top-0 left-0 w-full bg-red-500 text-white p-4 text-center z-50">
          <p className="font-semibold">{authError}</p>
        </div>
      )}
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/record" element={user ? <ObservationFlow user={user} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user && isAdmin ? <AdminPanel user={user} /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
