import React, { useEffect, useRef, useState } from 'react';
import { 
    Download, Map as MapIcon, Layers, ChevronRight, 
    Compass, Ruler, List, Info, CheckCircle2, Globe,
    Printer, Image as ImageIcon, Maximize2, FileText,
    Shield, Target, Navigation, Layout, MapPin,
    ChevronDown, ChevronUp, Folder, FolderOpen, Eye, EyeOff, X, Trash2
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const NorthArrowSVG = () => (
    <svg width="60" height="60" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="black" strokeWidth="1" />
        <path d="M50 5 L58 45 L50 40 L42 45 Z" fill="black" />
        <path d="M50 95 L58 55 L50 60 L42 55 Z" fill="#ddd" stroke="black" strokeWidth="0.5" />
        <text x="50" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fontFamily="Arial, Helvetica, sans-serif">N</text>
        <line x1="20" y1="50" x2="80" y2="50" stroke="black" strokeWidth="0.5" />
        <line x1="50" y1="20" x2="50" y2="80" stroke="black" strokeWidth="0.5" />
    </svg>
);

class MapProducerErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("MapProducer Caught Error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', background: '#080a0c', height: '100%', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '2rem', borderRadius: '12px', maxWidth: '600px', textAlign: 'center' }}>
                        <h3 style={{ color: '#ef4444', marginTop: 0 }}>Map Producer Render Error</h3>
                        <p style={{ fontSize: '0.85rem', color: '#ccc' }}>A corrupted imported shapefile caused a visual crash. Please delete the problematic shapefile in the Database.</p>
                        <div style={{ background: '#000', padding: '1rem', borderRadius: '8px', fontSize: '0.75rem', fontFamily: 'monospace', color: '#ff8a8a', overflowX: 'auto', textAlign: 'left', marginBottom: '1.5rem' }}>
                            {this.state.error?.toString()}
                        </div>
                        <button 
                            onClick={() => this.setState({ hasError: false, error: null })}
                            style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Reload Map Producer
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const FeoMapProducerContent = () => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const mapContainerRefMini = useRef(null);
    const mapRefMini = useRef(null);
    const [savedPolygons, setSavedPolygons] = useState([]);
    const [selectedPolys, setSelectedPolys] = useState([]);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [layoutDesign, setLayoutDesign] = useState('design1'); // design1 = Overlay, design2 = Sidebar
    const [activeBaseLayer, setActiveBaseLayer] = useState('Satellite');
    const [openFolders, setOpenFolders] = useState(['Ungrouped']);
    const [mapBounds, setMapBounds] = useState({
        north: 9.85, south: 9.81, east: 118.75, west: 118.71
    });
    const [lastActionStatus, setLastActionStatus] = useState('');
    const [showAllTrails, setShowAllTrails] = useState(true);
    const [groupedFolderIds, setGroupedFolderIds] = useState([]); // Folders to treat as 1 entity in Legend
    const [folderColors, setFolderColors] = useState({}); // Custom colors for folders
    // Geotagged Photos Feature
    const [geoPhotoMarkers, setGeoPhotoMarkers] = useState([]);
    const [layoutPhotos, setLayoutPhotos] = useState([]);  // { id, name, photo, lat, lng, offsetX, offsetY, x, y, size, locked }
    const geoPhotoLayerGroupRef = useRef(null);
    const [gpkgLoading, setGpkgLoading] = useState(false);
    const gpkgInputRef = useRef(null);
    const dragRef = useRef(null);
    const manualPhotoRef = useRef(null);
    const [manualCoord, setManualCoord] = useState({ lat: '', lng: '', name: '', photo: null });
    const [showManualForm, setShowManualForm] = useState(false);
    const [coordFormat, setCoordFormat] = useState('latlong');
    const resizeDragRef = useRef(null);
    const [isExporting, setIsExporting] = useState(false);    // hides UI controls during export
    const [mapMoveCounter, setMapMoveCounter] = useState(0);  // triggers re-render when map pans/zooms
    const [inspectedPolyId, setInspectedPolyId] = useState(null); // tracking for parcel details view
    const [showAttributeModal, setShowAttributeModal] = useState(false);

    // Load Leaflet Robustly
    useEffect(() => {
        if (window.L) { setMapLoaded(true); return; }
        
        console.log('[MapProducer] Establishing GIS environment...');
        const href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        if (!document.querySelector(`link[href="${href}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet'; link.href = href; document.head.appendChild(link);
        }
        
        const src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        if (!document.querySelector(`script[src="${src}"]`)) {
            const script = document.createElement('script');
            script.src = src; script.async = true;
            script.onload = () => { console.log('[MapProducer] GIS Engine Ready.'); setMapLoaded(true); };
            script.onerror = () => { console.error('[MapProducer] GIS Engine Failed.'); };
            document.head.appendChild(script);
        } else {
            setMapLoaded(true);
        }

        const timer = setTimeout(() => {
            if (window.L) setMapLoaded(true);
            else console.warn('[MapProducer] Connection slow...');
        }, 15000);

        return () => clearTimeout(timer);
    }, []);

    // Load Data
    useEffect(() => {
        const q = query(collection(db, 'feo_polygons'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const firestorePolygons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'cloud' }));
            
            // Self-Healing: Automatically identify and purge corrupted polygons that cause crashes
            const validPolygons = [];
            for (const poly of firestorePolygons) {
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
                    console.warn(`[MapProducer] Auto-purging corrupted polygon: ${poly.name} (${poly.id})`);
                    // We don't await here to avoid blocking the main UI thread
                    deleteDoc(doc(db, 'feo_polygons', poly.id)).catch(e => console.error("Cleanup failed", e));
                } else {
                    validPolygons.push(poly);
                }
            }

            try {
                const localData = JSON.parse(localStorage.getItem('feo_polygons_local') || '[]');
                setSavedPolygons([...validPolygons, ...(Array.isArray(localData) ? localData : [])]);
            } catch (err) {
                console.error('Error parsing local polygons:', err);
                setSavedPolygons(validPolygons);
            }
        }, (err) => {
            console.warn("Firestore error in Map Producer", err);
            try {
                const localData = JSON.parse(localStorage.getItem('feo_polygons_local') || '[]');
                setSavedPolygons(Array.isArray(localData) ? localData : []);
            } catch (e) {
                setSavedPolygons([]);
            }
        });
        return () => unsubscribe();
    }, []);

    // Initialize Preview Map
    useEffect(() => {
        if (!mapLoaded || !mapContainerRef.current || !window.L) return;
        
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }

        const L = window.L;
        const map = L.map(mapContainerRef.current, {
            center: [9.8349, 118.7384],
            zoom: 12,
            zoomControl: false,
            attributionControl: false,
            dragging: true, // Allow slight dragging for final layout adjustments
            scrollWheelZoom: true,
            doubleClickZoom: true,
            renderer: L.canvas({ padding: 0.5 }) // FORCE Canvas renderer to prevent SVG DOM crash with huge imported shapefiles
        });
        const satellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom: 22, maxNativeZoom: 20 });
        const terrain = L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', { maxZoom: 22, maxNativeZoom: 20 });
        const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 22, maxNativeZoom: 20 });
        
        map.baseLayers = { "Satellite": satellite, "Terrain": terrain, "Dark": dark };
        
        if (activeBaseLayer === 'Satellite') satellite.addTo(map);
        else if (activeBaseLayer === 'Terrain') terrain.addTo(map);
        else dark.addTo(map);

        L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);

        mapRef.current = map;

        // Initialize Mini Map
        if (mapContainerRefMini.current) {
            if (mapRefMini.current) {
                mapRefMini.current.remove();
            }
            const mapMini = L.map(mapContainerRefMini.current, {
                center: [9.8349, 118.7384],
                zoom: 7,
                zoomControl: false,
                attributionControl: false,
                dragging: false,
                scrollWheelZoom: false,
                doubleClickZoom: false
            });
            L.tileLayer('https://mt1.google.com/vt/lyrs=y,h&x={x}&y={y}&z={z}', { maxZoom: 10 }).addTo(mapMini);
            mapRefMini.current = mapMini;
        }

        const updateBounds = () => {
            const b = map.getBounds();
            if (b && b.isValid()) {
                setMapBounds({
                    north: b.getNorth(),
                    south: b.getSouth(),
                    east: b.getEast(),
                    west: b.getWest()
                });
            }
        };

        map.on('moveend', updateBounds);
        map.on('zoomend', updateBounds);
        // Re-render GPS-anchored layout photos when map pans or zooms
        map.on('move', () => setMapMoveCounter(c => c + 1));
        map.on('zoom', () => setMapMoveCounter(c => c + 1));

        // Fix Leaflet blank state in React tabs/modals
        const observer = new ResizeObserver(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
        });
        observer.observe(mapContainerRef.current);

        return () => {
            observer.disconnect();
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            if (mapRefMini.current) {
                mapRefMini.current.remove();
                mapRefMini.current = null;
            }
        };
    }, [mapLoaded, layoutDesign]); // Re-init on layout change since DOM node might rebuild

    // Update Map when polygon or layout changes
    useEffect(() => {
        if (!mapRef.current || window.L === undefined) return;
        const L = window.L;
        const map = mapRef.current;
        
        map.eachLayer(layer => {
            if (layer instanceof L.Polygon || layer instanceof L.Marker || layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });

        if (mapRefMini.current) {
            mapRefMini.current.eachLayer(layer => {
                if (layer instanceof L.Marker || layer instanceof L.Polygon) {
                    mapRefMini.current.removeLayer(layer);
                }
            });
        }

        if (selectedPolys.length === 0) {
            return;
        }

        const bounds = L.latLngBounds();

        selectedPolys.forEach(poly => {
            if (!poly.coordinates || !Array.isArray(poly.coordinates) || poly.coordinates.length === 0) return;

            try {
                // Normalize coordinates: handle both {lat,lng} objects and raw [lng,lat,z?] arrays from old imports
                const normalizeCoord = (c) => {
                    if (Array.isArray(c)) return { lat: Number(c[1]), lng: Number(c[0]) };
                    return { lat: Number(c.lat), lng: Number(c.lng) };
                };
                let coordsToDraw = poly.coordinates
                    .map(normalizeCoord)
                    .filter(c => !isNaN(c.lat) && !isNaN(c.lng) && isFinite(c.lat) && isFinite(c.lng));

                if (coordsToDraw.length < 2) return;

                // Point Decimation: Simplify massive shapefiles to prevent GPU/Browser crash (Black Screen)
                if (coordsToDraw.length > 500) {
                    const step = Math.ceil(coordsToDraw.length / 500);
                    coordsToDraw = coordsToDraw.filter((_, idx) => idx % step === 0);
                    // Ensure the polygon visually closes properly after decimation
                    if (poly.geometryType !== 'polyline' && coordsToDraw.length > 0) {
                        coordsToDraw.push(coordsToDraw[0]);
                    }
                }

                // Filter out standalone trails if toggled OFF
                if (poly.geometryType === 'polyline' && !showAllTrails) return;

                // Use consistent color for grouped folders
                let polyColor = poly.color || '#3b82f6';
                if (poly.folder && groupedFolderIds.includes(poly.folder)) {
                    if (folderColors[poly.folder]) {
                        polyColor = folderColors[poly.folder];
                    } else {
                        const firstInFolder = selectedPolys.find(p => p.folder === poly.folder);
                        if (firstInFolder) polyColor = firstInFolder.color || '#3b82f6';
                    }
                }

                const layer = poly.geometryType === 'polyline'
                    ? L.polyline(coordsToDraw, { color: polyColor, weight: 3 }).addTo(map)
                    : L.polygon(coordsToDraw, { color: polyColor, weight: 3, fillColor: polyColor, fillOpacity: 0.2 }).addTo(map);
                    
                // Render internal distance line if exists and trails are ON
                if (poly.distanceLineCoords && poly.distanceLineCoords.length > 0 && showAllTrails) {
                    L.polyline(poly.distanceLineCoords, {
                        color: '#ef4444',
                        weight: 2,
                        dashArray: '5, 8',
                        interactive: false
                    }).addTo(map);
                }

                bounds.extend(layer.getBounds());
            } catch (err) {
                console.error("Error drawing polygon layout:", err);
            }
        });

        if (bounds.isValid()) {
            try {
                // Add maxZoom: 18 to prevent zooming into infinity for tiny GIS sliver polygons
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
                setTimeout(() => {
                    if (mapRef.current) {
                        const b = mapRef.current.getBounds();
                        setMapBounds({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
                    }
                    if (mapRefMini.current) {
                        const center = bounds.getCenter();
                        mapRefMini.current.setView(center, 9); // Slightly closer for context
                        
                        // Also draw the polygons on the mini-map for "sense"
                        selectedPolys.forEach(poly => {
                            if (!poly.coordinates || poly.coordinates.length === 0) return;
                            
                            let polyColor = poly.color || '#3b82f6';
                            if (poly.folder && groupedFolderIds.includes(poly.folder) && folderColors[poly.folder]) {
                                polyColor = folderColors[poly.folder];
                            }

                            // Normalize coords (handle both {lat,lng} objects and raw [lng,lat,z?] arrays)
                            const miniCoords = poly.coordinates.map(c =>
                                Array.isArray(c) ? { lat: Number(c[1]), lng: Number(c[0]) } : { lat: Number(c.lat), lng: Number(c.lng) }
                            ).filter(c => !isNaN(c.lat) && !isNaN(c.lng));
                            if (miniCoords.length < 2) return;

                            L.polygon(miniCoords, {
                                color: polyColor,
                                weight: 1,
                                fillOpacity: 0.4
                            }).addTo(mapRefMini.current);
                        });
                        
                        L.marker(center).addTo(mapRefMini.current);
                    }
                }, 400);
            } catch (err) {
                console.error("Error fitting bounds:", err);
            }
        }

    }, [selectedPolys, layoutDesign, showAllTrails, folderColors]);

    // Render geotagged photo markers on the map
    useEffect(() => {
        if (!mapRef.current || !window.L) return;
        const L = window.L;
        const map = mapRef.current;
        // Remove old photo layer
        if (geoPhotoLayerGroupRef.current) {
            geoPhotoLayerGroupRef.current.clearLayers();
        } else {
            geoPhotoLayerGroupRef.current = L.layerGroup().addTo(map);
        }
        geoPhotoMarkers.forEach(pt => {
            const icon = L.divIcon({
                className: '',
                html: `<div style="width:14px;height:14px;border-radius:50%;background:#f59e0b;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.8);cursor:pointer;"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7]
            });
            const marker = L.marker([pt.lat, pt.lng], { icon });
            let popupHtml = `<div style="font-family:Arial;font-size:11px;max-width:180px;">`;
            if (pt.photo) {
                popupHtml += `<img src="${pt.photo}" style="width:100%;border-radius:4px;margin-bottom:6px;"/>`;
            }
            popupHtml += `<b>${pt.name}</b><br/><span style="color:#666;">${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}</span>`;
            popupHtml += `</div>`;
            marker.bindPopup(popupHtml);
            if (geoPhotoLayerGroupRef.current) {
                geoPhotoLayerGroupRef.current.addLayer(marker);
            }
        });
    }, [geoPhotoMarkers, mapLoaded]);

    // Parse GPKG geometry (WKB after GPKG header)
    const parseGPKGGeom = (bytes) => {
        try {
            if (!bytes || bytes.length < 9) return null;
            if (bytes[0] !== 0x47 || bytes[1] !== 0x50) return null; // 'GP' magic
            const flags = bytes[3];
            const envelopeCode = (flags >> 1) & 0x07;
            const envBytes = [0, 32, 48, 48, 64];
            const wkbStart = 8 + (envBytes[Math.min(envelopeCode, 4)] || 0);
            const view = new DataView(bytes.buffer, bytes.byteOffset + wkbStart);
            const le = view.getUint8(0) === 1;
            const gType = view.getUint32(1, le);
            if (gType === 1) { // Point
                return { lng: view.getFloat64(5, le), lat: view.getFloat64(13, le) };
            }
            return null;
        } catch { return null; }
    };

    // Replace GPKG import with EXIF GPS JPG reader
    const handleImportGeoJPG = async (files) => {
        if (!files || files.length === 0) return;
        setGpkgLoading(true);
        setLastActionStatus('READING GPS FROM PHOTOS...');
        try {
            // Load exifr library for EXIF GPS parsing
            if (!window.exifr) {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'https://unpkg.com/exifr/dist/full.umd.cjs';
                    s.onload = resolve; s.onerror = reject;
                    document.head.appendChild(s);
                });
            }
            const newMarkers = [];
            for (const file of Array.from(files)) {
                try {
                    const gps = await window.exifr.gps(file);
                    if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
                        const photo = await new Promise(resolve => {
                            const reader = new FileReader();
                            reader.onload = e => resolve(e.target.result);
                            reader.readAsDataURL(file);
                        });
                        newMarkers.push({
                            id: `jpg_${Date.now()}_${newMarkers.length}`,
                            lat: gps.latitude,
                            lng: gps.longitude,
                            name: file.name.replace(/\.[^/.]+$/, ''),
                            photo
                        });
                    } else {
                        setLastActionStatus(`NO GPS IN: ${file.name}`);
                    }
                } catch (err) { console.warn('EXIF parse error:', file.name, err); }
            }
            if (newMarkers.length > 0) {
                setGeoPhotoMarkers(prev => [...prev, ...newMarkers]);
                if (mapRef.current) mapRef.current.flyTo([newMarkers[0].lat, newMarkers[0].lng], 15);
                // Auto-insert each photo into the layout, GPS-anchored and locked
                setLayoutPhotos(prev => [
                    ...prev,
                    ...newMarkers.map((m, i) => ({
                        id: `lp_${Date.now()}_${i}`,
                        name: m.name,
                        photo: m.photo,
                        lat: m.lat,
                        lng: m.lng,
                        offsetX: 5,
                        offsetY: -5,
                        size: 80,
                        locked: true
                    }))
                ]);
                setLastActionStatus(`IMPORTED & INSERTED ${newMarkers.length} GEOTAGGED PHOTO(S)`);
            } else {
                setLastActionStatus('NO GPS DATA FOUND IN SELECTED PHOTOS');
            }
        } catch (e) {
            console.error('JPG GPS Import failed:', e);
            setLastActionStatus(`IMPORT ERROR: ${e.message}`);
        }
        setGpkgLoading(false);
        setTimeout(() => setLastActionStatus(''), 4000);
    };

    const addPhotoToLayout = (pt) => {
        if (!pt.photo) { setLastActionStatus('No photo data in this point.'); setTimeout(() => setLastActionStatus(''), 2500); return; }
        setLayoutPhotos(prev => [...prev, {
            id: `lp_${Date.now()}`,
            name: pt.name,
            photo: pt.photo,
            lat: pt.lat,
            lng: pt.lng,
            offsetX: 5,
            offsetY: -5,
            x: 60, y: 60,
            size: 80,
            locked: false
        }]);
        setLastActionStatus(`PHOTO INSERTED — drag to position then click ✓ LOCK`);
        setTimeout(() => setLastActionStatus(''), 3500);
    };

    const startDragPhoto = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = { id, startX: e.clientX, startY: e.clientY };
        const move = (ev) => {
            if (!dragRef.current) return;
            const dx = (ev.clientX - dragRef.current.startX) / 0.65;
            const dy = (ev.clientY - dragRef.current.startY) / 0.65;
            setLayoutPhotos(prev => prev.map(lp => {
                if (lp.id !== dragRef.current.id) return lp;
                // GPS-anchored: move via offset; free: move x/y
                if (lp.lat !== undefined && lp.lng !== undefined) {
                    return { ...lp, offsetX: (lp.offsetX || 5) + dx, offsetY: (lp.offsetY || -5) + dy };
                }
                return { ...lp, x: (lp.x || 60) + dx, y: (lp.y || 60) + dy };
            }));
            dragRef.current.startX = ev.clientX;
            dragRef.current.startY = ev.clientY;
        };
        const up = () => { dragRef.current = null; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    const startResizePhoto = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        // Read startSize from current layoutPhotos via setState prev pattern
        let startSize = 80;
        setLayoutPhotos(prev => { startSize = prev.find(lp => lp.id === id)?.size ?? 80; return prev; });
        // Use rAF to ensure startSize is set before adding listeners
        requestAnimationFrame(() => {
            const move = (ev) => {
                const dx = (ev.clientX - startX) / 0.65;
                const newSize = Math.max(40, Math.min(280, startSize + dx));
                setLayoutPhotos(prev => prev.map(lp => lp.id === id ? { ...lp, size: Math.round(newSize) } : lp));
            };
            const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
        });
    };

    const changeLayer = (name) => {
        if (!mapRef.current || !mapRef.current.baseLayers) return;
        const map = mapRef.current;
        Object.values(map.baseLayers).forEach(layer => map.removeLayer(layer));
        if (map.baseLayers[name]) {
            map.baseLayers[name].addTo(map);
            setActiveBaseLayer(name);
        }
    };

    const handleExportPDF = async () => {
        const wrapper = document.getElementById('print-layout-wrapper');
        const layout = document.getElementById('print-layout');
        if (!wrapper || !layout) {
            setLastActionStatus('ERROR: Layout not found.');
            return;
        }
        
        setLastActionStatus('PREPARING GIS DATA FOR PDF...');
        try {
            const originalTransform = wrapper.style.transform;
            wrapper.style.transform = 'none';
            setIsExporting(true); // Hide UI controls (X, resize, lock buttons)
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); // Wait for React DOM update
            await new Promise(r => setTimeout(r, 400)); // Extra stabilization

            const canvas = await html2canvas(layout, { 
                scale: 2, 
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    const el = clonedDoc.getElementById('print-layout');
                    if (el) {
                        el.style.transform = 'none';
                        el.style.width = '297mm';
                        el.style.height = '210mm';
                        el.style.margin = '0';
                        // Keep original padding so coordinate labels (-28px offset) stay inside bounds
                        el.style.padding = '25px 35px';
                        el.style.overflow = 'visible';
                        el.style.boxSizing = 'border-box';

                        // Hide/remove UI-only controls (delete buttons, resize handles) from export
                        el.querySelectorAll('.map-ui-control').forEach(ctrl => ctrl.remove());

                        // Make all position:relative containers show overflow
                        el.querySelectorAll('*').forEach(node => {
                            if (node.style && node.style.overflow === 'hidden') {
                                node.style.overflow = 'visible';
                            }
                        });

                        // Ensure input values are visible to html2canvas (keep as inputs to preserve layout height)
                        const inputs = el.querySelectorAll('input');
                        inputs.forEach(inp => {
                            inp.value = inp.defaultValue || inp.value || '';
                            inp.style.cursor = 'default';
                        });
                    }
                    // Force legend to expand and hide scrollbars during capture
                    clonedDoc.querySelectorAll('.legend-scroll-container').forEach(s => {
                        s.style.overflow = 'visible';
                        s.style.maxHeight = 'none';
                        s.style.height = 'auto';
                        if (s.parentElement) {
                            s.parentElement.style.overflow = 'visible';
                            s.parentElement.style.height = 'auto';
                        }
                    });
                }
            });
            
            wrapper.style.transform = originalTransform;
            setIsExporting(false);
            setLastActionStatus('CONVERTING TO PDF FORMAT...');

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
            pdf.save(`DENR_FEO_Map_${new Date().getTime()}.pdf`);
            setLastActionStatus('MAP EXPORTED SUCCESSFULLY!');
        } catch (e) {
            console.error("Export PDF failed", e);
            setIsExporting(false);
            setLastActionStatus(`EXPORT FAILED: ${e.message}`);
        }
        setTimeout(() => setLastActionStatus(''), 4000);
    };

    const handleExportImage = async () => {
        const wrapper = document.getElementById('print-layout-wrapper');
        const layout = document.getElementById('print-layout');
        if (!wrapper || !layout) {
            setLastActionStatus('ERROR: Layout not found.');
            return;
        }

        setLastActionStatus('RENDERING GIS IMAGE...');
        try {
            const originalTransform = wrapper.style.transform;
            wrapper.style.transform = 'none';
            setIsExporting(true);
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            await new Promise(r => setTimeout(r, 400));

            const canvas = await html2canvas(layout, { 
                scale: 2, 
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    const el = clonedDoc.getElementById('print-layout');
                    if (el) {
                        el.style.transform = 'none';
                        el.style.position = 'relative';
                        el.style.width = '297mm';
                        el.style.height = '210mm';
                        el.style.margin = '0';
                        el.style.padding = '25px 35px';
                        el.style.overflow = 'visible';
                        el.style.boxSizing = 'border-box';

                        // Hide/remove UI-only controls from export
                        el.querySelectorAll('.map-ui-control').forEach(ctrl => ctrl.remove());

                        el.querySelectorAll('*').forEach(node => {
                            if (node.style && node.style.overflow === 'hidden') {
                                node.style.overflow = 'visible';
                            }
                        });

                        // Ensure input values visible to html2canvas (keep as inputs to preserve layout height)
                        const inputs = el.querySelectorAll('input');
                        inputs.forEach(inp => {
                            inp.value = inp.defaultValue || inp.value || '';
                            inp.style.cursor = 'default';
                        });
                    }
                    clonedDoc.querySelectorAll('.legend-scroll-container').forEach(s => {
                        s.style.overflow = 'visible';
                        s.style.maxHeight = 'none';
                        s.style.height = 'auto';
                        if (s.parentElement) {
                            s.parentElement.style.overflow = 'visible';
                            s.parentElement.style.height = 'auto';
                            s.parentElement.style.minHeight = 'auto';
                        }
                    });
                }
            });
            
            wrapper.style.transform = originalTransform;
            setIsExporting(false);

            const link = document.createElement('a');
            link.download = `DENR_FEO_Map_${new Date().getTime()}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 1.0);
            link.click();
            setLastActionStatus('IMAGE DOWNLOADED!');
        } catch (e) {
            console.error("Export Image failed", e);
            setIsExporting(false);
            setLastActionStatus(`EXPORT FAILED: ${e.message}`);
        }
        setTimeout(() => setLastActionStatus(''), 4000);
    };

    const renderScaleBar = () => {
        if (!mapRef.current) return null;
        try {
            const map = mapRef.current;
            const zoom = map.getZoom();
            const center = map.getCenter();
            
            // Precise Meters per pixel (Leaflet standard)
            const lat = center.lat;
            const mpp = (40075016.686 * Math.abs(Math.cos(lat * Math.PI / 180))) / Math.pow(2, zoom + 8);
            
            // Representative Fraction (Scale 1:X) - Assuming standard 96 DPI
            const rf = Math.round(mpp * 3779.5275); 
            const formattedRf = `1:${rf.toLocaleString()}`;

            // Nice distances: 10, 20, 50, 100, 200, 500, 1k, 2k, 5k...
            const niceDistances = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
            const maxPxWidth = 140; 
            let totalDist = 5;
            for (let d of niceDistances) {
                if (d / mpp <= maxPxWidth) totalDist = d;
            }
            
            const fullWidth = totalDist / mpp;
            const unit = totalDist >= 1000 ? "Km" : "m";
            const val = totalDist >= 1000 ? totalDist / 1000 : totalDist;

            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', pointerEvents: 'none', padding: '5px 0' }}>
                    {/* Numerical Scale */}
                    <div style={{ fontSize: '8pt', fontWeight: 'bold', marginBottom: '14px', fontFamily: 'serif' }}>{formattedRf}</div>
                    
                    {/* Multi-tic Bar Scale */}
                    <div style={{ position: 'relative', width: `${fullWidth}px`, height: '8px', borderBottom: '1.5px solid #000' }}>
                        {/* Tics and Labels */}
                        {[0, 0.25, 0.5, 1].map((pct) => {
                            const d = val * pct;
                            const label = pct === 1 ? `${d} ${unit}` : `${d.toFixed(d < 1 ? 3 : 1).replace(/\.?0+$/, '')}`;
                            return (
                                <div key={pct} style={{ position: 'absolute', left: `${pct * 100}%`, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ position: 'absolute', bottom: '8px', fontSize: '6pt', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{label}</div>
                                    <div style={{ width: '1.5px', height: '6px', background: '#000' }}></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        } catch (e) { return null; }
    };

    const renderCoordinates = () => {
        const safeFixed = (val, dec) => {
            const n = Number(val);
            return isNaN(n) ? "0.000" : n.toFixed(dec);
        };
        
        // Calculate dynamic coordinate tics based on ACTUAL map bounds
        const latTics = [mapBounds.south, (mapBounds.south + mapBounds.north) / 2, mapBounds.north];
        const lngTics = [mapBounds.west, (mapBounds.west + mapBounds.east) / 2, mapBounds.east];
        
        return (
            <>
                {/* Top Longitudes */}
                <div style={{ position: 'absolute', top: '-18px', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 8%', fontSize: '8pt', fontWeight: 'bold', zIndex: 1000, color: '#000', textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff' }}>
                    {lngTics.map((lng, i) => <span key={`t-${i}`}>{safeFixed(lng, 3)}°E</span>)}
                </div>
                {/* Bottom Longitudes */}
                <div style={{ position: 'absolute', bottom: '-18px', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 8%', fontSize: '8pt', fontWeight: 'bold', zIndex: 1000, color: '#000', textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff' }}>
                    {lngTics.map((lng, i) => <span key={`b-${i}`}>{safeFixed(lng, 3)}°E</span>)}
                </div>
                {/* Left Latitudes */}
                <div style={{ position: 'absolute', left: '-28px', top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '8% 0', fontSize: '8pt', fontWeight: 'bold', zIndex: 1000, color: '#000' }}>
                    {latTics.slice().reverse().map((lat, i) => <span key={`l-${i}`} style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap', textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff' }}>{safeFixed(lat, 3)}°N</span>)}
                </div>
                {/* Right Latitudes */}
                <div style={{ position: 'absolute', right: '-28px', top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '8% 0', fontSize: '8pt', fontWeight: 'bold', zIndex: 1000, color: '#000' }}>
                    {latTics.slice().reverse().map((lat, i) => <span key={`r-${i}`} style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap', textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff' }}>{safeFixed(lat, 3)}°N</span>)}
                </div>
                
                {/* Grid Lines Overlay */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to right, transparent 49.5%, rgba(0,0,0,0.1) 49.5%, rgba(0,0,0,0.1) 50.5%, transparent 50.5%)' }}></div>
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to bottom, transparent 49.5%, rgba(0,0,0,0.1) 49.5%, rgba(0,0,0,0.1) 50.5%, transparent 50.5%)' }}></div>
            </>
        );
    };

    const renderTechnicalData = (isLarge = false) => {
        const totalArea = selectedPolys.reduce((sum, p) => sum + (Number(p.area) || 0), 0);
        const centerLat = ((mapBounds.north + mapBounds.south) / 2).toFixed(6);
        const centerLng = ((mapBounds.east + mapBounds.west) / 2).toFixed(6);

        const fontSize = isLarge ? '9.5pt' : '8.5pt';
        const titleSize = isLarge ? '10.5pt' : '9pt';

        // Detect Land Classification if available (for single selection)
        let landClass = null;
        if (selectedPolys.length === 1 && selectedPolys[0].attributes) {
            const attrs = selectedPolys[0].attributes;
            landClass = attrs.LAND_CLASS || attrs.LandClass || attrs.CLASS || attrs.classification || attrs.Land_Class || attrs.LANDCLASS;
        }

        return (
            <div style={{ fontSize: fontSize, fontFamily: 'Arial, Helvetica, sans-serif' }}>
                <div style={{ fontWeight: 900, borderBottom: '1.5px solid #000', marginBottom: isLarge ? '8px' : '5px', paddingBottom: '2px', fontSize: titleSize }}>TECHNICAL DATA</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: isLarge ? '10px' : '6px', rowGap: isLarge ? '4px' : '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderRight: '1px solid #eee', paddingRight: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>Area:</span>
                        <span style={{ fontWeight: 900, color: '#059669' }}>{totalArea > 0 ? (totalArea / 10000).toFixed(3) + ' HA' : 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold' }}>Lat:</span>
                        <span>{centerLat}°N</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderRight: '1px solid #eee', paddingRight: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>Perim:</span>
                        <span>{(totalArea * 1.5).toFixed(1)}M</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold' }}>Lng:</span>
                        <span>{centerLng}°E</span>
                    </div>
                </div>
                {landClass && (
                    <div style={{ marginTop: '5px', borderTop: '1px solid #000', paddingTop: '3px', fontSize: isLarge ? '8.5pt' : '7.5pt' }}>
                        <span style={{ fontWeight: 'bold' }}>CLASSIFICATION:</span> <span style={{ fontWeight: 900, color: '#2563eb' }}>{String(landClass).toUpperCase()}</span>
                    </div>
                )}
                {isLarge && (
                    <div style={{ marginTop: '6px', fontSize: '7.5pt', fontStyle: 'italic', color: '#666', borderTop: '1px solid #eee', paddingTop: '4px' }}>
                        * Precise geographic coordinates (WGS 84).
                    </div>
                )}
            </div>
        );
    };

    const renderLegendBox = (isDark = true) => {
        const hasTrails = selectedPolys.some(p => p.geometryType === 'polyline' || (p.distanceLineCoords && p.distanceLineCoords.length > 0));
        
        // Grouping Logic for Legend "1 Entity"
        const folders = [...new Set(selectedPolys.map(p => p.folder || 'Ungrouped'))];
        const legendItems = [];

        folders.forEach(folder => {
            const folderPolys = selectedPolys.filter(p => (p.folder || 'Ungrouped') === folder && p.geometryType !== 'polyline');
            if (folderPolys.length === 0) return;

            if (groupedFolderIds.includes(folder)) {
                const totalArea = folderPolys.reduce((sum, p) => sum + (Number(p.area) || 0), 0);
                const avgDist = folderPolys.reduce((sum, p) => sum + (Number(p.distanceToRoad) || 0), 0) / folderPolys.length;
                legendItems.push({
                    name: folder,
                    area: totalArea,
                    distance: avgDist,
                    color: folderColors[folder] || folderPolys[0].color || '#3b82f6',
                    isGroup: true
                });
            } else {
                folderPolys.forEach(p => {
                    legendItems.push({
                        name: p.name || 'Site',
                        area: p.area,
                        distance: p.distanceToRoad,
                        color: p.color || '#3b82f6',
                        isGroup: false
                    });
                });
            }
        });

        const polyCount = legendItems.length;
        const hasPolygons = polyCount > 0;
        
        // Smart Adaptive Sizing: Big for few, small for many
        let titleSize = '11pt';
        let subTitleSize = '10pt';
        let itemFontSize = '7.5pt';
        let gridCols = '1fr';

        if (polyCount === 0) {
            // No polygons
        } else if (polyCount <= 3) {
            titleSize = '12.5pt';
            subTitleSize = '10.5pt';
            itemFontSize = '10pt';
            gridCols = '1fr';
        } else if (polyCount <= 8) {
            titleSize = '12pt';
            subTitleSize = '10pt';
            itemFontSize = '9pt';
            gridCols = '1fr';
        } else if (polyCount <= 15) {
            titleSize = '10pt';
            subTitleSize = '9pt';
            itemFontSize = '7.5pt';
            gridCols = '1fr 1fr';
        } else if (polyCount <= 25) {
            titleSize = '9pt';
            subTitleSize = '8pt';
            itemFontSize = '6pt';
            gridCols = '1fr 1fr';
        } else {
            titleSize = '8pt';
            subTitleSize = '7pt';
            itemFontSize = '4.5pt';
            gridCols = '1fr 1fr 1fr';
        }

        return (
        <div style={{ color: isDark ? '#fff' : '#000' }}>
            <div style={{ fontSize: titleSize, fontWeight: 900, marginBottom: '2px', textTransform: 'uppercase', textShadow: isDark ? '1px 1px 2px #000' : 'none' }}>LOCATION OF THE STUDY</div>
            <div style={{ fontSize: subTitleSize, fontWeight: 'bold', marginBottom: '2px', textShadow: isDark ? '1px 1px 2px #000' : 'none' }}>Legend</div>
            
            {hasPolygons && (
                <div style={{ 
                    marginBottom: '4px', 
                    display: 'grid', 
                    gridTemplateColumns: gridCols, 
                    columnGap: '6px',
                    rowGap: '2px'
                }}>
                    {legendItems.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: itemFontSize, minWidth: 0 }}>
                            <div style={{ width: polyCount > 15 ? '10px' : '16px', height: polyCount > 15 ? '8px' : '12px', border: `1px solid ${item.color}`, backgroundColor: `${item.color}33`, flexShrink: 0 }}></div>
                            <span style={{ fontWeight: item.isGroup ? '900' : 'bold', textShadow: isDark ? '1px 1px 1px #000' : 'none', overflow: 'hidden', minWidth: 0 }}>
                                {item.name} - {((Number(item.area) || 0) / 10000).toFixed(3)}HA 
                                {showAllTrails && Number(item.distance) > 0 && ` (Trail: ${Number(item.distance) >= 1000 ? (Number(item.distance)/1000).toFixed(2) + 'km' : Number(item.distance).toFixed(0) + 'm'})`}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Simplified Trail Legend Icon (Dashed) */}
            {hasTrails && showAllTrails && (
                <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '7.5pt' }}>
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                        <div style={{ width: '6px', height: '1.5px', background: '#ef4444' }}></div>
                        <div style={{ width: '6px', height: '1.5px', background: '#ef4444' }}></div>
                    </div>
                    <span style={{ fontWeight: 'bold', fontStyle: 'italic', opacity: 0.8 }}>Trail Path / Road Access</span>
                </div>
            )}
        </div>
        );
    };

    return (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100%', gap: '1px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            {/* Status HUD */}
            {lastActionStatus && (
                <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '10px 20px', borderRadius: '12px', border: '1px solid #3b82f6', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', animation: 'fadeInUp 0.3s' }}>
                    {lastActionStatus}
                </div>
            )}

            {/* Sidebar */}
            <div className="no-print" style={{ background: '#080a0c', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderRight: '1px solid rgba(255,255,255,0.05)', height: '100%', overflow: 'hidden' }}>
                <div>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Target size={20} color="#60a5fa" /> MAP PRODUCER
                    </h3>
                    <p style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.5rem' }}>Generate standard landscape layout maps.</p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem', fontWeight: 'bold' }}>LAYOUT DESIGN</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                        <button 
                            onClick={() => setLayoutDesign('design1')}
                            style={{ padding: '0.45rem', borderRadius: '8px', background: layoutDesign === 'design1' ? '#3b82f6' : 'transparent', border: `1px solid ${layoutDesign === 'design1' ? '#3b82f6' : '#444'}`, color: '#fff', fontSize: '0.7rem', cursor: 'pointer', textAlign: 'center' }}
                        >Design 1<br/><span style={{ fontSize: '0.6rem', opacity: 0.7 }}>Overlay</span></button>
                        <button 
                            onClick={() => setLayoutDesign('design2')}
                            style={{ padding: '0.45rem', borderRadius: '8px', background: layoutDesign === 'design2' ? '#3b82f6' : 'transparent', border: `1px solid ${layoutDesign === 'design2' ? '#3b82f6' : '#444'}`, color: '#fff', fontSize: '0.7rem', cursor: 'pointer', textAlign: 'center' }}
                        >Design 2<br/><span style={{ fontSize: '0.6rem', opacity: 0.7 }}>Sidebar</span></button>
                        <button 
                            onClick={() => setLayoutDesign('design3')}
                            style={{ padding: '0.45rem', borderRadius: '8px', background: layoutDesign === 'design3' ? '#3b82f6' : 'transparent', border: `1px solid ${layoutDesign === 'design3' ? '#3b82f6' : '#444'}`, color: '#fff', fontSize: '0.7rem', cursor: 'pointer', textAlign: 'center' }}
                        >Design 3<br/><span style={{ fontSize: '0.6rem', opacity: 0.7 }}>Top Banner</span></button>
                        <button 
                            onClick={() => setLayoutDesign('design4')}
                            style={{ padding: '0.45rem', borderRadius: '8px', background: layoutDesign === 'design4' ? '#3b82f6' : 'transparent', border: `1px solid ${layoutDesign === 'design4' ? '#3b82f6' : '#444'}`, color: '#fff', fontSize: '0.7rem', cursor: 'pointer', textAlign: 'center' }}
                        >Design 4<br/><span style={{ fontSize: '0.6rem', opacity: 0.7 }}>Split Panel</span></button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="custom-scrollbar">
                    {savedPolygons.length === 0 ? (
                        <div style={{ color: '#666', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem', padding: '1rem' }}>
                            No polygons saved yet.<br/>Import or draw one in the FEO Shapefile Map tab.
                        </div>
                    ) : (
                        [...new Set(savedPolygons.map(p => p.folder || 'Ungrouped'))].map(folder => (
                            <div key={folder} style={{ marginBottom: '0.75rem' }}>
                                <div 
                                    style={{ 
                                        fontSize: '0.7rem', fontWeight: 800, color: '#60a5fa', marginBottom: '0.5rem', 
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '6px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={groupedFolderIds.includes(folder)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                const polysInFolder = savedPolygons.filter(p => (p.folder || 'Ungrouped') === folder);
                                                if (groupedFolderIds.includes(folder)) {
                                                    setGroupedFolderIds(prev => prev.filter(id => id !== folder));
                                                    setSelectedPolys(prev => prev.filter(p => (p.folder || 'Ungrouped') !== folder));
                                                } else {
                                                    setGroupedFolderIds(prev => [...prev, folder]);
                                                    setSelectedPolys(prev => {
                                                        const otherPolys = prev.filter(p => (p.folder || 'Ungrouped') !== folder);
                                                        return [...otherPolys, ...polysInFolder];
                                                    });
                                                }
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <input 
                                            type="color" 
                                            value={folderColors[folder] || '#3b82f6'} 
                                            onChange={(e) => setFolderColors(prev => ({ ...prev, [folder]: e.target.value }))}
                                            style={{ width: '18px', height: '18px', border: 'none', padding: 0, background: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                            title="Set Folder Color"
                                        />
                                        <span onClick={() => setOpenFolders(prev => prev.includes(folder) ? prev.filter(f => f !== folder) : [...prev, folder])} style={{ cursor: 'pointer' }}>{folder.toUpperCase()}</span>
                                    </div>
                                    <ChevronDown onClick={() => setOpenFolders(prev => prev.includes(folder) ? prev.filter(f => f !== folder) : [...prev, folder])} size={14} style={{ cursor: 'pointer', transform: openFolders.includes(folder) ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                                </div>
                                {openFolders.includes(folder) && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {savedPolygons
                                            .filter(p => (p.folder || 'Ungrouped') === folder) 
                                            .map(poly => (
                                                <div 
                                                    key={poly.id}
                                                    onClick={() => {
                                                        if (selectedPolys.some(p => p.id === poly.id)) {
                                                            setSelectedPolys(prev => prev.filter(p => p.id !== poly.id));
                                                            if (inspectedPolyId === poly.id) setInspectedPolyId(null);
                                                        } else {
                                                            setSelectedPolys(prev => [...prev, poly]);
                                                            setInspectedPolyId(poly.id);
                                                        }
                                                    }}
                                                    style={{ 
                                                        padding: '0.75rem', borderRadius: '10px', 
                                                        background: selectedPolys.some(p => p.id === poly.id) ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                                                        border: `1px solid ${selectedPolys.some(p => p.id === poly.id) ? '#3b82f6' : 'rgba(255,255,255,0.05)'}`, 
                                                        cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem'
                                                    }}
                                                >
                                                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedPolys.some(p => p.id === poly.id) ? '#3b82f6' : 'transparent', flexShrink: 0 }}>
                                                        {selectedPolys.some(p => p.id === poly.id) && <CheckCircle2 size={12} color="#fff" />}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{poly.name}</div>
                                                        <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '0.1rem' }}>
                                                            {poly.geometryType === 'polyline' ? 'Trail' : `${(poly.area / 10000).toFixed(3)} HA`} 
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 800 }}>VISUAL OPTIONS</div>
                        <button 
                            onClick={() => setShowAllTrails(!showAllTrails)}
                            className="btn-glass" 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: showAllTrails ? '#10b981' : '#888' }}
                        >
                            {showAllTrails ? <Eye size={12} /> : <EyeOff size={12} />}
                            TRAILS {showAllTrails ? 'ON' : 'OFF'}
                        </button>
                    </div>
                    
                    <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 800, marginTop: '0.5rem' }}>MAP LAYER</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => changeLayer('Satellite')} className={`btn-glass ${activeBaseLayer === 'Satellite' ? 'active' : ''}`} style={{ flex: 1, padding: '0.5rem', background: activeBaseLayer === 'Satellite' ? 'rgba(59, 130, 246, 0.2)' : '', border: activeBaseLayer === 'Satellite' ? '1px solid #3b82f6' : '' }} title="Satellite"><Globe size={18} style={{ margin: '0 auto' }} /></button>
                        <button onClick={() => changeLayer('Terrain')} className={`btn-glass ${activeBaseLayer === 'Terrain' ? 'active' : ''}`} style={{ flex: 1, padding: '0.5rem', background: activeBaseLayer === 'Terrain' ? 'rgba(59, 130, 246, 0.2)' : '', border: activeBaseLayer === 'Terrain' ? '1px solid #3b82f6' : '' }} title="Terrain"><MapPin size={18} style={{ margin: '0 auto' }} /></button>
                        <button onClick={() => changeLayer('Dark')} className={`btn-glass ${activeBaseLayer === 'Dark' ? 'active' : ''}`} style={{ flex: 1, padding: '0.5rem', background: activeBaseLayer === 'Dark' ? 'rgba(59, 130, 246, 0.2)' : '', border: activeBaseLayer === 'Dark' ? '1px solid #3b82f6' : '' }} title="Dark"><Navigation size={18} style={{ margin: '0 auto' }} /></button>
                    </div>
                </div>

                {/* PARCEL DETAILS INSPECTOR */}
                {inspectedPolyId && (
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <div style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 800 }}>PARCEL INSPECTOR</div>
                            <X size={14} color="#60a5fa" style={{ cursor: 'pointer' }} onClick={() => setInspectedPolyId(null)} />
                        </div>
                        {(() => {
                            const poly = savedPolygons.find(p => p.id === inspectedPolyId);
                            if (!poly) return <div style={{ color: '#666', fontSize: '0.7rem' }}>Polygon data lost.</div>;
                            return (
                                <>
                                    <div style={{ fontWeight: 900, color: '#fff', fontSize: '0.85rem' }}>{poly.name}</div>
                                    <div style={{ fontSize: '0.65rem', color: '#93c5fd', marginBottom: '0.75rem' }}>{(poly.area / 10000).toFixed(3)} HA</div>
                                    
                                    {poly.attributes && Object.keys(poly.attributes).length > 0 ? (
                                        <button 
                                            onClick={() => setShowAttributeModal(true)}
                                            className="btn btn-primary" 
                                            style={{ width: '100%', fontSize: '0.65rem', padding: '0.5rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }}
                                        >
                                            VIEW ALL ARCGIS DATA
                                        </button>
                                    ) : (
                                        <div style={{ color: '#444', fontSize: '0.65rem', fontStyle: 'italic' }}>No GIS attributes available.</div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* GEOTAGGED PHOTOS SECTION */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <MapPin size={12} /> GEOTAGGED PHOTOS (GPKG)
                    </div>
                    <input
                        ref={gpkgInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,.jpg,.jpeg"
                        multiple
                        style={{ display: 'none' }}
                        onChange={e => { if (e.target.files.length > 0) handleImportGeoJPG(e.target.files); e.target.value = ''; }}
                    />
                    <button
                        onClick={() => gpkgInputRef.current?.click()}
                        disabled={gpkgLoading}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', background: gpkgLoading ? '#333' : 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}
                    >
                        <Folder size={14} /> {gpkgLoading ? 'READING GPS DATA...' : 'IMPORT GEOTAGGED JPG(S)'}
                    </button>

                    {/* Manual coordinate entry */}
                    <button
                        onClick={() => setShowManualForm(p => !p)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '8px', background: showManualForm ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)', border: '1px solid #6366f1', color: '#a5b4fc', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}
                    >
                        <MapPin size={13} /> ADD MANUAL COORDINATES
                    </button>
                    {showManualForm && (
                        <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', padding: '0.6rem', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <input
                                type="text"
                                placeholder="Label / Name"
                                value={manualCoord.name}
                                onChange={e => setManualCoord(p => ({ ...p, name: e.target.value }))}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid #444', borderRadius: '6px', padding: '4px 8px', color: '#fff', fontSize: '0.72rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '2px' }}>
                                <button
                                    onClick={() => setCoordFormat('latlong')}
                                    style={{ flex: 1, padding: '3px', borderRadius: '5px', background: coordFormat === 'latlong' ? '#6366f1' : 'rgba(255,255,255,0.04)', border: `1px solid ${coordFormat === 'latlong' ? '#6366f1' : '#444'}`, color: coordFormat === 'latlong' ? '#fff' : '#888', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                >LAT / LNG</button>
                                <button
                                    onClick={() => setCoordFormat('ne')}
                                    style={{ flex: 1, padding: '3px', borderRadius: '5px', background: coordFormat === 'ne' ? '#6366f1' : 'rgba(255,255,255,0.04)', border: `1px solid ${coordFormat === 'ne' ? '#6366f1' : '#444'}`, color: coordFormat === 'ne' ? '#fff' : '#888', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                >N° / E°</button>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <input
                                    type="number"
                                    placeholder={coordFormat === 'latlong' ? 'Latitude' : 'N (North)'}
                                    value={manualCoord.lat}
                                    step="0.000001"
                                    onChange={e => setManualCoord(p => ({ ...p, lat: e.target.value }))}
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid #444', borderRadius: '6px', padding: '4px 6px', color: '#fff', fontSize: '0.72rem', outline: 'none', minWidth: 0 }}
                                />
                                <input
                                    type="number"
                                    placeholder={coordFormat === 'latlong' ? 'Longitude' : 'E (East)'}
                                    value={manualCoord.lng}
                                    step="0.000001"
                                    onChange={e => setManualCoord(p => ({ ...p, lng: e.target.value }))}
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid #444', borderRadius: '6px', padding: '4px 6px', color: '#fff', fontSize: '0.72rem', outline: 'none', minWidth: 0 }}
                                />
                            </div>
                            <input
                                ref={manualPhotoRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={e => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = ev => setManualCoord(p => ({ ...p, photo: ev.target.result }));
                                    reader.readAsDataURL(file);
                                    e.target.value = '';
                                }}
                            />
                            <button
                                onClick={() => manualPhotoRef.current?.click()}
                                style={{ width: '100%', padding: '3px', borderRadius: '6px', background: manualCoord.photo ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${manualCoord.photo ? '#10b981' : '#444'}`, color: manualCoord.photo ? '#10b981' : '#888', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 700 }}
                            >
                                {manualCoord.photo ? '✓ PHOTO ATTACHED' : '+ ATTACH PHOTO (JPG/PNG)'}
                            </button>
                            {manualCoord.photo && (
                                <img src={manualCoord.photo} alt="preview" style={{ width: '100%', height: '55px', objectFit: 'cover', borderRadius: '5px', border: '1px solid #10b981' }} />
                            )}
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button
                                    onClick={() => {
                                        const lat = parseFloat(manualCoord.lat);
                                        const lng = parseFloat(manualCoord.lng);
                                        if (isNaN(lat) || isNaN(lng)) { setLastActionStatus('Invalid coordinates.'); setTimeout(() => setLastActionStatus(''), 2000); return; }
                                        setGeoPhotoMarkers(prev => [...prev, {
                                            id: `manual_${Date.now()}`,
                                            lat, lng,
                                            name: manualCoord.name || `Point ${Date.now()}`,
                                            photo: manualCoord.photo
                                        }]);
                                        // Fly map to the new point
                                        if (mapRef.current) mapRef.current.flyTo([lat, lng], 15);
                                        setManualCoord({ lat: '', lng: '', name: '', photo: null });
                                        setShowManualForm(false);
                                        setLastActionStatus('MANUAL POINT ADDED');
                                        setTimeout(() => setLastActionStatus(''), 2000);
                                    }}
                                    style={{ flex: 1, padding: '5px', borderRadius: '6px', background: '#6366f1', border: 'none', color: '#fff', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                                >
                                    ADD POINT
                                </button>
                                <button
                                    onClick={() => { setManualCoord({ lat: '', lng: '', name: '', photo: null }); setShowManualForm(false); }}
                                    style={{ padding: '5px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer' }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    )}

                    {geoPhotoMarkers.length > 0 && (
                        <div style={{ maxHeight: '140px', overflowY: 'auto' }} className="custom-scrollbar">
                            {geoPhotoMarkers.map(pt => (
                                <div key={pt.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 6px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', marginBottom: '3px', fontSize: '0.65rem' }}>
                                    {pt.photo
                                        ? <img src={pt.photo} alt="" style={{ width: '28px', height: '22px', objectFit: 'cover', borderRadius: '3px', border: '1px solid #444', flexShrink: 0 }} />
                                        : <div style={{ width: '28px', height: '22px', background: '#333', borderRadius: '3px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={10} color="#666" /></div>
                                    }
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ color: '#ddd', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pt.name}</div>
                                        <div style={{ color: '#666', fontSize: '0.6rem' }}>{coordFormat === 'ne' ? `N${pt.lat.toFixed(4)}° E${pt.lng.toFixed(4)}°` : `${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}`}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <button onClick={() => setGeoPhotoMarkers(prev => prev.filter(p => p.id !== pt.id))} title="Remove" style={{ background: '#ef4444', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '2px 5px', cursor: 'pointer' }}>DEL</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button 
                        disabled={selectedPolys.length === 0}
                        onClick={handleExportPDF}
                        className="btn btn-primary" 
                        style={{ padding: '0.8rem', width: '100%', fontSize: '0.85rem', fontWeight: 800, background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', color: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                    >
                        <FileText size={18} /> EXPORT PDF A4
                    </button>
                    <button 
                        disabled={selectedPolys.length === 0}
                        onClick={handleExportImage}
                        className="btn btn-primary" 
                        style={{ padding: '0.8rem', width: '100%', fontSize: '0.85rem', fontWeight: 800, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                    >
                        <ImageIcon size={18} /> EXPORT JPG / PNG
                    </button>
                </div>
            </div>

            <div key={layoutDesign} style={{ background: '#1a1d21', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flex: 1 }}>
                {(() => {
                    const folders = [...new Set(selectedPolys.map(p => p.folder || 'Ungrouped'))];
                    let count = 0;
                    folders.forEach(f => {
                        if (groupedFolderIds.includes(f)) count += 1;
                        else count += selectedPolys.filter(p => (p.folder || 'Ungrouped') === f && p.geometryType !== 'polyline').length;
                    });
                    const legendItemsCount = count;
                    
                    return (
                        <div id="print-layout-wrapper" style={{ transform: 'scale(0.65)', transformOrigin: 'center', width: '297mm', height: '210mm', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div id="print-layout" style={{ 
                                width: '297mm', height: '210mm',
                                minWidth: '297mm', minHeight: '210mm',
                                background: '#fff', 
                                padding: '25px 35px',
                                display: 'flex', flexDirection: 'column', position: 'relative', color: '#000',
                                border: '1px solid #000', boxSizing: 'border-box',
                                fontFamily: 'Arial, Helvetica, sans-serif'
                            }}>
                                {layoutDesign === 'design1' ? (
                                    <>
                                        <div style={{ flex: 1, position: 'relative', border: '1px solid #000', marginBottom: '10px', overflow: 'visible' }}>
                                            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#f0f0f0' }}></div>
                                            {renderCoordinates()}
                                            {/* SVG leader lines: from photo bottom-center to GPS dot */}
                                            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 480, overflow: 'visible' }}>
                                                {layoutPhotos.map(lp => {
                                                    if (!lp.lat || !lp.lng || !mapRef.current || !window.L) return null;
                                                    try {
                                                        const dot = mapRef.current.latLngToContainerPoint([lp.lat, lp.lng]);
                                                        const photoW = lp.size + 8;
                                                        const photoH = Math.round(lp.size * 0.75) + 20;
                                                        const basePx = dot.x - lp.size / 2 + (lp.offsetX || 0);
                                                        const basePy = dot.y - photoH - 10 + (lp.offsetY || 0);
                                                        const linX1 = basePx + photoW / 2;
                                                        const linY1 = basePy + photoH;
                                                        return <line key={`ln_${lp.id}`} x1={linX1} y1={linY1} x2={dot.x} y2={dot.y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" />;
                                                    } catch { return null; }
                                                })}
                                            </svg>
                                            {layoutPhotos.map(lp => {
                                                // Center photo on GPS dot; offsetX/Y allows user to drag it aside
                                                let px = lp.x || 60, py = lp.y || 60;
                                                if (lp.lat !== undefined && lp.lng !== undefined && mapRef.current && window.L) {
                                                    try {
                                                        const pt = mapRef.current.latLngToContainerPoint([lp.lat, lp.lng]);
                                                        const photoH = Math.round(lp.size * 0.75) + 20;
                                                        px = pt.x - lp.size / 2 + (lp.offsetX || 0);
                                                        py = pt.y - photoH - 10 + (lp.offsetY || 0);
                                                    } catch {}
                                                }
                                                // Coordinate label for the caption
                                                const coordLabel = lp.lat !== undefined
                                                    ? `${lp.lat.toFixed(4)}°N  ${lp.lng.toFixed(4)}°E`
                                                    : lp.name;
                                                return (
                                                <div
                                                    key={lp.id}
                                                    onMouseDown={e => { if (!e.target.classList.contains('map-ui-control') && !e.target.closest?.('.map-ui-control')) startDragPhoto(e, lp.id); }}
                                                    style={{ position: 'absolute', left: px, top: py, zIndex: lp.locked ? 490 : 510, cursor: 'move', userSelect: 'none' }}
                                                >
                                                    <div style={{ background: '#fff', border: `2px solid ${lp.locked ? '#f59e0b' : '#10b981'}`, borderRadius: '4px', padding: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', position: 'relative' }}>
                                                        {!isExporting && (
                                                        <div
                                                            className="map-ui-control"
                                                            onMouseDown={e => { e.stopPropagation(); setLayoutPhotos(prev => prev.filter(p => p.id !== lp.id)); }}
                                                            style={{ position: 'absolute', top: '-10px', right: '-10px', width: '20px', height: '20px', background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20, fontSize: '10px', color: '#fff', fontWeight: 900, boxShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
                                                        >✕</div>
                                                        )}
                                                        <img src={lp.photo} alt={coordLabel} style={{ width: lp.size + 'px', height: Math.round(lp.size * 0.75) + 'px', objectFit: 'cover', display: 'block', borderRadius: '2px', pointerEvents: 'none' }} />
                                                        {/* Caption = coordinates, clamped to photo width */}
                                                        <div style={{ fontSize: '4.5pt', fontWeight: 'bold', textAlign: 'center', color: '#000', padding: '1px 2px', width: lp.size + 'px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>{coordLabel}</div>
                                                        {!isExporting && (
                                                        <div
                                                            className="map-ui-control"
                                                            onMouseDown={e => startResizePhoto(e, lp.id)}
                                                            style={{ position: 'absolute', bottom: '-6px', right: '-6px', width: '14px', height: '14px', background: '#3b82f6', borderRadius: '2px', cursor: 'se-resize', zIndex: 20, border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                                                            title="Drag to resize"
                                                        />
                                                        )}
                                                    </div>
                                                    {!lp.locked && !isExporting && (
                                                        <div
                                                            className="map-ui-control"
                                                            onMouseDown={e => { e.stopPropagation(); setLayoutPhotos(prev => prev.map(p => p.id === lp.id ? { ...p, locked: true } : p)); }}
                                                            style={{ background: '#10b981', color: '#fff', fontSize: '6pt', fontWeight: 900, textAlign: 'center', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', marginTop: '3px', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}
                                                        >✓ LOCK PLACEMENT</div>
                                                    )}
                                                </div>

                                                );
                                            })}
                                        </div>
                                        <div style={{ height: '185px', flexShrink: 0, border: '1px solid #000', display: 'flex', flexDirection: 'row', alignItems: 'stretch', background: '#fff' }}>
                                            <div style={{ flex: 1.2, borderRight: '1px solid #000', padding: '15px 10px 10px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                                <div>
                                                    <div style={{ fontSize: '10pt', fontWeight: 900, fontFamily: 'Arial, Helvetica, sans-serif', marginBottom: '4px' }}>DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES</div>
                                                    <div style={{ fontSize: '8pt', fontWeight: 'bold', color: '#222' }}>OFFICIAL GIS MAP LAYOUT</div>
                                                </div>
                                                <div style={{ display: 'flex', width: '100%', fontSize: '7.5pt', marginTop: '18px', paddingBottom: '6px' }}>
                                                    <div style={{ width: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <div style={{ marginBottom: '38px' }}>PREPARED BY:</div>
                                                        <div contentEditable suppressContentEditableWarning style={{ borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 'bold', width: '150px', background: 'transparent', outline: 'none', fontSize: '8.5pt', minHeight: '16px', lineHeight: '1.2' }}>JUAN DELA CRUZ</div>
                                                        <div contentEditable suppressContentEditableWarning style={{ textAlign: 'center', width: '150px', background: 'transparent', outline: 'none', fontSize: '7.5pt', color: '#444', minHeight: '14px', lineHeight: '1.2', marginTop: '2px' }}>GIS Officer</div>
                                                    </div>
                                                    <div style={{ width: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <div style={{ marginBottom: '38px' }}>APPROVED BY:</div>
                                                        <div contentEditable suppressContentEditableWarning style={{ borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 'bold', width: '150px', background: 'transparent', outline: 'none', fontSize: '8.5pt', minHeight: '16px', lineHeight: '1.2' }}>MARIA CLARA</div>
                                                        <div contentEditable suppressContentEditableWarning style={{ textAlign: 'center', width: '150px', background: 'transparent', outline: 'none', fontSize: '7.5pt', color: '#444', minHeight: '14px', lineHeight: '1.2', marginTop: '2px' }}>CENRO Officer</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ flex: legendItemsCount < 5 ? 1.5 : 2, borderRight: '1px solid #000', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                {renderLegendBox(false)}
                                            </div>
                                            <div style={{ flex: legendItemsCount < 5 ? 2 : 1.3, borderRight: '1px solid #000', padding: '10px 15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ transform: legendItemsCount < 5 ? 'scale(1.1)' : 'scale(0.8)' }}>
                                                        <NorthArrowSVG />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        {renderScaleBar()}
                                                        <div style={{ fontSize: legendItemsCount < 5 ? '9pt' : '7pt', color: '#666', fontWeight: 'bold', textAlign: 'center', marginTop: '2px' }}>
                                                            Coordinate System: WGS 84
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ borderTop: '1px dashed #000', paddingTop: '10px' }}>
                                                    {renderTechnicalData(legendItemsCount < 5)}
                                                </div>
                                            </div>
                                            <div style={{ width: '140px', padding: '5px', display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ flex: 1, width: '100%', border: '1px solid #000', background: '#e0e0e0', position: 'relative' }}>
                                                    <div ref={mapContainerRefMini} style={{ width: '100%', height: '100%' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : layoutDesign === 'design2' ? (
                                    // ── DESIGN 2: SIDEBAR ──────────────────────────────────────────────
                                    <div style={{ display: 'flex', width: '100%', height: '100%', border: '2px solid #000', padding: '30px', boxSizing: 'border-box', gap: '35px' }}>
                                        {/* LEFT: Main Map */}
                                        <div style={{ flex: 1, position: 'relative', border: '1px solid #000', overflow: 'visible' }}>
                                            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#f8f8f8' }}></div>
                                            {renderCoordinates()}
                                            {/* GPS photo SVG leader lines */}
                                            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 480, overflow: 'visible' }}>
                                                {layoutPhotos.map(lp => {
                                                    if (!lp.lat || !lp.lng || !mapRef.current || !window.L) return null;
                                                    try {
                                                        const dot = mapRef.current.latLngToContainerPoint([lp.lat, lp.lng]);
                                                        const photoW = lp.size + 8;
                                                        const photoH = Math.round(lp.size * 0.75) + 20;
                                                        const basePx = dot.x - lp.size / 2 + (lp.offsetX || 0);
                                                        const basePy = dot.y - photoH - 10 + (lp.offsetY || 0);
                                                        return <line key={`ln_${lp.id}`} x1={basePx + photoW / 2} y1={basePy + photoH} x2={dot.x} y2={dot.y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" />;
                                                    } catch { return null; }
                                                })}
                                            </svg>
                                            {layoutPhotos.map(lp => {
                                                let px = lp.x || 60, py = lp.y || 60;
                                                if (lp.lat !== undefined && lp.lng !== undefined && mapRef.current && window.L) {
                                                    try {
                                                        const pt = mapRef.current.latLngToContainerPoint([lp.lat, lp.lng]);
                                                        const photoH = Math.round(lp.size * 0.75) + 20;
                                                        px = pt.x - lp.size / 2 + (lp.offsetX || 0);
                                                        py = pt.y - photoH - 10 + (lp.offsetY || 0);
                                                    } catch {}
                                                }
                                                const coordLabel = lp.lat !== undefined ? `${lp.lat.toFixed(4)}°N  ${lp.lng.toFixed(4)}°E` : lp.name;
                                                return (
                                                    <div key={lp.id} onMouseDown={e => { if (!e.target.classList.contains('map-ui-control') && !e.target.closest?.('.map-ui-control')) startDragPhoto(e, lp.id); }} style={{ position: 'absolute', left: px, top: py, zIndex: lp.locked ? 490 : 510, cursor: 'move', userSelect: 'none' }}>
                                                        <div style={{ background: '#fff', border: `2px solid ${lp.locked ? '#f59e0b' : '#10b981'}`, borderRadius: '4px', padding: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', position: 'relative' }}>
                                                            {!isExporting && <div className="map-ui-control" onMouseDown={e => { e.stopPropagation(); setLayoutPhotos(prev => prev.filter(p => p.id !== lp.id)); }} style={{ position: 'absolute', top: '-10px', right: '-10px', width: '20px', height: '20px', background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20, fontSize: '10px', color: '#fff', fontWeight: 900 }}>✕</div>}
                                                            <img src={lp.photo} alt={coordLabel} style={{ width: lp.size + 'px', height: Math.round(lp.size * 0.75) + 'px', objectFit: 'cover', display: 'block', borderRadius: '2px', pointerEvents: 'none' }} />
                                                            <div style={{ fontSize: '4.5pt', fontWeight: 'bold', textAlign: 'center', color: '#000', padding: '1px 2px', width: lp.size + 'px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>{coordLabel}</div>
                                                            {!isExporting && <div className="map-ui-control" onMouseDown={e => startResizePhoto(e, lp.id)} style={{ position: 'absolute', bottom: '-6px', right: '-6px', width: '14px', height: '14px', background: '#3b82f6', borderRadius: '2px', cursor: 'se-resize', zIndex: 20, border: '2px solid #fff' }} title="Drag to resize" />}
                                                        </div>
                                                        {!lp.locked && !isExporting && <div className="map-ui-control" onMouseDown={e => { e.stopPropagation(); setLayoutPhotos(prev => prev.map(p => p.id === lp.id ? { ...p, locked: true } : p)); }} style={{ background: '#10b981', color: '#fff', fontSize: '6pt', fontWeight: 900, textAlign: 'center', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', marginTop: '3px', whiteSpace: 'nowrap' }}>✓ LOCK PLACEMENT</div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {/* RIGHT: Info Panel */}
                                        <div style={{ width: '280px', border: '1px solid #000', display: 'flex', flexDirection: 'column', padding: '10px', background: '#fff', position: 'relative' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                                                <div style={{ transform: 'scale(0.7)', margin: '-10px 0' }}><NorthArrowSVG /></div>
                                                <div style={{ marginTop: '2px' }}>{renderScaleBar()}</div>
                                                <div style={{ fontSize: '7pt', color: '#666', fontWeight: 'bold', textAlign: 'center', marginTop: '4px' }}>Coordinate System: WGS 84</div>
                                            </div>
                                            <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '6px 0', textAlign: 'center', marginBottom: '10px' }}>
                                                <div style={{ fontSize: '10pt', fontWeight: 900, fontFamily: 'Arial, Helvetica, sans-serif' }}>DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES</div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', fontSize: '7.5pt', marginBottom: '10px', padding: '5px 10px', borderBottom: '1.5px solid #000' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
                                                    <div>PREPARED BY:</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <div style={{ height: '28px' }} />
                                                        <div contentEditable suppressContentEditableWarning style={{ borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 'bold', width: '120px', fontSize: '8pt', lineHeight: 1.2, minHeight: '14px', outline: 'none' }}>JUAN DELA CRUZ</div>
                                                        <div contentEditable suppressContentEditableWarning style={{ textAlign: 'center', width: '120px', color: '#444', fontSize: '7pt', lineHeight: 1.2, minHeight: '13px', outline: 'none', marginTop: '2px' }}>GIS Officer</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '5px' }}>
                                                    <div>APPROVED BY:</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <div style={{ height: '28px' }} />
                                                        <div contentEditable suppressContentEditableWarning style={{ borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 'bold', width: '120px', fontSize: '8pt', lineHeight: 1.2, minHeight: '14px', outline: 'none' }}>MARIA CLARA</div>
                                                        <div contentEditable suppressContentEditableWarning style={{ textAlign: 'center', width: '120px', color: '#444', fontSize: '7pt', lineHeight: 1.2, minHeight: '13px', outline: 'none', marginTop: '2px' }}>CENRO Officer</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ padding: '0 5px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                                                <div className="legend-scroll-container" style={{ flex: 1, overflowY: 'visible', marginBottom: '15px', paddingRight: '5px' }}>
                                                    {renderLegendBox(false)}
                                                </div>
                                                <div style={{ borderTop: '2px solid #000', paddingTop: '15px', flexShrink: 0, background: '#fff' }}>
                                                    {renderTechnicalData(legendItemsCount < 5)}
                                                </div>
                                            </div>
                                            <div style={{ marginTop: 'auto' }}>
                                                <div style={{ height: '120px', border: '1.5px solid #000', background: '#e0e0e0', position: 'relative' }}>
                                                    <div ref={mapContainerRefMini} style={{ width: '100%', height: '100%' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : layoutDesign === 'design3' ? (
                                    // ── DESIGN 3: TOP BANNER ─────────────────────────────────────────
                                    // Header bar across top, full-width map, bottom info strip
                                    <>
                                        {/* TOP HEADER STRIP */}
                                        <div style={{ height: '52px', flexShrink: 0, border: '1px solid #000', marginBottom: '6px', display: 'flex', alignItems: 'stretch', background: '#fff' }}>
                                            {/* Left: DENR branding */}
                                            <div style={{ flex: 2, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 10px' }}>
                                                <div style={{ fontSize: '9.5pt', fontWeight: 900, fontFamily: 'Arial, Helvetica, sans-serif', textAlign: 'center', lineHeight: 1.2 }}>DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES</div>
                                                <div style={{ fontSize: '7pt', fontWeight: 'bold', color: '#444', marginTop: '2px' }}>OFFICIAL GIS MAP LAYOUT</div>
                                            </div>
                                            {/* Middle: Signatories */}
                                            <div style={{ flex: 2.5, borderRight: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '4px 10px', fontSize: '6.5pt' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                    <div>PREPARED BY:</div>
                                                    <div style={{ height: '18px' }} />
                                                    <div contentEditable suppressContentEditableWarning style={{ borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 'bold', width: '110px', fontSize: '7.5pt', lineHeight: 1.2, minHeight: '14px', outline: 'none' }}>JUAN DELA CRUZ</div>
                                                    <div contentEditable suppressContentEditableWarning style={{ textAlign: 'center', width: '110px', color: '#444', fontSize: '6.5pt', lineHeight: 1.2, minHeight: '12px', outline: 'none' }}>GIS Officer</div>
                                                </div>
                                                <div style={{ width: '1px', height: '80%', background: '#ddd' }} />
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                    <div>APPROVED BY:</div>
                                                    <div style={{ height: '18px' }} />
                                                    <div contentEditable suppressContentEditableWarning style={{ borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 'bold', width: '110px', fontSize: '7.5pt', lineHeight: 1.2, minHeight: '14px', outline: 'none' }}>MARIA CLARA</div>
                                                    <div contentEditable suppressContentEditableWarning style={{ textAlign: 'center', width: '110px', color: '#444', fontSize: '6.5pt', lineHeight: 1.2, minHeight: '12px', outline: 'none' }}>CENRO Officer</div>
                                                </div>
                                            </div>
                                            {/* Right: Date + Map No */}
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', fontSize: '6.5pt', gap: '4px' }}>
                                                <div style={{ textAlign: 'center' }}><b>DATE:</b><br /><div contentEditable suppressContentEditableWarning style={{ borderBottom: '1px solid #000', minWidth: '80px', textAlign: 'center', outline: 'none', minHeight: '12px' }}>{new Date().toLocaleDateString('en-PH')}</div></div>
                                                <div style={{ textAlign: 'center' }}><b>MAP NO:</b><br /><div contentEditable suppressContentEditableWarning style={{ borderBottom: '1px solid #000', minWidth: '80px', textAlign: 'center', outline: 'none', minHeight: '12px' }}>FEO-001</div></div>
                                            </div>
                                        </div>

                                        {/* MAIN MAP AREA */}
                                        <div style={{ flex: 1, position: 'relative', border: '1px solid #000', marginBottom: '6px', overflow: 'visible' }}>
                                            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#f0f0f0' }}></div>
                                            {renderCoordinates()}
                                            {/* GPS photo SVG leader lines */}
                                            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 480, overflow: 'visible' }}>
                                                {layoutPhotos.map(lp => {
                                                    if (!lp.lat || !lp.lng || !mapRef.current || !window.L) return null;
                                                    try {
                                                        const dot = mapRef.current.latLngToContainerPoint([lp.lat, lp.lng]);
                                                        const photoW = lp.size + 8;
                                                        const photoH = Math.round(lp.size * 0.75) + 20;
                                                        const basePx = dot.x - lp.size / 2 + (lp.offsetX || 0);
                                                        const basePy = dot.y - photoH - 10 + (lp.offsetY || 0);
                                                        return <line key={`ln_${lp.id}`} x1={basePx + photoW / 2} y1={basePy + photoH} x2={dot.x} y2={dot.y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" />;
                                                    } catch { return null; }
                                                })}
                                            </svg>
                                            {layoutPhotos.map(lp => {
                                                let px = lp.x || 60, py = lp.y || 60;
                                                if (lp.lat !== undefined && lp.lng !== undefined && mapRef.current && window.L) {
                                                    try {
                                                        const pt = mapRef.current.latLngToContainerPoint([lp.lat, lp.lng]);
                                                        const photoH = Math.round(lp.size * 0.75) + 20;
                                                        px = pt.x - lp.size / 2 + (lp.offsetX || 0);
                                                        py = pt.y - photoH - 10 + (lp.offsetY || 0);
                                                    } catch {}
                                                }
                                                const coordLabel = lp.lat !== undefined ? `${lp.lat.toFixed(4)}°N  ${lp.lng.toFixed(4)}°E` : lp.name;
                                                return (
                                                    <div key={lp.id} onMouseDown={e => { if (!e.target.classList.contains('map-ui-control') && !e.target.closest?.('.map-ui-control')) startDragPhoto(e, lp.id); }} style={{ position: 'absolute', left: px, top: py, zIndex: lp.locked ? 490 : 510, cursor: 'move', userSelect: 'none' }}>
                                                        <div style={{ background: '#fff', border: `2px solid ${lp.locked ? '#f59e0b' : '#10b981'}`, borderRadius: '4px', padding: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', position: 'relative' }}>
                                                            {!isExporting && <div className="map-ui-control" onMouseDown={e => { e.stopPropagation(); setLayoutPhotos(prev => prev.filter(p => p.id !== lp.id)); }} style={{ position: 'absolute', top: '-10px', right: '-10px', width: '20px', height: '20px', background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20, fontSize: '10px', color: '#fff', fontWeight: 900 }}>✕</div>}
                                                            <img src={lp.photo} alt={coordLabel} style={{ width: lp.size + 'px', height: Math.round(lp.size * 0.75) + 'px', objectFit: 'cover', display: 'block', borderRadius: '2px', pointerEvents: 'none' }} />
                                                            <div style={{ fontSize: '4.5pt', fontWeight: 'bold', textAlign: 'center', color: '#000', padding: '1px 2px', width: lp.size + 'px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>{coordLabel}</div>
                                                            {!isExporting && <div className="map-ui-control" onMouseDown={e => startResizePhoto(e, lp.id)} style={{ position: 'absolute', bottom: '-6px', right: '-6px', width: '14px', height: '14px', background: '#3b82f6', borderRadius: '2px', cursor: 'se-resize', zIndex: 20, border: '2px solid #fff' }} title="Drag to resize" />}
                                                        </div>
                                                        {!lp.locked && !isExporting && <div className="map-ui-control" onMouseDown={e => { e.stopPropagation(); setLayoutPhotos(prev => prev.map(p => p.id === lp.id ? { ...p, locked: true } : p)); }} style={{ background: '#10b981', color: '#fff', fontSize: '6pt', fontWeight: 900, textAlign: 'center', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', marginTop: '3px', whiteSpace: 'nowrap' }}>✓ LOCK PLACEMENT</div>}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* BOTTOM INFO STRIP */}
                                        <div style={{ height: '52px', flexShrink: 0, border: '1px solid #000', display: 'flex', alignItems: 'stretch', background: '#fff' }}>
                                            <div style={{ flex: 2, borderRight: '1px solid #000', padding: '4px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                {renderLegendBox(false)}
                                            </div>
                                            <div style={{ flex: 1.5, borderRight: '1px solid #000', padding: '4px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                {renderTechnicalData(true)}
                                            </div>
                                            <div style={{ width: '140px', borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '4px' }}>
                                                <div style={{ transform: 'scale(0.55)', margin: '-14px 0' }}><NorthArrowSVG /></div>
                                                {renderScaleBar()}
                                                <div style={{ fontSize: '5.5pt', color: '#666', fontWeight: 'bold' }}>WGS 84</div>
                                            </div>
                                            <div style={{ width: '130px', padding: '3px', display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ flex: 1, border: '1px solid #000', background: '#e0e0e0', position: 'relative' }}>
                                                    <div ref={mapContainerRefMini} style={{ width: '100%', height: '100%' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    // ── DESIGN 4: SPLIT PANEL ────────────────────────────────────────
                                    // Left 62% = full map, Right 38% = stacked info panel
                                    <div style={{ display: 'flex', width: '100%', height: '100%', border: '1px solid #000', boxSizing: 'border-box' }}>
                                        {/* LEFT: MAP */}
                                        <div style={{ flex: 1, position: 'relative', borderRight: '2px solid #000', overflow: 'visible' }}>
                                            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#f0f0f0' }}></div>
                                            {renderCoordinates()}
                                            {/* GPS photo SVG leader lines */}
                                            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 480, overflow: 'visible' }}>
                                                {layoutPhotos.map(lp => {
                                                    if (!lp.lat || !lp.lng || !mapRef.current || !window.L) return null;
                                                    try {
                                                        const dot = mapRef.current.latLngToContainerPoint([lp.lat, lp.lng]);
                                                        const photoW = lp.size + 8;
                                                        const photoH = Math.round(lp.size * 0.75) + 20;
                                                        const basePx = dot.x - lp.size / 2 + (lp.offsetX || 0);
                                                        const basePy = dot.y - photoH - 10 + (lp.offsetY || 0);
                                                        return <line key={`ln_${lp.id}`} x1={basePx + photoW / 2} y1={basePy + photoH} x2={dot.x} y2={dot.y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3" />;
                                                    } catch { return null; }
                                                })}
                                            </svg>
                                            {layoutPhotos.map(lp => {
                                                let px = lp.x || 60, py = lp.y || 60;
                                                if (lp.lat !== undefined && lp.lng !== undefined && mapRef.current && window.L) {
                                                    try {
                                                        const pt = mapRef.current.latLngToContainerPoint([lp.lat, lp.lng]);
                                                        const photoH = Math.round(lp.size * 0.75) + 20;
                                                        px = pt.x - lp.size / 2 + (lp.offsetX || 0);
                                                        py = pt.y - photoH - 10 + (lp.offsetY || 0);
                                                    } catch {}
                                                }
                                                const coordLabel = lp.lat !== undefined ? `${lp.lat.toFixed(4)}°N  ${lp.lng.toFixed(4)}°E` : lp.name;
                                                return (
                                                    <div key={lp.id} onMouseDown={e => { if (!e.target.classList.contains('map-ui-control') && !e.target.closest?.('.map-ui-control')) startDragPhoto(e, lp.id); }} style={{ position: 'absolute', left: px, top: py, zIndex: lp.locked ? 490 : 510, cursor: 'move', userSelect: 'none' }}>
                                                        <div style={{ background: '#fff', border: `2px solid ${lp.locked ? '#f59e0b' : '#10b981'}`, borderRadius: '4px', padding: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', position: 'relative' }}>
                                                            {!isExporting && <div className="map-ui-control" onMouseDown={e => { e.stopPropagation(); setLayoutPhotos(prev => prev.filter(p => p.id !== lp.id)); }} style={{ position: 'absolute', top: '-10px', right: '-10px', width: '20px', height: '20px', background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20, fontSize: '10px', color: '#fff', fontWeight: 900 }}>✕</div>}
                                                            <img src={lp.photo} alt={coordLabel} style={{ width: lp.size + 'px', height: Math.round(lp.size * 0.75) + 'px', objectFit: 'cover', display: 'block', borderRadius: '2px', pointerEvents: 'none' }} />
                                                            <div style={{ fontSize: '4.5pt', fontWeight: 'bold', textAlign: 'center', color: '#000', padding: '1px 2px', width: lp.size + 'px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>{coordLabel}</div>
                                                            {!isExporting && <div className="map-ui-control" onMouseDown={e => startResizePhoto(e, lp.id)} style={{ position: 'absolute', bottom: '-6px', right: '-6px', width: '14px', height: '14px', background: '#3b82f6', borderRadius: '2px', cursor: 'se-resize', zIndex: 20, border: '2px solid #fff' }} title="Drag to resize" />}
                                                        </div>
                                                        {!lp.locked && !isExporting && <div className="map-ui-control" onMouseDown={e => { e.stopPropagation(); setLayoutPhotos(prev => prev.map(p => p.id === lp.id ? { ...p, locked: true } : p)); }} style={{ background: '#10b981', color: '#fff', fontSize: '6pt', fontWeight: 900, textAlign: 'center', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', marginTop: '3px', whiteSpace: 'nowrap' }}>✓ LOCK PLACEMENT</div>}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* RIGHT: INFO PANEL */}
                                        <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
                                            {/* DENR Header */}
                                            <div style={{ borderBottom: '2px solid #000', padding: '8px 10px', textAlign: 'center', background: '#f5f5f5' }}>
                                                <div style={{ fontSize: '8pt', fontWeight: 900, fontFamily: 'Arial, Helvetica, sans-serif', lineHeight: 1.3 }}>DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES</div>
                                                <div style={{ fontSize: '6.5pt', fontWeight: 'bold', color: '#555', marginTop: '2px' }}>OFFICIAL GIS MAP LAYOUT</div>
                                            </div>

                                            {/* Mini-map */}
                                            <div style={{ height: '100px', borderBottom: '1px solid #000', position: 'relative', background: '#e0e0e0', flexShrink: 0 }}>
                                                <div ref={mapContainerRefMini} style={{ width: '100%', height: '100%' }}></div>
                                            </div>

                                            {/* North arrow + Scale */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '4px 8px', borderBottom: '1px solid #ccc', flexShrink: 0 }}>
                                                <div style={{ transform: 'scale(0.6)', margin: '-12px 0' }}><NorthArrowSVG /></div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                                                    {renderScaleBar()}
                                                    <div style={{ fontSize: '5.5pt', color: '#666', fontWeight: 'bold' }}>WGS 84</div>
                                                </div>
                                            </div>

                                            {/* Technical data */}
                                            <div style={{ padding: '6px 10px', borderBottom: '1px solid #ccc', flexShrink: 0 }}>
                                                {renderTechnicalData(false)}
                                            </div>

                                            {/* Legend — takes remaining space */}
                                            <div style={{ flex: 1, padding: '6px 10px', borderBottom: '1px solid #ccc', overflow: 'hidden' }} className="legend-scroll-container">
                                                {renderLegendBox(false)}
                                            </div>

                                            {/* Signatories */}
                                            <div style={{ flexShrink: 0, padding: '6px 10px', fontSize: '6.5pt' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                                                        <div>PREPARED BY:</div>
                                                        <div style={{ height: '22px' }} />
                                                        <div contentEditable suppressContentEditableWarning style={{ borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 'bold', width: '100px', fontSize: '7pt', lineHeight: 1.2, minHeight: '13px', outline: 'none' }}>JUAN DELA CRUZ</div>
                                                        <div contentEditable suppressContentEditableWarning style={{ textAlign: 'center', width: '100px', color: '#444', fontSize: '6pt', lineHeight: 1.2, minHeight: '12px', outline: 'none' }}>GIS Officer</div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                                                        <div>APPROVED BY:</div>
                                                        <div style={{ height: '22px' }} />
                                                        <div contentEditable suppressContentEditableWarning style={{ borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 'bold', width: '100px', fontSize: '7pt', lineHeight: 1.2, minHeight: '13px', outline: 'none' }}>MARIA CLARA</div>
                                                        <div contentEditable suppressContentEditableWarning style={{ textAlign: 'center', width: '100px', color: '#444', fontSize: '6pt', lineHeight: 1.2, minHeight: '12px', outline: 'none' }}>CENRO Officer</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}


                <style>{`
                    @media print {
                        @page {
                            size: A4 landscape;
                            margin: 0;
                        }
                        body * { visibility: hidden; }
                        #print-layout, #print-layout * { visibility: visible; }
                        #print-layout { 
                            position: absolute; 
                            left: 0; 
                            top: 0; 
                            margin: 0; 
                            box-shadow: none;
                            border: none;
                        }
                        .no-print, .btn, .sidebar, nav, .custom-scrollbar { display: none !important; }
                    }
                `}</style>
            </div>
            {/* GIS ATTRIBUTES SIDE PANEL (VERTICAL RECTANGLE) */}
            {showAttributeModal && inspectedPolyId && (
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
                        left: '335px', 
                        zIndex: 10000, 
                        width: '340px', 
                        height: 'calc(100% - 3rem)', 
                        overflow: 'hidden',
                        pointerEvents: 'auto'
                    }}
                >
                    <div className="surface-glass" style={{ borderRadius: '24px', background: 'rgba(15, 23, 42, 0.95)', border: '2px solid #60a5fa', display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '0 40px 80px rgba(0,0,0,0.9)' }}>
                        <div style={{ padding: '1.25rem', background: 'rgba(59, 130, 246, 0.1)', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="flex-center gap-3">
                                <Layers size={18} color="#60a5fa" />
                                {(() => {
                                    const poly = savedPolygons.find(p => p.id === inspectedPolyId);
                                    return (
                                        <div>
                                            <h4 style={{ margin: 0, color: '#fff', fontSize: '0.85rem', fontWeight: 900, letterSpacing: '0.5px' }}>ARCGIS METADATA</h4>
                                            <p style={{ margin: 0, fontSize: '0.65rem', color: '#60a5fa', fontWeight: 800 }}>{poly?.name}</p>
                                        </div>
                                    );
                                })()}
                            </div>
                            <button onClick={() => setShowAttributeModal(false)} className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', width: '32px', height: '32px' }}>
                                <X size={18} />
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                {(() => {
                                    const poly = savedPolygons.find(p => p.id === inspectedPolyId);
                                    if (!poly?.attributes) return <div style={{ color: '#666' }}>No attributes found.</div>;
                                    const priority = ['NAME', 'PARTNER ORGANIZATION NAME', 'REGION', 'MUNICIPALITY', 'BARANGAY', 'SITE_NAME', 'AREA_HA', 'TENURE_HOL', 'CTRCT_ID', 'CONTRACT_ID', 'PROJECT'];
                                    return Object.entries(poly.attributes)
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
                                                    padding: '1rem', borderRadius: '14px', 
                                                    background: isLandClass ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.03)',
                                                    border: `1px solid ${isLandClass ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.06)'}`
                                                }}>
                                                    <div style={{ fontSize: '0.65rem', color: isLandClass ? '#60a5fa' : '#888', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.2rem' }}>{key}</div>
                                                    <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700, wordBreak: 'break-word' }}>
                                                        {val !== undefined && val !== null && val !== '' ? String(val) : <span style={{ opacity: 0.2, fontWeight: 400, fontStyle: 'italic' }}>N/A</span>}
                                                    </div>
                                                </div>
                                            );
                                        });
                                })()}
                            </div>
                        </div>

                        <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.65rem', color: '#444' }}>PARCEL DATA INSPECTOR V2.0</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
};

const FeoMapProducer = () => (
    <MapProducerErrorBoundary>
        <FeoMapProducerContent />
    </MapProducerErrorBoundary>
);

export default FeoMapProducer;
