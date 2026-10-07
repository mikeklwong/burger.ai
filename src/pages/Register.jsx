import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
export default function Register() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState('');
  const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  const register=async(event)=>{event.preventDefault();setError('');if(password!==confirm){setError('Passwords do not match');return;}setLoading(true);try{await api.auth.register({email,password});window.location.href='/onboarding';}catch(e){setError(e.message);}finally{setLoading(false);}};
  return <AuthLayout icon={UserPlus} title="Find your people" subtitle="Create an account and share your style." footer={<>Already registered? <Link to="/login" className="text-primary underline">Log in</Link></>}>
    {error&&<p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
    <form onSubmit={register} className="space-y-4">
      <div><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div><Label htmlFor="password">Password</Label><Input id="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)} /><p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p></div>
      <div><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)} /></div>
      <Button type="submit" disabled={loading} className="w-full">{loading?'Creating account…':'Create account'}</Button>
    </form>
  </AuthLayout>;
}
