import React, { useState, useEffect } from 'react';
import { SignedIn, SignedOut, UserButton, useClerk, useUser } from "@clerk/clerk-react";
import "../styles/Header.css";
import { Link, useNavigate } from "react-router-dom";
import axios from 'axios';

function SignUpButton() {
  const clerk = useClerk();
  const navigate = useNavigate();

  const handleSignUp = async () => {
    try {
      const result = await clerk.openSignUp({});
      if (result.createdSessionId) {
        const { id, emailAddresses, phoneNumbers } = result.createdUserId;
        const email = emailAddresses[0].emailAddress;
        const phoneNumber = phoneNumbers[0]?.phoneNumber || '';
        const password = 'defaultPassword'; // Handle this securely

        // Register user in your backend
        await axios.post('http://localhost:5050/register', {
          id,
          email,
          phoneNumber,
          password
        });

        navigate('/');
      }
    } catch (error) {
      console.error('Error during sign up:', error);
    }
  };

  return (
    <button className="sign-up-btn" onClick={handleSignUp}>
      Sign up
    </button>
  );
}

function SignInButton() {
  const clerk = useClerk();

  return (
    <button className="sign-in-btn" onClick={() => clerk.openSignIn({})}>
      Sign in
    </button>
  );
}

function Header() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchIntent, setSearchIntent] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();

  const handleIntentSearch = async () => {
    try {
      const response = await fetch('http://localhost:5050/process-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: searchIntent })
      });

      const data = await response.json();
      
      // Navigate based on intent
      switch(data.intent) {
        case 'inventory':
          navigate('/inventory');
          break;
        case 'prescription':
          navigate('/image');
          break;
        case 'family-group':
          navigate('/family-group');
          break;
        case 'therapist':
          navigate('/therapist');
          break;
        case 'diagnosis':
          navigate('/'); // Open the diagnosis chat
          break;
        default:
          // Handle unknown intent
          alert('Could not determine what you want to do. Please try again.');
      }
      
      setSearchIntent(''); // Clear the input
    } catch (error) {
      console.error('Error processing intent:', error);
    }
  };

  useEffect(() => {
    if (user) {
      const email = user.primaryEmailAddress.emailAddress;
      const authMethods = user.externalAccounts;

      // Check if user logged in via Google
      const loggedInWithGoogle = authMethods.some(account => account.provider === 'google');

      if (!loggedInWithGoogle) {
        const adminEmail = "preetashah21@gnu.ac.in";
        const adminPassword = "qweasd123../";

        if (email === adminEmail) {
          console.log("proper");
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    }
  }, [user]);

  return (
    <header>
      <Link to="/" className="logo-container">
        <img src="/logo.png" alt="Health Advisor Logo" className="logo" />
      </Link>
      <nav>
        <SignedOut>
          <ul>
            <li>
              <SignUpButton />
            </li>
            <li>
              <SignInButton />
            </li>
          </ul>
        </SignedOut>

        <SignedIn>
        <div className="intent-search">
      <input 
        type="text" 
        placeholder="What would you like to do?"
        value={searchIntent}
        onChange={(e) => setSearchIntent(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleIntentSearch()}
      />
    </div>
    <ul>
            {isAdmin ? (
              <>
                <li>
                  <Link to='/inventory' style={{textDecoration: 'none'}}>
                    <button className='sign-up-btn' style={{color: "#3498db"}}>
                      Inventory
                    </button>
                  </Link>
                </li>
                <li>
                  <Link to='/image' style={{textDecoration: 'none'}}>
                    <button className='sign-up-btn' style={{color: "#3498db"}}>
                      Upload
                    </button>
                  </Link>
                </li>
                <li>
                  <Link to='/family-group' style={{textDecoration: 'none'}}>
                    <button className='sign-up-btn' style={{color: "#3498db"}}>
                      Family Group
                    </button>
                  </Link>
                </li>
                <li>
                  <Link to='/therapist' style={{textDecoration: 'none'}}>
                    <button className='sign-up-btn' style={{color: "#3498db"}}>
                      Ai Therapist
                    </button>
                  </Link>
                </li>
                <li>
                  <UserButton className="user-button" afterSignOutUrl="/" />
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to='/inventory' style={{textDecoration: 'none'}}>
                    <button className='sign-up-btn' style={{color: "#3498db"}}>
                      Inventory
                    </button>
                  </Link>
                </li>
                <li>
                  <Link to='/image' style={{textDecoration: 'none'}}>
                    <button className='sign-up-btn' style={{color: "#3498db"}}>
                      Upload
                    </button>
                  </Link>
                </li>
                <li>
                  <Link to='/family-group' style={{textDecoration: 'none'}}>
                    <button className='sign-up-btn' style={{color: "#3498db"}}>
                      Family Group
                    </button>
                  </Link>
                </li>
                <li>
                  <Link to='/therapist' style={{textDecoration: 'none'}}>
                    <button className='sign-up-btn' style={{color: "#3498db"}}>
                      Ai Therapist
                    </button>
                  </Link>
                </li>
                <li>
                  <UserButton className="user-button" afterSignOutUrl="/" />
                </li>
              </>
            )}
          </ul>
        </SignedIn>
      </nav>
    </header>
  );
}

export default Header;