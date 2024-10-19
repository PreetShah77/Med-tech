import React, { useState } from 'react';
import axios from 'axios';
import { useUser } from "@clerk/clerk-react";
import '../styles/ImageUpload.css';

function ImageUpload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [ayurvedicAlternatives, setAyurvedicAlternatives] = useState(null);
  const { user } = useUser();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError(null);
    setWarnings([]);
    setAyurvedicAlternatives(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !user) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setWarnings([]);
    setAyurvedicAlternatives(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('userId', user.id);
    formData.append('userEmail', user.primaryEmailAddress.emailAddress);
    formData.append('username', user.fullName);

    try {
      const response = await axios.post('http://localhost:5050/interpret', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000 // 30 seconds timeout
      });
      
      if (response.data.error) {
        setError(response.data.error);
      } else if (response.data.prescription_interpretation && response.data.inventory_comparison) {
        setResult({
          prescription: formatPrescription(response.data.prescription_interpretation),
          comparison: formatInventoryComparison(response.data.inventory_comparison)
        });
        if (response.data.warnings && response.data.warnings.length > 0) {
          setWarnings(response.data.warnings);
        }
      } else {
        setError('Unexpected response format from server');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };



  const fetchAyurvedicAlternatives = async () => {
    if (!result || !result.prescription) return;

    try {
      setLoading(true);
      const response = await axios.post('http://localhost:5050/suggest_ayurvedic', {
        prescription: result.prescription
      });
      setAyurvedicAlternatives(formatAyurvedicAlternatives(response.data.ayurvedic_alternatives));
    } catch (error) {
      console.error('Error fetching ayurvedic alternatives:', error);
      setError('Failed to fetch ayurvedic alternatives');
    } finally {
      setLoading(false);
    }
  };

  const formatPrescription = (prescription) => {
    const lines = prescription.split('\n');
    return (
      <div className="formatted-prescription">
        {lines.map((line, index) => {
          if (line.trim().endsWith(':')) {
            return <h4 key={index}>{line}</h4>;
          } else if (line.includes('Dosage:') || line.includes('Instructions:')) {
            return <p key={index} className="dosage-info">{line}</p>;
          } else {
            return <p key={index}>{line}</p>;
          }
        })}
      </div>
    );
  };


  const formatInventoryComparison = (comparison) => {
    const lines = comparison.split('\n');
    return (
      <div className="formatted-comparison">
        {lines.map((line, index) => {
          if (line.trim().startsWith('Available:')) {
            return <p key={index} className="available">{line}</p>;
          } else if (line.trim().startsWith('Not Available:')) {
            return <p key={index} className="not-available">{line}</p>;
          } else {
            return <p key={index}>{line}</p>;
          }
        })}
      </div>
    );
  };

  const formatAyurvedicAlternatives = (alternatives) => {
    const lines = alternatives.split('\n');
    return (
      <div className="formatted-alternatives">
        {lines.map((line, index) => {
          if (line.trim().endsWith(':')) {
            return <h4 key={index}>{line}</h4>;
          } else {
            return <p key={index}>{line}</p>;
          }
        })}
      </div>
    );
  };

  return (
    <div className="app-container">
      <h1 className="title">Prescription Interpreter</h1>
      <div className="upload-section">
        <form onSubmit={handleSubmit} className="upload-form">
          <label htmlFor="file-upload" className="custom-file-upload">
            <i className="fas fa-cloud-upload-alt"></i> Choose Image
          </label>
          <input id="file-upload" type="file" onChange={handleFileChange} accept="image/*" />
          <button type="submit" disabled={!file || loading || !user} className="submit-button">
            {loading ? 'Processing...' : 'Interpret Prescription'}
          </button>
        </form>
        {file && <p className="file-name">{file.name}</p>}
        
        {error && <div className="message error">{error}</div>}
        {warnings.length > 0 && (
          <div className="message warning">
            <h3>Warnings:</h3>
            {warnings.map((warning, index) => (
              <p key={index}>{warning}</p>
            ))}
          </div>
        )}
      </div>
      
      {result && (
        <div className="result-section">
          <div className="result-column">
            <h3>Prescription Interpretation</h3>
            {result.prescription}
          </div>
          <div className="result-column">
            <h3>Inventory Comparison</h3>
            {result.comparison}
          </div>
          <div className="result-column">
            <h3>Ayurvedic Alternatives</h3>
            {!ayurvedicAlternatives && (
              <button onClick={fetchAyurvedicAlternatives} className="ayurvedic-button" disabled={loading}>
                {loading ? 'Fetching...' : 'Suggest Ayurvedic Alternatives'}
              </button>
            )}
            {ayurvedicAlternatives && ayurvedicAlternatives}
          </div>
        </div>
      )}
    </div>
  );
}
export default ImageUpload;