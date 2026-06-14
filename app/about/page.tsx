
import { BackButton } from '@/components/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Users, BarChart, Shield, Filter, Timer } from 'lucide-react';
import { AppFooter } from '@/components/footer';

export default function AboutPage() {
  const features = [
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Secure Student Authentication",
      description: "Easy and secure login for students using their unique Student ID, preventing duplicate votes and ensuring a fair election.",
    },
    {
      icon: <Filter className="h-8 w-8 text-primary" />,
      title: "Class-Based Candidate Filtering",
      description: "Students see only the Class Representative (CR) candidates running in their specific class, making voting simple and relevant.",
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Dynamic Candidate Management",
      description: "Admins can effortlessly add and manage candidates for both House Representative (HR) and CR positions through a simple interface.",
    },
    {
      icon: <BarChart className="h-8 w-8 text-primary" />,
      title: "Live Results & Analytics",
      description: "Admins get access to a powerful dashboard with live vote counts and detailed turnout analytics.",
    },
    {
      icon: <Timer className="h-8 w-8 text-primary" />,
      title: "Election Timer Controls",
      description: "Administrators can set specific start and end times for elections, automating the voting window.",
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-primary" />,
      title: "Voting Confirmation",
      description: "After voting, students receive a clear confirmation, and the system prevents any further attempts to vote.",
    }
  ];

  return (
    <div className='flex flex-col min-h-screen'>
      <main className="flex-1 p-4 sm:p-8">
        <BackButton className="mb-4" fallback="/" />
        <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                  <h1 className="text-4xl sm:text-5xl font-extrabold font-headline text-foreground">
                      About AKHSS E-Voting
                  </h1>
                  <p className="mt-4 text-lg text-muted-foreground">
                      Revolutionizing school elections with a secure, transparent, and user-friendly platform.
                  </p>
              </div>
              
              <Card>
                  <CardHeader>
                      <CardTitle className="text-2xl text-center">Our Core Features</CardTitle>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-8">
                      {features.map((feature, index) => (
                          <div key={index} className="flex items-start gap-4">
                              <div className="flex-shrink-0">{feature.icon}</div>
                              <div>
                                  <h3 className="text-lg font-bold">{feature.title}</h3>
                                  <p className="text-muted-foreground mt-1">{feature.description}</p>
                              </div>
                          </div>
                      ))}
                  </CardContent>
              </Card>
              
              <div className="text-center mt-12">
                  <h2 className="text-3xl font-bold font-headline">Our Mission</h2>
                  <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                      Our mission is to empower the next generation of leaders by providing a fair, accessible, and modern electoral process. We believe that a positive first experience with democracy can inspire a lifetime of civic engagement.
                  </p>
              </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
