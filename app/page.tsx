import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Info, Vote } from 'lucide-react';
import { AppFooter } from '@/components/footer';

export default function WelcomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center text-center p-4">
      <div className="absolute top-0 left-0 w-full h-full bg-background/50 backdrop-blur-sm"></div>
      <div className="relative z-10 flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex items-center gap-4">
            <Vote className="h-16 w-16 text-primary" />
            <h1 className="text-6xl font-bold font-headline text-primary">AKHSS E-Voting</h1>
        </div>
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-headline tracking-tight text-foreground">
            A New Era of School Elections
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Welcome to AKHSS E-Voting, a modern, secure, and engaging platform designed to make school elections fair, transparent, and accessible for everyone.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/login">
            <Button size="lg" className="font-bold text-lg group">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            </Link>
            <Link href="/about">
                <Button size="lg" variant="outline" className="font-bold text-lg group">
                    <Info className="mr-2 h-5 w-5"/>
                    Learn More
                </Button>
            </Link>
        </div>
      </div>
      <AppFooter className="absolute bottom-4" />
    </main>
  );
}
