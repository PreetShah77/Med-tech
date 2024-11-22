import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FaMicrophone, FaMicrophoneSlash, FaPaperPlane, FaVolumeMute } from 'react-icons/fa';
import '../styles/AITherapist.css';

const AITherapist = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognition = useRef(null);
  const synthesis = window.speechSynthesis;

  useEffect(() => {
    recognition.current = new window.webkitSpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;

    recognition.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.current.onend = () => {
      setIsListening(false);
    };

    return () => {
      recognition.current.stop();
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognition.current.stop();
    } else {
      recognition.current.start();
    }
    setIsListening(!isListening);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const stopSpeaking = () => {
    if (synthesis.speaking) {
      synthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const response = await axios.post('http://localhost:5050/mental_chat', { 
        message: input,
        conversation_history: messages.map(m => `${m.sender}: ${m.text}`).join('\n')
      });
      const botMessage = { text: response.data.response, sender: 'bot' };
      setMessages(prev => [...prev, botMessage]);
      speak(botMessage.text);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { text: 'Sorry, I encountered an error. Please try again.', sender: 'bot' };
      setMessages(prev => [...prev, errorMessage]);
      speak(errorMessage.text);
    }
  };

  const speak = (text) => {
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Enhanced voice settings
    const voices = synthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Female') || voice.name.includes('Samantha')
    );
    
    utterance.voice = preferredVoice || voices[0];
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    
    utterance.onend = () => setIsSpeaking(false);
    synthesis.speak(utterance);
  };

  return (
    <div className="ai-therapist">
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>
            {message.text}
          </div>
        ))}
      </div>
      
      <motion.div
        className="ai-ball"
        animate={{
          scale: isSpeaking ? [1, 1.2, 1.5, 1.2, 1] : 1,
          rotate: isSpeaking ? [0, 360] : 0,
          borderRadius: isSpeaking ? ["50%", "40%", "30%", "50%"] : "50%",
        }}
        transition={{
          duration: 2,
          repeat: isSpeaking ? Infinity : 0,
          ease: "easeInOut",
        }}
      >
        <div className="voice-wave">
          <motion.div
            className="wave"
            animate={{
              height: isSpeaking ? [20, 50, 70, 30] : 20,
            }}
            transition={{
              duration: 0.5,
              repeat: isSpeaking ? Infinity : 0,
              repeatType: "mirror",
            }}
          />
        </div>
      </motion.div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type or speak your message..."
        />
        <button className="icon-button" onClick={toggleListening}>
          {isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>
        {isSpeaking && (
          <button className="icon-button" onClick={stopSpeaking}>
            <FaVolumeMute />
          </button>
        )}
        <button className="icon-button" onClick={handleSubmit}>
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
};

export default AITherapist;
