import React, { useState, useEffect, useRef, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3';
import api from '../api/axios';
import {
  Network, RefreshCw, Trash2, Play, Pause,
  Search, Plus, Minus, Maximize2, Info, ChevronRight
} from 'lucide-react';

const LABEL_CONFIG = {
  Case: { color: '#3b82f6', emoji: '📂', label: 'Case' },
  Suspect: { color: '#ef4444', emoji: '👤', label: 'Suspect' },
  Victim: { color: '#fbbf24', emoji: '🩸', label: 'Victim' },
  Location: { color: '#10b981', emoji: '📍', label: 'Location' },
  Weapon: { color: '#8b5cf6', emoji: '⚔️', label: 'Weapon' },
  Date: { color: '#06b6d4', emoji: '📅', label: 'Date' },
  Organization: { color: '#ec4899', emoji: '🏢', label: 'Organization' },
  Unknown: { color: '#6b7280', emoji: '❓', label: 'Unknown' },
};

const GraphExplorer = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [selectedNodeConnections, setSelectedNodeConnections] = useState([]);
  const graphRef = useRef(null);

  const queryParams = new URLSearchParams(window.location.search);
  const filterCaseId = queryParams.get('caseId');

  const [isPaused, setIsPaused] = useState(false);

  // Statistics Calculation
  const stats = useMemo(() => {
    const typeCount = {};
    graphData.nodes.forEach(n => {
      typeCount[n.label] = (typeCount[n.label] || 0) + 1;
    });
    return {
      nodes: graphData.nodes.length,
      links: graphData.links.length,
      types: typeCount
    };
  }, [graphData]);

  useEffect(() => {
    fetchGraphData();
  }, [filterCaseId]);

  useEffect(() => {
    if (graphRef.current) {
      // High stability forces
      graphRef.current.d3Force('charge').strength(-2000);
      graphRef.current.d3Force('link').distance(280);
      graphRef.current.d3Force('collide', d3.forceCollide(100));
    }
  }, [graphData]);

  const fetchGraphData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = filterCaseId ? `/graph/?case_id=${filterCaseId}` : '/graph/';
      const response = await api.get(url);
      const rawNodes = response.data.nodes || [];
      const rawEdges = response.data.edges || [];

      const formattedData = {
        nodes: rawNodes.map(n => ({
          ...n,
          name: n.properties?.name || n.properties?.case_id || n.properties?.date || n.label || n.id,
          config: LABEL_CONFIG[n.label] || LABEL_CONFIG.Unknown,
        })),
        links: rawEdges.map(e => ({
          source: String(e.source),
          target: String(e.target),
          label: e.type,
          id: `${e.source}-${e.target}-${e.type}`
        }))
      };
      setGraphData(formattedData);

      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.d3ReheatSimulation();
          graphRef.current.zoomToFit(800, 200);
        }
      }, 600);

    } catch (err) {
      console.error("Failed to fetch graph data:", err);
      setError("Intelligence Core Sync Failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeHover = (node) => {
    setHoverNode(node);
    if (!selectedNode) {
      const newHighlightNodes = new Set();
      const newHighlightLinks = new Set();

      if (node) {
        newHighlightNodes.add(node.id);
        graphData.links.forEach(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          
          if (sourceId === node.id || targetId === node.id) {
            newHighlightLinks.add(link.id);
            newHighlightNodes.add(sourceId);
            newHighlightNodes.add(targetId);
          }
        });
      }

      setHighlightNodes(newHighlightNodes);
      setHighlightLinks(newHighlightLinks);
    }
  };

  const toggleSimulation = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      graphRef.current.pauseAnimation();
    } else {
      graphRef.current.resumeAnimation();
    }
  };

  const handleZoom = (factor) => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * factor, 400);
    }
  };

  const calculateNodeConnections = (clickedNode) => {
    const connections = [];
    const connectedNodeIds = new Set();

    graphData.links.forEach(link => {
      // Safely handle both object and string references
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;

      if (sourceId === clickedNode.id || targetId === clickedNode.id) {
        const connectedNodeId = sourceId === clickedNode.id ? targetId : sourceId;
        const connectedNodeData = graphData.nodes.find(n => n.id === connectedNodeId);
        
        if (connectedNodeData && !connectedNodeIds.has(connectedNodeId)) {
          connections.push({
            id: connectedNodeData.id,
            name: connectedNodeData.name,
            label: connectedNodeData.label,
            emoji: connectedNodeData.config.emoji,
            color: connectedNodeData.config.color,
            linkType: link.label,
            linkId: link.id
          });
          connectedNodeIds.add(connectedNodeId);
        }
      }
    });

    return connections;
  };

  return (
    <div className="h-full flex flex-col bg-[#0f172a] select-none rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl">
      {/* HEADER SECTION - Matching User Reference */}
      <div className="bg-white/5 border-b border-white/10 px-8 py-6 backdrop-blur-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-3.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400">
              <Network size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Investigation Graph</h1>
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-1 opacity-60">Forensic relationship network analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* STATS CARDS */}
            <div className="flex gap-8 px-8 py-3.5 bg-white/[0.03] rounded-2xl border border-white/10">
              <div className="text-center">
                <p className="text-2xl font-black text-white leading-none">{stats.nodes}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold mt-1 tracking-widest">Subjects</p>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className="text-center">
                <p className="text-2xl font-black text-white leading-none">{stats.links}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold mt-1 tracking-widest">Connections</p>
              </div>
            </div>

            {/* CONTROLS */}
            <div className="flex gap-2">
              <button onClick={() => handleZoom(1.3)} className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all active:scale-95" title="Zoom In">
                <Plus size={20} />
              </button>
              <button onClick={() => handleZoom(0.7)} className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all active:scale-95" title="Zoom Out">
                <Minus size={20} />
              </button>
              <button onClick={toggleSimulation} className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${isPaused ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/10 text-slate-300'}`} title={isPaused ? "Play" : "Pause"}>
                {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
              </button>
              <button onClick={() => { if (window.confirm("RESET NEURAL MATRIX?")) api.delete('/graph/').then(() => fetchGraphData()) }} className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all" title="Reset Grid">
                <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
              </button>
              <button onClick={() => graphRef.current.zoomToFit(600, 100)} className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all" title="Fit Screen">
                <Maximize2 size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 gap-6 p-6 min-h-0 bg-[#020617]">
        {/* GRAPH CANVAS */}
        <div 
          className="flex-1 bg-[#0f172a] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 relative group"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedNode(null);
              setSelectedNodeConnections([]);
              setHighlightNodes(new Set());
              setHighlightLinks(new Set());
            }
          }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:40px_40px]"></div>

          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={0}
            onNodeClick={(node) => {
              setSelectedNode(node);
              const connections = calculateNodeConnections(node);
              setSelectedNodeConnections(connections);
              
              const newHighlightNodes = new Set([node.id]);
              const newHighlightLinks = new Set();
              
              connections.forEach(conn => {
                newHighlightNodes.add(conn.id);
              });
              
              graphData.links.forEach(link => {
                const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                
                if (sourceId === node.id || targetId === node.id) {
                  newHighlightLinks.add(link.id);
                }
              });
              
              setHighlightNodes(newHighlightNodes);
              setHighlightLinks(newHighlightLinks);

              // Center and smoothly zoom on clicked node
              if (graphRef.current) {
                const currentZoom = graphRef.current.zoom();
                graphRef.current.centerAt(node.x, node.y, 1000);
                if (currentZoom < 1.2) {
                  graphRef.current.zoom(1.2, 1000);
                }
              }
            }}
            onNodeHover={handleNodeHover}
            onNodeDragEnd={n => { n.fx = n.x; n.fy = n.y; }}
            d3VelocityDecay={0.4}
            cooldownTicks={200}

            linkDashArray={link => highlightLinks.has(link.id) ? [10, 5] : [5, 5]}
            linkColor={link => {
              if (highlightLinks.has(link.id)) {
                return '#3b82f6';
              }
              if (selectedNode) {
                return 'rgba(255, 255, 255, 0.02)';
              }
              return 'rgba(255, 255, 255, 0.05)';
            }}
            linkWidth={link => {
              if (highlightLinks.has(link.id)) {
                return 5;
              }
              if (selectedNode) {
                return 1;
              }
              return 2;
            }}
            linkDirectionalArrowLength={7}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.2}

            // --- Advanced Flow Particles ---
            linkDirectionalParticles={link => highlightLinks.has(link.id) ? 4 : (selectedNode ? 0 : 2)}
            linkDirectionalParticleWidth={link => highlightLinks.has(link.id) ? 4 : 1.5}
            linkDirectionalParticleSpeed={link => highlightLinks.has(link.id) ? 0.008 : 0.002}
            linkDirectionalParticleColor={link => highlightLinks.has(link.id) ? '#60a5fa' : 'rgba(255,255,255,0.3)'}

            // --- Advanced Link Labels ---
            linkCanvasObjectMode={() => 'after'}
            linkCanvasObject={(link, ctx) => {
              const MAX_FONT_SIZE = 4;
              const LABEL_NODE_MARGIN = 15;

              const start = link.source;
              const end = link.target;

              // Ignore unbound links
              if (typeof start !== 'object' || typeof end !== 'object') return;

              // Calculate label positioning
              const textPos = Object.assign(...['x', 'y'].map(c => ({
                [c]: start[c] + (end[c] - start[c]) / 2 // calc middle point
              })));

              const relLink = { x: end.x - start.x, y: end.y - start.y };
              const maxTextLength = Math.sqrt(Math.pow(relLink.x, 2) + Math.pow(relLink.y, 2)) - LABEL_NODE_MARGIN * 2;

              let textAngle = Math.atan2(relLink.y, relLink.x);
              // Maintain label upright
              if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
              if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

              const isHighlighted = highlightLinks.has(link.id);
              
              if (isHighlighted || maxTextLength > 30) {
                ctx.font = `${isHighlighted ? 'bold ' : ''}${MAX_FONT_SIZE}px "Inter", sans-serif`;
                const text = link.label;
                const textWidth = ctx.measureText(text).width;
                
                if (textWidth < maxTextLength || isHighlighted) {
                    ctx.save();
                    ctx.translate(textPos.x, textPos.y);
                    ctx.rotate(textAngle);

                    // Background for text to improve readability
                    if (isHighlighted) {
                      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
                      ctx.fillRect(-textWidth/2 - 2, -MAX_FONT_SIZE/2 - 1, textWidth + 4, MAX_FONT_SIZE + 2);
                    }

                    ctx.fillStyle = isHighlighted ? '#60a5fa' : 'rgba(255,255,255,0.4)';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(text, 0, 0);
                    ctx.restore();
                }
              }
            }}

            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.name || '';
              const isHovered = hoverNode && (hoverNode.id === node.id || highlightNodes.has(node.id));
              const isSelected = selectedNode?.id === node.id;
              const isConnected = selectedNode && highlightNodes.has(node.id) && node.id !== selectedNode.id;
              const opacity = selectedNode && !highlightNodes.has(node.id) ? 0.1 : 1;

              // Visual Tuning - Radius in graph units
              const radius = isSelected ? 36 : (isConnected ? 32 : (isHovered ? 30 : 28));

              ctx.globalAlpha = opacity;

              // Advanced Selected Node Pulse Animation
              if (isSelected) {
                const time = Date.now();
                const pulseRadius = radius + 6 + Math.sin(time / 150) * 3;
                ctx.beginPath();
                ctx.arc(node.x, node.y, pulseRadius, 0, 2 * Math.PI);
                ctx.fillStyle = node.config.color;
                ctx.globalAlpha = 0.4;
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(node.x, node.y, pulseRadius + 6, 0, 2 * Math.PI);
                ctx.strokeStyle = node.config.color;
                ctx.lineWidth = 1.5 / globalScale;
                ctx.globalAlpha = 0.2;
                ctx.stroke();
                
                ctx.globalAlpha = opacity;
              }

              // 1. White Node Base
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
              ctx.fillStyle = '#ffffff';
              // Disable heavy shadow during high zoom or many nodes for perf and visual clarity
              if (globalScale < 2) {
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 8;
              }
              ctx.fill();
              ctx.shadowBlur = 0;

              // Connected node glow
              if (isConnected) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI);
                ctx.strokeStyle = node.config.color;
                ctx.lineWidth = 2 / globalScale;
                ctx.globalAlpha = 0.5;
                ctx.stroke();
                ctx.globalAlpha = opacity;
              }

              // 2. Colored Border
              ctx.strokeStyle = node.config.color;
              ctx.lineWidth = isSelected ? 4 / globalScale : 2.5 / globalScale;
              ctx.stroke();

              // 3. Draw Emoji - Proportional to radius, NOT inversely proportional to zoom
              const emojiSize = radius * 1.1; 
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = `${emojiSize}px sans-serif`;
              ctx.fillText(node.config.emoji, node.x, node.y);

              // 4. Identification Pod (Below Node) - Keeps text readable size regardless of zoom
              const labelFontSize = Math.max(14 / globalScale, 3);
              if (globalScale > 0.4 || isHovered || isSelected || isConnected) {
                ctx.font = `600 ${labelFontSize}px "Inter", sans-serif`;
                ctx.fillStyle = node.config.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                const displayLabel = label.length > 20 ? label.substring(0, 20) + '...' : label;
                ctx.fillText(displayLabel, node.x, node.y + radius + (8 / globalScale));
              }

              ctx.globalAlpha = 1;
            }}
            nodePointerAreaPaint={(node, color, ctx) => {
              ctx.fillStyle = color;
              const radius = selectedNode?.id === node.id ? 36 : 30;
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            nodeCanvasObjectMode={() => 'replace'}
          />
        </div>

        {/* SIDEBARS - Conditionally render to avoid layout overflow */}
        {!selectedNode ? (
          <div className="w-80 flex flex-col gap-4 overflow-y-auto pr-1 animate-in slide-in-from-right duration-300">
            {/* ENTITY TYPES LEGEND */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-3xl shadow-xl">
              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 opacity-80 flex items-center justify-between">
                Entity Types
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono">{Object.keys(LABEL_CONFIG).length}</span>
              </h2>
              <div className="space-y-3">
                {Object.entries(LABEL_CONFIG).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all group cursor-default">
                    <div className="text-2xl transition-transform group-hover:scale-125 duration-300">{config.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-wider">{config.label}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{stats.types[key] || 0} discovered</p>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ background: config.color, color: config.color }}></div>
                  </div>
                ))}
              </div>
            </div>

            {/* TIPS PANEL */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-3 text-blue-400">
                <Info size={16} />
                <p className="text-xs font-black uppercase tracking-widest">Protocol Tips</p>
              </div>
              <ul className="text-[10px] space-y-2 text-slate-300/80 font-medium">
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-400 rounded-full"></div>Click nodes for deep profile analysis</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-400 rounded-full"></div>Hover to expose network connections</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-400 rounded-full"></div>Drag entities to reorganize topology</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-400 rounded-full"></div>Use scroll-wheel for granular zooming</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="w-[30rem] flex-shrink-0 bg-black/80 backdrop-blur-xl border-l border-white/10 p-8 shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
            {/* Header / Icon */}
            <div className="flex items-start justify-between mb-8">
              <div 
                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]"
                style={{ 
                  backgroundColor: `${selectedNode.config.color}15`,
                  borderColor: `${selectedNode.config.color}30`,
                  boxShadow: `0 0 30px ${selectedNode.config.color}20` 
                }}
              >
                <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                  {selectedNode.config.emoji}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedNode(null);
                  setSelectedNodeConnections([]);
                  setHighlightNodes(new Set());
                  setHighlightLinks(new Set());
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-white/10 hover:bg-white/10 text-slate-500 hover:text-white transition-all"
              >
                ✕
              </button>
            </div>

            {/* Title Section */}
            <div className="mb-10">
              <p className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-[0.3em] mb-3">
                Detailed_Analysis
              </p>
              <h3 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">
                {selectedNode.name}
              </h3>
            </div>

            {/* Properties Blocks */}
            <div className="space-y-4 mb-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Name</p>
                <p className="text-base font-semibold text-slate-200">{selectedNode.name}</p>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Type</p>
                <p className="text-base font-semibold text-slate-200">{selectedNode.config.label}</p>
              </div>
              {Object.entries(selectedNode.properties || {}).map(([key, value]) => (
                key !== 'case_id' && key !== 'name' && (
                  <div key={key} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      {key}
                    </p>
                    <p className="text-base font-semibold text-slate-200 break-words">
                      {String(value)}
                    </p>
                  </div>
                )
              ))}
            </div>

            {/* Validation Footer */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-10">
              <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-[0.2em]">Data_Validation</span>
              <span className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-[0.2em]">Secure</span>
            </div>

            {/* Connections Section */}
            <div className="border-t border-white/10 pt-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Network Connections
                </p>
                <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
                  {selectedNodeConnections.length} Connected
                </span>
              </div>

              {selectedNodeConnections.length > 0 ? (
                <div className="space-y-3">
                  {selectedNodeConnections.map((connection) => (
                    <div
                      key={connection.id}
                      className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-4 rounded-xl transition-all group cursor-pointer"
                    >
                      {/* Connection Header */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg">{connection.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {connection.label}
                          </p>
                          <p className="text-sm font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                            {connection.name}
                          </p>
                        </div>
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: connection.color }}
                        ></div>
                      </div>

                      {/* Link Type */}
                      <div className="bg-black/20 rounded-lg px-3 py-2 ml-7">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">
                          Relationship
                        </p>
                        <p className="text-xs font-mono font-bold text-blue-300">
                          {connection.linkType}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                  <p className="text-sm text-slate-400 italic">No connections found</p>
                </div>
              )}
            </div>

            {/* Advanced Graph Insights Generation */}
            <div className="mt-8 p-5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-400/30 rounded-2xl shadow-lg relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
               <div className="flex items-center gap-2 mb-3">
                 <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
                   <Network size={14} />
                 </div>
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                   AI Graph Insights
                 </p>
               </div>
               
               <p className="text-sm text-slate-300 leading-relaxed font-medium">
                 {selectedNodeConnections.length > 3 
                   ? `This ${selectedNode.config.label} acts as a central hub within the network, exhibiting ${selectedNodeConnections.length} direct relationships. High connectivity suggests a critical role in the investigation map.`
                   : selectedNodeConnections.length > 0
                     ? `This ${selectedNode.config.label} has direct associations with ${selectedNodeConnections.length} other entities. Further investigation of these immediate links is recommended.`
                     : `This ${selectedNode.config.label} currently appears isolated in the network graph with no established direct links.`}
               </p>
               
               {/* Activity Bar Chart Visualization (Mock) */}
               <div className="mt-4 flex items-end gap-1.5 h-10 opacity-70">
                 {[...Array(12)].map((_, i) => {
                    const h = Math.floor(Math.random() * 100) + 20;
                    return (
                      <div 
                        key={i} 
                        className="flex-1 bg-indigo-500/40 rounded-sm hover:bg-indigo-400 transition-colors"
                        style={{ height: `${h}%` }}
                      ></div>
                    );
                 })}
               </div>
               <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-2 text-center">Temporal Activity Signature</p>
            </div>

            {/* Case Association */}
            {selectedNode.properties?.case_id && (
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-400/30 rounded-2xl">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">
                  Associated Case
                </p>
                <p className="text-xs font-mono font-bold text-blue-200">
                  {selectedNode.properties.case_id}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper for rounded rectangles in canvas
function roundRect(ctx, x, y, width, height, radius) {
  if (typeof radius === 'undefined') radius = 5;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export default GraphExplorer;
