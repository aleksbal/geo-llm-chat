import { useState, useEffect } from 'react';
import { MessageSquare, Map as MapIcon, AlertCircle } from 'lucide-react';
import Split from 'react-split';
import Map from './components/Map';
import Chat from './components/Chat';
import ErrorBoundary from './components/ErrorBoundary';
import { generateResponse, checkOllamaConnection } from './services/ollama';
import { extractGeoJson } from './utils/geoJsonExtractor';
import type { FeatureCollection } from 'geojson';

function App() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; isStreaming?: boolean }>>([]);
  const [geoJsonData, setGeoJsonData] = useState<FeatureCollection | null>(null);
  const [isOllamaConnected, setIsOllamaConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let retries = 3;
    const retry = async () => {
      try {
        const connected = await checkOllamaConnection();
        if (connected) {
          setIsOllamaConnected(true);
        } else if (retries > 0) {
          retries--;
          setTimeout(retry, 2000);
        } else {
          setIsOllamaConnected(false);
        }
      } catch (error) {
        if (retries > 0) {
          retries--;
          setTimeout(retry, 2000);
        } else {
          setIsOllamaConnected(false);
        }
      }
    };
    retry();
  }, []);

  const handleSendMessage = async (message: string) => {
    if (!isOllamaConnected) {
      setMessages(prev => [...prev, 
        { role: 'user', content: message },
        { role: 'assistant', content: 'Cannot process request: Ollama is not connected. Please ensure Ollama is running on http://localhost:11434' }
      ]);
      return;
    }

    setMessages(prev => [...prev, 
      { role: 'user', content: message },
      { role: 'assistant', content: '', isStreaming: true }
    ]);

    let currentContent = '';
    
    await generateResponse(
      message,
      (text) => {
        currentContent += text;
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: currentContent, isStreaming: true }
        ]);

        const extractedGeoJson = extractGeoJson(currentContent);
        if (extractedGeoJson) {
          setGeoJsonData(prev => {
            if (!prev) return extractedGeoJson;
            return {
              type: 'FeatureCollection',
              features: [...prev.features, ...extractedGeoJson.features]
            };
          });
        }
      },
      () => {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: currentContent }
        ]);
      },
      (error) => {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: `Error: ${error}` }
        ]);
      }
    );
  };

  const ChatPanel = (
    <div className="h-full flex flex-col">
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Geospatial Chat
          </h1>
          {isOllamaConnected !== null && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isOllamaConnected 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isOllamaConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              {isOllamaConnected ? 'Ollama Connected' : 'Ollama Disconnected'}
            </div>
          )}
        </div>
        {!isOllamaConnected && (
          <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Please ensure Ollama is running on http://localhost:11434
          </div>
        )}
      </header>
      <Chat 
        onSendMessage={handleSendMessage} 
        messages={messages} 
        disabled={!isOllamaConnected}
      />
    </div>
  );

  const MapPanel = (
    <div className="h-full flex flex-col">
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <MapIcon className="w-6 h-6" />
          Map View
        </h2>
      </header>
      <div className="flex-1 relative">
        <ErrorBoundary>
          <Map geoJsonData={geoJsonData} />
        </ErrorBoundary>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      <Split 
        sizes={[30, 70]}
        minSize={300}
        gutterSize={4}
        className="split-horizontal h-full"
      >
        {ChatPanel}
        {MapPanel}
      </Split>
    </div>
  );
}

export default App;