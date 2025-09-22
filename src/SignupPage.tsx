import React from "react";
import {ConnectButton} from '@suiet/wallet-kit';

const SignupPage: React.FC = () => {


  return (
    <div className="min-h-screen max-w-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/10">
      <div>
        Sign up
      </div>
      <ConnectButton />
    </div>
  );
};

export default SignupPage;
