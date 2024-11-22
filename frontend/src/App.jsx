import React, { useState, useRef, useEffect } from 'react';
import { Send, ImagePlus, MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroSection from './components/HeroSection';
import FeatureSection from './components/FeatureSection';

import '../src/styles/App.css';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

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

    const caption = prompt("Please describe your health condition or symptoms visible in the image:");
    if (!caption) {
      alert("A description is required for accurate analysis");
      return;
    }

    setIsLoading(true);
    const newMessages = [...messages, { 
      type: 'image',
      sender: 'user',
      imageUrl: URL.createObjectURL(file),
      caption: caption
    }];
    setMessages(newMessages);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('caption', caption);

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
        text: 'Unable to analyze the image. Please try again.'
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
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const renderMessage = (msg, index) => {
    const messageClass = msg.sender === 'user' ? 'user-message' : 'bot-message';
    
    return (
      <motion.div 
        key={index} 
        className={`message ${messageClass}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {msg.type === 'image' ? (
          <div className="image-message">
            <img src={msg.imageUrl} alt="Uploaded health condition" />
            <p className="image-caption">{msg.caption}</p>
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
            {msg.citations && msg.citations.map((citation, citIndex) => (
              <div key={citIndex} className="citation">
                <a href={citation.url} target="_blank" rel="noopener noreferrer">
                  [{citIndex + 1}] {citation.title}
                </a>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="app">
      <main className="main-content">
        <HeroSection />
        <FeatureSection />
      </main>

      {/* Floating Chat Button */}
      <motion.div 
        className="floating-chat-button"
        onClick={toggleChat}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <MessageCircle size={24} />
      </motion.div>

      {/* Animated Chatbot Container */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            className="floating-chatbot-container"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="chatbot-window">
              <div className="chatbot-header">
                <span>AI Health Assistant</span>
                <div className="header-controls">
                  <div className="status-indicator">Online</div>
                  <button className="close-button" onClick={toggleChat}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="chatbot-messages">
                {messages.length === 0 && (
                  <div className="welcome-message">
                    <h3>Hello! 👋</h3>
                    <p>Describe your symptoms or upload an image for analysis.</p>
                  </div>
                )}
                {messages.map((msg, index) => renderMessage(msg, index))}
                {isLoading && (
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="chatbot-input">
                <input
                  className='in'
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Describe your symptoms..."
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <motion.button 
                  className="upload-button"
                  onClick={() => fileInputRef.current?.click()}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ImagePlus size={20} />
                </motion.button>
                <motion.button 
                  className="send-button"
                  onClick={sendMessage}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Send size={20} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;