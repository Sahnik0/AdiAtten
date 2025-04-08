
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PrivacyPolicy = () => {
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
                <CardTitle className="text-2xl md:text-3xl">Privacy Policy</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-blue max-w-none">
                <p>Last Updated: April 5, 2025</p>
                
                <h2>1. Introduction</h2>
                <p>
                  Welcome to AdiAtten Attendance System. We respect your privacy and are committed 
                  to protecting your personal data. This privacy policy explains how we collect, use, 
                  process, and protect your personal information.
                </p>
                
                <h2>2. Information We Collect</h2>
                <p>We collect and process the following information:</p>
                <ul>
                  <li>Name and contact details (email address)</li>
                  <li>Student ID/Roll number</li>
                  <li>Device information for verification purposes</li>
                  <li>Location data (only during attendance marking)</li>
                  <li>Attendance records and timestamps</li>
                </ul>
                
                <h2>3. How We Use Your Information</h2>
                <p>We use your personal information for the following purposes:</p>
                <ul>
                  <li>To verify your identity and prevent fraud</li>
                  <li>To record and track attendance</li>
                  <li>To generate attendance reports</li>
                  <li>To communicate important updates about the system</li>
                  <li>To respond to your requests or inquiries</li>
                </ul>
                
                <h2>4. Location Data</h2>
                <p>
                  Our system uses your device's location data only at the time of marking attendance to 
                  verify your presence within the designated area. We do not track your location continuously.
                  The location data is used solely for the purpose of verifying attendance and is stored 
                  securely with your attendance record.
                </p>
                
                <h2>5. Device Verification</h2>
                <p>
                  To prevent attendance fraud, we link your account to a specific device. This helps ensure 
                  that only you can mark your attendance from your registered device. If you need to change 
                  devices, please contact your administrator.
                </p>
                
                <h2>6. Data Security</h2>
                <p>
                  We implement appropriate security measures to protect your personal information against 
                  unauthorized access, alteration, disclosure, or destruction. We use industry-standard 
                  encryption methods and regularly review our security practices.
                </p>
                
                <h2>7. Data Retention</h2>
                <p>
                  We retain your personal information for as long as necessary to fulfill the purposes 
                  outlined in this privacy policy, unless a longer retention period is required by law.
                </p>
                
                <h2>8. Your Rights</h2>
                <p>Depending on your location, you may have rights to:</p>
                <ul>
                  <li>Access the personal information we hold about you</li>
                  <li>Request correction of inaccurate information</li>
                  <li>Request deletion of your personal information</li>
                  <li>Object to the processing of your personal information</li>
                  <li>Request restriction of processing</li>
                  <li>Request the transfer of your personal information</li>
                </ul>
                
                <h2>9. Changes to This Policy</h2>
                <p>
                  We may update this privacy policy from time to time. We will notify you of any changes 
                  by posting the new privacy policy on this page and updating the "Last Updated" date.
                </p>
                
                <h2>10. Contact Us</h2>
                <p>
                  If you have any questions about this privacy policy or our data practices, please 
                  contact us at sahnik.biswas@stu.adamasuniversity.ac.in
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;