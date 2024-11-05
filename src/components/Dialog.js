import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './Dialog.css';

const Dialog = ({ onGeoJsonUpdate }) => {

  // Log onGeoJsonUpdate at component render to see if it’s a function
  console.log("onGeoJsonUpdate function has type:", typeof onGeoJsonUpdate);

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

    const augmentedQuery = `${query} Respond only in well-formed JSON with two attributes (response and geo). Dont add any text ouu of JSON document. Don't explain the technical details about formatting, JSON or GeoJSON. Put response text in the first JSON attribute called "response". The second attribute "geo" should be an array of GeoJSON objects if there are geographical objects mentioned in the response text, otherwise an empty array.`;

    try {
      const response = await axios.post('/api/generate', {
        model: 'llama3.2',
        stream: false,
        prompt: augmentedQuery,
      });

      console.log("Response Original:", response.data);

      // Check if the response field is present in the server response
      // Step 1: Extract and parse the stringified JSON in `response.data.response`
      const parsedResponse = JSON.parse(response.data?.response || '{}');

      // Step 2: Extract `response` text and `geo` data from parsed JSON
      const answer = parsedResponse?.response || 'No response from the LLM.';
      const geoData = parsedResponse?.geo || [];

      // Log the extracted response and geo data
      console.log("Response Full:", parsedResponse);
      console.log("Response Text:", answer);
      console.log("Geo Data:", geoData);

      // Update conversation history with user query and LLM response
      setConversation((prev) => [
        ...prev,
        { type: 'user', text: query },
        { type: 'llm', text: answer },
      ]);

      // Explicitly check if onGeoJsonUpdate is a function before calling it
      if (typeof onGeoJsonUpdate === 'function') {
        onGeoJsonUpdate(geoData);
      } else {
        console.warn("onGeoJsonUpdate is not a function.");
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
