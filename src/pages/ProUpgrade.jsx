import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
export default function ProUpgrade(){
  return <div className="px-5 py-8"><h1 className="mb-3 text-3xl font-black">Made for everyone</h1><p className="mb-6 text-muted-foreground">All features in the standalone edition are free. No payment or subscription setup is needed.</p><ul className="mb-6 space-y-3">{['Share up to 20 outfits a day','View profile visits and outfit analytics','Save collections and discover new styles'].map(text=><li key={text} className="flex gap-2"><Check aria-hidden="true" size={20}/>{text}</li>)}</ul><Link to="/upload" className="inline-block rounded-full bg-primary px-5 py-3 text-primary-foreground">Share a fit</Link></div>;
}
