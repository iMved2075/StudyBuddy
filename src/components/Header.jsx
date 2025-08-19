import { BrainCircuit, LogOut } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <BrainCircuit className="h-6 w-6 text-primary" />
        <span className="text-lg">StudyBuddy</span>
      </Link>
      <div className="ml-auto flex items-center gap-4">
        <ThemeToggle />
        {user && (
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Sign Out</span>
          </Button>
        )}
      </div>
    </header>
  );
}
