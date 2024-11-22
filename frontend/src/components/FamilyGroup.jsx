import React, { useState, useEffect } from 'react';
import { useUser } from "@clerk/clerk-react";
import axios from 'axios';
import '../styles/FamilyGroup.css';

function FamilyGroup() {
  const { user } = useUser();
  const [groupName, setGroupName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groupInventory, setGroupInventory] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchUserGroups();
      fetchPendingInvitations();
    }
  }, [user]);

  const fetchUserGroups = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5050/user-groups', {
        params: { userId: user.id }
      });
      setUserGroups(response.data);
    } catch (err) {
      console.error('Failed to fetch user groups:', err);
      setError('Failed to fetch user groups. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5050/pending-invitations', {
        params: { userEmail: user.primaryEmailAddress.emailAddress }
      });
      setPendingInvitations(response.data);
    } catch (err) {
      console.error('Failed to fetch pending invitations:', err);
      setError('Failed to fetch pending invitations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId) => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5050/group-members', {
        params: { groupId }
      });
      setGroupMembers(response.data);
    } catch (err) {
      console.error('Failed to fetch group members:', err);
      setError('Failed to fetch group members. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchGroupInventory = async (groupId) => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5050/group-inventory', {
        params: { groupId }
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
      fetchUserGroups();
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
      fetchUserGroups();
    } catch (err) {
      setError('Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async (groupId) => {
    setLoading(true);
    setError(null);

    try {
      await axios.post('http://localhost:5050/leave-group', {
        groupId,
        userId: user.id
      });
      alert('Left group successfully!');
      fetchUserGroups();
    } catch (err) {
      setError('Failed to leave group');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (groupId) => {
    setLoading(true);
    setError(null);

    try {
      await axios.post('http://localhost:5050/invite-member', {
        groupId,
        inviterId: user.id,
        inviteeEmail
      });
      setInviteeEmail('');
      alert('Invitation sent successfully!');
    } catch (err) {
      setError('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondInvitation = async (invitationId, accept) => {
    setLoading(true);
    setError(null);

    try {
      await axios.post('http://localhost:5050/respond-invitation', {
        invitationId,
        userEmail: user.primaryEmailAddress.emailAddress,
        accept
      });
      alert(accept ? 'Invitation accepted!' : 'Invitation declined.');
      fetchPendingInvitations();
      fetchUserGroups();
    } catch (err) {
      setError('Failed to respond to invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="family-group-container">
      <h2 className="title">Family Groups</h2>
      
      {error && <div className="error-message">{error}</div>}

      {pendingInvitations.length > 0 && (
        <div className="pending-invitations">
          <h3>Pending Invitations</h3>
          {pendingInvitations.map((invitation) => (
            <div key={invitation.id} className="invitation-item">
              <p>{invitation.inviter_name} invited you to join {invitation.group_name}</p>
              <button onClick={() => handleRespondInvitation(invitation.id, true)}>Accept</button>
              <button onClick={() => handleRespondInvitation(invitation.id, false)}>Decline</button>
            </div>
          ))}
        </div>
      )}

      {userGroups.length === 0 ? (
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
      ) : (
        <div className="user-groups">
          <h3>Your Groups</h3>
          {userGroups.map((group) => (
            <div key={group.id} className="group-item">
              <h4>{group.name}</h4>
              <p>Members: {group.member_count}</p>
              <div className="group-actions-buttons">
  <button 
    className="view-members-btn" 
    onClick={() => fetchGroupMembers(group.id)}
  >
    View Members
  </button>
  <button 
    className="view-inventory-btn" 
    onClick={() => fetchGroupInventory(group.id)}
  >
    View Inventory
  </button>
  <button 
    className="leave-group-btn" 
    onClick={() => handleLeaveGroup(group.id)}
  >
    Leave Group
  </button>
</div>
              <div className="invite-form">
                <input
                  type="email"
                  value={inviteeEmail}
                  onChange={(e) => setInviteeEmail(e.target.value)}
                  placeholder="Enter email to invite"
                />
                <button onClick={() => handleInviteMember(group.id)}>Invite Member</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {groupMembers.length > 0 && (
        <div className="group-members">
          <h3>Group Members</h3>
          {groupMembers.map((member) => (
            <div key={member.id} className="member-item">
              <span>{member.username}</span>
              <span>{member.email}</span>
            </div>
          ))}
        </div>
      )}

      {groupInventory.length > 0 && (
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
      )}
    </div>
  );
}

export default FamilyGroup;