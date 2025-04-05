
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full bg-white border-t py-4 px-4 mt-auto">
      <div className="container max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <p className="text-sm text-muted-foreground">
          &copy; {currentYear} Campus Guard Attendance System
        </p>
        
        <div className="flex items-center space-x-4 mt-2 md:mt-0">
          <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link to="/meet-the-maker" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Meet the Maker
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Help
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;