import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { snapRoute } from '../api/routesApi.js';
import './RouteSnapPanel.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
});

const CHICAGO  = [41.8781, -87.6298];
const KM_TO_MI = 0.621371;

export default function RouteSnapPanel({
  onSnap,
  onDistanceChange,   // (km: number | null) => void  — fires live on every LRM update
  savedGeometry   = null,
  savedDistanceKm = null,
  savedWaypoints  = null,
}) {
  const [waypoints,    setWaypoints]    = useState(() => savedWaypoints ?? []);
  const [liveDistance, setLiveDistance] = useState(savedDistanceKm);
  const [saving,       setSaving]       = useState(false);
  const [savedResult,  setSavedResult]  = useState(
    savedDistanceKm != null ? { distanceKm: savedDistanceKm } : null
  );
  const [errorMsg,   setErrorMsg]   = useState('');
  const [fullscreen, setFullscreen] = useState(false);

  // Re-initialise when a different workout is opened
  useEffect(() => {
    setWaypoints(savedWaypoints ?? []);
    setLiveDistance(savedDistanceKm);
    setSavedResult(savedDistanceKm != null ? { distanceKm: savedDistanceKm } : null);
    setErrorMsg('');
  }, [savedWaypoints, savedDistanceKm, savedGeometry]);

  // Forward live LRM distance to parent
  const handleDistanceChange = useCallback((km) => {
    setLiveDistance(km);
    onDistanceChange?.(km);
  }, [onDistanceChange]);

  function handleClear() {
    setWaypoints([]);
    setLiveDistance(null);
    setSavedResult(null);
    setErrorMsg('');
    onDistanceChange?.(null);
  }

  function handleUndo() {
    setWaypoints((prev) => prev.slice(0, -1));
    setErrorMsg('');
  }

  async function handleSave() {
    if (waypoints.length < 2) { setErrorMsg('Place at least 2 points first.'); return; }
    setSaving(true);
    setSavedResult(null);
    setErrorMsg('');
    try {
      const result = await snapRoute(waypoints);
      result.waypoints = waypoints;
      setSavedResult(result);
      setLiveDistance(result.distanceKm);
      onDistanceChange?.(result.distanceKm);
      onSnap?.(result);
    } catch (err) {
      if (err?.status === 503 || err?.message?.includes('503')) {
        setErrorMsg('Routing engine unavailable — check backend OSRM.');
      } else if (err?.message?.includes('fetch')) {
        setErrorMsg('Cannot reach backend. Make sure the backend server is running.');
      } else {
        setErrorMsg(`Save failed: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const hasRoute = waypoints.length >= 2;

  return (
    <div className={`rsp${fullscreen ? ' rsp--fullscreen' : ''}`}>

      {/* ── Toolbar ── */}
      <div className="rsp__toolbar">
        <span className="rsp__distance-display">
          {liveDistance != null
            ? <>
                <strong>{Number(liveDistance).toFixed(2)} km</strong>
                <span className="rsp__distance-mi">
                  {' '}({(Number(liveDistance) * KM_TO_MI).toFixed(2)} mi)
                </span>
                {savedResult && <span className="rsp__distance-saved"> ✓ saved</span>}
              </>
            : <span className="rsp__distance-empty">
                {waypoints.length === 0
                  ? 'Click the map to start your route'
                  : 'Add one more point to measure'}
              </span>
          }
        </span>
        <div className="rsp__actions">
          <button type="button" className="rsp__btn rsp__btn--ghost"
            onClick={handleUndo} disabled={waypoints.length === 0}>↩ Undo</button>
          <button type="button" className="rsp__btn rsp__btn--ghost"
            onClick={handleClear} disabled={waypoints.length === 0}>🗑 Clear</button>
          <button type="button" className="rsp__btn rsp__btn--fullscreen"
            onClick={() => setFullscreen((v) => !v)}>
            {fullscreen ? '⛶ Exit' : '⛶ Fullscreen'}
          </button>
          <button type="button" className="rsp__btn rsp__btn--primary"
            onClick={handleSave} disabled={saving || !hasRoute}>
            {saving ? 'Saving…' : savedResult ? '↺ Update Route' : '✓ Save Route to Workout'}
          </button>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="rsp__map-wrap" style={{ height: fullscreen ? '100%' : '360px' }}>
        <MapContainer
          center={CHICAGO}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxZoom={20}
          />
          <RoutingLayer
            waypoints={waypoints}
            onWaypointsChange={setWaypoints}
            onDistanceChange={handleDistanceChange}
            savedDistanceKm={savedDistanceKm}
          />
        </MapContainer>
      </div>

      <p className="rsp__hint">
        🟢 Start &nbsp;·&nbsp; 🔴 Finish &nbsp;·&nbsp;
        Foot paths, sidewalks &amp; trails only &nbsp;·&nbsp;
        Drag markers to adjust &nbsp;·&nbsp; Double-click to remove
        {savedResult && <> &nbsp;·&nbsp; <strong>Route saved — drag or add points, then click ↺ Update Route</strong></>}
      </p>

      {errorMsg && <div className="rsp__error"><strong>⚠ {errorMsg}</strong></div>}

      {savedResult && (
        <div className="rsp__result">
          <span className="rsp__result-icon">✓</span>
          <span>
            Route saved &nbsp;·&nbsp;
            <strong>{Number(savedResult.distanceKm).toFixed(2)} km</strong>
            {' '}({(Number(savedResult.distanceKm) * KM_TO_MI).toFixed(2)} mi)
            <span className="rsp__result-sub"> — distance field updated</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ── RoutingLayer ──��───────────────────────────────────────────────────────────

function RoutingLayer({ waypoints, onWaypointsChange, onDistanceChange, savedDistanceKm }) {
  const map          = useMap();
  const routingRef   = useRef(null);
  const markersRef   = useRef([]);
  const waypointsRef = useRef(waypoints);

  useEffect(() => { waypointsRef.current = waypoints; }, [waypoints]);

  // Fit map to initial saved waypoints once
  const fittedRef = useRef(false);
  useEffect(() => {
    if (fittedRef.current || waypoints.length < 2) return;
    fittedRef.current = true;
    const bounds = L.latLngBounds(waypoints.map((wp) => [wp.lat, wp.lng]));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [48, 48] });
  }, [waypoints, map]);

  useEffect(() => {
    if (waypoints.length === 0) fittedRef.current = false;
  }, [waypoints.length]);

  // Pre-fill saved distance immediately before LRM recalculates
  useEffect(() => {
    if (savedDistanceKm != null && waypoints.length >= 2) {
      onDistanceChange(savedDistanceKm);
    }
  }, [savedDistanceKm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click to add waypoint
  const handleMapClick = useCallback((e) => {
    onWaypointsChange([...waypointsRef.current, { lat: e.latlng.lat, lng: e.latlng.lng }]);
  }, [onWaypointsChange]);

  useEffect(() => {
    map.on('click', handleMapClick);
    return () => map.off('click', handleMapClick);
  }, [map, handleMapClick]);

  // Draggable numbered markers
  useEffect(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    waypoints.forEach((wp, i) => {
      const isStart = i === 0;
      const isEnd   = i === waypoints.length - 1 && waypoints.length > 1;
      const icon = L.divIcon({
        className: '',
        html: `<div class="rsp-pin${isStart ? ' rsp-pin--start' : isEnd ? ' rsp-pin--end' : ''}">${i + 1}</div>`,
        iconSize: [26, 26], iconAnchor: [13, 13],
      });
      const marker = L.marker([wp.lat, wp.lng], { draggable: true, icon }).addTo(map);
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        onWaypointsChange(waypointsRef.current.map((w, idx) => idx === i ? { lat, lng } : w));
      });
      marker.on('dblclick', (e) => {
        L.DomEvent.stopPropagation(e);
        onWaypointsChange(waypointsRef.current.filter((_, idx) => idx !== i));
      });
      markersRef.current.push(marker);
    });

    return () => { markersRef.current.forEach((m) => m.remove()); markersRef.current = []; };
  }, [waypoints, map, onWaypointsChange]);

  // LRM live route line
  useEffect(() => {
    if (waypoints.length < 2) {
      if (routingRef.current) { map.removeControl(routingRef.current); routingRef.current = null; }
      onDistanceChange(null);
      return;
    }
    const lLatLngs = waypoints.map((wp) => L.latLng(wp.lat, wp.lng));
    if (routingRef.current) {
      routingRef.current.setWaypoints(lLatLngs);
    } else {
      routingRef.current = L.Routing.control({
        waypoints: lLatLngs,
        routeWhileDragging: true,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false,
        showAlternatives: false,
        createMarker: () => null,
        lineOptions: {
          styles: [
            { color: '#ffffff', weight: 7, opacity: 0.75 },
            { color: '#22c55e', weight: 4, opacity: 1.0  },
          ],
          extendToWaypoints: true,
          missingRouteTolerance: 0,
        },
        router: L.Routing.osrmv1({
          serviceUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1',
          profile: 'foot',
        }),
      }).addTo(map);

      routingRef.current.on('routesfound', (e) => {
        const metres = e.routes?.[0]?.summary?.totalDistance;
        if (metres != null) onDistanceChange(metres / 1000);
        const el = routingRef.current.getContainer?.();
        if (el) el.style.display = 'none';
      });
      routingRef.current.on('routingerror', () => onDistanceChange(null));
    }
  }, [waypoints, map, onDistanceChange]);

  useEffect(() => {
    return () => {
      if (routingRef.current) { map.removeControl(routingRef.current); routingRef.current = null; }
    };
  }, [map]);

  return null;
}