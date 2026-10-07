import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
export default function ForgotPassword() {
  return <AuthLayout icon={Lock} title="Account recovery" subtitle="Get help from the person hosting this instance." footer={<Link to="/login" className="text-primary underline">Back to log in</Link>}>
    <p className="text-sm">This standalone edition does not send recovery emails. Contact the server owner to reset your account password. You can also return to the login screen and try the demo.</p>
  </AuthLayout>;
}
