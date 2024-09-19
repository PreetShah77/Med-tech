import '../src/styles/App.css';
import { MessageCircle, X, Send } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (input.trim() === '') return;

    const newMessages = [...messages, { text: input, sender: 'user' }];
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
      const botMessage = {
        text: data.response,
        sender: 'bot',
        citations: data.citations || []
      };
      setMessages([...newMessages, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      setMessages([...newMessages, { text: 'Sorry, I encountered an error. Please try again.', sender: 'bot' }]);
    }
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
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender === 'user' ? 'user-message' : 'bot-message'}`}>
                {msg.text}
                {msg.citations && msg.citations.map((citation, citIndex) => (
                  <div key={citIndex} className="citation">
                    <a href={citation.url} target="_blank" rel="noopener noreferrer">[{citIndex + 1}] {citation.title}</a>
                  </div>
                ))}
              </div>
            ))}
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
            <button onClick={sendMessage}>
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <ChatBot />
      <main>
        <section className="hero animate-slide-up">
          <h2>Your Personal Health Assistant</h2>
          <p>Manage your health with ease using AI-powered recommendations and tracking</p>
          <button className="cta-button pulse">Get Started</button>
        </section>
        <section className="features">
          <h3 className="animate-fade-in">Key Features</h3>
          <div className="feature-grid">
            <div className="feature-item animate-pop-in">
              <i className="fas fa-pills"></i>
              <h4>Medicine Suggestions</h4>
              <p>Get personalized medicine recommendations based on your symptoms</p>
            </div>
            <div className="feature-item animate-pop-in">
              <i className="fas fa-heartbeat"></i>
              <h4>Lifestyle Recommendations</h4>
              <p>Receive tailored lifestyle and diet suggestions for better health</p>
            </div>
            <div className="feature-item animate-pop-in">
              <i className="fas fa-clipboard-list"></i>
              <h4>Medicine Tracking</h4>
              <p>Keep track of your medicines, including expiry dates and dosage</p>
            </div>
            <div className="feature-item animate-pop-in">
              <i className="fas fa-chart-line"></i>
              <h4>Health Analytics</h4>
              <p>View insights and analytics about your health and medicine usage</p>
            </div>
          </div>
        </section>
      </main>
      <footer className="animate-fade-in">
        <p>&copy; 2024 Health Synce. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;