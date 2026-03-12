import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { snapRoute } from '../api/routesApi.js';
import './RouteSnapPanel.css';

// Fix Leaflet broken marker icons in Vite builds
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
});

const CHICAGO    = [41.8781, -87.6298];
const KM_TO_MI   = 0.621371;

/**
 * RouteSnapPanel
 *
 * UX mirrors onthegomap.com:
 *  - Click anywhere → snaps immediately to nearest foot path / trail / sidewalk
 *  - Route line extends live after each click
 *  - Drag any marker to adjust; route re-draws live
 *  - Double-click a marker to remove it
 *  - Live distance counter updates after every point
 *  - Fullscreen button expands the map panel
 *  - "Save Route to Workout" calls /routes/snap and prefills distance
 *
 * Props:
 *   onSnap {(result) => void}
 */
export default function RouteSnapPanel({ onSnap }) {
  const [waypoints,    setWaypoints]    = useState([]);
  const [liveDistance, setLiveDistance] = useState(null); // km
  const [saving,       setSaving]       = useState(false);
  const [savedResult,  setSavedResult]  = useState(null);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [fullscreen,   setFullscreen]   = useState(false);

  function handleClear() {
    setWaypoints([]);
    setLiveDistance(null);
    setSavedResult(null);
    setErrorMsg('');
  }

  function handleUndo() {
    setWaypoints((prev) => prev.slice(0, -1));
    setSavedResult(null);
    setErrorMsg('');
  }

  async function handleSave() {
    if (waypoints.length < 2) {
      setErrorMsg('Place at least 2 points first.');
      return;
    }
    setSaving(true);
    setSavedResult(null);
    setErrorMsg('');
    try {
      const result = await snapRoute(waypoints);
      setSavedResult(result);
      onSnap?.(result);
    } catch (err) {
      if (err?.status === 503 || err?.message?.includes('503')) {
        setErrorMsg('Backend routing engine unavailable — start the backend server first.');
      } else if (err?.message?.includes('fetch')) {
        setErrorMsg('Cannot reach backend. Make sure the backend server is running, then try again.');
      } else {
        setErrorMsg(`Save failed: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const mapHeight = fullscreen ? '100%' : '360px';

  return (
    <div className={`rsp${fullscreen ? ' rsp--fullscreen' : ''}`}>

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="rsp__toolbar">
        <span className="rsp__distance-display">
          {liveDistance != null
            ? <>
                <strong>{liveDistance.toFixed(2)} km</strong>
                <span className="rsp__distance-mi"> ({(liveDistance * KM_TO_MI).toFixed(2)} mi)</span>
              </>
            : <span className="rsp__distance-empty">
                {waypoints.length === 0 ? 'Click map to start route' : 'Add one more point to measure'}
              </span>
          }
        </span>
        <div className="rsp__actions">
          <button
            type="button"
            className="rsp__btn rsp__btn--ghost"
            onClick={handleUndo}
            disabled={waypoints.length === 0}
            title="Undo last point (Ctrl+Z)"
          >
            ↩ Undo
          </button>
          <button
            type="button"
            className="rsp__btn rsp__btn--ghost"
            onClick={handleClear}
            disabled={waypoints.length === 0}
            title="Clear all points"
          >
            🗑 Clear
          </button>
          <button
            type="button"
            className="rsp__btn rsp__btn--fullscreen"
            onClick={() => setFullscreen((v) => !v)}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
          >
            {fullscreen ? '⛶ Exit' : '⛶ Fullscreen'}
          </button>
          <button
            type="button"
            className="rsp__btn rsp__btn--primary"
            onClick={handleSave}
            disabled={saving || waypoints.length < 2}
            title="Save snapped route to this workout's distance field"
          >
            {saving ? 'Saving…' : '✓ Save Route to Workout'}
          </button>
        </div>
      </div>

      {/* ── Map ─────────────────────────────────────────── */}
      <div className="rsp__map-wrap" style={{ height: mapHeight }}>
        <MapContainer
          center={CHICAGO}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
          zoomControl
        >
          {/*
            Stadia "Alidade Smooth" tile style:
            - Green parks, gardens, grass areas
            - Blue rivers, lakes, water bodies
            - Light grey car roads (de-emphasised)
            - Footpaths, cycle tracks, and trails rendered distinctly
            - Clean, uncluttered background
          */}
          <TileLayer
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={20}
          />
          <RoutingLayer
            waypoints={waypoints}
            onWaypointsChange={setWaypoints}
            onDistanceChange={setLiveDistance}
          />
        </MapContainer>
      </div>

      {/* ── Legend ──────────────────────────────────────── */}
      <p className="rsp__hint">
        🟢 Start &nbsp;·&nbsp; 🔴 Finish &nbsp;·&nbsp;
        Route follows <strong>foot paths, sidewalks &amp; trails</strong> only &nbsp;·&nbsp;
        Drag markers to adjust &nbsp;·&nbsp; Double-click to remove a point
      </p>

      {errorMsg && (
        <div className="rsp__error">
          <strong>⚠ {errorMsg}</strong>
          {errorMsg.includes('backend') && (
            <p className="rsp__error-sub">
              Note: the live map preview works without the backend. Only "Save Route to Workout"
              needs the backend running to persist the route distance.
            </p>
          )}
        </div>
      )}

      {savedResult && (
        <div className="rsp__result">
          <span className="rsp__result-icon">✓</span>
          <span>
            Route saved &nbsp;·&nbsp;
            <strong>{savedResult.distanceKm.toFixed(2)} km</strong>
            {' '}({(savedResult.distanceKm * KM_TO_MI).toFixed(2)} mi)
            <span className="rsp__result-sub"> — distance field updated</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ── RoutingLayer ──────────────────────────────────────────────────────────────

function RoutingLayer({ waypoints, onWaypointsChange, onDistanceChange }) {
  const map          = useMap();
  const routingRef   = useRef(null);
  const markersRef   = useRef([]);
  const waypointsRef = useRef(waypoints);

  useEffect(() => { waypointsRef.current = waypoints; }, [waypoints]);

  // ── Click → add waypoint ──────────────────────────────
  const handleMapClick = useCallback((e) => {
    const next = [...waypointsRef.current, { lat: e.latlng.lat, lng: e.latlng.lng }];
    onWaypointsChange(next);
  }, [onWaypointsChange]);

  useEffect(() => {
    map.on('click', handleMapClick);
    return () => map.off('click', handleMapClick);
  }, [map, handleMapClick]);

  // ── Numbered draggable markers ────────────────────────
  useEffect(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    waypoints.forEach((wp, i) => {
      const isStart = i === 0;
      const isEnd   = i === waypoints.length - 1 && waypoints.length > 1;

      const icon = L.divIcon({
        className: '',
        html: `<div class="rsp-pin${isStart ? ' rsp-pin--start' : isEnd ? ' rsp-pin--end' : ''}">${i + 1}</div>`,
        iconSize:   [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([wp.lat, wp.lng], { draggable: true, icon }).addTo(map);

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        const updated = waypointsRef.current.map((w, idx) =>
          idx === i ? { lat, lng } : w
        );
        onWaypointsChange(updated);
      });

      marker.on('dblclick', (e) => {
        L.DomEvent.stopPropagation(e);
        const updated = waypointsRef.current.filter((_, idx) => idx !== i);
        onWaypointsChange(updated);
      });

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [waypoints, map, onWaypointsChange]);

  // ── LRM route line ────────────────────────────────────
  useEffect(() => {
    if (waypoints.length < 2) {
      if (routingRef.current) {
        map.removeControl(routingRef.current);
        routingRef.current = null;
      }
      onDistanceChange(null);
      return;
    }

    const lLatLngs = waypoints.map((wp) => L.latLng(wp.lat, wp.lng));

    if (routingRef.current) {
      routingRef.current.setWaypoints(lLatLngs);
    } else {
      routingRef.current = L.Routing.control({
        waypoints,
        routeWhileDragging: true,
        addWaypoints:       false,
        draggableWaypoints: false,
        fitSelectedRoutes:  true,
        showAlternatives:   false,
        createMarker:       () => null,
        lineOptions: {
          styles: [
            { color: '#ffffff', weight: 7,  opacity: 0.75 },  // white halo
            { color: '#22c55e', weight: 4,  opacity: 1.0  },  // green route
          ],
          extendToWaypoints:     true,
          missingRouteTolerance: 0,
        },
        router: L.Routing.osrmv1({
          // ✅ routing.openstreetmap.de/routed-foot — dedicated foot/pedestrian
          // OSRM server. Uses OSM foot profile: sidewalks, footpaths, trails.
          // Does NOT route along car roads or highways.
          serviceUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1',
          profile:    'foot',
        }),
      }).addTo(map);

      routingRef.current.on('routesfound', (e) => {
        const metres = e.routes?.[0]?.summary?.totalDistance;
        if (metres != null) onDistanceChange(metres / 1000);
        const el = routingRef.current.getContainer?.();
        if (el) el.style.display = 'none';
      });

      routingRef.current.on('routingerror', () => {
        onDistanceChange(null);
      });
    }
  }, [waypoints, map, onDistanceChange]);

  useEffect(() => {
    return () => {
      if (routingRef.current) {
        map.removeControl(routingRef.current);
        routingRef.current = null;
      }
    };
  }, [map]);

  return null;
}