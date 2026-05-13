import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
    X, Trash2, Download, Layers, MousePointer2, Ruler, 
    Maximize, Minimize, Map as MapIcon, Info, CheckCircle2,
    AlertCircle, Activity, Crosshair, Search, LocateFixed, Globe,
    Navigation, MapPin, List, Save, Eye, EyeOff, Edit3, Settings, AlertTriangle, Undo2, RefreshCcw, Zap, Compass,
    ChevronDown, ChevronRight, ChevronUp, Folder, FolderOpen, GripVertical, Plus, Archive
} from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

const FeoShapefileMap = ({ onClose }) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const drawItemsRef = useRef(null);
    const vertexMarkersRef = useRef([]);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [measurement, setMeasurement] = useState({ area: 0, perimeter: 0 });
    // Removed unused isSidebarOpen state
    const [undoStack, setUndoStack] = useState([]);
    const undoStackRef = useRef([]);
    const [isEditingMap, setIsEditingMap] = useState(false);
    const [isVisualEditing, setIsVisualEditing] = useState(false);
    
    // Keep undoStackRef in sync
    useEffect(() => { undoStackRef.current = undoStack; }, [undoStack]);
    const [isMeasuringDistance, setIsMeasuringDistance] = useState(false);
    const [selectedBulkIds, setSelectedBulkIds] = useState([]);
    const [bulkFolderModal, setBulkFolderModal] = useState(false);
    const [bulkTargetFolder, setBulkTargetFolder] = useState('');
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [showAttributeModal, setShowAttributeModal] = useState(false);
    const editHandlerRef = useRef(null);
    const isMeasuringRef = useRef(false);
    const selectedPolyRef = useRef(null);
    
    // Sync refs for leaflet events
    const savedPolygonsRef = useRef([]);
    const [isCollectionOpen, setIsCollectionOpen] = useState(true);
    const [activeLayer, setActiveLayer] = useState('Satellite');
    const [cursorCoords, setCursorCoords] = useState({ lat: 0, lng: 0 });
    const [lastActionStatus, setLastActionStatus] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAllTrails, setShowAllTrails] = useState(true);
    const [openFolders, setOpenFolders] = useState(['Ungrouped']);
    const [editingFolder, setEditingFolder] = useState(null);
    const [newFolderName, setNewFolderName] = useState('');
    const preEditStateRef = useRef([]);
    const [importTargetFolder, setImportTargetFolder] = useState('');
    
    // Database State
    const [savedPolygons, setSavedPolygons] = useState([]);
    const [selectedPolygon, setSelectedPolygon] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [newPolyName, setNewPolyName] = useState('');
    const [currentDrawnLayer, setCurrentDrawnLayer] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const THEME_COLOR = '#3b82f6';

    const hierarchicalFolders = useMemo(() => {
        const root = { folders: {}, polygons: [], path: '' };
        const term = searchQuery.toLowerCase().trim();
        
        savedPolygons.forEach(poly => {
            const matchesSearch = !term || 
                (poly.name?.toLowerCase().includes(term)) ||
                (poly.folder?.toLowerCase().includes(term)) ||
                (poly.attributes && Object.values(poly.attributes).some(v => String(v).toLowerCase().includes(term)));

            if (!matchesSearch) return;

            const folderPath = poly.folder || 'Ungrouped';
            const parts = folderPath.split(' / ').map(p => p.trim()).filter(Boolean);
            
            let current = root;
            let currentPath = '';
            parts.forEach(part => {
                currentPath = currentPath ? `${currentPath} / ${part}` : part;
                if (!current.folders[part]) {
                    current.folders[part] = { name: part, folders: {}, polygons: [], path: currentPath };
                }
                current = current.folders[part];
            });
            current.polygons.push(poly);
        });
        
        return root;
    }, [savedPolygons, searchQuery]);

    const renderPolygonItem = (poly) => {
        // Detect corrupted coordinates (stored as arrays-of-arrays from bad import)
        // OR out-of-bounds coordinates (Projected data saved as Lat/Lng)
        const firstCoord = poly.coordinates?.[0];
        const isCorrupted = !firstCoord || (
            Array.isArray(firstCoord)
                ? (isNaN(Number(firstCoord[1])) || isNaN(Number(firstCoord[0])))
                : (isNaN(Number(firstCoord.lat)) || isNaN(Number(firstCoord.lng)) || Array.isArray(firstCoord.lat) || Math.abs(firstCoord.lat) > 90 || Math.abs(firstCoord.lng) > 180)
        );

        // Safe center for setView — fallback for corrupted
        const safeCenter = (() => {
            if (!firstCoord) return { lat: 9.83, lng: 118.73 };
            if (Array.isArray(firstCoord)) return { lat: Number(firstCoord[1]), lng: Number(firstCoord[0]) };
            if (Array.isArray(firstCoord.lat)) return { lat: 9.83, lng: 118.73 };
            return { lat: Number(firstCoord.lat), lng: Number(firstCoord.lng) };
        })();
        const isSafeCenter = !isNaN(safeCenter.lat) && !isNaN(safeCenter.lng);

        return (
            <div 
                key={poly.id} 
                draggable={!isCorrupted}
                onDragStart={(e) => handleDragStart(e, poly.id)}
                onClick={() => { 
                    setSelectedPolygon(poly); 
                    if (isSafeCenter) mapRef.current.setView(safeCenter, 15);
                }}
                className="poly-list-item" 
                style={{ 
                    padding: '0.6rem 0.75rem', borderRadius: '10px',
                    background: isCorrupted ? 'rgba(239,68,68,0.08)' : selectedPolygon?.id === poly.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isCorrupted ? 'rgba(239,68,68,0.4)' : selectedPolygon?.id === poly.id ? '#3b82f6' : 'rgba(255,255,255,0.05)'}`,
                    cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem'
                }}
            >
                <GripVertical size={14} style={{ opacity: 0.3, cursor: 'grab' }} onMouseDown={(e) => e.stopPropagation()} />
                <input 
                    type="checkbox" 
                    checked={selectedBulkIds.includes(poly.id)}
                    onChange={(e) => {
                        e.stopPropagation();
                        setSelectedBulkIds(prev => e.target.checked ? [...prev, poly.id] : prev.filter(id => id !== poly.id));
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex-between">
                        <span style={{ fontWeight: 700, fontSize: '0.8rem', color: isCorrupted ? '#fca5a5' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>{poly.name}</span>
                        <div className="flex-center gap-1">
                            {!isCorrupted && (
                                <button onClick={(e) => { e.stopPropagation(); toggleVisibility(poly); }} style={{ background: 'none', border: 'none', color: poly.visible ? '#34d399' : '#666', padding: '2px' }}>
                                    {poly.visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                                </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); deletePolygon(poly); }} style={{ background: 'none', border: 'none', color: '#ef4444', padding: '2px' }} title="Delete">
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: isCorrupted ? '#f87171' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isCorrupted
                                ? <><span>⚠</span><span>CORRUPTED — delete &amp; re-import</span></>
                                : poly.geometryType === 'polyline' ? 'Trail' : `${(poly.area / 10000).toFixed(3)} HA`
                            }
                        </div>
                        {poly.attributes && Object.keys(poly.attributes).length > 0 && (
                            <div style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '1px 5px', borderRadius: '4px', fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.5px' }}>ARCGIS DATA</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Sync state to refs for Leaflet event handlers
    useEffect(() => { savedPolygonsRef.current = savedPolygons; }, [savedPolygons]);
    useEffect(() => { selectedPolyRef.current = selectedPolygon; }, [selectedPolygon]);
    useEffect(() => { isMeasuringRef.current = isMeasuringDistance; }, [isMeasuringDistance]);

    // Load Leaflet and its plugins via CDN
    useEffect(() => { 
        console.log('[FEO] Component Mounted. GIS Engine Ready.');
        setMapLoaded(true);
    }, []);

    // Firestore + LocalStorage Listener
    useEffect(() => {
        const q = query(collection(db, 'feo_polygons'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const firestorePolygons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'cloud' }));
            // Get local fallback data
            const localData = JSON.parse(localStorage.getItem('feo_polygons_local') || '[]');
            setSavedPolygons([...firestorePolygons, ...localData]);
        }, (err) => {
            console.warn("Firestore access error, switching to local only", err);
            const localData = JSON.parse(localStorage.getItem('feo_polygons_local') || '[]');
            setSavedPolygons(localData);
        });
        return () => unsubscribe();
    }, []);

    const initializeMap = useCallback(() => {
        if (!mapLoaded || !mapContainerRef.current || mapRef.current) return;

        const L = window.L;
        const palawanCenter = [9.8349, 118.7384];
        
        const map = L.map(mapContainerRef.current, {
            center: palawanCenter, 
            zoom: 9, 
            zoomControl: false, 
            attributionControl: false,
            maxZoom: 22 // Allow deeper zoom with upscaling
        });
        mapRef.current = map;

        // Base Layers - Upgraded to Google Hybrid for High-Res Zoom
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxNativeZoom: 19, maxZoom: 22 });
        const satellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { 
            maxNativeZoom: 20, 
            maxZoom: 22,
            attribution: '© Google Maps'
        });
        const terrain = L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', { maxNativeZoom: 20, maxZoom: 22 });
        const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxNativeZoom: 20, maxZoom: 22 });

        satellite.addTo(map);
        mapRef.current.baseLayers = { "Satellite": satellite, "Terrain": terrain, "Street": osm, "Dark": dark };

        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
        drawItemsRef.current = drawnItems;

        if (window.L.Draw && window.L.Draw.Event) {
            mapRef.current.on(window.L.Draw.Event.CREATED, async function (e) {
                const layer = e.layer;
                
                // Handle Visual Distance Measurement
                if (e.layerType === 'polyline' && isMeasuringRef.current) {
                    const rawLatLngs = layer.getLatLngs();
                    let lengthMeters = 0;
                    for (let i = 0; i < rawLatLngs.length - 1; i++) {
                        lengthMeters += rawLatLngs[i].distanceTo(rawLatLngs[i+1]);
                    }
                    const roundedDistance = Math.round(lengthMeters);
                    
                    if (selectedPolyRef.current) {
                        const poly = selectedPolyRef.current;
                        const trailCoords = rawLatLngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));

                        // Update the parent polygon with both distance and coordinates
                        const updatedData = { 
                            distanceToRoad: roundedDistance,
                            distanceLineCoords: trailCoords
                        };

                        setSavedPolygons(prev => prev.map(p => p.id === poly.id ? {...p, ...updatedData} : p));
                        setSelectedPolygon({...poly, ...updatedData});
                        await updateDoc(doc(db, 'feo_polygons', poly.id), updatedData);
                        
                        setLastActionStatus(`Distance ${roundedDistance}m set visually!`);
                    }
                    setIsMeasuringDistance(false);
                    isMeasuringRef.current = false;
                    return; 
                }

                // Normal Polygon/Trail Drawing
                drawItemsRef.current.addLayer(layer);
                
                setCurrentDrawnLayer(layer);
                setNewPolyName('');
                setShowSaveModal(true);
                calculateStats();
            });

            map.on(window.L.Draw.Event.EDITSTART, () => {
                // Capture old state for UNDO before real-time edits change it
                preEditStateRef.current = JSON.parse(JSON.stringify(savedPolygonsRef.current));
            });

            map.on(window.L.Draw.Event.EDITED, async (e) => {
                const layers = e.layers;
                const changes = [];
                
                for (const layerId in layers._layers) {
                    const layer = layers._layers[layerId];
                    const dbId = layer.options.dbId;
                    if (!dbId) continue;

                    const rawLatLngs = layer.getLatLngs();
                    const isPolygon = Array.isArray(rawLatLngs[0]);
                    const flatLatLngs = isPolygon ? rawLatLngs[0] : rawLatLngs;
                    const latlngs = flatLatLngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
                    const area = isPolygon ? window.L.GeometryUtil.geodesicArea(flatLatLngs) : 0;
                    
                    const oldPoly = preEditStateRef.current.find(p => p.id === dbId);
                    if (oldPoly) changes.push({ action: 'edit', oldData: oldPoly });

                    if (selectedPolyRef.current && selectedPolyRef.current.id === dbId) {
                        setSelectedPolygon(prev => ({...prev, coordinates: latlngs, area}));
                    }
                    setSavedPolygons(prev => prev.map(p => p.id === dbId ? {...p, coordinates: latlngs, area} : p));
                    await updateDoc(doc(db, 'feo_polygons', dbId), { coordinates: latlngs, area });
                }
                
                if (changes.length > 0) {
                    setUndoStack(prev => [...prev, ...changes]);
                    setLastActionStatus('Polygon edited visually! Undo available.');
                }
                calculateStats();
            });

            const syncDataForLayer = (layer) => {
                if (!layer) return;
                const dbId = layer.options.dbId;
                if (!dbId) return;
                
                const rawLatLngs = layer.getLatLngs();
                const isPolygon = Array.isArray(rawLatLngs[0]);
                const flatLatLngs = isPolygon ? rawLatLngs[0] : rawLatLngs;
                const latlngs = flatLatLngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
                const area = isPolygon ? window.L.GeometryUtil.geodesicArea(flatLatLngs) : 0;
                
                if (selectedPolyRef.current && selectedPolyRef.current.id === dbId) {
                    setSelectedPolygon(prev => ({...prev, coordinates: latlngs, area}));
                }
                setSavedPolygons(prev => prev.map(p => p.id === dbId ? {...p, coordinates: latlngs, area} : p));
                calculateStats();
            };

            map.on('draw:editvertex', async (e) => {
                syncDataForLayer(e.poly);
            });

            // Handle REAL-TIME markers during drag
            map.on('draw:editstart', () => {
                setTimeout(() => {
                    drawnItems.eachLayer(layer => {
                        if (layer.editing && layer.editing._markerGroup) {
                            layer.editing._markerGroup.eachLayer(marker => {
                                // Use direct listener for maximum responsiveness
                                marker.on('drag', () => {
                                    const dbId = layer.options.dbId;
                                    if (!dbId) return;
                                    const rawLatLngs = layer.getLatLngs();
                                    const isPolygon = Array.isArray(rawLatLngs[0]);
                                    const flatLatLngs = isPolygon ? rawLatLngs[0] : rawLatLngs;
                                    const latlngs = flatLatLngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
                                    const area = isPolygon ? window.L.GeometryUtil.geodesicArea(flatLatLngs) : 0;
                                    
                                    // Update Ref immediately for other calculations
                                    if (selectedPolyRef.current && selectedPolyRef.current.id === dbId) {
                                        setSelectedPolygon(prev => ({...prev, coordinates: latlngs, area}));
                                    }
                                    setSavedPolygons(prev => prev.map(p => p.id === dbId ? {...p, coordinates: latlngs, area} : p));
                                });
                            });
                        }
                    });
                }, 200);
            });

            map.on(window.L.Draw.Event.DELETED, async (e) => {
                const layers = e.layers;
                const changes = [];
                for (const layerId in layers._layers) {
                    const layer = layers._layers[layerId];
                    const dbId = layer.options.dbId;
                    if (!dbId) continue;
                    
                    const oldPoly = savedPolygonsRef.current.find(p => p.id === dbId);
                    if (oldPoly) changes.push({ action: 'delete', oldData: oldPoly });
                    
                    await deleteDoc(doc(db, 'feo_polygons', dbId));
                }
                if (changes.length > 0) {
                    setUndoStack(prev => [...prev, ...changes]);
                    setLastActionStatus('Polygon deleted. Undo available.');
                }
                calculateStats();
            });
            
            // Map interaction handling
            mapRef.current.on('draw:drawstart', () => setIsEditingMap(true));
            mapRef.current.on('draw:drawstop', () => {
                setIsEditingMap(false);
                setIsMeasuringDistance(false);
                isMeasuringRef.current = false; // Fix: Reset ref on stop
            });
            mapRef.current.on('draw:editstart', () => setIsEditingMap(true));
            mapRef.current.on('draw:editstop', () => setIsEditingMap(false));
            mapRef.current.on('draw:deletestart', () => setIsEditingMap(true));
            mapRef.current.on('draw:deletestop', () => setIsEditingMap(false));
            
            // Expose edit handler
            if (window.L.EditToolbar && window.L.EditToolbar.Edit) {
                editHandlerRef.current = new window.L.EditToolbar.Edit(map, {
                    featureGroup: drawnItems
                });
            }

            // Draw Controls
            if (window.L.Control && window.L.Control.Draw) {
                const drawControl = new window.L.Control.Draw({
                    edit: { featureGroup: drawnItems },
                    draw: {
                        polygon: {
                            allowIntersection: false,
                            drawError: { color: '#e1e100', message: '<strong>Error:</strong> Polygon edges cannot cross!' },
                            shapeOptions: { color: '#3b82f6', fillOpacity: 0.2, weight: 2 }
                        },
                        polyline: { shapeOptions: { color: '#ef4444', weight: 3 } },
                        rectangle: false, circle: false, marker: false, circlemarker: false
                    }
                });
                map.addControl(drawControl);
            }
        } // End of if (window.L.Draw)

        map.on('mousemove', (e) => setCursorCoords({ lat: e.latlng.lat, lng: e.latlng.lng }));
        L.control.zoom({ position: 'bottomright' }).addTo(map);

    }, [mapLoaded, savedPolygons.length]);

    useEffect(() => { if (mapLoaded) initializeMap(); }, [mapLoaded, initializeMap]);

    // Sync saved polygons to map
    useEffect(() => {
        if (!mapRef.current || !drawItemsRef.current || !window.L || !mapLoaded) return;
        
        // CRITICAL: DO NOT SYNC while editing or measuring!
        // This prevents the map from clearing layers while the user is dragging vertices.
        if (isVisualEditing || isMeasuringRef.current || isEditingMap) {
            console.log('[GIS] Sync skipped: Active Editing Session');
            return;
        }

        const L = window.L;
        const drawnItems = drawItemsRef.current;
        console.log('[GIS] Updating map layers. Saved count:', savedPolygons.length);
        
        // Track existing IDs to avoid flickering if possible, but simpler to clear and re-add 
        // if we want perfect sync with visibility
        drawnItems.clearLayers();

        // Normalize a single coordinate: handles {lat,lng} objects OR [lng,lat,z?] arrays
        const normCoord = (c) => {
            if (Array.isArray(c)) return { lat: Number(c[1]), lng: Number(c[0]) };
            return { lat: Number(c.lat), lng: Number(c.lng) };
        };
        const normCoords = (arr) => (arr || [])
            .map(normCoord)
            .filter(c => !isNaN(c.lat) && !isNaN(c.lng) && isFinite(c.lat) && isFinite(c.lng));

        savedPolygons.forEach(poly => {
            const gType = (poly.geometryType || '').toLowerCase();
            // Expanded support for trail variants
            const isTrail = gType === 'polyline' || gType === 'linestring' || gType === 'path' || gType === 'trail';
            const isSelected = selectedPolygon && selectedPolygon.id === poly.id;
            
            // Log for debugging if trails are missing
            if (isTrail) console.log(`[GIS] Processing Trail: ${poly.name}, showAll: ${showAllTrails}, isSelected: ${isSelected}`);

            if (isTrail && !showAllTrails && !isSelected) return;
            if (poly.visible === false) return;

            // Normalize & validate coordinates — skip silently if corrupted
            const safeCoords = normCoords(poly.coordinates);
            if (safeCoords.length < 2) {
                console.warn(`[GIS] Skipping corrupted polygon: "${poly.name}" (${poly.id})`);
                return;
            }

            try {
                const layer = isTrail
                    ? L.polyline(safeCoords, {
                        color: poly.color || '#ef4444',
                        weight: 5,
                        dbId: poly.id,
                        className: 'gis-trail-layer'
                    })
                    : L.polygon(safeCoords, {
                        color: poly.color || '#3b82f6',
                        fillColor: poly.color || '#3b82f6',
                        fillOpacity: 0.2,
                        weight: 2,
                        dbId: poly.id
                    });
                
                // Render internal distance line if exists
                if (!isTrail && poly.distanceLineCoords && poly.distanceLineCoords.length > 0 && showAllTrails) {
                    const safeDistCoords = normCoords(poly.distanceLineCoords);
                    if (safeDistCoords.length >= 2) {
                        L.polyline(safeDistCoords, {
                            color: '#ef4444',
                            weight: 2,
                            dashArray: '5, 8',
                            interactive: false
                        }).addTo(drawnItems);
                    }
                }

                layer.addTo(drawnItems);
                if (isTrail) layer.bringToFront();

                layer.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    setSelectedPolygon(poly);
                });
            } catch (err) {
                console.error(`[GIS] Failed to draw "${poly.name}": ${err.message}`);
            }
        });
    }, [savedPolygons, mapLoaded, showAllTrails, selectedPolygon, isVisualEditing, isEditingMap]);

    // Vertex Marker Visualization
    useEffect(() => {
        if (!mapRef.current || !window.L) return;
        const L = window.L;
        
        // Clear old markers
        vertexMarkersRef.current.forEach(m => mapRef.current.removeLayer(m));
        vertexMarkersRef.current = [];

        if (selectedPolygon && !isEditingMap) {
            selectedPolygon.coordinates.forEach((coord, idx) => {
                // Normalize in case coord is a raw array from old import
                const c = Array.isArray(coord)
                    ? { lat: Number(coord[1]), lng: Number(coord[0]) }
                    : { lat: Number(coord.lat), lng: Number(coord.lng) };
                if (isNaN(c.lat) || isNaN(c.lng)) return; // skip corrupted vertex

                try {
                    const marker = L.circleMarker(c, {
                        radius: 5,
                        color: '#fff',
                        weight: 1,
                        fillColor: '#3b82f6',
                        fillOpacity: 0.9,
                        pane: 'markerPane'
                    }).addTo(mapRef.current);
                    
                    marker.bindTooltip(`Point ${idx + 1}<br/>${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`, {
                        permanent: false, direction: 'top'
                    });
                    
                    vertexMarkersRef.current.push(marker);
                } catch (err) { /* skip bad vertex */ }
            });
        }
    }, [selectedPolygon, isEditingMap]);

    const toggleFolder = (folder) => {
        setOpenFolders(prev => prev.includes(folder) ? prev.filter(f => f !== folder) : [...prev, folder]);
    };

    const handleDragStart = (e, polyId) => {
        e.dataTransfer.setData('polyId', polyId);
    };

    const handleDropOnFolder = async (e, folderName) => {
        e.preventDefault();
        const polyId = e.dataTransfer.getData('polyId');
        if (!polyId) return;
        
        const poly = savedPolygons.find(p => p.id === polyId);
        if (poly && poly.folder !== folderName) {
            const updatedPoly = { ...poly, folder: folderName };
            setSavedPolygons(prev => prev.map(p => p.id === polyId ? updatedPoly : p));
            if (poly.source === 'cloud') {
                await updateDoc(doc(db, 'feo_polygons', polyId), { folder: folderName });
            } else {
                const localData = JSON.parse(localStorage.getItem('feo_polygons_local') || '[]');
                const newLocal = localData.map(p => p.id === polyId ? updatedPoly : p);
                localStorage.setItem('feo_polygons_local', JSON.stringify(newLocal));
            }
            setLastActionStatus(`Moved ${poly.name} to ${folderName}`);
        }
    };

    const renameFolder = async (oldName, newName) => {
        if (!newName || oldName === newName) { setEditingFolder(null); return; }
        const affectedPolys = savedPolygons.filter(p => (p.folder || 'Ungrouped') === oldName);
        
        for (const poly of affectedPolys) {
            if (poly.source === 'cloud') {
                await updateDoc(doc(db, 'feo_polygons', poly.id), { folder: newName });
            } else {
                const localData = JSON.parse(localStorage.getItem('feo_polygons_local') || '[]');
                const newLocal = localData.map(p => p.id === poly.id ? {...p, folder: newName} : p);
                localStorage.setItem('feo_polygons_local', JSON.stringify(newLocal));
            }
        }
        setSavedPolygons(prev => prev.map(p => (p.folder || 'Ungrouped') === oldName ? {...p, folder: newName} : p));
        setOpenFolders(prev => prev.map(f => f === oldName ? newName : f));
        setEditingFolder(null);
        setLastActionStatus(`Folder renamed to ${newName}`);
    };

    const deleteFolder = async (folderName) => {
        const affectedPolys = savedPolygons.filter(p => (p.folder || 'Ungrouped') === folderName);
        setConfirmDialog({
            message: `Delete folder "${folderName}" and all ${affectedPolys.length} polygons inside it?`,
            onConfirm: async () => {
                for (const poly of affectedPolys) {
                    if (poly.source === 'cloud') {
                        await deleteDoc(doc(db, 'feo_polygons', poly.id));
                    } else {
                        const localData = JSON.parse(localStorage.getItem('feo_polygons_local') || '[]');
                        const newLocal = localData.filter(p => p.id !== poly.id);
                        localStorage.setItem('feo_polygons_local', JSON.stringify(newLocal));
                    }
                }
                setSavedPolygons(prev => prev.filter(p => (p.folder || 'Ungrouped') !== folderName));
                setLastActionStatus(`Folder "${folderName}" deleted.`);
            }
        });
    };

    const handleUndo = async () => {
        if (undoStackRef.current.length === 0) return;
        const lastAction = undoStackRef.current[undoStackRef.current.length - 1];
        
        try {
            if (lastAction.action === 'edit') {
                await updateDoc(doc(db, 'feo_polygons', lastAction.oldData.id), lastAction.oldData);
                setLastActionStatus('Edit undone!');
            } else if (lastAction.action === 'delete') {
                await setDoc(doc(db, 'feo_polygons', lastAction.oldData.id), lastAction.oldData);
                setLastActionStatus('Polygon restored!');
            }
            
            setUndoStack(prev => prev.slice(0, -1));
        } catch (err) {
            console.error("Undo failed:", err);
            setLastActionStatus('Failed to undo action.');
        }
    };

    // Global Undo Hotkey
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    handleUndo();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const calculateStats = () => {
        if (!drawItemsRef.current) return;
        let totalArea = 0; let totalPerimeter = 0;
        drawItemsRef.current.getLayers().forEach(layer => {
            if (layer instanceof window.L.Polygon) {
                const latlngs = layer.getLatLngs()[0];
                totalArea += window.L.GeometryUtil.geodesicArea(latlngs);
                for (let i = 0; i < latlngs.length; i++) {
                    totalPerimeter += latlngs[i].distanceTo(latlngs[(i + 1) % latlngs.length]);
                }
            }
        });
        setMeasurement({ area: totalArea, perimeter: totalPerimeter });
    };

    const handleSavePolygon = async () => {
        if (!currentDrawnLayer || !newPolyName.trim()) return;
        setIsSaving(true);
        
        const isPolyline = !(currentDrawnLayer instanceof window.L.Polygon);
        const geometryType = isPolyline ? 'polyline' : 'polygon';
        
        // Corrected coordinate extraction for both Polygons and Polylines
        const rawLatLngs = currentDrawnLayer.getLatLngs();
        const latlngs = (Array.isArray(rawLatLngs[0]) ? rawLatLngs[0] : rawLatLngs).map(ll => ({ lat: ll.lat, lng: ll.lng }));
            
        const area = geometryType === 'polyline' ? 0 : window.L.GeometryUtil.geodesicArea(latlngs.map(l => window.L.latLng(l.lat, l.lng)));
        
        const polyData = {
            name: newPolyName,
            coordinates: latlngs,
            area: area,
            createdAt: Date.now(),
            visible: true,
            color: geometryType === 'polyline' ? '#ef4444' : '#3b82f6',
            geometryType: geometryType,
            folder: 'Ungrouped'
        };

        try {
            const docRef = await addDoc(collection(db, 'feo_polygons'), polyData);
            currentDrawnLayer.options.dbId = docRef.id;
            currentDrawnLayer.on('click', () => setSelectedPolygon({ id: docRef.id, ...polyData }));
            setLastActionStatus('Polygon synchronized with cloud');
        } catch (err) {
            console.error("Critical Save Failure:", err);
            setLastActionStatus('Failed to sync. Check connection.');
        } finally {
            setIsSaving(false);
            setShowSaveModal(false);
            setCurrentDrawnLayer(null);
            setNewPolyName('');
            setTimeout(() => setLastActionStatus(''), 4000);
        }
    };

    const deletePolygon = async (poly) => {
        setConfirmDialog({
            message: `Are you sure you want to delete ${poly.name}?`,
            onConfirm: async () => {
                try {
                    if (poly.source === 'cloud') {
                        await deleteDoc(doc(db, 'feo_polygons', poly.id));
                    } else {
                        const localData = JSON.parse(localStorage.getItem('feo_polygons_local') || '[]');
                        const filtered = localData.filter(p => p.id !== poly.id);
                        localStorage.setItem('feo_polygons_local', JSON.stringify(filtered));
                        setSavedPolygons(prev => prev.filter(p => p.id !== poly.id));
                    }
                    const layer = drawItemsRef.current.getLayers().find(l => l.options.dbId === poly.id);
                    if (layer) drawItemsRef.current.removeLayer(layer);
                    
                    setUndoStack(prev => [...prev, { action: 'delete', oldData: poly }]);
                    setLastActionStatus('Polygon deleted. Undo available.');
                    if (selectedPolygon?.id === poly.id) setSelectedPolygon(null);
                } catch (err) {
                    setLastActionStatus('Delete failed');
                }
                setTimeout(() => setLastActionStatus(''), 3000);
            }
        });
    };

    const toggleVisibility = (poly) => {
        const newVisible = !poly.visible;
        setSavedPolygons(prev => prev.map(p => p.id === poly.id ? {...p, visible: newVisible} : p));
        const layer = drawItemsRef.current.getLayers().find(l => l.options.dbId === poly.id);
        if (layer) {
            if (newVisible) layer.addTo(mapRef.current);
            else mapRef.current.removeLayer(layer);
        }
    };

    const locateMe = () => {
        if (!mapRef.current || !window.L) return;
        setLastActionStatus('Locating...');
        mapRef.current.locate({ setView: true, maxZoom: 16 });
        mapRef.current.on('locationfound', () => setLastActionStatus('Location found'));
        mapRef.current.on('locationerror', () => setLastActionStatus('Location access denied'));
    };

    const changeLayer = (name) => {
        if (!mapRef.current || !mapRef.current.baseLayers) return;
        const map = mapRef.current;
        Object.values(map.baseLayers).forEach(layer => map.removeLayer(layer));
        if (map.baseLayers[name]) {
            map.baseLayers[name].addTo(map);
            setActiveLayer(name);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault(); if (!searchQuery) return;
        
        // Coordinate Regex (Lat, Lng)
        const coordMatch = searchQuery.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
        if (coordMatch) {
            const lat = parseFloat(coordMatch[1]);
            const lng = parseFloat(coordMatch[2]);
            mapRef.current.setView([lat, lng], 16);
            setLastActionStatus(`Jumping to Coordinates: ${lat}, ${lng}`);
            setTimeout(() => setLastActionStatus(''), 3000);
            return;
        }

        setLastActionStatus('Searching...');
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                mapRef.current.setView([lat, lon], 14);
                setLastActionStatus('Location found');
            } else setLastActionStatus('Location not found');
        } catch (err) { setLastActionStatus('Search failed'); }
        setTimeout(() => setLastActionStatus(''), 3000);
    };

    const exportGeoJSON = () => {
        if (savedPolygons.length === 0) return;
        const collection = {
            type: 'FeatureCollection',
            features: savedPolygons.map(p => ({
                type: 'Feature',
                properties: { name: p.name, area_ha: (p.area / 10000).toFixed(4), source: p.source },
                geometry: { type: 'Polygon', coordinates: [p.coordinates.map(c => [c[1], c[0]])] }
            }))
        };
        const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `DENR_FEO_GIS_Export_${new Date().toISOString().split('T')[0]}.geojson`;
        a.click();
    };

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%', borderRadius: '16px', overflow: 'hidden', background: '#080a0c', display: 'flex', flexDirection: 'column' }}>
            {!mapLoaded && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 1000, background: '#080a0c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
                    <div className="spinner-small" style={{ width: '40px', height: '40px', border: '3px solid var(--denr-blue-light)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px', display: 'block' }}>RECALIBRATING GIS ENGINE...</span>
                        <span style={{ color: '#555', fontSize: '0.8rem', marginTop: '0.5rem', display: 'block' }}>Initializing secure GIS handshake with Palawan servers.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            onClick={() => window.location.reload()}
                            className="btn btn-glass" 
                            style={{ fontSize: '0.8rem', padding: '0.5rem 1.5rem' }}
                        >
                            <RefreshCcw size={14} /> REFRESH
                        </button>
                        <button 
                            onClick={() => {
                                console.warn('[GIS] Force loading map...');
                                setMapLoaded(true);
                            }}
                            className="btn btn-glass" 
                            style={{ fontSize: '0.8rem', padding: '0.5rem 1.5rem', borderColor: 'rgba(255,255,255,0.1)' }}
                        >
                            <Zap size={14} /> FORCE LOAD
                        </button>
                    </div>
                </div>
            )}

            {/* Header / Toolbar */}
            <div className="flex-between no-print" style={{ padding: '0.75rem 1.5rem', background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, gap: '1rem', zIndex: 600 }}>
                <div className="flex-center gap-3">
                    <div style={{ background: 'rgba(96, 165, 250, 0.1)', padding: '0.5rem', borderRadius: '10px' }}>
                        <MapIcon size={20} color="#60a5fa" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: 800 }}>PALAWAN SHAPEFILE PORTAL</h3>
                        <p style={{ fontSize: '0.65rem', color: '#888', margin: 0 }}>GIS Node Status: {mapLoaded ? 'ONLINE' : 'CONNECTING...'}</p>
                    </div>
                </div>

                <div className="flex-center gap-2">
                    <button className="btn btn-glass" onClick={onClose} style={{ padding: '0.5rem', minWidth: 'auto', borderRadius: '8px' }} title="Close Portal">
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <div ref={mapContainerRef} style={{ height: '100%', width: '100%', background: '#080a0c' }}></div>


            {/* Collection Sidebar - Left */}
            <div style={{ 
                position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 500,
                width: isCollectionOpen ? '320px' : '60px', height: 'calc(100% - 3rem)',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <div className="surface-glass" style={{ 
                    height: '100%', borderRadius: '24px', display: 'flex', flexDirection: 'column',
                    background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)',
                    overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {isCollectionOpen && (
                            <div className="flex-center gap-2" style={{ flex: 1 }}>
                                <List size={18} color="#60a5fa" />
                                <h4 style={{ margin: 0, color: '#fff', fontSize: '0.9rem', fontWeight: 800 }}>GIS DATABASE</h4>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); window.location.reload(); }} 
                                    className="btn-icon" 
                                    style={{ background: 'rgba(255,255,255,0.05)', color: '#888', marginLeft: 'auto', padding: '4px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} 
                                    title="Reset GIS Engine"
                                >
                                    <RefreshCcw size={14} />
                                </button>
                            </div>
                        )}
                        <button className="btn-glass" onClick={() => setIsCollectionOpen(!isCollectionOpen)} style={{ padding: '0.4rem' }}>
                            {isCollectionOpen ? <Minimize size={16} /> : <List size={20} />}
                        </button>
                    </div>

                    {isCollectionOpen && (
                        <>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }} className="custom-scrollbar">
                                {savedPolygons.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                                        <MapIcon size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                        <p style={{ fontSize: '0.8rem' }}>Database is empty.</p>
                                    </div>
                                ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {/* Real-time Search Box */}
                                            <div style={{ position: 'relative', marginBottom: '0.25rem' }}>
                                                <Search style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} size={14} />
                                                <input 
                                                    type="text"
                                                    placeholder="Search Name or Folder..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    style={{ 
                                                        width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', 
                                                        borderRadius: '12px', padding: '0.6rem 0.8rem 0.6rem 2.2rem', color: '#fff', fontSize: '0.75rem', 
                                                        outline: 'none', transition: 'all 0.3s' 
                                                    }}
                                                    onFocus={(e) => e.target.style.borderColor = THEME_COLOR}
                                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                                />
                                                {searchQuery && (
                                                    <button 
                                                        onClick={() => setSearchQuery('')}
                                                        style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '2px' }}
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>

                                            <div style={{ padding: '0.75rem 1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                                <div className="flex-center gap-2">
                                                    <input 
                                                        type="checkbox"
                                                        checked={savedPolygons.length > 0 && selectedBulkIds.length === savedPolygons.length}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedBulkIds(savedPolygons.map(p => p.id));
                                                            else setSelectedBulkIds([]);
                                                        }}
                                                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>Select All ({savedPolygons.length})</span>
                                                </div>
                                                <button 
                                                    onClick={() => setShowAllTrails(!showAllTrails)} 
                                                    className="btn-glass" 
                                                    style={{ 
                                                        padding: '0.4rem 0.8rem', fontSize: '0.7rem', 
                                                        background: showAllTrails ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                                        color: showAllTrails ? '#60a5fa' : '#888',
                                                        border: `1px solid ${showAllTrails ? '#60a5fa' : 'rgba(255,255,255,0.1)'}`
                                                    }}
                                                >
                                                    <Compass size={14} style={{ marginRight: '4px' }} />
                                                    {showAllTrails ? 'TRAILS ON' : 'TRAILS OFF'}
                                                </button>
                                            </div>
                                            {(() => {
                                                const renderRecursiveFolder = (folderName, data, depth = 0) => {
                                                    const isRoot = depth === 0;
                                                    const isFolderOpen = openFolders.includes(data.path);
                                                    const folderPolys = data.polygons;
                                                    const allPolysInBranch = savedPolygons.filter(p => (p.folder || '').startsWith(data.path));

                                                    return (
                                                        <div key={data.path || 'root'} style={{ marginBottom: isRoot ? '0' : '0.6rem', marginLeft: isRoot ? 0 : '0.75rem' }}>
                                                            {!isRoot && (
                                                                <div 
                                                                    onClick={() => toggleFolder(data.path)}
                                                                    onDragOver={(e) => e.preventDefault()} 
                                                                    onDrop={(e) => handleDropOnFolder(e, data.path)}
                                                                    style={{ 
                                                                        fontSize: '0.75rem', fontWeight: 900, color: (isFolderOpen || searchQuery) ? THEME_COLOR : '#94a3b8', padding: '0.6rem 0.8rem', 
                                                                        background: (isFolderOpen || searchQuery) ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.03)', borderRadius: '10px',
                                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                        cursor: 'pointer', border: `1px solid ${(isFolderOpen || searchQuery) ? THEME_COLOR + '44' : 'rgba(255,255,255,0.05)'}`,
                                                                        transition: 'all 0.2s', marginBottom: '0.4rem'
                                                                    }}
                                                                >
                                                                    <div className="flex-center gap-2">
                                                                        {(isFolderOpen || searchQuery) ? <FolderOpen size={16} color={THEME_COLOR} /> : <Folder size={16} />}
                                                                        <span style={{ letterSpacing: '0.5px' }}>{folderName.toUpperCase()}</span>
                                                                    </div>
                                                                    <div className="flex-center gap-2">
                                                                        <span style={{ opacity: 0.5, fontSize: '0.65rem', fontWeight: 900 }}>
                                                                            {allPolysInBranch.length}
                                                                        </span>
                                                                        <ChevronDown size={14} style={{ transform: (isFolderOpen || searchQuery) ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {(isFolderOpen || isRoot || searchQuery) && (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderLeft: isRoot ? 'none' : '1px solid rgba(255,255,255,0.05)', paddingLeft: isRoot ? 0 : '0.5rem', marginLeft: isRoot ? 0 : '0.2rem' }}>
                                                                    {Object.entries(data.folders)
                                                                        .sort((a, b) => a[0].localeCompare(b[0]))
                                                                        .map(([name, subData]) => renderRecursiveFolder(name, subData, depth + 1))
                                                                    }
                                                                    {folderPolys.map(poly => renderPolygonItem(poly))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                };
                                                return renderRecursiveFolder('root', hierarchicalFolders);
                                            })()}
                                        {selectedBulkIds.length > 0 && (
                                            <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '12px', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid #3b82f6' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 800 }}>{selectedBulkIds.length} ITEMS SELECTED</div>
                                                <div className="flex-center gap-2">
                                                    <button 
                                                        className="btn btn-glass" 
                                                        style={{ flex: 1, fontSize: '0.7rem' }}
                                                        onClick={() => setBulkFolderModal(true)}
                                                    >Move to Folder</button>
                                                    <button 
                                                        className="btn btn-glass" 
                                                        style={{ flex: 1, fontSize: '0.7rem', color: '#ef4444' }}
                                                        onClick={() => {
                                                            setConfirmDialog({
                                                                message: `Are you sure you want to delete ${selectedBulkIds.length} items?`,
                                                                onConfirm: async () => {
                                                                    for (const id of selectedBulkIds) {
                                                                        const poly = savedPolygons.find(p => p.id === id);
                                                                        if (poly) {
                                                                            await deleteDoc(doc(db, 'feo_polygons', poly.id));
                                                                            setUndoStack(prev => [...prev, { action: 'delete', oldData: poly }]);
                                                                        }
                                                                    }
                                                                    setSelectedBulkIds([]);
                                                                    setLastActionStatus(`Deleted ${selectedBulkIds.length} items. Undo available.`);
                                                                }
                                                            });
                                                        }}
                                                    >Delete Selected</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <input 
                                    type="text" 
                                    placeholder="Folder for import (Optional)" 
                                    value={importTargetFolder}
                                    onChange={e => setImportTargetFolder(e.target.value)}
                                    className="input-modern"
                                    style={{ fontSize: '0.75rem', padding: '0.5rem' }}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={exportGeoJSON} className="btn btn-glass" style={{ flex: 1, fontSize: '0.75rem', padding: '0.8rem' }}>
                                        <Download size={14} /> EXPORT
                                    </button>
                                    <button
                                        onClick={() => document.getElementById('import-geojson-input').click()} 
                                        className="btn btn-primary" 
                                        style={{ flex: 1, fontSize: '0.75rem', padding: '0.8rem', whiteSpace: 'nowrap' }}
                                    >
                                        <Layers size={14} /> IMPORT ArcGIS (.zip)
                                    </button>
                                </div>
                                <input 
                                    type="file" 
                                    id="import-geojson-input" 
                                    style={{ display: 'none' }} 
                                    accept=".geojson,.json,.zip,.rar,.7z,application/zip,application/x-zip-compressed" 
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        
                                        setIsImporting(true);
                                        setLastActionStatus('Reading shapefile data...');
                                        const reader = new FileReader();
                                        reader.onload = async (event) => {
                                            try {
                                                let geojsonResults = [];
                                                
                                                const allFoundFiles = [];
                                                const clusters = {};
                                                const clusterSummary = {}; 
                                                const prjFiles = {};

                                                if (window.proj4) {
                                                    window.proj4.defs([
                                                        ["EPSG:3123", "+proj=tmerc +lat_0=0 +lon_0=119 +k=0.99995 +x_0=500000 +y_0=0 +ellps=clrk66 +units=m +no_defs"],
                                                        ["EPSG:3125", "+proj=tmerc +lat_0=0 +lon_0=121 +k=0.99995 +x_0=500000 +y_0=0 +ellps=clrk66 +units=m +no_defs"],
                                                        ["EPSG:32650", "+proj=utm +zone=50 +datum=WGS84 +units=m +no_defs"],
                                                        ["EPSG:32651", "+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs"]
                                                    ]);
                                                }

                                                if (file.name.toLowerCase().endsWith('.zip')) {
                                                    const JSZip = window.JSZip;
                                                    const zip = await JSZip.loadAsync(event.target.result);

                                                const flatFiles = {}; 

                                                const scanZip = async (currentZip, parentPath = "") => {
                                                    const entries = Object.keys(currentZip.files);
                                                    for (const name of entries) {
                                                        const entry = currentZip.files[name];
                                                        if (entry.dir) continue;
                                                        
                                                        const lowerName = name.toLowerCase();
                                                        if (lowerName.split('/').pop().startsWith('._')) continue;
                                                        
                                                        const ext = lowerName.split('.').pop().trim();
                                                        const fileData = await entry.async("arraybuffer");
                                                        
                                                        const virtualPath = parentPath ? `${parentPath}/${name}` : name;

                                                        if (ext === 'zip') {
                                                            try {
                                                                const zipName = name.split('/').pop().replace(/\.zip$/i, '');
                                                                const nestedZip = await JSZip.loadAsync(fileData);
                                                                await scanZip(nestedZip, parentPath ? `${parentPath}/${zipName}` : zipName);
                                                            } catch (e) { console.warn("Skip nested zip:", name); }
                                                        } else if (['shp', 'dbf', 'shx', 'prj', 'cpg'].includes(ext)) {
                                                            flatFiles[virtualPath] = fileData;
                                                            if (ext === 'prj') {
                                                                try { prjFiles[virtualPath] = new TextDecoder().decode(fileData); } catch (e) {}
                                                            }
                                                        }
                                                    }
                                                };

                                                try {
                                                    await scanZip(zip);
                                                    
                                                    const masterZip = new JSZip();
                                                    Object.entries(flatFiles).forEach(([name, data]) => {
                                                        masterZip.file(name, data);
                                                    });
                                                    
                                                    const masterBuffer = await masterZip.generateAsync({ type: "arraybuffer" });
                                                    const result = await window.shp(masterBuffer);
                                                    geojsonResults = Array.isArray(result) ? result : [result];
                                                    
                                                } catch (e) { 
                                                    console.error("Master Parse Error:", e);
                                                    setIsImporting(false);
                                                    setLastActionStatus(`Import Failed: ${e.message}`);
                                                    return;
                                                }
                                            } else {
                                                const text = new TextDecoder().decode(event.target.result);
                                                const parsed = JSON.parse(text);
                                                geojsonResults = Array.isArray(parsed) ? parsed : [parsed];
                                            }

                                            if (geojsonResults.length === 0) {
                                                setIsImporting(false);
                                                setLastActionStatus("");
                                                return;
                                            }

                                                const zipBaseName = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
                                                const baseFolder = importTargetFolder.trim() || zipBaseName;
                                                const geojson = geojsonResults;
                                                let totalFeatures = 0;
                                                
                                                const extractName = (props) => {
                                                    if (!props) return null;
                                                    const blacklist = ['MIMAROPA', 'PALAWAN', 'REGION IV-B', 'REGION 4B', 'PHILIPPINES'];
                                                    const poKeys = ['PARTNER ORGANIZATION NAME', 'PARTNER_ORGANIZATION_NAME', 'PO_NAME', 'PARTNER', 'PARTNER_NA', 'TENURE_HOLDER', 'ORG_NAME', 'TENURE_NAME', 'TENURE_H_1', 'NAME_PART'];
                                                    
                                                    for (const key of poKeys) {
                                                        if (props[key] && !blacklist.includes(props[key].toString().toUpperCase().trim())) {
                                                            return props[key];
                                                        }
                                                    }
                                                    return null;
                                                };

                                                let batch = writeBatch(db);
                                                let operationCount = 0;
                                                const BATCH_LIMIT = 450;

                                                const importedFolders = new Set();
                                                importedFolders.add(baseFolder);

                                                for (const geoCollection of geojsonResults) {
                                                    const features = geoCollection.features || (geoCollection.type === 'Feature' ? [geoCollection] : []);
                                                    
                                                    let internalPath = "";
                                                    if (geoCollection.fileName) {
                                                        const pathParts = geoCollection.fileName.split('/').filter(Boolean);
                                                        const cleanPart0 = pathParts[0]?.toUpperCase().split('-')[0].trim();
                                                        const cleanZip = zipBaseName.split('-')[0].trim();
                                                        
                                                        if (cleanPart0 === cleanZip || zipBaseName.includes(pathParts[0]?.toUpperCase())) {
                                                            pathParts.shift();
                                                        }
                                                        if (pathParts.length > 0) {
                                                            pathParts.pop();
                                                        }
                                                        internalPath = pathParts.join(' / ');
                                                    }

                                                    let activePrj = null;
                                                    if (geoCollection.fileName) {
                                                        const prjKey = geoCollection.fileName.replace(/\.shp$/i, '.prj');
                                                        activePrj = prjFiles[prjKey];
                                                    }

                                                    for (const feature of features) {
                                                        if (!feature.geometry) continue;
                                                        
                                                        let polygons = [];
                                                        let geometryType = 'polygon';
                                                        
                                                        if (feature.geometry.type === 'Polygon') {
                                                            polygons = [feature.geometry.coordinates];
                                                        } else if (feature.geometry.type === 'MultiPolygon') {
                                                            polygons = feature.geometry.coordinates;
                                                        } else if (feature.geometry.type === 'LineString') {
                                                            polygons = [[feature.geometry.coordinates]];
                                                            geometryType = 'polyline';
                                                        } else if (feature.geometry.type === 'MultiLineString') {
                                                            polygons = feature.geometry.coordinates.map(line => [line]);
                                                            geometryType = 'polyline';
                                                        } else if (feature.geometry.type === 'Point') {
                                                            polygons = [[feature.geometry.coordinates]];
                                                            geometryType = 'point';
                                                        } else if (feature.geometry.type === 'MultiPoint') {
                                                            polygons = feature.geometry.coordinates.map(p => [p]);
                                                            geometryType = 'point';
                                                        }
                                                        
                                                        if (polygons.length === 0) continue;
                                                            
                                                        for (const ring of polygons) {
                                                            const pointArray = (geometryType === 'polyline' || geometryType === 'point') ? ring : (ring[0] || ring);
                                                            let coords = pointArray.map(c => ({ lat: Number(c[1]), lng: Number(c[0]) })).filter(c => !isNaN(c.lat) && !isNaN(c.lng));
                                                            
                                                            if (coords.length > 0) {
                                                                const isProjected = Math.abs(coords[0].lat) > 1000 || Math.abs(coords[0].lng) > 1000;
                                                                if (isProjected && window.proj4) {
                                                                    const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
                                                                    const fromProj = activePrj || "EPSG:3123";
                                                                    try {
                                                                        coords = coords.map(c => {
                                                                            const result = window.proj4(fromProj, wgs84, [c.lng, c.lat]);
                                                                            return { lat: result[1], lng: result[0] };
                                                                        });
                                                                    } catch (pe) { console.warn("Projection failed", pe); }
                                                                }
                                                            }

                                                            if (coords.length === 0) continue;
                                                            if (geometryType !== 'point' && coords.length < 2) continue;
                                                                                                                const area = (geometryType === 'polyline' || geometryType === 'point') ? 0 : window.L.GeometryUtil.geodesicArea(coords.map(c => window.L.latLng(c.lat, c.lng)));
                                                            
                                                            // Clean and normalize attributes (handle trailing spaces and nulls)
                                                            const cleanedAttributes = {};
                                                            if (feature.properties) {
                                                                Object.entries(feature.properties).forEach(([k, v]) => {
                                                                    const cleanKey = k.trim().toUpperCase();
                                                                    let cleanVal = v;
                                                                    if (typeof v === 'string') {
                                                                        cleanVal = v.trim();
                                                                    }
                                                                    cleanedAttributes[cleanKey] = cleanVal;
                                                                });

                                                                // Intelligent Attribute Mapping for Contract ID
                                                                const contractKeys = ['CTRCT_ID', 'CONTRACT_ID', 'CT_ID', 'CONT_ID', 'CONTRACT', 'CONTRACT_NO', 'CNTRCT_ID'];
                                                                let foundContract = null;
                                                                for (const ck of contractKeys) {
                                                                    if (cleanedAttributes[ck]) {
                                                                        foundContract = cleanedAttributes[ck];
                                                                        break;
                                                                    }
                                                                }
                                                                // If not found, try any key containing "CONTRACT"
                                                                if (!foundContract) {
                                                                    const anyContractKey = Object.keys(cleanedAttributes).find(k => k.includes('CONTRACT') || k.includes('CTRCT'));
                                                                    if (anyContractKey) foundContract = cleanedAttributes[anyContractKey];
                                                                }
                                                                if (foundContract) {
                                                                    cleanedAttributes.CTRCT_ID = foundContract; // Standardize
                                                                }
                                                            }

                                                            const partnerName = cleanedAttributes.NAME_PART || cleanedAttributes['PARTNER ORGANIZATION NAME'] || extractName(feature.properties) || "";
                                                            
                                                            let finalFolder = baseFolder;
                                                            if (internalPath) finalFolder += ` / ${internalPath}`;
                                                            // Auto-group by name: add a sub-folder if partner name is found
                                                            if (partnerName) {
                                                                finalFolder += ` / ${partnerName.trim()}`;
                                                            }
                                                            
                                                            importedFolders.add(finalFolder);

                                                            const newDocRef = doc(collection(db, 'feo_polygons')); batch.set(newDocRef, {
                                                                name: partnerName || `Imported ${geometryType === 'polyline' ? 'Trail' : 'Area'} ${++totalFeatures}`,
                                                                coordinates: coords,
                                                                geometryType: geometryType,
                                                                area: area,
                                                                createdAt: Date.now(),
                                                                visible: true,
                                                                color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
                                                                folder: finalFolder,
                                                                attributes: cleanedAttributes
                                                            });


                                                            operationCount++;
                                                            if (operationCount >= BATCH_LIMIT) {
                                                                await batch.commit();
                                                                batch = writeBatch(db);
                                                                operationCount = 0;
                                                                setLastActionStatus(`Importing... ${totalFeatures} items processed`);
                                                            }
                                                        }
                                                    }
                                                }
                                                
                                                if (operationCount > 0) {
                                                    await batch.commit();
                                                }
                                                
                                                setIsImporting(false);
                                                if (totalFeatures > 0) {
                                                    setLastActionStatus(`Imported ${totalFeatures} items successfully.`);
                                                    setOpenFolders(prev => [...new Set([...prev, ...Array.from(importedFolders)])]);
                                                }
                                            } catch (err) {
                                                console.error("Import Error:", err);
                                                setIsImporting(false);
                                                setLastActionStatus(`Import Failed: ${err.message || err}`);
                                            }
                                        };
                                        reader.readAsArrayBuffer(file);
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Bulk Folder Modal */}
            {bulkFolderModal && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="surface-glass" style={{ width: '350px', padding: '2rem', borderRadius: '24px', border: '1px solid var(--denr-blue-light)' }}>
                        <h3 style={{ margin: 0, marginBottom: '1.5rem', color: 'var(--denr-blue-light)' }}>Move to Folder</h3>
                        <input 
                            type="text" 
                            value={bulkTargetFolder} 
                            onChange={e => setBulkTargetFolder(e.target.value)} 
                            placeholder="e.g. Palawan Sites"
                            className="input-modern" 
                            style={{ width: '100%', marginBottom: '1.5rem' }} 
                            autoFocus 
                        />
                        <div className="flex-center gap-4">
                            <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => setBulkFolderModal(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => {
                                const fName = bulkTargetFolder.trim() || 'Ungrouped';
                                for (const id of selectedBulkIds) {
                                    await updateDoc(doc(db, 'feo_polygons', id), { folder: fName });
                                }
                                setLastActionStatus(`Moved ${selectedBulkIds.length} items to ${fName}`);
                                setSelectedBulkIds([]);
                                setBulkFolderModal(false);
                                setBulkTargetFolder('');
                            }}>Move</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Smart Search HUD */}
            <div style={{ position: 'absolute', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 400, width: '100%', maxWidth: '400px', padding: '0 1rem' }}>
                <form onSubmit={handleSearch} style={{ position: 'relative', display: 'flex', gap: '0.75rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#60a5fa' }} />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search Place or Lat, Lng..." className="input-modern" style={{ paddingLeft: '2.8rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '0.85rem', height: '44px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', width: '100%' }} />
                    </div>
                    <button 
                        type="button"
                        onClick={async () => {
                            setConfirmDialog({
                                message: "This will scan your entire GIS database and delete any polygons with corrupted coordinates or invalid area. Proceed?",
                                onConfirm: async () => {
                                    setLastActionStatus("Scanning for corrupted data...");
                                    let deletedCount = 0;
                                    for (const poly of savedPolygons) {
                                        let corrupted = false;
                                        const firstCoord = poly.coordinates?.[0];
                                        if (!firstCoord || isNaN(Number(poly.area))) {
                                            corrupted = true;
                                        } else if (Array.isArray(firstCoord)) {
                                            if (isNaN(Number(firstCoord[1])) || isNaN(Number(firstCoord[0]))) corrupted = true;
                                        } else {
                                            if (isNaN(Number(firstCoord.lat)) || isNaN(Number(firstCoord.lng))) corrupted = true;
                                        }

                                        if (corrupted) {
                                            await deleteDoc(doc(db, 'feo_polygons', poly.id));
                                            deletedCount++;
                                        }
                                    }
                                    setLastActionStatus(`Cleanup Complete: Deleted ${deletedCount} corrupted items.`);
                                }
                            });
                        }}
                        className="btn-glass"
                        style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#ef4444', flexShrink: 0 }}
                        title="Database Cleanup (Delete Corrupted)"
                    >
                        <Zap size={18} />
                    </button>
                </form>
            </div>

            {/* Precision Coordinate HUD */}
            <div style={{ position: 'absolute', bottom: '1.5rem', left: isCollectionOpen ? '350px' : '90px', zIndex: 400, transition: 'all 0.4s' }}>
                <div className="surface-glass" style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', color: '#fff', fontSize: '0.75rem', fontWeight: 800, background: 'rgba(15, 23, 42, 0.85)', display: 'flex', gap: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div><span style={{ color: '#60a5fa' }}>LAT:</span> <span style={{ fontFamily: 'monospace' }}>{cursorCoords.lat.toFixed(6)}</span></div>
                    <div><span style={{ color: '#60a5fa' }}>LNG:</span> <span style={{ fontFamily: 'monospace' }}>{cursorCoords.lng.toFixed(6)}</span></div>
                </div>
            </div>

            {/* Control HUD - Right Top */}
            <div style={{ position: 'absolute', top: '1.5rem', right: selectedPolygon ? '370px' : '1.5rem', zIndex: 500, display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'right 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <div className="surface-glass" style={{ padding: '0.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.8)' }}>
                    <button 
                        onClick={() => {
                            console.log('[GIS] Triggering Draw Polygon');
                            if (window.L && window.L.Draw && window.L.Draw.Polygon && mapRef.current) {
                                try {
                                    new window.L.Draw.Polygon(mapRef.current).enable();
                                    setLastActionStatus('Drawing mode enabled. Click to add points.');
                                } catch (err) {
                                    console.error('[GIS] Draw Error:', err);
                                    setLastActionStatus('ERROR: Failed to start drawing tools.');
                                }
                            } else {
                                setLastActionStatus('ERROR: GIS engine not ready.');
                            }
                        }} 
                        className="btn-gis-tool" 
                        title="Draw New Polygon"
                    >
                        <Layers size={20} />
                    </button>
                    
                    <button 
                        onClick={() => {
                            if (isVisualEditing) {
                                if (editHandlerRef.current) {
                                    editHandlerRef.current.save();
                                    editHandlerRef.current.disable();
                                }
                                setIsVisualEditing(false);
                                setIsEditingMap(false);
                                setLastActionStatus('Visual edits saved!');
                            } else {
                                if (drawItemsRef.current && drawItemsRef.current.getLayers().length === 0) {
                                    setLastActionStatus('ERROR: No polygons loaded to edit.');
                                    return;
                                }
                                
                                if (!window.L || !window.L.EditToolbar || !window.L.EditToolbar.Edit) {
                                    setLastActionStatus('ERROR: Visual Edit tool not available.');
                                    return;
                                }

                                try {
                                    // Re-initialize handler to ensure latest layers are captured
                                    editHandlerRef.current = new window.L.EditToolbar.Edit(mapRef.current, {
                                        featureGroup: drawItemsRef.current
                                    });
                                    
                                    editHandlerRef.current.enable();
                                    setIsVisualEditing(true);
                                    setIsEditingMap(true);
                                    setLastActionStatus('Drag vertices to edit polygons visually');
                                } catch (err) {
                                    console.error('[GIS] Edit Error:', err);
                                    setLastActionStatus('ERROR: Failed to start Edit tool.');
                                }
                            }
                        }} 
                        className={`btn-gis-tool ${isVisualEditing ? 'active' : ''}`} 
                        style={{ background: isVisualEditing ? '#ef4444' : '' }}
                        title={isVisualEditing ? 'Save Visual Edits' : 'Visually Edit Polygons'}
                    >
                        {isVisualEditing ? <CheckCircle2 size={20} /> : <Settings size={20} />}
                    </button>
                    <button 
                        onClick={() => {
                            if (isMeasuringDistance) {
                                setIsMeasuringDistance(false);
                                isMeasuringRef.current = false;
                                setLastActionStatus('Measurement tool cancelled.');
                                return;
                            }

                            if (!selectedPolygon) {
                                setLastActionStatus('ERROR: SELECT A POLYGON FIRST!');
                                return;
                            }
                            
                            setIsMeasuringDistance(true);
                            isMeasuringRef.current = true;
                            
                            try {
                                new window.L.Draw.Polyline(mapRef.current, {
                                    shapeOptions: { color: '#f87171', weight: 4, dashArray: '5, 5' }
                                }).enable();
                                setLastActionStatus('Draw a line from polygon to road');
                            } catch (err) {
                                console.error('[GIS] Trail Error:', err);
                                setLastActionStatus('ERROR: Measurement tool failed.');
                            }
                        }} 
                        className={`btn-gis-tool ${isMeasuringDistance ? 'active' : ''}`}
                        style={{ background: isMeasuringDistance ? '#f87171' : '' }}
                        title="Visually Set Distance to Road"
                    >
                        <Ruler size={20} />
                    </button>
                    <button onClick={locateMe} className="btn-gis-tool" title="Locate Me"><LocateFixed size={20} /></button>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.2rem' }}></div>
                    <button onClick={() => changeLayer('Satellite')} className={`btn-gis-tool ${activeLayer === 'Satellite' ? 'active' : ''}`}><Globe size={20} /></button>
                    <button onClick={() => changeLayer('Terrain')} className={`btn-gis-tool ${activeLayer === 'Terrain' ? 'active' : ''}`}><MapPin size={20} /></button>
                    <button onClick={() => changeLayer('Dark')} className={`btn-gis-tool ${activeLayer === 'Dark' ? 'active' : ''}`}><Navigation size={20} /></button>
                    
                    <button onClick={() => setShowAllTrails(!showAllTrails)} className={`btn-gis-tool ${showAllTrails ? 'active' : ''}`} title="Toggle All Trails">
                        <Compass size={20} style={{ color: showAllTrails ? '#ef4444' : '#666' }} />
                    </button>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.2rem' }}></div>
                    <button 
                        onClick={handleUndo} 
                        disabled={undoStack.length === 0}
                        className="btn-gis-tool" 
                        style={{ 
                            background: undoStack.length > 0 ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.05)', 
                            color: undoStack.length > 0 ? '#eab308' : '#666', 
                            border: undoStack.length > 0 ? '1px solid #eab308' : '1px solid rgba(255,255,255,0.1)',
                            opacity: undoStack.length > 0 ? 1 : 0.5,
                            cursor: undoStack.length > 0 ? 'pointer' : 'not-allowed'
                        }}
                        title="Undo Last Action"
                    >
                        <Undo2 size={20} />
                    </button>
                </div>
            </div>

            {/* Precision Editor - Right */}
            {selectedPolygon && (
                <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 600, width: '340px', maxHeight: 'calc(100% - 3rem)', overflow: 'hidden' }}>
                    <div className="surface-glass" style={{ borderRadius: '24px', background: 'rgba(15, 23, 42, 0.95)', border: '2px solid #3b82f6', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="flex-center gap-2">
                                <Settings size={18} color="#3b82f6" />
                                <h4 style={{ margin: 0, color: '#fff', fontSize: '0.9rem' }}>PRECISION EDITOR</h4>
                            </div>
                            <button className="btn-glass" onClick={() => setSelectedPolygon(null)}><X size={16} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }} className="custom-scrollbar">
                            {/* GIS ATTRIBUTES QUICK-ACCESS */}
                            {selectedPolygon.attributes && Object.keys(selectedPolygon.attributes).length > 0 && (
                                <button 
                                    onClick={() => setShowAttributeModal(!showAttributeModal)}
                                    className="btn btn-primary" 
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.85rem', background: showAttributeModal ? 'rgba(96, 165, 250, 0.2)' : 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#fff', fontSize: '0.75rem', fontWeight: 800, borderRadius: '12px', marginBottom: '1.5rem' }}
                                >
                                    <Layers size={16} color="#60a5fa" />
                                    {showAttributeModal ? 'CLOSE GIS ATTRIBUTES' : 'VIEW FULL GIS ATTRIBUTES'}
                                </button>
                            )}
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '0.5rem' }}>POLYGON NAME</label>
                            <input type="text" value={selectedPolygon.name} onChange={async (e) => {
                                const newName = e.target.value;
                                setSavedPolygons(prev => prev.map(p => p.id === selectedPolygon.id ? {...p, name: newName} : p));
                                setSelectedPolygon({...selectedPolygon, name: newName});
                                if (selectedPolygon.source === 'cloud') {
                                    await updateDoc(doc(db, 'feo_polygons', selectedPolygon.id), { name: newName });
                                } else {
                                    const localData = JSON.parse(localStorage.getItem('feo_polygons_local') || '[]');
                                    const updated = localData.map(p => p.id === selectedPolygon.id ? {...p, name: newName} : p);
                                    localStorage.setItem('feo_polygons_local', JSON.stringify(updated));
                                }
                            }} className="input-modern" style={{ marginBottom: '1.5rem' }} />

                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '0.5rem' }}>POLYGON COLOR</label>
                            <input type="color" value={selectedPolygon.color || '#3b82f6'} onChange={async (e) => {
                                const newColor = e.target.value;
                                setSavedPolygons(prev => prev.map(p => p.id === selectedPolygon.id ? {...p, color: newColor} : p));
                                setSelectedPolygon({...selectedPolygon, color: newColor});
                                if (selectedPolygon.source === 'cloud') {
                                    await updateDoc(doc(db, 'feo_polygons', selectedPolygon.id), { color: newColor });
                                } else {
                                    const localData = JSON.parse(localStorage.getItem('feo_polygons_local') || '[]');
                                    const updated = localData.map(p => p.id === selectedPolygon.id ? {...p, color: newColor} : p);
                                    localStorage.setItem('feo_polygons_local', JSON.stringify(updated));
                                }
                            }} style={{ marginBottom: '1.5rem', width: '100%', height: '40px', cursor: 'pointer', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }} />

                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '1rem' }}>VERTEX COORDINATES (POINT LIST)</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }} className="custom-scrollbar">
                                {selectedPolygon.coordinates.map((coord, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <div style={{ width: '20px', fontSize: '0.6rem', color: '#60a5fa', fontWeight: 800 }}>{idx+1}</div>
                                        <input 
                                            type="number" 
                                            step="0.000001" 
                                            value={coord.lat} 
                                            onChange={async (e) => {
                                                const newVal = parseFloat(e.target.value);
                                                const newCoords = [...selectedPolygon.coordinates];
                                                newCoords[idx] = { lat: newVal, lng: coord.lng };
                                                setSavedPolygons(prev => prev.map(p => p.id === selectedPolygon.id ? {...p, coordinates: newCoords} : p));
                                                setSelectedPolygon({...selectedPolygon, coordinates: newCoords});
                                                
                                                const layer = drawItemsRef.current.getLayers().find(l => l.options.dbId === selectedPolygon.id);
                                                if (layer) layer.setLatLngs(newCoords);
                                                
                                                const newArea = window.L.GeometryUtil.geodesicArea(newCoords.map(c => window.L.latLng(c.lat, c.lng)));
                                                if (selectedPolygon.source === 'cloud') {
                                                    await updateDoc(doc(db, 'feo_polygons', selectedPolygon.id), { coordinates: newCoords, area: newArea });
                                                } else {
                                                    const localData = JSON.parse(localStorage.getItem('feo_polygons_local') || '[]');
                                                    const updated = localData.map(p => p.id === selectedPolygon.id ? {...p, coordinates: newCoords, area: newArea} : p);
                                                    localStorage.setItem('feo_polygons_local', JSON.stringify(updated));
                                                }
                                            }}
                                            className="input-modern" 
                                            style={{ padding: '0.4rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.03)' }} 
                                        />
                                        <input 
                                            type="number" 
                                            step="0.000001" 
                                            value={coord.lng} 
                                            onChange={async (e) => {
                                                const newVal = parseFloat(e.target.value);
                                                const newCoords = [...selectedPolygon.coordinates];
                                                newCoords[idx] = { lat: coord.lat, lng: newVal };
                                                setSavedPolygons(prev => prev.map(p => p.id === selectedPolygon.id ? {...p, coordinates: newCoords} : p));
                                                setSelectedPolygon({...selectedPolygon, coordinates: newCoords});
                                                
                                                const layer = drawItemsRef.current.getLayers().find(l => l.options.dbId === selectedPolygon.id);
                                                if (layer) layer.setLatLngs(newCoords);
                                                
                                                const newArea = window.L.GeometryUtil.geodesicArea(newCoords.map(c => window.L.latLng(c.lat, c.lng)));
                                                if (selectedPolygon.source === 'cloud') {
                                                    await updateDoc(doc(db, 'feo_polygons', selectedPolygon.id), { coordinates: newCoords, area: newArea });
                                                } else {
                                                    const localData = JSON.parse(localStorage.getItem('feo_polygons_local') || '[]');
                                                    const updated = localData.map(p => p.id === selectedPolygon.id ? {...p, coordinates: newCoords, area: newArea} : p);
                                                    localStorage.setItem('feo_polygons_local', JSON.stringify(updated));
                                                }
                                            }}
                                            className="input-modern" 
                                            style={{ padding: '0.4rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.03)' }} 
                                        />
                                        <button 
                                            onClick={async () => {
                                                if (selectedPolygon.coordinates.length <= 3) return;
                                                const newCoords = selectedPolygon.coordinates.filter((_, i) => i !== idx);
                                                const newArea = window.L.GeometryUtil.geodesicArea(newCoords.map(c => window.L.latLng(c.lat, c.lng)));
                                                setSelectedPolygon({...selectedPolygon, coordinates: newCoords, area: newArea});
                                                const layer = drawItemsRef.current.getLayers().find(l => l.options.dbId === selectedPolygon.id);
                                                if (layer) layer.setLatLngs(newCoords);
                                                
                                                if (selectedPolygon.source === 'cloud') {
                                                    await updateDoc(doc(db, 'feo_polygons', selectedPolygon.id), { coordinates: newCoords, area: newArea });
                                                } else {
                                                    const localData = JSON.parse(localStorage.getItem('feo_polygons_local') || '[]');
                                                    const updated = localData.map(p => p.id === selectedPolygon.id ? {...p, coordinates: newCoords, area: newArea} : p);
                                                    localStorage.setItem('feo_polygons_local', JSON.stringify(updated));
                                                }
                                            }}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.5 }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={async () => {
                                        const last = selectedPolygon.coordinates[selectedPolygon.coordinates.length - 1];
                                        const newCoords = [...selectedPolygon.coordinates, { lat: last.lat + 0.0001, lng: last.lng + 0.0001 }];
                                        setSelectedPolygon({...selectedPolygon, coordinates: newCoords});
                                        const layer = drawItemsRef.current.getLayers().find(l => l.options.dbId === selectedPolygon.id);
                                        if (layer) layer.setLatLngs(newCoords);
                                        
                                        if (selectedPolygon.source === 'cloud') {
                                            await updateDoc(doc(db, 'feo_polygons', selectedPolygon.id), { coordinates: newCoords });
                                        } else {
                                            const localData = JSON.parse(localStorage.getItem('feo_polygons_local') || '[]');
                                            const updated = localData.map(p => p.id === selectedPolygon.id ? {...p, coordinates: newCoords} : p);
                                            localStorage.setItem('feo_polygons_local', JSON.stringify(updated));
                                        }
                                    }}
                                >
                                    + ADD VERTEX POINT
                                </button>
                            </div>
                            
                            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '0.5rem' }}>DISTANCE TO NEAREST ROAD (METERS)</label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <Ruler size={16} color="#60a5fa" />
                                    <input 
                                        type="number" 
                                        value={selectedPolygon.distanceToRoad || ''} 
                                        placeholder="e.g. 50"
                                        onChange={async (e) => {
                                            const newVal = e.target.value === '' ? '' : parseFloat(e.target.value);
                                            setSavedPolygons(prev => prev.map(p => p.id === selectedPolygon.id ? {...p, distanceToRoad: newVal} : p));
                                            setSelectedPolygon({...selectedPolygon, distanceToRoad: newVal});
                                            
                                            if (selectedPolygon.source === 'cloud') {
                                                await updateDoc(doc(db, 'feo_polygons', selectedPolygon.id), { distanceToRoad: newVal });
                                            } else {
                                                const localData = JSON.parse(localStorage.getItem('feo_polygons_local') || '[]');
                                                const updated = localData.map(p => p.id === selectedPolygon.id ? {...p, distanceToRoad: newVal} : p);
                                                localStorage.setItem('feo_polygons_local', JSON.stringify(updated));
                                            }
                                        }}
                                        className="input-modern" 
                                        style={{ width: '100%' }} 
                                    />
                                    <button 
                                        onClick={() => {
                                            if (window.L && mapRef.current) {
                                                setIsMeasuringDistance(true);
                                                new window.L.Draw.Polyline(mapRef.current, {
                                                    shapeOptions: { color: '#f87171', weight: 4, dashArray: '5, 5' }
                                                }).enable();
                                                setLastActionStatus('Draw a line from the polygon to the road');
                                            }
                                        }}
                                        className="btn btn-glass"
                                        style={{ padding: '0.65rem', flexShrink: 0, color: isMeasuringDistance ? '#f87171' : '#60a5fa' }}
                                        title="Measure Visually on Map"
                                    >
                                        <Crosshair size={16} />
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                                    This value will be displayed on the map layout produced in the Map Producer tool.
                                </p>
                            </div>


                        </div>
                        <div style={{ padding: '1.25rem', background: 'rgba(59, 130, 246, 0.1)', borderTop: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <div className="flex-between">
                                <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 800 }}>ANALYZED AREA</span>
                                <span style={{ fontWeight: 900, color: '#fff' }}>{(selectedPolygon.area / 10000).toFixed(4)} HA</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Importing HUD */}
            {isImporting && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 5000, background: 'rgba(8, 10, 12, 0.8)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                        <div style={{ position: 'absolute', inset: 0, border: '4px solid rgba(59, 130, 246, 0.1)', borderRadius: '50%' }}></div>
                        <div style={{ position: 'absolute', inset: 0, border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <Layers size={32} color="#3b82f6" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                    </div>
                    <h3 style={{ color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '1.2rem', letterSpacing: '2px' }}>PROCESSING GIS DATA</h3>
                    <p style={{ color: '#60a5fa', fontSize: '0.85rem', fontWeight: 700 }}>{lastActionStatus || 'Optimizing shapes...'}</p>
                    <div style={{ width: '200px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '1.5rem', overflow: 'hidden' }}>
                        <div style={{ width: '100%', height: '100%', background: '#3b82f6', animation: 'progressIndeterminate 2s ease-in-out infinite' }}></div>
                    </div>
                </div>
            )}

            {/* Save Modal */}
            {showSaveModal && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="surface-glass" style={{ width: '400px', padding: '2rem', borderRadius: '24px', border: '1px solid var(--denr-blue-light)' }}>
                        <h3 style={{ margin: 0, marginBottom: '1.5rem', color: 'var(--denr-blue-light)' }}>Confirm Shape Analysis</h3>
                        <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Assign Location / Site Name:</label>
                        <input type="text" value={newPolyName} onChange={e => setNewPolyName(e.target.value)} className="input-modern" style={{ width: '100%', marginBottom: '1rem' }} autoFocus />
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
                            <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                                <span style={{ color: '#888', fontSize: '0.7rem' }}>CALCULATED AREA</span>
                                <span style={{ color: '#fff', fontWeight: 800 }}>{(measurement.area / 10000).toFixed(4)} HA</span>
                            </div>
                        </div>
                        <div className="flex-center gap-4">
                            <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => { 
                                if (currentDrawnLayer) drawItemsRef.current.removeLayer(currentDrawnLayer);
                                setShowSaveModal(false); 
                            }}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSavePolygon} disabled={isSaving}>
                                {isSaving ? 'Processing...' : 'Confirm & Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modern Confirm Modal */}
            {confirmDialog && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="surface-glass" style={{ width: '350px', padding: '2rem', borderRadius: '24px', border: '1px solid var(--denr-blue-light)' }}>
                        <div className="flex-center gap-2" style={{ marginBottom: '1rem', color: '#ef4444' }}>
                            <AlertTriangle size={24} />
                            <h3 style={{ margin: 0 }}>Confirm Action</h3>
                        </div>
                        <p style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                            {confirmDialog.message}
                        </p>
                        <div className="flex-center gap-4">
                            <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => setConfirmDialog(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }} onClick={() => {
                                confirmDialog.onConfirm();
                                setConfirmDialog(null);
                            }}>Proceed</button>
                        </div>
                    </div>
                </div>
            )}

            {lastActionStatus && (
                <div style={{ position: 'absolute', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(5, 150, 105, 0.95)', color: '#fff', padding: '0.6rem 1.25rem', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, boxShadow: '0 10px 25px rgba(0,0,0,0.4)', animation: 'slideInBottom 0.3s ease-out' }}>
                    <CheckCircle2 size={16} /> {lastActionStatus.toUpperCase()}
                </div>
            )}

            {/* GIS ATTRIBUTES SIDE PANEL (VERTICAL RECTANGLE) */}
            {showAttributeModal && selectedPolygon && (
                <div 
                    ref={el => {
                        if (el && window.L) {
                            window.L.DomEvent.disableScrollPropagation(el);
                            window.L.DomEvent.disableClickPropagation(el);
                        }
                    }}
                    onWheel={(e) => e.stopPropagation()} 
                    style={{ 
                        position: 'absolute', 
                        top: '1.5rem', 
                        right: '370px', 
                        zIndex: 600, 
                        width: '340px', 
                        height: 'calc(100% - 3rem)', 
                        overflow: 'hidden',
                        pointerEvents: 'auto'
                    }}
                >
                    <div className="surface-glass" style={{ borderRadius: '24px', background: 'rgba(15, 23, 42, 0.95)', border: '2px solid #60a5fa', display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
                        <div style={{ padding: '1.25rem', background: 'rgba(59, 130, 246, 0.1)', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="flex-center gap-3">
                                <Layers size={18} color="#60a5fa" />
                                <h4 style={{ margin: 0, color: '#fff', fontSize: '0.85rem', letterSpacing: '0.5px' }}>ARCGIS ATTRIBUTES</h4>
                            </div>
                            <button onClick={() => setShowAttributeModal(false)} className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', width: '30px', height: '30px' }}>
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div 
                            ref={el => {
                                if (el && window.L) {
                                    window.L.DomEvent.disableScrollPropagation(el);
                                    window.L.DomEvent.disableClickPropagation(el);
                                }
                            }}
                            style={{ 
                                flex: 1, 
                                overflowY: 'auto', 
                                padding: '1.25rem',
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#60a5fa rgba(255,255,255,0.05)'
                            }} 
                            className="custom-scrollbar"
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {(() => {
                                    const priority = ['NAME', 'PARTNER ORGANIZATION NAME', 'REGION', 'MUNICIPALITY', 'BARANGAY', 'SITE_NAME', 'AREA_HA', 'TENURE_HOL', 'CTRCT_ID', 'CONTRACT_ID', 'PROJECT'];
                                    return Object.entries(selectedPolygon.attributes)
                                        .sort((a, b) => {
                                            const idxA = priority.findIndex(p => p.toUpperCase() === a[0].toUpperCase());
                                            const idxB = priority.findIndex(p => p.toUpperCase() === b[0].toUpperCase());
                                            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                                            if (idxA !== -1) return -1;
                                            if (idxB !== -1) return 1;
                                            return a[0].localeCompare(b[0]);
                                        })
                                        .map(([key, val]) => {
                                            const isLandClass = key.toLowerCase().includes('land') || key.toLowerCase().includes('class');
                                            return (
                                                <div key={key} style={{ 
                                                    padding: '0.85rem', borderRadius: '12px', 
                                                    background: isLandClass ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                                                    border: `1px solid ${isLandClass ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.05)'}`
                                                }}>
                                                    <div style={{ fontSize: '0.6rem', color: isLandClass ? '#60a5fa' : '#888', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.2rem' }}>{key}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600, wordBreak: 'break-word' }}>
                                                        {val !== undefined && val !== null && val !== '' ? String(val) : <span style={{ opacity: 0.2, fontWeight: 400, fontStyle: 'italic' }}>N/A</span>}
                                                    </div>
                                                </div>
                                            );
                                        });
                                })()}
                            </div>
                        </div>
                        <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.65rem', color: '#666' }}>ArcGIS Metadata Source Protocol 1.0</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);
};

export default FeoShapefileMap;
