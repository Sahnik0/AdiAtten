import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Home, Github, Linkedin, Twitter, Mail, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Simple header that doesn't need authentication
const SimpleHeader = () => {
  return (
    <header className="w-full bg-white shadow-sm py-3 px-4 sticky top-0 z-10">
      <div className="container max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/">
            <h1 className="text-xl font-bold gradient-text bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-cyan-500 hover:to-blue-600 transition-all duration-300">
              AdiAtten
            </h1>
          </Link>
        </div>
        
        <Link to="/">
          <Button variant="outline" size="sm" className="flex items-center hover:bg-blue-50 transition-colors">
            <Home className="h-4 w-4 mr-1" />
            Back to Home
          </Button>
        </Link>
      </div>
    </header>
  );
};

const SocialLink = ({ icon: Icon, href, label }) => {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline transition-colors"
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </a>
  );
};

const MeetTheMaker = () => {
  const [activeTab, setActiveTab] = useState("about");
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <SimpleHeader />
      
      <main className="flex-grow container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">Meet the Maker</h1>
        
        <Card className="shadow-lg border-blue-100 hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardTitle className="text-2xl md:text-3xl text-blue-800">Sahnik Biswas</CardTitle>
          </CardHeader>
          
          <CardContent className="prose prose-blue max-w-none pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="w-full md:w-1/3">
                <div className="aspect-square rounded-lg bg-blue-100 flex items-center justify-center overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <img
                    src="/api/placeholder/400/400"
                    alt="Sahnik Biswas"
                    className="rounded-lg object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                
                <div className="mt-4 space-y-2">
                  <h3 className="text-lg font-medium text-gray-800">Connect with me</h3>
                  <div className="flex flex-col space-y-3">
                    <SocialLink icon={Github} href="https://github.com/Sahnik0" label="GitHub" />
                    <SocialLink icon={Linkedin} href="https://linkedin.com/in/sahnik-biswas" label="LinkedIn" />
                    <SocialLink icon={Twitter} href="https://twitter.com/sahnik_biswas" label="Twitter" />
                    <SocialLink icon={Mail} href="mailto:sahnik.biswas@stu.adamasuniversity.ac.in" label="Email" />
                    <SocialLink icon={ExternalLink} href="https://sahnik.tech" label="Portfolio" />
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-2/3">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full grid grid-cols-2 mb-6">
                    <TabsTrigger value="about">About Me</TabsTrigger>
                    <TabsTrigger value="project">Project Details</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="about" className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-md">
                      <h2 className="text-xl font-bold text-blue-800">About Me</h2>
                      <p className="mt-2">
                        I'm Sahnik Biswas, a passionate developer and student at Adamas University. I designed and developed 
                        the AdiAtten System as my personal project to revolutionize attendance tracking in educational institutions.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-blue-700">My Mission</h3>
                      <p className="mt-1">
                        My mission with AdiAtten is to streamline the attendance process while ensuring accuracy and preventing
                        fraud. I believe that by automating attendance tracking, educators can focus more on teaching
                        and less on administrative tasks.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-blue-700">My Journey</h3>
                      <p className="mt-1">
                        As a Class Representative who observed the challenges in traditional attendance systems, I was inspired to create 
                        a solution that leverages modern technology. AdiAtten is the result of countless hours hard work, 
                        design, and development, reflecting my commitment to solving real-world problems.
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="project" className="space-y-4">
                    <div className="bg-cyan-50 p-4 rounded-md">
                      <h2 className="text-xl font-bold text-cyan-800">Project Overview</h2>
                      <p className="mt-2">
                        AdiAtten is a secure and efficient attendance tracking system built with modern web technologies.
                        I developed this project single-handedly to address the inefficiencies in traditional attendance methods.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-cyan-700">Key Features</h3>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>Secure authentication system</li>
                        <li>Real-time attendance tracking</li>
                        <li>Anti-spoofing measures</li>
                        <li>Comprehensive reporting dashboard</li>
                        <li>Mobile-responsive design</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-cyan-700">Technologies Used</h3>
                      <p className="mt-1">
                        AdiAtten is built using TypeScript, TailwindCss and firebase with emphasis on security and user experience.
                        The frontend utilizes modern React patterns and component libraries to create an intuitive interface.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="mt-6 pt-4 border-t border-blue-100">
                  <h3 className="text-lg font-semibold text-blue-700">Contact</h3>
                  <p className="mt-1">
                    For any inquiries or suggestions regarding the AdiAtten Attendance System,
                    please reach out to me at <a href="mailto:sahnik.biswas@stu.adamasuniversity.ac.in" className="text-blue-600 hover:underline">sahnik.biswas@stu.adamasuniversity.ac.in</a>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default MeetTheMaker;