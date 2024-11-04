import React, { useState, useRef } from 'react';
import Split from 'react-split';
import Header from './components/Header';
import Footer from './components/Footer';
import Dialog from './components/Dialog';
import MapDisplay from './components/MapDisplay';
import './App.css';

function App() {
  const [geoJSONData, setGeoJSONData] = useState(null);
  const mapRef = useRef(null);

  const handleGeoJSONUpdate = (geoJSON) => {
    setGeoJSONData(geoJSON);
  };

  // Trigger a resize on the Map component when resizing ends
  const handleDragEnd = () => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }
  };

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Split
          className="split"
          sizes={[30, 70]}
          minSize={200}
          gutterSize={5}
          onDragEnd={handleDragEnd}
        >
          <div className="dialog-section">
            <Dialog onGeoJSONUpdate={handleGeoJSONUpdate} />
          </div>
          <div className="map-section">
            <MapDisplay ref={mapRef} geoJSONData={geoJSONData} />
          </div>
        </Split>
      </main>
      <Footer />
    </div>
  );
}

export default App;

