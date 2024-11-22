import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import Layout from "./components/Layout";
import NoMatch from "./components/NoMatch";
import ImageUpload from "./components/ImageUpload";
import "./styles/index.css";
import MedicineInventory from "./components/MedicineInventory";
import FamilyGroup from './components/FamilyGroup';
import AITherapist from "./components/AITherapist";
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<App />} />
            <Route path="/image" element={<ImageUpload />}></Route>
            <Route path="/inventory" element={<MedicineInventory />}></Route>
            <Route path="/family-group" element={<FamilyGroup />} />
            <Route path="/therapist" element={<AITherapist />} />
          </Route>
          <Route path="*" element={<NoMatch />} />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);
