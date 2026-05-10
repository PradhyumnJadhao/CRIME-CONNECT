import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';

// Wait... the master prompt provides mock data
const graphData = {
  nodes: [
    { data: { id: "raju",   label: "Raju Singh",     type: "suspect",  riskScore: 94 } },
    { data: { id: "karim",  label: "Karim Khan",     type: "suspect",  riskScore: 87 } },
    { data: { id: "vikram", label: "Vikram Desai",   type: "suspect",  riskScore: 72 } },
    { data: { id: "bank",   label: "Koregaon Bank",  type: "location", riskScore: 0  } },
    { data: { id: "gun",    label: "AK-47 #KA-9821", type: "weapon",   riskScore: 0  } },
    { data: { id: "car",    label: "White Maruti",   type: "vehicle",  riskScore: 0  } },
    { data: { id: "phone",  label: "+91-9876543210", type: "phone",    riskScore: 0  } },
    { data: { id: "victim", label: "Anand Sharma",   type: "victim",   riskScore: 0  } },
    { data: { id: "fir1",   label: "FIR #1042",      type: "document", riskScore: 0  } },
    { data: { id: "fir2",   label: "FIR #1055",      type: "document", riskScore: 0  } },
  ],
  edges: [
    { data: { source: "raju",  target: "bank",  label: "was_at" } },
    { data: { source: "raju",  target: "gun",   label: "used" } },
    { data: { source: "raju",  target: "karim", label: "called" } },
    { data: { source: "raju",  target: "victim",label: "attacked" } },
    { data: { source: "raju",  target: "phone", label: "owns" } },
    { data: { source: "karim", target: "bank",  label: "spotted_near" } },
    { data: { source: "karim", target: "car",   label: "drove" } },
    { data: { source: "vikram",target: "gun",   label: "supplied" } },
    { data: { source: "fir1",  target: "raju",  label: "mentions" } },
    { data: { source: "fir2",  target: "vikram",label: "mentions" } },
    { data: { source: "car",   target: "bank",  label: "getaway_vehicle" } },
    { data: { source: "phone", target: "karim", label: "last_contact" } },
  ]
};

const DemoSection = () => {
  const cyRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Suspects', 'Locations', 'Weapons'];

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: graphData,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': '#ffffff', 
            'font-family': 'Inter, sans-serif',
            'font-size': '12px',
            'font-weight': '600',
            'text-valign': 'bottom',
            'text-margin-y': 8,
            'background-color': (ele) => {
              const type = ele.data('type');
              if(type === 'suspect') return '#ef4444'; // red
              if(type === 'location') return '#00d4ff'; // cyan
              if(type === 'weapon') return '#f59e0b'; // amber
              if(type === 'victim') return '#a78bfa'; // violet
              if(type === 'phone') return '#f97316'; // orange
              return '#64748b'; // doc
            },
            'width': 35,
            'height': 35,
            'border-width': 2,
            'border-color': 'rgba(255,255,255,0.8)',
            'shape': 'ellipse',
            'underlay-color': (ele) => {
               const type = ele.data('type');
               if(type === 'suspect') return 'rgba(239, 68, 68, 0.4)'; 
               if(type === 'location') return 'rgba(0, 212, 255, 0.4)'; 
               if(type === 'weapon') return 'rgba(245, 158, 11, 0.4)';
               return 'rgba(139, 92, 246, 0.2)'; 
            },
            'underlay-padding': 10,
            'underlay-opacity': 1,
            'underlay-shape': 'ellipse'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#00d4ff',
            'line-opacity': 0.4,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#00d4ff',
            'line-style': 'dashed',
            'line-dash-pattern': [6, 6],
            'label': 'data(label)',
            'font-family': 'Inter, sans-serif',
            'font-size': '9px',
            'font-weight': '500',
            'color': '#00d4ff',
            'text-background-color': '#060b14',
            'text-background-opacity': 0.9,
            'text-background-padding': 3,
            'text-background-shape': 'roundrectangle'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#ffffff',
            'underlay-padding': 16,
          }
        },
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.15
          }
        }
      ],
      layout: {
        name: 'cose', 
      },
      userZoomingEnabled: false,
    });
    
    // Switch layout
    cy.layout({ 
      name: 'cose', 
      animate: false, 
      componentSpacing: 100, 
      nodeRepulsion: 400000, 
      nodeOverlap: 20,
      idealEdgeLength: 100,
      edgeElasticity: 100 
    }).run();
    cyRef.current = cy;

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      setSelectedNode(node.data());
      
      // Highlight connections
      cy.elements().addClass('dimmed');
      node.removeClass('dimmed');
      node.connectedEdges().removeClass('dimmed');
      node.connectedEdges().connectedNodes().removeClass('dimmed');
    });

    cy.on('tap', (evt) => {
      if(evt.target === cy){
        setSelectedNode(null);
        cy.elements().removeClass('dimmed');
      }
    });

    return () => {
      if (cy) cy.destroy();
    };
  }, []);

  // Handle filtering
  useEffect(() => {
    if(!cyRef.current) return;
    const cy = cyRef.current;
    
    cy.elements().removeClass('dimmed');
    
    if (activeFilter !== 'All') {
      const filterType = activeFilter.toLowerCase().slice(0, -1); // e.g. "Suspects" -> "suspect"
      cy.nodes().forEach(node => {
        if(node.data('type') !== filterType) {
          node.addClass('dimmed');
        }
      });
    }
  }, [activeFilter]);

  return (
    <section id="demo" className="relative z-10 py-24">
      <div className="w-full max-w-[1000px] mx-auto px-6">
        
        <div className="text-center mb-16">
          <h2 className="font-display font-bold text-[clamp(28px,4vw,48px)] text-gradient mb-4">
            See It In Action
          </h2>
        </div>

        {/* Demo Window */}
        <div className="bg-bg-card backdrop-blur-[30px] border border-violet-border/60 rounded-2xl overflow-hidden shadow-[0_40px_120px_rgba(139,92,246,0.15)] flex flex-col">
          
          {/* Top Bar */}
          <div className="h-12 bg-bg-deep/95 border-b border-violet-border/50 flex items-center px-5">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-semantic-danger"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-semantic-success"></div>
            </div>
            <div className="mx-auto font-mono text-[12px] text-text-placeholder">
              crime-connect — investigation mode
            </div>
            <div className="font-mono text-[10px] text-semantic-success flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-semantic-success animate-blink"></span>
              LIVE
            </div>
          </div>

          <div className="flex h-[600px] relative">
            {/* Graph Canvas Component */}
            <div ref={containerRef} className="flex-1 bg-[#0a0810]/50" />

            {/* Slide-in Info Panel */}
            <div className={`absolute right-0 top-0 bottom-0 bg-bg-deep/95 border-l border-violet-border/50 backdrop-blur-md transition-transform duration-300 ease-out flex flex-col p-6 w-[280px]
              ${selectedNode ? 'translate-x-0' : 'translate-x-full'}`}>
              
              {selectedNode && (
                <>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-[#a78bfa] mb-2 px-2 py-1 bg-violet-glow/20 rounded-md inline-block w-fit">
                    {selectedNode.type}
                  </div>
                  <h3 className="font-display font-bold text-[20px] text-text-main mb-6">
                    {selectedNode.label}
                  </h3>
                  
                  {selectedNode.riskScore > 0 && (
                    <div className="mb-6">
                      <div className="font-mono text-[10px] text-text-placeholder mb-1">RISK SCORE</div>
                      <div className="text-amber-500 font-display font-bold text-2xl">{selectedNode.riskScore}/100</div>
                    </div>
                  )}

                  <div className="font-mono text-[11px] text-text-muted leading-relaxed mb-8 flex-1">
                    Node ID: {selectedNode.id} <br/>
                    Linked FIRs: 2 <br/>
                    Connected Entities: Data active
                  </div>

                  <button className="interactive w-full py-3 rounded-xl bg-grad-gold text-[#0e0b14] font-display font-semibold transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                    Investigate &rarr;
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="h-16 bg-[#0e0b14]/80 border-t border-violet-border/50 flex items-center gap-3 px-5">
            <span className="font-mono text-[10px] text-text-placeholder mr-2">FILTERS:</span>
            {filters.map(f => (
              <button 
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`interactive px-4 py-1.5 rounded-md font-body text-[13px] transition-colors border ${
                  activeFilter === f 
                  ? 'bg-amber-glow/20 border-amber-border text-amber-500' 
                  : 'bg-transparent border-violet-border/30 text-text-muted hover:border-violet-border hover:text-violet-light'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default DemoSection;
