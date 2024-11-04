import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './Dialog.css';

const Dialog = ({ onGeoJsonUpdate }) => {
  const [query, setQuery] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const conversationEndRef = useRef(null);

  // Function to scroll to the latest message
  const scrollToBottom = () => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [conversation]);

  // Function to handle sending the query to the LLM API
  const handleSendQuery = async () => {
    if (!query.trim()) return;

    // Clear any previous error message
    setErrorMessage('');
    setIsLoading(true);

    const augmentedQuery = `${query} If there is a mention of a geographical object in the answer, provide position/shape as GeoJSON doc at the end.`;

    try {
      const response = await axios.post('/api/generate', {
        model: 'llama3.2',
        stream: false,
        prompt: augmentedQuery,
      });

      const answer = response.data?.answer || 'No answer provided by the LLM.';

      // Update conversation history
      setConversation((prev) => [
        ...prev,
        { type: 'user', text: query },
        { type: 'llm', text: answer },
      ]);

      // Attempt to extract GeoJSON if present
      let geoJson = null;
      const geoJsonMatch = answer.match(/(\{.*"type":\s?"FeatureCollection".*\})/);
      if (geoJsonMatch) {
        try {
          geoJson = JSON.parse(geoJsonMatch[0]);
          onGeoJsonUpdate(geoJson);
        } catch (error) {
          console.error('Error parsing GeoJSON:', error);
        }
      }

      setQuery(''); // Clear input field
    } catch (error) {
      setErrorMessage('Failed to fetch response. Please try again.');
      console.error('Error with LLM API:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dialog">
      <div className="conversation">
        {conversation.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.type === 'user' ? 'user-message' : 'llm-message'}`}
          >
            {msg.text}
          </div>
        ))}
        {isLoading && <div className="loading">Thinking...</div>}
        {errorMessage && <div className="error">{errorMessage}</div>}
        <div ref={conversationEndRef} />
      </div>
      <div className="input-area">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question..."
        />
        <button onClick={handleSendQuery} disabled={isLoading}>
          Send
        </button>
      </div>
    </div>
  );
};

export default Dialog;
