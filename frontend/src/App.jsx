import '../src/styles/App.css';
import { MessageCircle, X, Send, ImagePlus } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

const App = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    setIsLoading(true);
    const newMessages = [...messages, { 
      type: 'image',
      sender: 'user',
      imageUrl: URL.createObjectURL(file)
    }];
    setMessages(newMessages);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('http://localhost:5050/analyze-health-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      setMessages([...newMessages, {
        type: 'text',
        sender: 'bot',
        text: data.analysis,
        recommendations: data.recommendations,
        urgency: data.urgency
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages([...newMessages, { 
        type: 'text',
        sender: 'bot',
        text: 'Sorry, I encountered an error analyzing the image. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (input.trim() === '') return;

    const newMessages = [...messages, { type: 'text', text: input, sender: 'user' }];
    setMessages(newMessages);
    setInput('');

    try {
      const response = await fetch('http://localhost:5050/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          conversation: messages.map(msg => `${msg.sender}: ${msg.text}`).join('\n')
        }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      setMessages([...newMessages, { 
        type: 'text',
        text: data.response,
        sender: 'bot',
        citations: data.citations || []
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages([...newMessages, { 
        type: 'text',
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot'
      }]);
    }
  };

  const renderMessage = (msg, index) => {
    const messageClass = msg.sender === 'user' ? 'user-message' : 'bot-message';
    
    return (
      <div key={index} className={`message ${messageClass}`}>
        {msg.type === 'image' ? (
          <div className="image-message">
            <img src={msg.imageUrl} alt="Uploaded health condition" />
          </div>
        ) : (
          <div className="text-message">
            <div className="message-text">{msg.text}</div>
            {msg.recommendations && (
              <div className="recommendations">
                <h4>Recommendations:</h4>
                <ul>
                  {msg.recommendations.map((rec, idx) => (
                    <li key={idx} className={`urgency-${msg.urgency}`}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
            {msg.citations?.map((citation, citIndex) => (
              <div key={citIndex} className="citation">
                <a href={citation.url} target="_blank" rel="noopener noreferrer">
                  [{citIndex + 1}] {citation.title}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
      <div className="chatbot-icon" onClick={toggleChat}>
        <MessageCircle size={30} color="white" />
      </div>
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span>Health Advisor</span>
            <button className="chatbot-close" onClick={toggleChat}>
              <X size={24} />
            </button>
          </div>
          <div className="chatbot-messages">
            {messages.map((msg, index) => renderMessage(msg, index))}
            {isLoading && (
              <div className="message bot-message">
                <div className="loading-spinner">Analyzing image...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chatbot-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button 
              className="upload-button"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={20} />
            </button>
            <button onClick={sendMessage}>
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;