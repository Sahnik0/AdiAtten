
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const MeetTheMaker = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-blue-100">
      <Header />
      
      <main className="flex-grow p-4">
        <div className="container max-w-4xl mx-auto py-4 md:py-8">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl md:text-3xl">Meet the Maker</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-blue max-w-none">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="w-full md:w-1/3">
                    <div className="aspect-square rounded-lg bg-blue-100 flex items-center justify-center">
                      <img 
                        src="/placeholder.svg" 
                        alt="Developer" 
                        className="rounded-lg object-cover"
                      />
                    </div>
                  </div>
                  
                  <div className="w-full md:w-2/3">
                    <h2>About the Developer</h2>
                    <p>
                      AdiAtten System was developed by a team of passionate educators and developers 
                      from Adamas University, with the goal of creating a secure and efficient attendance tracking 
                      solution for educational institutions.
                    </p>
                    
                    <h3>Our Mission</h3>
                    <p>
                      Our mission is to streamline the attendance process while ensuring accuracy and preventing 
                      fraud. We believe that by automating attendance tracking, educators can focus more on teaching 
                      and less on administrative tasks.
                    </p>
                    
                    <h3>Development Team</h3>
                    <p>
                      The development team consists of faculty members from the Computer Science department 
                      and student developers who collaborated to build this innovative solution. The project 
                      incorporates modern web technologies and security practices to provide a reliable system 
                      for attendance management.
                    </p>
                    
                    <h3>Contact</h3>
                    <p>
                      For any inquiries or suggestions regarding the AdiAtten Attendance System, 
                      please reach out to us at sahnik.biswas@stu.adamasuniversity.ac.in
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MeetTheMaker;