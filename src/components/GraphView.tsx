import { useEffect, useRef, useCallback, useState } from 'react';
import cytoscape, { Core, EdgeSingular, NodeSingular } from 'cytoscape';
import { GraphData, FilterOptions } from '../types';

interface GraphViewProps {
  data: GraphData;
  filterOptions: FilterOptions;
  selectedRepo: string | null;
  onSelectNode: (repoName: string | null) => void;
}

function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    bgPrimary: style.getPropertyValue('--bg-primary').trim(),
    bgSecondary: style.getPropertyValue('--bg-secondary').trim(),
    textPrimary: style.getPropertyValue('--text-primary').trim(),
    textSecondary: style.getPropertyValue('--text-secondary').trim(),
    accentPrimary: style.getPropertyValue('--accent-primary').trim(),
    accentSecondary: style.getPropertyValue('--accent-secondary').trim(),
    accentSuccess: style.getPropertyValue('--accent-success').trim(),
    accentWarning: style.getPropertyValue('--accent-warning').trim(),
    accentDanger: style.getPropertyValue('--accent-danger').trim(),
    accentPurple: style.getPropertyValue('--accent-purple').trim(),
    borderColor: style.getPropertyValue('--border-color').trim(),
  };
}

function GraphView({ data, filterOptions, selectedRepo, onSelectNode }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localMode, setLocalMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    nodeId: string | null;
  }>({ visible: false, x: 0, y: 0, nodeId: null });

  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
  }, []);

  const runCoseLayout = useCallback((cy: Core, animate = true) => {
    cy.layout({
      name: 'cose',
      animate,
      animationDuration: animate ? 500 : 0,
      nodeDimensionsIncludeLabels: true,
      spacingFactor: 1.5,
      randomize: false,
      componentSpacing: 100,
      nodeRepulsion: () => 4500,
      idealEdgeLength: () => 100,
    }).run();
  }, []);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const colors = getThemeColors();

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
            label: 'data(label)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 8,
            'font-size': '12px',
            color: colors.textPrimary,
            'background-color': colors.accentPrimary,
            width: 40,
            height: 40,
            'border-width': 2,
            'border-color': colors.borderColor,
            'transition-property': 'background-color, border-color, width, height, opacity',
            'transition-duration': 200,
          },
        },
        {
          selector: 'node[?isPrivate]',
          style: {
            'background-color': colors.accentWarning,
            'border-color': colors.accentWarning,
          },
        },
        {
          selector: 'node[?hasReadme]',
          style: {
            'border-width': 4,
            'border-style': 'double',
          },
        },
        {
          selector: 'node:selected',
          style: {
            width: 50,
            height: 50,
            'background-color': colors.accentPurple,
            'border-color': colors.accentPurple,
            'border-width': 4,
          },
        },
        {
          selector: 'node:active',
          style: {
            'overlay-opacity': 0.2,
            'overlay-color': colors.textPrimary,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': colors.textSecondary,
            'curve-style': 'bezier',
            opacity: 0.6,
          },
        },
        {
          selector: 'edge[type="wikilink"]',
          style: {
            'line-color': colors.accentSecondary,
            width: 3,
          },
        },
        {
          selector: 'edge[type="topic"]',
          style: {
            'line-color': colors.textSecondary,
            'line-style': 'dashed',
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': colors.accentPurple,
            width: 4,
          },
        },
        {
          selector: '.search-match',
          style: {
            'background-color': colors.accentWarning,
            'border-color': colors.accentWarning,
            width: 50,
            height: 50,
            'z-index': 999,
          },
        },
        {
          selector: '.search-dim',
          style: {
            opacity: 0.15,
          },
        },
        {
          selector: '.local-hidden',
          style: {
            display: 'none',
          },
        },
        {
          selector: '.hidden',
          style: {
            display: 'none',
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
      autoungrabify: false,
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
      closeContextMenu();
    });

    // Hover effects
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      node.style('cursor', 'pointer');
    });

    // Right-click context menu
    cy.on('cxttap', 'node', (evt) => {
      evt.preventDefault();
      const node = evt.target;
      const originalEvent = evt.originalEvent as MouseEvent | undefined;
      setContextMenu({
        visible: true,
        x: originalEvent?.clientX ?? 0,
        y: originalEvent?.clientY ?? 0,
        nodeId: node.data('id'),
      });
    });

    cy.on('cxttap', (evt) => {
      if (evt.target === cy) {
        closeContextMenu();
      }
    });

    cyRef.current = cy;

    const observer = new MutationObserver(() => {
      const newColors = getThemeColors();
      cy.style()
        .selector('node').style({
          color: newColors.textPrimary,
          'background-color': newColors.accentPrimary,
          'border-color': newColors.borderColor,
        })
        .selector('node[?isPrivate]').style({
          'background-color': newColors.accentWarning,
          'border-color': newColors.accentWarning,
        })
        .selector('node:selected').style({
          'background-color': newColors.accentPurple,
          'border-color': newColors.accentPurple,
        })
        .selector('node:active').style({
          'overlay-color': newColors.textPrimary,
        })
        .selector('edge').style({
          'line-color': newColors.textSecondary,
        })
        .selector('edge[type="wikilink"]').style({
          'line-color': newColors.accentSecondary,
        })
        .selector('edge[type="topic"]').style({
          'line-color': newColors.textSecondary,
        })
        .selector('edge:selected').style({
          'line-color': newColors.accentPurple,
        })
        .selector('.search-match').style({
          'background-color': newColors.accentWarning,
          'border-color': newColors.accentWarning,
        })
        .update();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
      cy.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    runCoseLayout(cy);
  }, [data, runCoseLayout]);

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

  // Search highlighting
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().forEach((node: NodeSingular) => {
      node.removeClass('search-match');
      node.removeClass('search-dim');
    });

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      cy.nodes().forEach((node: NodeSingular) => {
        const id = String(node.data('id') || '').toLowerCase();
        if (id.includes(query)) {
          node.addClass('search-match');
          node.removeClass('search-dim');
        } else {
          node.addClass('search-dim');
          node.removeClass('search-match');
        }
      });
    }
  }, [searchQuery]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass('local-hidden');

    if (!localMode || !selectedRepo) {
      return;
    }

    const selected = cy.getElementById(selectedRepo);
    if (selected.empty()) return;

    const neighborhood = selected.closedNeighborhood();
    const twoHops = neighborhood.closedNeighborhood();

    cy.elements().addClass('local-hidden');
    twoHops.removeClass('local-hidden');

    const visibleForLayout = cy.elements().not('.hidden').not('.local-hidden');
    if (visibleForLayout.nonempty()) {
      visibleForLayout.layout({
        name: 'cose',
        animate: true,
        animationDuration: 350,
        nodeDimensionsIncludeLabels: true,
        spacingFactor: 1.3,
        randomize: false,
      }).run();
    }
  }, [localMode, selectedRepo]);

  useEffect(() => {
    if (!contextMenu.visible) return;

    const handleOutsideClick = () => {
      closeContextMenu();
    };

    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [closeContextMenu, contextMenu.visible]);

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

  const handleRelayout = useCallback(() => {
    const cy = cyRef.current;
    if (cy) {
      if (localMode && selectedRepo) {
        const visibleForLayout = cy.elements().not('.hidden').not('.local-hidden');
        if (visibleForLayout.nonempty()) {
          visibleForLayout.layout({
            name: 'cose',
            animate: true,
            animationDuration: 500,
            nodeDimensionsIncludeLabels: true,
            spacingFactor: 1.3,
            randomize: false,
          }).run();
        }
        return;
      }
      runCoseLayout(cy);
    }
  }, [localMode, runCoseLayout, selectedRepo]);

  const handleOpenInGitHub = useCallback(() => {
    if (contextMenu.nodeId) {
      const node = data.nodes.find(n => n.data.id === contextMenu.nodeId);
      const htmlUrl = node?.data.htmlUrl;
      if (htmlUrl) {
        window.open(htmlUrl, '_blank', 'noopener,noreferrer');
      }
    }
    closeContextMenu();
  }, [closeContextMenu, contextMenu.nodeId, data.nodes]);

  const handleFocusNode = useCallback(() => {
    const cy = cyRef.current;
    if (cy && contextMenu.nodeId) {
      const node = cy.getElementById(contextMenu.nodeId);
      if (!node.empty()) {
        cy.animate({
          center: { eles: node },
          zoom: 2,
        });
      }
    }
    closeContextMenu();
  }, [closeContextMenu, contextMenu.nodeId]);

  const handleShowLocalGraph = useCallback(() => {
    if (contextMenu.nodeId) {
      onSelectNode(contextMenu.nodeId);
      setLocalMode(true);
    }
    closeContextMenu();
  }, [closeContextMenu, contextMenu.nodeId, onSelectNode]);

  return (
    <div className="graph-view">
      <div className="graph-controls">
        <button onClick={handleFit} title="Fit to view">⊞</button>
        <button onClick={handleCenter} title="Center">⊕</button>
        <button onClick={handleRelayout} title="Re-layout">
          ↺
        </button>
        <button
          onClick={() => setLocalMode(prev => !prev)}
          title={localMode ? 'Show all repos' : 'Local graph mode'}
          className={localMode ? 'active' : ''}
        >
          {localMode ? '🔍 Local' : '🌐 Global'}
        </button>
      </div>
      <div className="graph-search">
        <input
          type="text"
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
        />
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
<span className="legend-dot has-readme"></span>
          <span>Has README</span>
        </div>
        <div className="legend-item">
          <span className="legend-line wikilink"></span>
          <span>Wiki-link</span>
        </div>
        <div className="legend-item">
          <span className="legend-line topic"></span>
          <span>Shared Topic</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot legend-search-match"></span>
          <span>Search Match</span>
        </div>
      </div>
      {contextMenu.visible && contextMenu.nodeId && (
        <div
          className="graph-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={event => event.stopPropagation()}
        >
          <div className="context-menu-item" onClick={handleOpenInGitHub}>Open in GitHub</div>
          <div className="context-menu-item" onClick={handleFocusNode}>Focus</div>
          <div className="context-menu-item" onClick={handleShowLocalGraph}>Show Local Graph</div>
        </div>
      )}
      <style>{`
        .graph-search {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 10;
        }

        .graph-search input {
          padding: 0.5rem 0.75rem;
          width: 200px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .graph-search input:focus {
          outline: none;
          border-color: var(--accent-primary);
        }

        .graph-context-menu {
          position: fixed;
          z-index: 100;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.25rem 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          min-width: 180px;
        }

        .context-menu-item {
          padding: 0.5rem 1rem;
          cursor: pointer;
          color: var(--text-primary);
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .context-menu-item:hover {
          background: var(--bg-tertiary);
        }

        .legend-dot.legend-search-match {
          background: #f1c40f;
          border: 2px solid #f39c12;
        }
      `}</style>
    </div>
  );
}

export default GraphView;
