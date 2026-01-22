import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import Results from './pages/Results';

const AnimatedRoutes = ({ onAnalyze, analysisData, loading, error }) => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route
                    path="/"
                    element={<Home onAnalyze={onAnalyze} />}
                />
                <Route
                    path="/results"
                    element={<Results data={analysisData} loading={loading} error={error} />}
                />
            </Routes>
        </AnimatePresence>
    );
};

export default AnimatedRoutes;
