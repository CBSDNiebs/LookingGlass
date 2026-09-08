import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn } from 'lucide-react';

export default function Login() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed', error);
      alert('Login failed. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f7f7f5] p-4">
      <div className="bg-white p-8 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] max-w-md w-full text-center border border-black/10">
        <h1 className="text-3xl font-bold mb-2">Walk Through Tool</h1>
        <p className="text-gray-500 mb-8">Sign in to record and view observations.</p>
        <button
          onClick={handleLogin}
          className="flex items-center justify-center gap-2 w-full bg-black text-white py-4 px-6 rounded-xl font-bold text-lg hover:bg-gray-800 transition-colors"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
