
import React, { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AnimatedRoutes from './AnimatedRoutes';

function App() {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async (text) => {
    setLoading(true);
    setError(null);
    try {
      // Small delay to allow exit animations if needed and show loading state
      await new Promise(r => setTimeout(r, 500));

      const response = await fetch('http://localhost:8000/api/analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          llm_mode: 'local_stub', // default to stub for demo
          top_k: 6,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText} `);
      }

      const data = await response.json();
      setAnalysisData(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <AnimatedRoutes
        onAnalyze={handleAnalyze}
        analysisData={analysisData}
        loading={loading}
        error={error}
      />
    </Router>
  );
}

export default App;
