import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { UserIcon } from "lucide-react";

const Navbar = () => {
  const { user, signOut: logout, isAuthenticated, displayName } = useAuth();

  return (
    <nav className="flex items-center justify-between p-4 bg-background/70 backdrop-blur-md border-b">
      <div className="flex items-center">
        <Link to="/" className="text-xl font-bold">
          YT Summarizer
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserIcon className="w-4 h-4" />
              <span className="hidden md:inline-block">
                {displayName || 'User'}
              </span>
            </div>
            <Button variant="outline" onClick={logout}>
              Sign out
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="outline">Sign in</Button>
            </Link>
            <Link to="/signup">
              <Button>Sign up</Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
