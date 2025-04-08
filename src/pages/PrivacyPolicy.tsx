import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, Clock, Search, User, MapPin, Smartphone, Lock, Archive, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const PrivacyPolicy = () => {
  const [activeSection, setActiveSection] = useState(null);
  
  const sections = [
    { id: 'introduction', title: 'Introduction', icon: Shield },
    { id: 'collection', title: 'Information We Collect', icon: Search },
    { id: 'usage', title: 'How We Use Your Information', icon: FileText },
    { id: 'location', title: 'Location Data', icon: MapPin },
    { id: 'device', title: 'Device Verification', icon: Smartphone },
    { id: 'security', title: 'Data Security', icon: Lock },
    { id: 'retention', title: 'Data Retention', icon: Archive },
    { id: 'rights', title: 'Your Rights', icon: User },
    { id: 'changes', title: 'Changes to This Policy', icon: Clock },
    { id: 'contact', title: 'Contact Us', icon: AlertCircle }
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-blue-100">
      <Header />
      
      <main className="flex-grow p-4 py-6">
        <div className="container max-w-6xl mx-auto">
          <Button variant="outline" asChild className="mb-6 hover:bg-blue-50 transition-colors">
            <Link to="/" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Navigation Sidebar for Desktop */}
            <div className="hidden md:block">
              <Card className="sticky top-20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-blue-700">Quick Navigation</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <nav className="flex flex-col">
                    {sections.map((section) => {
                      const Icon = section.icon;
                      return (
                        <button 
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className={`flex items-center px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${
                            activeSection === section.id ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                          }`}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          <span>{section.title}</span>
                        </button>
                      );
                    })}
                  </nav>
                </CardContent>
              </Card>
            </div>
            
            {/* Mobile Navigation */}
            <div className="block md:hidden mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-blue-700">On This Page</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="sections">
                      <AccordionTrigger className="text-sm font-medium">Jump to a section</AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-col space-y-1">
                          {sections.map((section) => {
                            const Icon = section.icon;
                            return (
                              <button 
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className="flex items-center px-2 py-1.5 text-left text-sm hover:bg-blue-50 rounded transition-colors"
                              >
                                <Icon className="h-4 w-4 mr-2" />
                                <span>{section.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>
            
            {/* Main Content */}
            <div className="col-span-1 md:col-span-3">
              <Card className="border border-blue-100 shadow-md">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl md:text-3xl text-blue-800">Privacy Policy</CardTitle>
                    <div className="text-sm text-blue-600 font-medium">Last Updated: April 5, 2025</div>
                  </div>
                </CardHeader>
                
                <CardContent className="prose prose-blue max-w-none pt-6">
                  <div id="introduction" className="scroll-mt-20 mb-8">
                    <div className="flex items-start">
                      <Shield className="h-6 w-6 mr-2 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h2 className="text-xl font-bold text-blue-800 mb-3">1. Introduction</h2>
                        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                          <p>
                            Welcome to AdiAtten Attendance System. We respect your privacy and are committed 
                            to protecting your personal data. This privacy policy explains how we collect, use, 
                            process, and protect your personal information.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div id="collection" className="scroll-mt-20 mb-8">
                    <div className="flex items-start">
                      <Search className="h-6 w-6 mr-2 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h2 className="text-xl font-bold text-blue-800 mb-3">2. Information We Collect</h2>
                        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                          <p>We collect and process the following information:</p>
                          <ul className="space-y-1">
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>Name and contact details (email address)</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>Student ID/Roll number</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>Device information for verification purposes</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>Location data (only during attendance marking)</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>Attendance records and timestamps</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div id="usage" className="scroll-mt-20 mb-8">
                    <div className="flex items-start">
                      <FileText className="h-6 w-6 mr-2 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h2 className="text-xl font-bold text-blue-800 mb-3">3. How We Use Your Information</h2>
                        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                          <p>We use your personal information for the following purposes:</p>
                          <ul className="space-y-1">
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>To verify your identity and prevent fraud</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>To record and track attendance</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>To generate attendance reports</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>To communicate important updates about the system</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>To respond to your requests or inquiries</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div id="location" className="scroll-mt-20 mb-8">
                    <div className="flex items-start">
                      <MapPin className="h-6 w-6 mr-2 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h2 className="text-xl font-bold text-blue-800 mb-3">4. Location Data</h2>
                        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                          <p>
                            Our system uses your device's location data only at the time of marking attendance to 
                            verify your presence within the designated area. We do not track your location continuously.
                            The location data is used solely for the purpose of verifying attendance and is stored 
                            securely with your attendance record.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div id="device" className="scroll-mt-20 mb-8">
                    <div className="flex items-start">
                      <Smartphone className="h-6 w-6 mr-2 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h2 className="text-xl font-bold text-blue-800 mb-3">5. Device Verification</h2>
                        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                          <p>
                            To prevent attendance fraud, we link your account to a specific device. This helps ensure 
                            that only you can mark your attendance from your registered device. If you need to change 
                            devices, please contact your administrator.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div id="security" className="scroll-mt-20 mb-8">
                    <div className="flex items-start">
                      <Lock className="h-6 w-6 mr-2 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h2 className="text-xl font-bold text-blue-800 mb-3">6. Data Security</h2>
                        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                          <p>
                            We implement appropriate security measures to protect your personal information against 
                            unauthorized access, alteration, disclosure, or destruction. We use industry-standard 
                            encryption methods and regularly review our security practices.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div id="retention" className="scroll-mt-20 mb-8">
                    <div className="flex items-start">
                      <Archive className="h-6 w-6 mr-2 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h2 className="text-xl font-bold text-blue-800 mb-3">7. Data Retention</h2>
                        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                          <p>
                            We retain your personal information for as long as necessary to fulfill the purposes 
                            outlined in this privacy policy, unless a longer retention period is required by law.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div id="rights" className="scroll-mt-20 mb-8">
                    <div className="flex items-start">
                      <User className="h-6 w-6 mr-2 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h2 className="text-xl font-bold text-blue-800 mb-3">8. Your Rights</h2>
                        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                          <p>Depending on your location, you may have rights to:</p>
                          <ul className="space-y-1">
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>Access the personal information we hold about you</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>Request correction of inaccurate information</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>Request deletion of your personal information</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>Object to the processing of your personal information</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>Request restriction of processing</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">•</span>
                              <span>Request the transfer of your personal information</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div id="changes" className="scroll-mt-20 mb-8">
                    <div className="flex items-start">
                      <Clock className="h-6 w-6 mr-2 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h2 className="text-xl font-bold text-blue-800 mb-3">9. Changes to This Policy</h2>
                        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                          <p>
                            We may update this privacy policy from time to time. We will notify you of any changes 
                            by posting the new privacy policy on this page and updating the "Last Updated" date.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div id="contact" className="scroll-mt-20 mb-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-6 w-6 mr-2 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h2 className="text-xl font-bold text-blue-800 mb-3">10. Contact Us</h2>
                        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                          <p>
                            If you have any questions about this privacy policy or our data practices, please 
                            contact me at <a href="mailto:sahnik.biswas@stu.adamasuniversity.ac.in" className="text-blue-600 hover:underline font-medium">sahnik.biswas@stu.adamasuniversity.ac.in</a>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-blue-100 text-center text-sm text-gray-500">
                    <p>© 2025 AdiAtten Attendance System. All rights reserved.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;