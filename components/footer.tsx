import { cn } from "@/lib/utils";

export function AppFooter({ className }: { className?: string }) {
    return (
        <footer className={cn("w-full text-center p-4 text-muted-foreground text-sm", className)}>
            <p>&copy; {new Date().getFullYear()} AKHSS E-Voting. All rights reserved.</p>
            <p className="mt-1">Developed by Aarish Wazir</p>
      </footer>
    );
}
