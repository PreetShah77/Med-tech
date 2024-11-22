import React, { useState, useEffect } from 'react';
import { useUser } from "@clerk/clerk-react";
import axios from 'axios';
import '../styles/MedicineInventory.css';

function MedicineInventory() {
  const { user } = useUser();
  const [medicines, setMedicines] = useState([]);
  const [expiredMedicines, setExpiredMedicines] = useState([]);
  const [newMedicine, setNewMedicine] = useState({ name: '', quantity: '', expiryDate: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (user) {
      fetchMedicines();
      fetchExpiredMedicines();
    }
  }, [user]);

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5050/medicines', {
        params: { userId: user.id }
      });
      setMedicines(response.data);
    } catch (err) {
      console.error('Failed to fetch medicines:', err);
      setError('Failed to fetch medicines. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (medicine) => {
    setEditingMedicine({
      ...medicine,
      expiryDate: medicine.expiryDate.split('T')[0] // Format date for input
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:5050/search-medicines', {
        params: { userId: user.id, query: searchQuery }
      });
      setSearchResults(response.data.length ? response.data : []);
    } catch (err) {
      console.error('Failed to search medicines:', err);
      setError('Failed to search medicines. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMedicine = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`http://localhost:5050/medicines/${editingMedicine.id}`, {
        quantity: editingMedicine.quantity,
        expiryDate: editingMedicine.expiryDate
      });
      setEditingMedicine(null);
      fetchMedicines();
      fetchExpiredMedicines();
    } catch (err) {
      setError('Failed to update medicine');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiredMedicines = async () => {
    try {
      const response = await axios.get('http://localhost:5050/expired-medicines', {
        params: { userId: user.id }
      });
      setExpiredMedicines(response.data);
    } catch (err) {
      console.error('Failed to fetch expired medicines:', err);
    }
  };

  const handleInputChange = (e) => {
    setNewMedicine({ ...newMedicine, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('name', newMedicine.name);
    formData.append('quantity', newMedicine.quantity);
    formData.append('expiryDate', newMedicine.expiryDate);
    formData.append('userId', user.id);
    formData.append('userEmail', user.primaryEmailAddress.emailAddress);
    formData.append('username', user.fullName);

    try {
      await axios.post('http://localhost:5050/medicines', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewMedicine({ name: '', quantity: '', expiryDate: '' });
      fetchMedicines();
      fetchExpiredMedicines();
    } catch (err) {
      setError('Failed to add medicine');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await axios.delete(`http://localhost:5050/medicines/${id}`);
      fetchMedicines();
      fetchExpiredMedicines();
    } catch (err) {
      setError('Failed to delete medicine');
    } finally {
      setLoading(false);
    }
  };

  const isExpired = (expiryDate) => {
    return new Date(expiryDate) <= new Date();
  };

  return (
    <div className="medicine-inventory-container">
      <div className='main-div'>
      <h2 className="title">Medicine Inventory</h2>
      <div className="search-bar">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search medicines (e.g., 'filter by fever medicine')"
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Display search results */}
      {searchResults.length > 0 ? (
        <div className="search-results">
          <h3>Search Results</h3>
          {searchResults.map((medicine) => (
            <div key={medicine.id} className="medicine-item">
              <h4>{medicine.name}</h4>
              <p className="description">{medicine.description}</p>
              <span>Qty: {medicine.quantity}</span>
              <span>Expires: {new Date(medicine.expiryDate).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      ) : searchQuery && !loading && (
        <div className="no-results">
          <h3>No such medicine found</h3>
        </div>
      )}

      {expiredMedicines.length > 0 && (
        <div className="expired-medicines-notification">
          <h3>Expired Medicines</h3>
          <ul>
            {expiredMedicines.map((medicine) => (
              <li key={medicine.id}>{medicine.name} - Expired on {new Date(medicine.expiryDate).toLocaleDateString()}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="add-medicine-form">
        <input
          type="text"
          name="name"
          value={newMedicine.name}
          onChange={handleInputChange}
          placeholder="Medicine Name"
          required
        />
        <input
          type="number"
          name="quantity"
          value={newMedicine.quantity}
          onChange={handleInputChange}
          placeholder="Quantity"
          required
        />
        <input
          type="date"
          name="expiryDate"
          value={newMedicine.expiryDate}
          onChange={handleInputChange}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Medicine'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      <div className="medicine-list">
        <h3>Your Medicines</h3>
        {medicines.map((medicine) => (
          <div key={medicine.id} className={`medicine-item ${isExpired(medicine.expiryDate) ? 'expired' : ''}`}>
            {editingMedicine?.id === medicine.id ? (
              <form onSubmit={handleUpdateMedicine} className="edit-form">
                <input
                  type="number"
                  value={editingMedicine.quantity}
                  onChange={(e) => setEditingMedicine({
                    ...editingMedicine,
                    quantity: e.target.value
                  })}
                  placeholder="Quantity"
                  required
                />
                <input
                  type="date"
                  value={editingMedicine.expiryDate}
                  onChange={(e) => setEditingMedicine({
                    ...editingMedicine,
                    expiryDate: e.target.value
                  })}
                  required
                />
                <button type="submit">Save</button>
                <button type="button" onClick={() => setEditingMedicine(null)}>Cancel</button>
              </form>
            ) : (
              <>
                <div className="medicine-info">
                  <h4>{medicine.name}</h4>
                  <div className="medicine-description">
                    <p>{medicine.description}</p>
                  </div>
                  <span>Qty: {medicine.quantity}</span>
                  <span>Expires: {new Date(medicine.expiryDate).toLocaleDateString()}</span>
                  {isExpired(medicine.expiryDate) && <span className="expired-label">EXPIRED</span>}
                </div>
                <div className="medicine-actions">
                  <button onClick={() => handleEdit(medicine)}>Edit</button>
                  <button onClick={() => handleDelete(medicine.id)}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}

export default MedicineInventory;
