import { useRef, useEffect, useState, useCallback } from 'react';
import { createRelationshipGraph, RELATIONSHIP_TYPES } from '@/viz/RelationshipGraphViz';
import { useAppState, useAppDispatch, actions } from '@/lib';
import { useNavigate } from 'react-router-dom';

/**
 * Relationship Graph React wrapper component
 * Provides interactive controls and integrates with app state
 */
export default function RelationshipGraph({ height = 600 }) {
  const containerRef = useRef(null);
  const vizRef = useRef(null);
  const { data, selectedMethodId, filteredMethods } = useAppState();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Visualization options state
  const [showClusters, setShowClusters] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showSimilar, setShowSimilar] = useState(true);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
  const [nodeSpacing, setNodeSpacing] = useState(1.5);
  const [hoveredMethod, setHoveredMethod] = useState(null);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (vizRef.current) vizRef.current.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    if (vizRef.current) vizRef.current.zoomOut();
  }, []);

  const handleZoomReset = useCallback(() => {
    if (vizRef.current) vizRef.current.zoomToFit();
  }, []);

  const handleResetSimulation = useCallback(() => {
    if (vizRef.current) vizRef.current.resetSimulation();
  }, []);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if graph container is focused or no input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement.tagName === 'INPUT' || 
                             activeElement.tagName === 'TEXTAREA' ||
                             activeElement.isContentEditable;
      
      if (isInputFocused) return;

      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          handleZoomReset();
          break;
        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleResetSimulation();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleZoomReset, handleResetSimulation]);

  // Initialize visualization
  useEffect(() => {
    if (!containerRef.current || !data) return;

    const initViz = () => {
      const container = containerRef.current;
      if (!container || container.clientWidth === 0) {
        const retryTimeout = setTimeout(initViz, 50);
        return () => clearTimeout(retryTimeout);
      }

      const vizData = {
        pipelineSteps: data.pipeline_steps || [],
        methods: filteredMethods.length > 0 ? filteredMethods : data.methods,
      };

      vizRef.current = createRelationshipGraph(container, vizData, {
        height,
        selectedMethodId,
        showClusters,
        showLabels,
        nodeSpacing,
        linkOptions: {
          showSimilarMethods: showSimilar,
          similarityThreshold,
        },
        onMethodClick: (method) => {
          navigate(`/methods/${method.id}`);
        },
        onMethodHover: (method) => {
          setHoveredMethod(method);
          dispatch(actions.setHoveredMethod(method?.id || null));
        },
      });
    };

    const rafId = requestAnimationFrame(initViz);

    return () => {
      cancelAnimationFrame(rafId);
      if (vizRef.current) {
        vizRef.current.destroy();
      }
    };
  }, [data, filteredMethods, showClusters, showLabels, showSimilar, similarityThreshold, nodeSpacing, height, selectedMethodId, navigate, dispatch]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && data && vizRef.current) {
        vizRef.current.destroy();

        const vizData = {
          pipelineSteps: data.pipeline_steps || [],
          methods: filteredMethods.length > 0 ? filteredMethods : data.methods,
        };

        vizRef.current = createRelationshipGraph(containerRef.current, vizData, {
          height,
          selectedMethodId,
          showClusters,
          showLabels,
          nodeSpacing,
          linkOptions: {
            showSimilarMethods: showSimilar,
            similarityThreshold,
          },
          onMethodClick: (method) => {
            navigate(`/methods/${method.id}`);
          },
          onMethodHover: (method) => {
            setHoveredMethod(method);
            dispatch(actions.setHoveredMethod(method?.id || null));
          },
        });
      }
    };

    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [data, filteredMethods, showClusters, showLabels, showSimilar, similarityThreshold, nodeSpacing, height, selectedMethodId, navigate, dispatch]);

  if (!data) {
    return (
      <div className="relationship-graph relationship-graph--loading">
        <div className="loading__spinner" />
        <p>Loading graph data...</p>
      </div>
    );
  }

  return (
    <div className="relationship-graph">
      {/* Controls Bar */}
      <div className="relationship-graph__controls">
        <div className="relationship-graph__controls-left">
          {/* Cluster toggle */}
          <label className="relationship-graph__toggle">
            <input
              type="checkbox"
              checked={showClusters}
              onChange={(e) => setShowClusters(e.target.checked)}
            />
            <span>Show Clusters</span>
          </label>

          {/* Labels toggle */}
          <label className="relationship-graph__toggle">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            <span>Show Labels</span>
          </label>

          {/* Similar methods toggle */}
          <label className="relationship-graph__toggle">
            <input
              type="checkbox"
              checked={showSimilar}
              onChange={(e) => setShowSimilar(e.target.checked)}
            />
            <span>Similar Methods</span>
          </label>

          {/* Similarity threshold */}
          {showSimilar && (
            <div className="relationship-graph__slider">
              <label>Similarity: {Math.round(similarityThreshold * 100)}%</label>
              <input
                type="range"
                min="0.2"
                max="0.7"
                step="0.05"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              />
            </div>
          )}

          {/* Node spacing slider */}
          <div className="relationship-graph__slider relationship-graph__slider--spacing">
            <label>Spacing: {nodeSpacing.toFixed(1)}x</label>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={nodeSpacing}
              onChange={(e) => setNodeSpacing(parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div className="relationship-graph__controls-right">
          {/* Semantic zoom hint */}
          <span className="relationship-graph__zoom-hint">
            Zoom in for more details
          </span>

          {/* Zoom controls */}
          <button
            className="relationship-graph__btn"
            onClick={handleZoomOut}
            title="Zoom Out (−)"
            aria-label="Zoom out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <button
            className="relationship-graph__btn"
            onClick={handleZoomIn}
            title="Zoom In (+)"
            aria-label="Zoom in"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <button
            className="relationship-graph__btn"
            onClick={handleZoomReset}
            title="Reset View (0)"
            aria-label="Reset view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          <button
            className="relationship-graph__btn"
            onClick={handleResetSimulation}
            title="Restart Simulation (R)"
            aria-label="Restart simulation"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className="relationship-graph__canvas"
        style={{ height: `${height}px` }}
        role="application"
        aria-label="Method relationship graph - use scroll to zoom, drag nodes to reposition, press + or - to zoom"
      />

      {/* Legend */}
      <div className="relationship-graph__legend">
        <div className="relationship-graph__legend-section">
          <span className="relationship-graph__legend-title">Relationships</span>
          <div className="relationship-graph__legend-items">
            {Object.entries(RELATIONSHIP_TYPES).map(([key, style]) => (
              <div key={key} className="relationship-graph__legend-item">
                <svg width="30" height="12" viewBox="0 0 30 12">
                  <line
                    x1="0"
                    y1="6"
                    x2="30"
                    y2="6"
                    stroke={style.color}
                    strokeWidth={style.strokeWidth}
                    strokeDasharray={style.dashArray || 'none'}
                  />
                </svg>
                <span>{style.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hover Info Card */}
      {hoveredMethod && (
        <div className="relationship-graph__hover-card">
          <h4>{hoveredMethod.name}</h4>
          <div className="relationship-graph__hover-meta">
            <span className="relationship-graph__hover-step" style={{ color: hoveredMethod.color }}>
              {hoveredMethod.pipelineStep.replace(/_/g, ' ')}
            </span>
            {hoveredMethod.year && <span>• {hoveredMethod.year}</span>}
          </div>
          <div className="relationship-graph__hover-tags">
            {hoveredMethod.modalities.map((mod) => (
              <span key={mod} className="relationship-graph__hover-tag">
                {mod}
              </span>
            ))}
          </div>
          <p className="relationship-graph__hover-hint">
            {hoveredMethod.degree} connection{hoveredMethod.degree !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
