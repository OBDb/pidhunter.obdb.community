import React from 'react';
import ByteExplorer from './components/ByteExplorer';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Byte Explorer</h1>
        <ByteExplorer />
      </div>
    </div>
  );
}

export default App;