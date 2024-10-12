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
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const email = user.primaryEmailAddress.emailAddress;
      const authMethods = user.externalAccounts;

      // Check if user logged in via Google
      const loggedInWithGoogle = authMethods.some(account => account.provider === 'google');

      if (loggedInWithGoogle) {
        // Register or update user in your backend when logged in with Google
        const handleGoogleLogin = async () => {
          try {
            const { id, primaryEmailAddress, phoneNumbers } = user;
            const email = primaryEmailAddress.emailAddress;
            const phoneNumber = phoneNumbers[0]?.phoneNumber || '';
            const password = '';  // Since Google login doesn't use password

            // Send data to your backend to register the user
            await axios.post('http://localhost:5050/register', {
              id,
              email,
              phoneNumber,
              password
            });
          } catch (error) {
            console.error('Error during Google login registration:', error);
          }
        };

        handleGoogleLogin();
      } else {
        const adminEmail = "preetashah21@gnu.ac.in";
        if (email === adminEmail) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      }
    }
  }, [user]);

  const handleSOS = () => {
    navigate('/sos');
  };

  return (
    <header>
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
                <li></li>
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
                <li></li>
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
