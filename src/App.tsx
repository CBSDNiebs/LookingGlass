import { useEffect, useState } from 'react';
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './firebase';
import Dashboard from './components/Dashboard';
import ObservationFlow from './components/ObservationFlow';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setAuthError(null);
      if (authUser) {
        setUser(authUser);
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

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f7f7f5] p-4">
        <div className="bg-white p-8 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] max-w-md w-full text-center border border-black/10">
          <h1 className="text-3xl font-bold mb-2">Walk Through Tool</h1>
          <p className="text-gray-500 mb-8">Sign in to record and view observations.</p>
          <button
            onClick={async () => {
              await signInWithPopup(auth, new GoogleAuthProvider());
            }}
            className="flex items-center justify-center gap-2 w-full bg-black text-white py-4 px-6 rounded-xl font-bold text-lg hover:bg-gray-800 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const router = createHashRouter([
    { path: "/", element: <Dashboard user={user} /> },
    { path: "/record", element: <ObservationFlow user={user} /> },
    { path: "*", element: <Navigate to="/" /> }
  ]);

  return (
    <>
      {authError && (
        <div className="fixed top-0 left-0 w-full bg-red-500 text-white p-4 text-center z-50">
          <p className="font-semibold">{authError}</p>
        </div>
      )}
      <RouterProvider router={router} />
    </>
  );
}
