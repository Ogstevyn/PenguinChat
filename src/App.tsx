import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SignupPage from './SignupPage';


const AppContent: React.FC = () => {

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/" element={<SignupPage />}
        />
      </Routes>
    </BrowserRouter>
  );
};



const App = () => (
  <AppContent />
);

export default App;
