import React from 'react';
import { motion } from 'framer-motion';
import '../styles/HeroSection.css';
import backgroundImage from '../assets/homepage.png'; // Make sure to add your image in assets

const HeroSection = () => {
  return (
    <section className="hero" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <motion.div
        className="hero-content"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <h1>Your Complete Health Companion</h1>
        <p>Experience the future of healthcare with AI-powered guidance</p>

      </motion.div>
    </section>
  );
};

export default HeroSection;
