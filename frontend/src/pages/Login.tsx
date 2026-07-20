import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LockKeyhole } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { state, login } = useApp();
  const [email, setEmail] = useState('hamaina30@gmail.com');
  const [password, setPassword] = useState('');

  if (state.authUser) return <Navigate to="/" replace />;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!password.trim()) return;
    login('admin', email);
    navigate('/', { replace: true });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen w-screen bg-stone-950 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <LockKeyhole size={26} />
          </div>
          <h1 className="text-2xl font-display font-bold text-stone-900">AgriCitrus Login</h1>
          <p className="text-sm text-stone-500">Admin access for local system.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-mono font-bold text-stone-400 uppercase">Email</label>
          <input value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none" />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-mono font-bold text-stone-400 uppercase">Password</label>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="w-full bg-stone-50 border border-stone-200 focus:border-orange-500 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none" />
        </div>

        <button className="w-full bg-orange-600 hover:bg-orange-500 text-white rounded-2xl py-3 text-sm font-bold transition-colors">
          Enter Dashboard
        </button>
      </form>
    </motion.div>
  );
};


