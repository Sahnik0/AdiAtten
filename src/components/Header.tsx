import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const Header = () => {
  const { currentUser, signOut } = useAuth();
  const isMobile = useIsMobile();
  
  return (
    <header className="w-full bg-white shadow-sm py-3 px-4">
      <div className="container max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-bold gradient-text bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">
            AdiAtten
          </h1>
        </div>
        
        {currentUser && (
          <div className="flex items-center space-x-2">
            {!isMobile && (
              <span className="text-sm text-muted-foreground mr-2">
                {currentUser.email}
              </span>
            )}
            <Button 
              variant="outline" 
              size={isMobile ? "sm" : "default"}
              onClick={() => signOut()}
              className="flex items-center"
            >
              <LogOut className="h-4 w-4 mr-1" />
              {isMobile ? "" : "Sign Out"}
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
