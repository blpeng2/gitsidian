import { useEffect, useRef, useCallback } from 'react';
import cytoscape, { Core, NodeSingular, EdgeSingular } from 'cytoscape';
import { GraphData, FilterOptions } from '../types';

interface GraphViewProps {
  data: GraphData;
  filterOptions: FilterOptions;
  selectedRepo: string | null;
  onSelectNode: (repoName: string | null) => void;
}

function GraphView({ data, filterOptions, selectedRepo, onSelectNode }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: data.nodes,
        edges: data.edges,
      },
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 8,
            'font-size': '12px',
            'color': '#e0e0e0',
            'background-color': '#4a90d9',
            'width': 40,
            'height': 40,
            'border-width': 2,
            'border-color': '#2d5f8a',
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': 200,
          },
        },
        {
          selector: 'node[?isPrivate]',
          style: {
            'background-color': '#e67e22',
            'border-color': '#b36318',
          },
        },
        {
          selector: 'node[?hasMetaNote]',
          style: {
            'border-width': 4,
            'border-style': 'double',
          },
        },
        {
          selector: 'node[?publicReady]',
          style: {
            'background-color': '#27ae60',
            'border-color': '#1e8449',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'width': 50,
            'height': 50,
            'background-color': '#9b59b6',
            'border-color': '#8e44ad',
            'border-width': 4,
          },
        },
        {
          selector: 'node:active',
          style: {
            'overlay-opacity': 0.2,
            'overlay-color': '#fff',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#666',
            'curve-style': 'bezier',
            'opacity': 0.6,
          },
        },
        {
          selector: 'edge[type="wikilink"]',
          style: {
            'line-color': '#3498db',
            'width': 3,
          },
        },
        {
          selector: 'edge[type="topic"]',
          style: {
            'line-color': '#95a5a6',
            'line-style': 'dashed',
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#9b59b6',
            'width': 4,
          },
        },
        {
          selector: '.hidden',
          style: {
            'display': 'none',
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 500,
        nodeDimensionsIncludeLabels: true,
        spacingFactor: 1.5,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: () => 4500,
        idealEdgeLength: () => 100,
      },
      wheelSensitivity: 0.2,
      minZoom: 0.2,
      maxZoom: 3,
    });

    // Event handlers
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      onSelectNode(node.data('id'));
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        onSelectNode(null);
      }
    });

    // Hover effects
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      node.style('cursor', 'pointer');
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, []);

  // Update elements when data changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.json({
      elements: {
        nodes: data.nodes,
        edges: data.edges,
      },
    });

    cy.layout({
      name: 'cose',
      animate: true,
      animationDuration: 500,
      nodeDimensionsIncludeLabels: true,
      spacingFactor: 1.5,
      randomize: false,
    }).run();
  }, [data]);

  // Apply filters
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().forEach((node: NodeSingular) => {
      const isPrivate = node.data('isPrivate');
      const isOrphan = node.data('isOrphan');
      const topics: string[] = node.data('topics');

      let visible = true;

      // Visibility filter
      if (!filterOptions.showPrivate && isPrivate) visible = false;
      if (!filterOptions.showPublic && !isPrivate) visible = false;
      if (!filterOptions.showOrphans && isOrphan) visible = false;
      if (filterOptions.topicFilter && !topics.includes(filterOptions.topicFilter)) {
        visible = false;
      }

      if (visible) {
        node.removeClass('hidden');
      } else {
        node.addClass('hidden');
      }
    });

    // Hide edges connected to hidden nodes
    cy.edges().forEach((edge: EdgeSingular) => {
      const source = edge.source();
      const target = edge.target();
      
      if (source.hasClass('hidden') || target.hasClass('hidden')) {
        edge.addClass('hidden');
      } else {
        edge.removeClass('hidden');
      }
    });
  }, [filterOptions]);

  // Highlight selected node
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().forEach((node: NodeSingular) => {
      if (node.data('id') === selectedRepo) {
        node.select();
        // Center on selected node
        cy.animate({
          center: { eles: node },
          zoom: 1.5,
        });
      } else {
        node.unselect();
      }
    });
  }, [selectedRepo]);

  // Fit graph to viewport
  const handleFit = useCallback(() => {
    const cy = cyRef.current;
    if (cy) {
      cy.fit(undefined, 50);
    }
  }, []);

  // Center graph
  const handleCenter = useCallback(() => {
    const cy = cyRef.current;
    if (cy) {
      cy.center();
    }
  }, []);

  return (
    <div className="graph-view">
      <div className="graph-controls">
        <button onClick={handleFit} title="Fit to view">⊞</button>
        <button onClick={handleCenter} title="Center">⊕</button>
      </div>
      <div ref={containerRef} className="graph-container" />
      <div className="graph-legend">
        <div className="legend-item">
          <span className="legend-dot public"></span>
          <span>Public</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot private"></span>
          <span>Private</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot with-note"></span>
          <span>Has Meta Note</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot ready"></span>
          <span>Public Ready</span>
        </div>
        <div className="legend-item">
          <span className="legend-line wikilink"></span>
          <span>Wiki-link</span>
        </div>
        <div className="legend-item">
          <span className="legend-line topic"></span>
          <span>Shared Topic</span>
        </div>
      </div>
    </div>
  );
}

export default GraphView;
