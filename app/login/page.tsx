
"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { BackButton } from "@/components/back-button";
import { useSearchParams } from "next/navigation";
import { AppFooter } from "@/components/footer";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "student";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
       <BackButton className="absolute top-4 left-4" fallback="/" />
      <div className="flex flex-col items-center justify-center gap-4 mb-8">
        <Logo />
        <p className="text-center text-muted-foreground max-w-md">
          Welcome to the official School E-Voting System. Please login to cast your vote.
        </p>
      </div>

      <Tabs defaultValue={tab} className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="student">Student Login</TabsTrigger>
          <TabsTrigger value="admin">Admin Login</TabsTrigger>
        </TabsList>
        <TabsContent value="student">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Student Portal</CardTitle>
              <CardDescription>
                Enter your unique Voter ID to proceed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuthForm mode="student" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Admin Panel</CardTitle>
              <CardDescription>
                Enter your admin credentials to access the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuthForm mode="admin" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <AppFooter className="mt-8" />
    </main>
  );
}
