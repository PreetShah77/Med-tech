import React, { useState } from 'react';
import axios from 'axios';
import { useUser } from "@clerk/clerk-react";
import ReactMarkdown from 'react-markdown';
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

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setFile(droppedFiles[0]);
    }
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
        console.log('Sending request to interpret prescription...');
        const response = await axios.post('http://localhost:5050/interpret', formData, {
            headers: { 
                'Content-Type': 'multipart/form-data'
            },
            timeout: 120000 // 120 seconds timeout
        });

        console.log('Received response:', response.data);

        if (response.data.error) {
            setError(response.data.error);
        } else if (response.data.prescription_interpretation) {
            const prescriptionText = response.data.prescription_interpretation.interpretation || response.data.prescription_interpretation;
            setResult({
                prescription: formatPrescription(prescriptionText),
                comparison: formatInventoryComparison(response.data.inventory_comparison || '')
            });
        } else {
            setError('Unable to interpret the prescription. Please try again with a clearer image.');
        }
    } catch (error) {
        console.error('Error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to process the prescription. Please try again.';
        setError(errorMessage);
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
    if (!prescription) return null;
    
    // Convert the prescription text to proper markdown format
    let markdownText = prescription;
    
    // Replace * with - for better markdown list rendering
    markdownText = markdownText.replace(/\\\*/g, '- ');
    
    return (
      <div className="formatted-prescription markdown-content">
        <ReactMarkdown>
          {markdownText}
        </ReactMarkdown>
      </div>
    );
  };

  const formatInventoryComparison = (comparison) => {
    // Convert the prescription text to proper markdown format
    let markdownText = comparison;
    
    // Replace * with - for better markdown list rendering
    markdownText = markdownText.replace(/\\\*/g, '- ');
    return (
      <div className="formatted-comparison">
        <ReactMarkdown>
          {markdownText}
        </ReactMarkdown>
      </div>
    );
  };

  const formatAyurvedicAlternatives = (alternatives) => {
    // Convert the prescription text to proper markdown format
    let markdownText = alternatives;
    
    // Replace * with - for better markdown list rendering
    markdownText = markdownText.replace(/\\\*/g, '- ');
    return (
      <div className="formatted-alternatives">
        <ReactMarkdown>
          {markdownText}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="app-container">
      <h1 className="title">Prescription Interpreter</h1>
      <div className="upload-section" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
        <form onSubmit={handleSubmit} className="upload-form">
          <label htmlFor="file-upload" className="custom-file-upload">
            <i className="fas fa-cloud-upload-alt"></i> Choose Image
          </label>
          <input id="file-upload" type="file" onChange={handleFileChange} accept="image/*" />
          <button type="submit" disabled={!file || loading || !user} className="submit-button">
            {loading ? 'Processing...' : 'Interpret Prescription'}
          </button>
        </form>
        <div className="drop-area">
          <p>Or drag and drop your image here</p>
        </div>
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