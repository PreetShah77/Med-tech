import React, { useState } from 'react';
import axios from 'axios';
import { useUser } from "@clerk/clerk-react";
import '../styles/ImageUpload.css';

function ImageUpload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [ayurvedicAlternatives, setAyurvedicAlternatives] = useState(null);
  const { user } = useUser();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError(null);
    setWarning(null);
    setAyurvedicAlternatives(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !user) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setWarning(null);
    setAyurvedicAlternatives(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('userId', user.id);
    formData.append('userEmail', user.primaryEmailAddress.emailAddress);
    formData.append('username', user.fullName);

    try {
      console.log('Sending request to server...');
      const response = await axios.post('http://localhost:5050/interpret', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000 // 30 seconds timeout
      });
      
      console.log("Response data:", response.data);

      if (response.data.error) {
        setError(response.data.error);
      } else if (response.data.warning) {
        setWarning(response.data.warning);
      } else if (response.data.prescription_interpretation && response.data.inventory_comparison) {
        setResult({
          prescription: response.data.prescription_interpretation,
          comparison: response.data.inventory_comparison
        });
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
      setAyurvedicAlternatives(response.data.ayurvedic_alternatives);
    } catch (error) {
      console.error('Error fetching ayurvedic alternatives:', error);
      setError('Failed to fetch ayurvedic alternatives');
    } finally {
      setLoading(false);
    }
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
        {warning && (
          <div className="message warning">
            <h3>Warning: Content Blocked</h3>
            <p>{warning}</p>
            <p>The AI model couldn't interpret the prescription due to potential safety concerns. Please ensure the image contains only prescription information and try again.</p>
          </div>
        )}
      </div>
      
      {result && (
        <div className="result-section">
          <div className="result-column">
            <h3>Prescription Interpretation</h3>
            <pre>{result.prescription}</pre>
          </div>
          <div className="result-column">
            <h3>Inventory Comparison</h3>
            <pre>{result.comparison}</pre>
          </div>
          <div className="result-column">
            <h3>Ayurvedic Alternatives</h3>
            {!ayurvedicAlternatives && (
              <button onClick={fetchAyurvedicAlternatives} className="ayurvedic-button" disabled={loading}>
                {loading ? 'Fetching...' : 'Suggest Ayurvedic Alternatives'}
              </button>
            )}
            {ayurvedicAlternatives && (
              <pre>{ayurvedicAlternatives}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;