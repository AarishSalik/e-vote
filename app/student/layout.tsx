
import { AppFooter } from '@/components/footer';
import { BackButton } from '@/components/back-button';
import { UserNav } from '@/components/user-nav';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-card border-b">
        <div className="container mx-auto flex h-16 items-center px-4 sm:px-8 justify-between">
          <div className='flex items-center gap-4'>
            <BackButton fallback='/student/dashboard' />
            <h1 className="text-lg font-semibold">Student Portal</h1>
          </div>
          <UserNav />
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 sm:p-8">{children}</main>
      <AppFooter />
    </div>
  );
}
