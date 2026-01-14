import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppStateProvider, ThemeProvider } from '@/lib';
import { HomePage, MethodPage, AboutPage, ComparePage, RelationshipPage } from '@/views';

import '@/styles/global.css';
import '@/styles/components.css';
import '@/styles/relationship.css';

// Base path for routing (matches Vite config)
const basename = import.meta.env.BASE_URL;

/**
 * Main App component with routing
 */
function App() {
  return (
    <ThemeProvider>
      <AppStateProvider>
        <BrowserRouter basename={basename}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/methods/:methodId" element={<MethodPage />} />
            <Route path="/relationships" element={<RelationshipPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppStateProvider>
    </ThemeProvider>
  );
}

export default App;
