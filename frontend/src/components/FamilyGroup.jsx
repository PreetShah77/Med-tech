import React, { useState, useEffect } from 'react';
import { useUser } from "@clerk/clerk-react";
import axios from 'axios';
// import '../styles/FamilyGroup.css';

function FamilyGroup() {
  const { user } = useUser();
  const [groupName, setGroupName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groupInventory, setGroupInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchGroupInventory();
    }
  }, [user]);

  const fetchGroupInventory = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5050/group-inventory', {
        params: { userId: user.id }
      });
      setGroupInventory(response.data);
    } catch (err) {
      console.error('Failed to fetch group inventory:', err);
      setError('Failed to fetch group inventory. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:5050/create-group', {
        groupName,
        userId: user.id
      });
      setGroupName('');
      alert(`Group created successfully! Group ID: ${response.data.groupId}`);
      fetchGroupInventory();
    } catch (err) {
      setError('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await axios.post('http://localhost:5050/join-group', {
        groupId,
        userId: user.id
      });
      setGroupId('');
      alert('Joined group successfully!');
      fetchGroupInventory();
    } catch (err) {
      setError('Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="family-group-container">
      <h2 className="title">Family Group</h2>
      
      <div className="group-actions">
        <form onSubmit={handleCreateGroup} className="group-form">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </form>

        <form onSubmit={handleJoinGroup} className="group-form">
          <input
            type="text"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            placeholder="Enter group ID"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Joining...' : 'Join Group'}
          </button>
        </form>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="group-inventory">
        <h3>Group Inventory</h3>
        {groupInventory.map((medicine) => (
          <div key={medicine.id} className="medicine-item">
            <span>{medicine.name}</span>
            <span>Qty: {medicine.quantity}</span>
            <span>Expires: {new Date(medicine.expiryDate).toLocaleDateString()}</span>
            <span>Owner: {medicine.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FamilyGroup;