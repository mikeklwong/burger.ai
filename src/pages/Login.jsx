import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { safeReturnTo } from '@/lib/authReturnTo';
export default function Login() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  const login=async(event)=>{event.preventDefault();setLoading(true);setError('');try{await api.auth.loginViaEmailPassword(email,password);window.location.href=safeReturnTo();}catch(e){setError(e.message);}finally{setLoading(false);}};
  const demo=async()=>{setLoading(true);setError('');try{await api.auth.demo();window.location.href='/';}catch(e){setError(e.message);}finally{setLoading(false);}};
  return <AuthLayout icon={LogIn} title="burger.ai" subtitle="Rate fits. Find your people." footer={<>New here? <Link to="/register" className="text-primary underline">Create an account</Link></>}>
    <Button onClick={demo} disabled={loading} className="mb-2 h-12 w-full">Try the demo</Button>
    <p className="mb-6 text-center text-xs text-muted-foreground">No signup needed. Explore sample fits with a guest account.</p>
    {error&&<p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
    <form onSubmit={login} className="space-y-4">
      <div><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} /></div>
      <Button type="submit" disabled={loading} variant="outline" className="w-full">{loading?'Please wait…':'Log in'}</Button>
      <Link to="/forgot-password" className="block text-center text-sm text-primary underline">Forgot password?</Link>
    </form>
  </AuthLayout>;
}
