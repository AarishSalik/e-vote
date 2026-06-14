"use client"
import Link from 'next/link';
import { LayoutDashboard, UserCog, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function BottomNavBar() {
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Home', icon: Home },
        { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/login?tab=admin', label: 'Admin', icon: UserCog },
    ];

    // Hide the nav bar on the login page, but show on welcome page if navigated back
    if (pathname === '/login') {
        return null;
    }
    
    // Don't show the bar on the root welcome page initially, but allow it on subsequent navigations
    if (pathname === '/' && typeof window !== 'undefined' && window.history.length <= 2) {
        // A simple check to see if it's the initial page load.
        // This could be more robust, but works for this scenario.
        const initialLoad = !document.referrer || new URL(document.referrer).origin !== window.location.origin;
        if(initialLoad) return null;
    }


    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-t-lg z-50 md:hidden">
            <div className="flex justify-around h-16 items-center">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link href={item.href} key={item.label} className={cn(
                            "flex flex-col items-center justify-center text-muted-foreground w-full h-full transition-colors",
                            { "text-primary bg-primary/10": isActive }
                        )}>

                            <item.icon className="h-6 w-6" />
                            <span className="text-xs font-medium">{item.label}</span>

                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
