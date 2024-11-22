import React, { useEffect, useRef } from 'react';
import '../styles/FeatureSection.css';

const FeatureSection = () => {
  const featureRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('swipe-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 } // Trigger when 20% of the image is in view
    );

    // Make sure to only observe actual DOM elements
    featureRefs.current.forEach(feature => {
      if (feature) observer.observe(feature);
    });

    return () => {
      // Ensure only valid DOM elements are unobserved
      featureRefs.current.forEach(feature => {
        if (feature) {
          observer.unobserve(feature);
        }
      });
    };
  }, []);

  return (
    <section className="feature-section">
      <h2 className="section-title">Our Features</h2>
      <div className="features">
        <div className="feature" ref={el => (featureRefs.current[0] = el)}>
          <img src="src/assets/feature1.png" alt="Feature 1" />
        </div>
        <div className="feature" ref={el => (featureRefs.current[1] = el)}>
          <img src="src/assets/feature2.png" alt="Feature 2" />
        </div>
        <div className="feature" ref={el => (featureRefs.current[2] = el)}>
          <img src="src/assets/feature3.png" alt="Feature 3" />
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;