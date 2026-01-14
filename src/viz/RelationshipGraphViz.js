import * as d3 from 'd3';
import { STEP_COLORS } from './PipelineViz';

/**
 * Method Relationship Graph Visualization
 * Sophisticated force-directed graph with clustering, similarity detection,
 * and interactive exploration capabilities
 */

// Re-export step colors for consistency
export { STEP_COLORS };

// Modality colors for similarity edges
const MODALITY_COLORS = {
  text: '#88c0d0',
  image: '#a3be8c',
  video: '#b48ead',
  audio: '#d08770',
  sensor: '#ebcb8b',
  realtime: '#bf616a',
  mixed: '#8fbcbb',
};

// Design tokens
const TOKENS = {
  bg: '#2e3440',
  bgSubtle: '#323845',
  surface: '#3b4252',
  surfaceRaised: '#434c5e',
  text: '#eceff4',
  textSecondary: '#d8dee9',
  textMuted: '#9aa5b8',
  border: 'rgba(76, 86, 106, 0.5)',
  accent: '#88c0d0',
  accentMuted: 'rgba(136, 192, 208, 0.3)',
};

// Relationship types with styling
const RELATIONSHIP_TYPES = {
  explicit: {
    color: '#88c0d0',
    strokeWidth: 2.5,
    dashArray: null,
    label: 'Explicitly Related',
  },
  sameStep: {
    color: 'rgba(136, 192, 208, 0.3)',
    strokeWidth: 1,
    dashArray: '3,3',
    label: 'Same Pipeline Step',
  },
  sharedModality: {
    color: 'rgba(163, 190, 140, 0.4)',
    strokeWidth: 1.5,
    dashArray: '5,3',
    label: 'Shared Modality',
  },
  sharedTask: {
    color: 'rgba(180, 142, 173, 0.4)',
    strokeWidth: 1.5,
    dashArray: '2,2',
    label: 'Shared Task',
  },
  similar: {
    color: 'rgba(235, 203, 139, 0.5)',
    strokeWidth: 1.5,
    dashArray: '4,4',
    label: 'Similar Methods',
  },
};

/**
 * Calculate similarity score between two methods
 * Based on shared modalities, tasks, tags, and pipeline proximity
 */
function calculateSimilarity(method1, method2, pipelineSteps) {
  if (method1.id === method2.id) return 0;

  let score = 0;

  // Shared modalities (high weight)
  const sharedModalities = method1.modalities.filter((m) =>
    method2.modalities.includes(m)
  );
  score += sharedModalities.length * 0.25;

  // Shared tasks (high weight)
  const sharedTasks = (method1.tasks || []).filter((t) =>
    (method2.tasks || []).includes(t)
  );
  score += sharedTasks.length * 0.2;

  // Shared tags (medium weight)
  const sharedTags = (method1.tags || []).filter((t) =>
    (method2.tags || []).includes(t)
  );
  score += sharedTags.length * 0.1;

  // Pipeline step proximity (methods in same or adjacent steps are related)
  const step1 = pipelineSteps.find((s) => s.id === method1.pipeline_step);
  const step2 = pipelineSteps.find((s) => s.id === method2.pipeline_step);
  if (step1 && step2) {
    const stepDiff = Math.abs(step1.order - step2.order);
    if (stepDiff === 0) score += 0.15;
    else if (stepDiff === 1) score += 0.05;
  }

  // Same maturity level (low weight)
  if (method1.maturity === method2.maturity) {
    score += 0.05;
  }

  // Same evidence type (low weight)
  if (method1.evidence_type === method2.evidence_type) {
    score += 0.05;
  }

  return Math.min(score, 1); // Cap at 1
}

/**
 * Build graph data from methods
 */
function buildGraphData(data, options = {}) {
  const {
    showExplicitRelations = true,
    showSimilarMethods = true,
    similarityThreshold = 0.35,
    showSameStepLinks = false,
    showSharedModalityLinks = false,
    showSharedTaskLinks = false,
    maxSimilarLinks = 3, // Max similar connections per node
  } = options;

  const methods = data.methods;
  const pipelineSteps = data.pipelineSteps;

  // Create nodes
  const nodes = methods.map((method) => ({
    id: method.id,
    name: method.name,
    shortName: method.name.length > 30 
      ? method.name.substring(0, 27) + '...' 
      : method.name,
    pipelineStep: method.pipeline_step,
    modalities: method.modalities || [],
    tasks: method.tasks || [],
    tags: method.tags || [],
    maturity: method.maturity,
    evidenceType: method.evidence_type,
    relatedIds: method.related_method_ids || [],
    year: method.references?.year,
    color: STEP_COLORS[method.pipeline_step] || TOKENS.accent,
    // Will be computed: degree, clusterId
  }));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const links = [];
  const addedLinks = new Set();

  // Helper to add unique links
  const addLink = (source, target, type, strength = 1) => {
    const key = [source, target].sort().join('--');
    if (!addedLinks.has(key) && source !== target) {
      addedLinks.add(key);
      links.push({
        source,
        target,
        type,
        strength,
        ...RELATIONSHIP_TYPES[type],
      });
    }
  };

  // 1. Explicit relationships from data
  if (showExplicitRelations) {
    methods.forEach((method) => {
      (method.related_method_ids || []).forEach((relatedId) => {
        if (nodeMap.has(relatedId)) {
          addLink(method.id, relatedId, 'explicit', 1);
        }
      });
    });
  }

  // 2. Same pipeline step links (optional, can create dense graphs)
  if (showSameStepLinks) {
    pipelineSteps.forEach((step) => {
      const stepMethods = methods.filter((m) => m.pipeline_step === step.id);
      for (let i = 0; i < stepMethods.length; i++) {
        for (let j = i + 1; j < stepMethods.length; j++) {
          addLink(stepMethods[i].id, stepMethods[j].id, 'sameStep', 0.3);
        }
      }
    });
  }

  // 3. Shared modality links (optional)
  if (showSharedModalityLinks) {
    for (let i = 0; i < methods.length; i++) {
      for (let j = i + 1; j < methods.length; j++) {
        const shared = methods[i].modalities.filter((m) =>
          methods[j].modalities.includes(m)
        );
        if (shared.length > 0 && methods[i].pipeline_step !== methods[j].pipeline_step) {
          addLink(methods[i].id, methods[j].id, 'sharedModality', 0.4 + shared.length * 0.1);
        }
      }
    }
  }

  // 4. Shared task links (optional)
  if (showSharedTaskLinks) {
    for (let i = 0; i < methods.length; i++) {
      for (let j = i + 1; j < methods.length; j++) {
        const shared = (methods[i].tasks || []).filter((t) =>
          (methods[j].tasks || []).includes(t)
        );
        if (shared.length > 0 && methods[i].pipeline_step !== methods[j].pipeline_step) {
          addLink(methods[i].id, methods[j].id, 'sharedTask', 0.3 + shared.length * 0.15);
        }
      }
    }
  }

  // 5. Similar methods (based on computed similarity)
  if (showSimilarMethods) {
    const similarities = [];
    for (let i = 0; i < methods.length; i++) {
      for (let j = i + 1; j < methods.length; j++) {
        const sim = calculateSimilarity(methods[i], methods[j], pipelineSteps);
        if (sim >= similarityThreshold) {
          similarities.push({
            source: methods[i].id,
            target: methods[j].id,
            similarity: sim,
          });
        }
      }
    }

    // Sort by similarity and limit per node
    similarities.sort((a, b) => b.similarity - a.similarity);
    const nodeLinkCounts = new Map();

    similarities.forEach(({ source, target, similarity }) => {
      const sourceCount = nodeLinkCounts.get(source) || 0;
      const targetCount = nodeLinkCounts.get(target) || 0;

      if (sourceCount < maxSimilarLinks && targetCount < maxSimilarLinks) {
        addLink(source, target, 'similar', similarity);
        nodeLinkCounts.set(source, sourceCount + 1);
        nodeLinkCounts.set(target, targetCount + 1);
      }
    });
  }

  // Calculate node degrees
  const degreeMap = new Map();
  links.forEach((link) => {
    degreeMap.set(link.source, (degreeMap.get(link.source) || 0) + 1);
    degreeMap.set(link.target, (degreeMap.get(link.target) || 0) + 1);
  });
  nodes.forEach((node) => {
    node.degree = degreeMap.get(node.id) || 0;
  });

  return { nodes, links };
}

/**
 * Compute cluster hulls for pipeline steps
 */
function computeClusterHulls(nodes, pipelineSteps) {
  const clusters = new Map();

  pipelineSteps.forEach((step) => {
    clusters.set(step.id, {
      id: step.id,
      name: step.name,
      color: STEP_COLORS[step.id],
      nodes: [],
    });
  });

  nodes.forEach((node) => {
    const cluster = clusters.get(node.pipelineStep);
    if (cluster) {
      cluster.nodes.push(node);
    }
  });

  return Array.from(clusters.values()).filter((c) => c.nodes.length > 0);
}

/**
 * Generate hull path for a cluster
 */
function generateHullPath(clusterNodes, padding = 30) {
  if (clusterNodes.length < 3) {
    // For 1-2 nodes, create a circle/ellipse
    if (clusterNodes.length === 1) {
      const node = clusterNodes[0];
      const r = padding + 15;
      return `M ${node.x - r},${node.y} 
              a ${r},${r} 0 1,0 ${r * 2},0 
              a ${r},${r} 0 1,0 ${-r * 2},0`;
    } else {
      const [n1, n2] = clusterNodes;
      const midX = (n1.x + n2.x) / 2;
      const midY = (n1.y + n2.y) / 2;
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const rx = dist / 2 + padding;
      const ry = padding + 20;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      return `M ${midX - rx},${midY} 
              a ${rx},${ry} ${angle} 1,0 ${rx * 2},0 
              a ${rx},${ry} ${angle} 1,0 ${-rx * 2},0`;
    }
  }

  // For 3+ nodes, compute convex hull
  const points = clusterNodes.map((n) => [n.x, n.y]);
  const hull = d3.polygonHull(points);

  if (!hull) return null;

  // Expand hull by padding using offset
  const expandedHull = hull.map((point, i) => {
    const prev = hull[(i - 1 + hull.length) % hull.length];
    const next = hull[(i + 1) % hull.length];

    // Calculate normal vectors
    const dx1 = point[0] - prev[0];
    const dy1 = point[1] - prev[1];
    const dx2 = next[0] - point[0];
    const dy2 = next[1] - point[1];

    // Average normal
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
    const nx = (-dy1 / len1 - dy2 / len2) / 2;
    const ny = (dx1 / len1 + dx2 / len2) / 2;
    const nlen = Math.sqrt(nx * nx + ny * ny) || 1;

    return [point[0] + (nx / nlen) * padding, point[1] + (ny / nlen) * padding];
  });

  // Create smooth curve through hull points
  const line = d3
    .line()
    .x((d) => d[0])
    .y((d) => d[1])
    .curve(d3.curveCatmullRomClosed.alpha(0.5));

  return line(expandedHull);
}

/**
 * Creates the relationship graph visualization
 */
export function createRelationshipGraph(container, data, options = {}) {
  const containerRect = container.getBoundingClientRect();
  const containerWidth = containerRect.width;
  const containerHeight = containerRect.height || 600;

  if (!containerWidth || containerWidth === 0) {
    return { update: () => {}, destroy: () => {} };
  }

  const {
    width = containerWidth,
    height = Math.max(containerHeight, 500),
    onMethodClick = () => {},
    onMethodHover = () => {},
    selectedMethodId = null,
    // Reserved for future enhancements
    // eslint-disable-next-line no-unused-vars
    highlightedCluster = null,
    // eslint-disable-next-line no-unused-vars
    clusterBy = 'pipelineStep', // 'pipelineStep', 'modality', 'task'
    showClusters = true,
    showLabels = true,
    nodeSpacing = 1.5, // Multiplier for node spacing (0.5 = compact, 3.0 = very spread out)
    linkOptions = {},
    animated = true,
  } = options;

  // Build graph data
  const graphData = buildGraphData(data, {
    showExplicitRelations: true,
    showSimilarMethods: true,
    similarityThreshold: 0.3,
    maxSimilarLinks: 4,
    ...linkOptions,
  });

  const { nodes, links } = graphData;

  // Clear previous
  d3.select(container).selectAll('*').remove();

  // Create SVG with zoom support
  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', 'Method relationship graph visualization')
    .style('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif')
    .style('background', TOKENS.bg);

  // Defs for gradients, markers, filters
  const defs = svg.append('defs');

  // Glow filter for selected nodes
  const glowFilter = defs
    .append('filter')
    .attr('id', 'glow')
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%');

  glowFilter
    .append('feGaussianBlur')
    .attr('stdDeviation', '3')
    .attr('result', 'coloredBlur');

  const glowMerge = glowFilter.append('feMerge');
  glowMerge.append('feMergeNode').attr('in', 'coloredBlur');
  glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

  // Arrow markers for each relationship type
  Object.entries(RELATIONSHIP_TYPES).forEach(([type, style]) => {
    defs
      .append('marker')
      .attr('id', `arrow-${type}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L10,0L0,4')
      .attr('fill', style.color);
  });

  // Main group with zoom transform
  const g = svg.append('g').attr('class', 'graph-container');

  // Initial scale for zoom
  const initialScale = 0.85;

  // Track current zoom scale for semantic zooming
  let currentZoomScale = initialScale;

  // Semantic zoom level thresholds
  const ZOOM_LEVELS = {
    ABSTRACT: 0.45,      // Very zoomed out - just dots
    MINIMAL: 0.7,        // Zoomed out - dots with step color
    NORMAL: 1.0,         // Default - nodes with modality indicators
    DETAILED: 1.5,       // Zoomed in - show short labels
    FULL: 2.2,           // Very zoomed in - full details
  };

  // Get zoom level name for indicator
  function getZoomLevelName(scale) {
    if (scale < ZOOM_LEVELS.ABSTRACT) return 'Abstract';
    if (scale < ZOOM_LEVELS.MINIMAL) return 'Minimal';
    if (scale < ZOOM_LEVELS.DETAILED) return 'Normal';
    if (scale < ZOOM_LEVELS.FULL) return 'Detailed';
    return 'Full Detail';
  }

  // Helper to wrap text
  function wrapText(text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';
    const charWidth = 6.5; // Approximate character width

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length * charWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 3); // Max 3 lines
  }

  // Variables that will be set later (declared here for semantic zoom access)
  let node, link, hullGroup, nodeGroup, labelGroup, nodeRadius;

  // Zoom level indicator (fixed position overlay)
  const zoomIndicator = svg.append('g')
    .attr('class', 'zoom-indicator')
    .attr('transform', `translate(${width - 140}, 20)`);

  zoomIndicator.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', 130)
    .attr('height', 50)
    .attr('rx', 8)
    .attr('fill', TOKENS.surface)
    .attr('stroke', TOKENS.border)
    .attr('opacity', 0.9);

  const zoomLevelText = zoomIndicator.append('text')
    .attr('x', 65)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .attr('fill', TOKENS.text)
    .attr('font-size', '11px')
    .attr('font-weight', '600')
    .text('Normal');

  const zoomPercentText = zoomIndicator.append('text')
    .attr('x', 65)
    .attr('y', 38)
    .attr('text-anchor', 'middle')
    .attr('fill', TOKENS.textMuted)
    .attr('font-size', '10px')
    .text('85%');

  // Zoom hint at bottom
  const zoomHint = svg.append('g')
    .attr('class', 'zoom-hint')
    .attr('transform', `translate(${width / 2}, ${height - 25})`);

  zoomHint.append('text')
    .attr('text-anchor', 'middle')
    .attr('fill', TOKENS.textMuted)
    .attr('font-size', '10px')
    .attr('opacity', 0.7)
    .text('Scroll to zoom • Zoom in for more details');

  // Semantic zoom update function
  function updateSemanticZoom(scale) {
    currentZoomScale = scale;

    // Update zoom indicator
    zoomLevelText.text(getZoomLevelName(scale));
    zoomPercentText.text(`${Math.round(scale * 100)}%`);

    // Determine zoom level
    const isAbstract = scale < ZOOM_LEVELS.ABSTRACT;
    const isMinimal = scale >= ZOOM_LEVELS.ABSTRACT && scale < ZOOM_LEVELS.MINIMAL;
    const isNormal = scale >= ZOOM_LEVELS.MINIMAL && scale < ZOOM_LEVELS.DETAILED;
    const isDetailed = scale >= ZOOM_LEVELS.DETAILED && scale < ZOOM_LEVELS.FULL;
    const isFull = scale >= ZOOM_LEVELS.FULL;

    // Hide zoom hint when user has zoomed
    zoomHint.transition().duration(300)
      .attr('opacity', scale === initialScale ? 1 : 0);

    // Bail out if elements not yet created
    if (!node || !link || !hullGroup) return;

    // --- Update node circles ---
    node.selectAll('.node-circle')
      .transition()
      .duration(150)
      .attr('r', (d) => {
        const baseRadius = nodeRadius(d);
        if (isAbstract) return baseRadius * 0.6;
        if (isMinimal) return baseRadius * 0.8;
        return baseRadius;
      })
      .attr('stroke-width', isAbstract ? 1 : 2);

    // --- Update modality indicators ---
    node.selectAll('.modality-indicator')
      .transition()
      .duration(150)
      .attr('opacity', () => {
        if (isAbstract || isMinimal) return 0;
        return 0.8;
      })
      .attr('r', () => {
        if (isNormal) return 4;
        if (isDetailed) return 5;
        return 6;
      });

    // --- Update links ---
    link
      .transition()
      .duration(150)
      .attr('opacity', () => {
        if (isAbstract) return 0.2;
        if (isMinimal) return 0.4;
        return 0.6;
      })
      .attr('stroke-width', (d) => {
        if (isAbstract) return 0.5;
        if (isMinimal) return d.strokeWidth * 0.7;
        return d.strokeWidth;
      });

    // --- Update cluster hulls ---
    hullGroup.selectAll('.cluster-hull')
      .transition()
      .duration(150)
      .attr('fill-opacity', () => {
        if (isAbstract) return 0.15;
        if (isMinimal) return 0.12;
        return 0.08;
      })
      .attr('stroke-opacity', () => {
        if (isAbstract) return 0.5;
        if (isMinimal) return 0.4;
        return 0.3;
      })
      .attr('stroke-width', () => {
        if (isAbstract) return 3;
        return 2;
      });

    // --- Update cluster labels ---
    hullGroup.selectAll('.cluster-label')
      .transition()
      .duration(150)
      .attr('font-size', () => {
        if (isAbstract) return '16px';
        if (isMinimal) return '14px';
        return '12px';
      })
      .attr('opacity', () => {
        if (isAbstract) return 0.9;
        if (isMinimal) return 0.8;
        if (isFull) return 0.4;
        return 0.7;
      });

    // --- Update semantic detail cards ---
    updateDetailCards(isDetailed, isFull);
  }

  // Detail cards for zoomed-in view
  function updateDetailCards(showDetailed, showFull) {
    if (!nodeGroup) return;

    // Remove existing detail cards
    nodeGroup.selectAll('.detail-card').remove();

    if (!showDetailed && !showFull) return;

    // Add detail cards to each node
    node.each(function(d) {
      const nodeEl = d3.select(this);
      const r = nodeRadius(d);

      const cardGroup = nodeEl.append('g')
        .attr('class', 'detail-card')
        .attr('transform', `translate(${r + 8}, ${-r - 5})`);

      // Card background
      const cardBg = cardGroup.append('rect')
        .attr('class', 'detail-card-bg')
        .attr('rx', 6)
        .attr('ry', 6)
        .attr('fill', TOKENS.surface)
        .attr('stroke', d.color)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.95);

      // Card content
      const cardContent = cardGroup.append('g')
        .attr('class', 'detail-card-content')
        .attr('transform', 'translate(10, 12)');

      let yOffset = 0;

      // Method name (always shown in detail view)
      const nameText = showFull ? d.name : d.shortName;
      const nameLines = wrapText(nameText, showFull ? 200 : 150);
      
      nameLines.forEach((line, i) => {
        cardContent.append('text')
          .attr('class', 'detail-name')
          .attr('y', yOffset + i * 14)
          .attr('fill', TOKENS.text)
          .attr('font-size', '12px')
          .attr('font-weight', '600')
          .text(line);
      });
      yOffset += nameLines.length * 14 + 6;

      // Year and maturity (in detailed view)
      if (d.year || d.maturity) {
        const metaText = [d.year, d.maturity].filter(Boolean).join(' · ');
        cardContent.append('text')
          .attr('class', 'detail-meta')
          .attr('y', yOffset)
          .attr('fill', TOKENS.textMuted)
          .attr('font-size', '10px')
          .text(metaText);
        yOffset += 14;
      }

      // Modalities (shown as badges in full view)
      if (showFull && d.modalities.length > 0) {
        yOffset += 4;
        let xOffset = 0;
        d.modalities.forEach((mod) => {
          const badge = cardContent.append('g')
            .attr('transform', `translate(${xOffset}, ${yOffset})`);

          const badgeText = badge.append('text')
            .attr('y', 9)
            .attr('fill', MODALITY_COLORS[mod] || TOKENS.textSecondary)
            .attr('font-size', '9px')
            .attr('font-weight', '500')
            .text(mod);

          const textWidth = badgeText.node().getComputedTextLength();

          badge.insert('rect', 'text')
            .attr('x', -4)
            .attr('y', 0)
            .attr('width', textWidth + 8)
            .attr('height', 14)
            .attr('rx', 3)
            .attr('fill', MODALITY_COLORS[mod] || TOKENS.textMuted)
            .attr('opacity', 0.15);

          xOffset += textWidth + 12;
        });
        yOffset += 20;
      }

      // Pipeline step badge (full view only)
      if (showFull) {
        const stepName = data.pipelineSteps.find(s => s.id === d.pipelineStep)?.name || d.pipelineStep;
        yOffset += 2;
        
        const stepBadge = cardContent.append('g')
          .attr('transform', `translate(0, ${yOffset})`);

        stepBadge.append('circle')
          .attr('cx', 5)
          .attr('cy', 6)
          .attr('r', 4)
          .attr('fill', d.color);

        stepBadge.append('text')
          .attr('x', 12)
          .attr('y', 9)
          .attr('fill', TOKENS.textSecondary)
          .attr('font-size', '10px')
          .text(stepName);

        yOffset += 16;
      }

      // Evidence type (full view only)
      if (showFull && d.evidenceType) {
        cardContent.append('text')
          .attr('y', yOffset)
          .attr('fill', TOKENS.textMuted)
          .attr('font-size', '9px')
          .attr('font-style', 'italic')
          .text(`Evidence: ${d.evidenceType}`);
        yOffset += 12;
      }

      // Size the card background
      const contentBBox = cardContent.node().getBBox();
      cardBg
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', contentBBox.width + 20)
        .attr('height', contentBBox.height + 16);

      // Fade in animation
      cardGroup
        .attr('opacity', 0)
        .transition()
        .duration(200)
        .attr('opacity', 1);
    });
  }

  // Zoom behavior with semantic updates
  const zoom = d3
    .zoom()
    .scaleExtent([0.2, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
      
      // Debounced semantic zoom update
      if (Math.abs(event.transform.k - currentZoomScale) > 0.05) {
        updateSemanticZoom(event.transform.k);
      }
    });

  svg.call(zoom);

  // Initial transform
  const initialTransform = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(initialScale)
    .translate(-width / 2, -height / 2);

  svg.call(zoom.transform, initialTransform);

  // Base distances scaled by nodeSpacing multiplier
  const baseDistanceExplicit = 150 * nodeSpacing;
  const baseDistanceSimilar = 200 * nodeSpacing;
  const baseDistanceOther = 250 * nodeSpacing;
  const chargeStrength = -500 * nodeSpacing;
  const collisionRadius = 40 * nodeSpacing;
  const clusterRadius = Math.min(width, height) * (0.25 + nodeSpacing * 0.1);

  // Force simulation
  const simulation = d3
    .forceSimulation(nodes)
    .force(
      'link',
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance((d) => {
          // Distances scaled by nodeSpacing
          if (d.type === 'explicit') return baseDistanceExplicit;
          if (d.type === 'similar') return baseDistanceSimilar;
          return baseDistanceOther;
        })
        .strength((d) => d.strength * (0.4 / nodeSpacing))
    )
    .force('charge', d3.forceManyBody().strength(chargeStrength).distanceMax(800))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(collisionRadius))
    .force('x', d3.forceX(width / 2).strength(0.015 / nodeSpacing))
    .force('y', d3.forceY(height / 2).strength(0.015 / nodeSpacing));

  // Cluster force - group by pipeline step
  const clusterCenters = {};
  
  const stepCount = data.pipelineSteps.length;

  data.pipelineSteps.forEach((step, i) => {
    const angle = (i / stepCount) * 2 * Math.PI - Math.PI / 2;
    clusterCenters[step.id] = {
      x: width / 2 + Math.cos(angle) * clusterRadius,
      y: height / 2 + Math.sin(angle) * clusterRadius,
    };
  });

  simulation.force(
    'cluster',
    d3.forceX((d) => clusterCenters[d.pipelineStep]?.x || width / 2).strength(0.12)
  );
  simulation.force(
    'clusterY',
    d3.forceY((d) => clusterCenters[d.pipelineStep]?.y || height / 2).strength(0.12)
  );

  // Cluster hulls layer (behind everything)
  hullGroup = g.append('g').attr('class', 'hulls');

  // Links layer
  const linkGroup = g.append('g').attr('class', 'links');

  // Nodes layer
  nodeGroup = g.append('g').attr('class', 'nodes');

  // Labels layer
  labelGroup = g.append('g').attr('class', 'labels');

  // Draw links
  link = linkGroup
    .selectAll('.link')
    .data(links)
    .enter()
    .append('path')
    .attr('class', (d) => `link link--${d.type}`)
    .attr('stroke', (d) => d.color)
    .attr('stroke-width', (d) => d.strokeWidth)
    .attr('stroke-dasharray', (d) => d.dashArray)
    .attr('fill', 'none')
    .attr('opacity', animated ? 0 : 0.6)
    .attr('marker-end', (d) => (d.type === 'explicit' ? `url(#arrow-${d.type})` : null));

  if (animated) {
    link.transition().duration(800).delay(500).attr('opacity', 0.6);
  }

  // Draw nodes
  node = nodeGroup
    .selectAll('.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node')
    .style('cursor', 'pointer')
    .call(
      d3
        .drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
    );

  // Node circles
  nodeRadius = (d) => Math.max(8, Math.min(18, 8 + d.degree * 1.5));

  node
    .append('circle')
    .attr('class', 'node-circle')
    .attr('r', nodeRadius)
    .attr('fill', (d) => d.color)
    .attr('stroke', TOKENS.surface)
    .attr('stroke-width', 2)
    .attr('opacity', animated ? 0 : 1);

  if (animated) {
    node
      .selectAll('.node-circle')
      .transition()
      .duration(500)
      .delay((d, i) => i * 20)
      .attr('opacity', 1);
  }

  // Modality indicators (small dots around the node)
  node.each(function (d) {
    const nodeEl = d3.select(this);
    const r = nodeRadius(d);
    const modalities = d.modalities.slice(0, 4); // Max 4 indicators

    modalities.forEach((mod, i) => {
      const angle = (i / modalities.length) * 2 * Math.PI - Math.PI / 2;
      const indicatorR = 4;
      const dist = r + indicatorR + 2;

      nodeEl
        .append('circle')
        .attr('class', 'modality-indicator')
        .attr('cx', Math.cos(angle) * dist)
        .attr('cy', Math.sin(angle) * dist)
        .attr('r', indicatorR)
        .attr('fill', MODALITY_COLORS[mod] || TOKENS.textMuted)
        .attr('stroke', TOKENS.bg)
        .attr('stroke-width', 1)
        .attr('opacity', 0.8);
    });
  });

  // Node labels (shown on hover or always if showLabels)
  if (showLabels) {
    const labels = labelGroup
      .selectAll('.node-label')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-label')
      .attr('opacity', 0);

    // Label background
    labels
      .append('rect')
      .attr('class', 'label-bg')
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', TOKENS.surface)
      .attr('stroke', TOKENS.border)
      .attr('stroke-width', 1);

    // Label text
    labels
      .append('text')
      .attr('class', 'label-text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', TOKENS.text)
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .text((d) => d.shortName);

    // Size backgrounds to fit text
    labels.each(function () {
      const label = d3.select(this);
      const text = label.select('.label-text');
      const bbox = text.node().getBBox();
      label
        .select('.label-bg')
        .attr('x', bbox.x - 6)
        .attr('y', bbox.y - 3)
        .attr('width', bbox.width + 12)
        .attr('height', bbox.height + 6);
    });
  }

  // Node interactions
  node
    .on('mouseenter', function (event, d) {
      // Highlight node
      d3.select(this)
        .select('.node-circle')
        .transition()
        .duration(150)
        .attr('r', nodeRadius(d) * 1.3)
        .attr('filter', 'url(#glow)');

      // Show label
      labelGroup
        .selectAll('.node-label')
        .filter((n) => n.id === d.id)
        .transition()
        .duration(150)
        .attr('opacity', 1);

      // Highlight connected links
      link
        .transition()
        .duration(150)
        .attr('opacity', (l) =>
          l.source.id === d.id || l.target.id === d.id ? 1 : 0.15
        )
        .attr('stroke-width', (l) =>
          l.source.id === d.id || l.target.id === d.id
            ? l.strokeWidth * 1.5
            : l.strokeWidth
        );

      // Fade non-connected nodes
      node
        .transition()
        .duration(150)
        .attr('opacity', (n) => {
          if (n.id === d.id) return 1;
          const isConnected = links.some(
            (l) =>
              (l.source.id === d.id && l.target.id === n.id) ||
              (l.target.id === d.id && l.source.id === n.id)
          );
          return isConnected ? 1 : 0.3;
        });

      onMethodHover(d);
    })
    .on('mouseleave', function (event, d) {
      // Reset node
      d3.select(this)
        .select('.node-circle')
        .transition()
        .duration(150)
        .attr('r', nodeRadius(d))
        .attr('filter', null);

      // Hide label
      labelGroup
        .selectAll('.node-label')
        .transition()
        .duration(150)
        .attr('opacity', 0);

      // Reset links
      link
        .transition()
        .duration(150)
        .attr('opacity', 0.6)
        .attr('stroke-width', (l) => l.strokeWidth);

      // Reset nodes
      node.transition().duration(150).attr('opacity', 1);

      onMethodHover(null);
    })
    .on('click', function (event, d) {
      event.stopPropagation();
      onMethodClick(d);
    });

  // Simulation tick
  simulation.on('tick', () => {
    // Update link paths (curved for visual appeal)
    link.attr('d', (d) => {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;

      // Straight line for explicit relations, curved for others
      if (d.type === 'explicit') {
        return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
      }
      return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
    });

    // Update node positions
    node.attr('transform', (d) => `translate(${d.x},${d.y})`);

    // Update labels
    labelGroup
      .selectAll('.node-label')
      .attr('transform', (d) => `translate(${d.x},${d.y - nodeRadius(d) - 15})`);

    // Update cluster hulls
    if (showClusters) {
      const clusters = computeClusterHulls(nodes, data.pipelineSteps);

      const hulls = hullGroup.selectAll('.cluster-hull').data(clusters, (d) => d.id);

      hulls.exit().remove();

      hulls
        .enter()
        .append('path')
        .attr('class', 'cluster-hull')
        .attr('fill', (d) => d.color)
        .attr('fill-opacity', 0.08)
        .attr('stroke', (d) => d.color)
        .attr('stroke-opacity', 0.3)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .merge(hulls)
        .attr('d', (d) => generateHullPath(d.nodes, 25));

      // Cluster labels
      const clusterLabels = hullGroup
        .selectAll('.cluster-label')
        .data(clusters, (d) => d.id);

      clusterLabels.exit().remove();

      clusterLabels
        .enter()
        .append('text')
        .attr('class', 'cluster-label')
        .attr('text-anchor', 'middle')
        .attr('fill', (d) => d.color)
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .attr('opacity', 0.7)
        .merge(clusterLabels)
        .attr('x', (d) => d3.mean(d.nodes, (n) => n.x))
        .attr('y', (d) => d3.min(d.nodes, (n) => n.y) - 40)
        .text((d) => d.name);
    }
  });

  // Drag functions
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  // Highlight selected method
  if (selectedMethodId) {
    node.attr('opacity', (d) => {
      if (d.id === selectedMethodId) return 1;
      const isConnected = links.some(
        (l) =>
          (l.source.id === selectedMethodId && l.target.id === d.id) ||
          (l.target.id === selectedMethodId && l.source.id === d.id)
      );
      return isConnected ? 1 : 0.3;
    });

    node
      .filter((d) => d.id === selectedMethodId)
      .select('.node-circle')
      .attr('filter', 'url(#glow)')
      .attr('stroke', TOKENS.accent)
      .attr('stroke-width', 3);
  }

  // Return controls
  return {
    update: (newOptions) => {
      // Could implement partial updates here
      createRelationshipGraph(container, data, { ...options, ...newOptions });
    },
    destroy: () => {
      simulation.stop();
      d3.select(container).selectAll('*').remove();
    },
    zoomToFit: () => {
      svg.transition().duration(500).call(zoom.transform, initialTransform);
    },
    zoomIn: () => {
      svg.transition().duration(300).call(zoom.scaleBy, 1.3);
    },
    zoomOut: () => {
      svg.transition().duration(300).call(zoom.scaleBy, 0.7);
    },
    resetSimulation: () => {
      simulation.alpha(1).restart();
    },
  };
}

export { RELATIONSHIP_TYPES, MODALITY_COLORS, TOKENS };
