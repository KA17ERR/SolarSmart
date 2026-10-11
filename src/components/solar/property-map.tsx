"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { AlertCircle, LoaderCircle, MapPin, Search } from "lucide-react";
import { isValidGeocodeQuery, parseGeocodeResults, type GeocodeResult } from "@/lib/map-search";

type SearchHit = GeocodeResult;
type Coordinates = { lat: number; lng: number };
const SAMPLE: Coordinates = { lat: 30.2672, lng: -97.7431 };
const UNRESOLVED: Coordinates = { lat: 20, lng: 0 };
const GEOCODER = process.env.NEXT_PUBLIC_MAP_GEOCODER_URL?.trim() || "https://nominatim.openstreetmap.org/search";
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim() || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

/** Optional online street map. No precise location is requested or sent automatically. */
export function PropertyMap({ onConfirm, onUseSample, initialLocation, initialLabel }: { onConfirm: (location: Coordinates & { label: string }) => void; onUseSample: () => void; initialLocation?: Coordinates | null; initialLabel?: string }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const marker = useRef<Leaflet.Marker | null>(null);
  const lastSearch = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const searchLock = useRef(false);
  const initialLocationRef = useRef(initialLocation);
  const skipAutocompleteRef = useRef(false);
  initialLocationRef.current = initialLocation;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Coordinates>(initialLocation ?? UNRESOLVED);
  const [selectedLabel, setSelectedLabel] = useState(initialLocation ? initialLabel || "Selected property location" : "No location resolved yet");
  const [selectedResolved, setSelectedResolved] = useState(Boolean(initialLocation));
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [activeHit, setActiveHit] = useState(0);

  function updateMarker(point: Coordinates) {
    if (marker.current) { marker.current.setLatLng([point.lat, point.lng]); return; }
    void import("leaflet").then(L => {
      if (!map.current || marker.current) return;
      const pin = L.marker([point.lat, point.lng], { draggable: true, title: "Selected approximate property location", keyboard: true, alt: "Selected approximate property location", icon: L.divIcon({ className: "solar-map-pin", html: '<span aria-hidden="true"></span>', iconSize: [24, 30], iconAnchor: [12, 28] }) }).addTo(map.current);
      pin.on("dragend", () => {
        const position = pin.getLatLng(); const coordinates = { lat: position.lat, lng: position.lng };
        setSelected(coordinates); setSelectedResolved(true); setSelectedLabel(`Selected map point · ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`);
      });
      marker.current = pin;
    });
  }

  useEffect(() => {
    if (!mapElement.current || map.current) return;
    let disposed = false;
    let instance: Leaflet.Map | null = null;
    let resize: ResizeObserver | null = null;
    void import("leaflet").then(L => {
      if (disposed || !mapElement.current) return;
      const mapNode = mapElement.current;
      const start = initialLocationRef.current ?? UNRESOLVED;
      const activeMap = L.map(mapNode, { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView([start.lat, start.lng], initialLocationRef.current ? 15 : 2);
      instance = activeMap;
      const layer = L.tileLayer(TILE_URL, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
      });
      layer.on("tileerror", () => setTilesUnavailable(true));
      layer.addTo(activeMap);
      const markerIcon = L.divIcon({ className: "solar-map-pin", html: '<span aria-hidden="true"></span>', iconSize: [24, 30], iconAnchor: [12, 28] });
      const activePin = initialLocationRef.current ? L.marker([start.lat, start.lng], { draggable: true, title: "Selected approximate property location", keyboard: true, alt: "Selected approximate property location", icon: markerIcon }).addTo(activeMap) : null;
      if (activePin) activePin.on("dragend", () => {
        const point = activePin.getLatLng();
        setSelected({ lat: point.lat, lng: point.lng }); setSelectedResolved(true);
        setSelectedLabel(`Selected map point · ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);
      });
      activeMap.on("click", event => {
        const point = event.latlng;
        updateMarker(point);
        setSelected({ lat: point.lat, lng: point.lng });
        setSelectedResolved(true);
        setSelectedLabel(`Selected map point · ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);
      });
      map.current = activeMap;
      marker.current = activePin;
      setMapLoading(false);
      resize = new ResizeObserver(() => activeMap.invalidateSize({ pan: false }));
      resize.observe(mapNode);
    }).catch(() => { setMapLoading(false); setError("The interactive map could not load in this browser. Use the sample property and continue with manual roof details."); });
    return () => {
      disposed = true;
      activeRequest.current?.abort();
      resize?.disconnect();
      instance?.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    const location = initialLocationRef.current;
    if (location) {
      if (marker.current) marker.current.setLatLng([location.lat, location.lng]);
      else void import("leaflet").then(L => { if (map.current && !marker.current) marker.current = L.marker([location.lat, location.lng], { draggable: true, title: "Selected approximate property location", keyboard: true, alt: "Selected approximate property location", icon: L.divIcon({ className: "solar-map-pin", html: '<span aria-hidden="true"></span>', iconSize: [24, 30], iconAnchor: [12, 28] }) }).addTo(map.current); });
      map.current.flyTo([location.lat, location.lng], 15, { duration: 0.6 });
      setSelected(location); setSelectedResolved(true); setSelectedLabel(initialLabel || "Selected property location");
    } else {
      marker.current?.remove(); marker.current = null;
      map.current.setView([UNRESOLVED.lat, UNRESOLVED.lng], 2);
      setSelected(UNRESOLVED); setSelectedResolved(false); setSelectedLabel("No location resolved yet");
    }
  }, [initialLocation?.lat, initialLocation?.lng, initialLabel]);

  const search = useCallback(async (queryText: string) => {
    const text = queryText.trim();
    if (!isValidGeocodeQuery(text)) { setError("Enter a city, postcode, landmark, or address between 2 and 120 characters."); return; }
    if (searchLock.current) return;
    searchLock.current = true;
    setBusy(true); setError(""); setHits([]);
    const wait = Math.max(0, 1100 - (Date.now() - lastSearch.current));
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 9000);
    lastSearch.current = Date.now();
    try {
      const url = new URL(GEOCODER);
      url.searchParams.set("q", text);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "5");
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("search unavailable");
      const result: unknown = await response.json();
      if (!Array.isArray(result)) throw new Error("invalid search response");
      const matches = parseGeocodeResults(result);
      if (!matches.length) { setError("No locations found. Try a nearby city or postcode, or continue with the sample property."); return; }
      setHits(matches);
      setActiveHit(0);
    } catch {
      if (controller.signal.aborted) setError("Location search timed out or was canceled. Retry, use a broader place name, or continue with the sample property.");
      else setError("Location search is temporarily unavailable. Check your connection and retry, or continue with the sample property.");
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) activeRequest.current = null;
      searchLock.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const text = query.trim();
    if (skipAutocompleteRef.current) { skipAutocompleteRef.current = false; return; }
    if (text.length < 3) { setHits([]); setError(""); return; }
    const timer = window.setTimeout(() => { activeRequest.current?.abort(); void search(text); }, 1000);
    return () => { window.clearTimeout(timer); activeRequest.current?.abort(); };
  }, [query, search]);

  function selectHit(hit: SearchHit) {
    const coordinates = { lat: hit.lat, lng: hit.lng };
    setSelected(coordinates); setSelectedLabel(hit.displayName); setSelectedResolved(true); setHits([]);
    skipAutocompleteRef.current = true;
    setQuery(hit.displayName);
    setError("");
    updateMarker(coordinates);
    map.current?.flyTo([coordinates.lat, coordinates.lng], 16, { duration: 0.8 });
  }

  function useSample() {
    setSelected(SAMPLE);
    setSelectedLabel("Austin, Texas · illustrative sample location");
    setSelectedResolved(true);
    updateMarker(SAMPLE);
    map.current?.flyTo([SAMPLE.lat, SAMPLE.lng], 12, { duration: 0.5 });
    setQuery(""); setHits([]); setError(""); onUseSample();
  }

  return <section className="property-map-card" aria-labelledby="property-map-title">
    <div className="property-map-heading"><div><p className="landing-eyebrow">Optional location search</p><h3 id="property-map-title">Find an approximate property location</h3><p>Suggestions use OpenStreetMap/Nominatim after you type at least three characters. No device location is requested. A marker does not identify a specific building.</p></div><MapPin aria-hidden="true" size={19}/></div>
    <div className="property-map-search">
      <label htmlFor="property-location-search">Search by city, postcode, landmark, or address</label>
      <div><input id="property-location-search" role="combobox" aria-autocomplete="list" aria-expanded={hits.length > 0} aria-controls="property-location-results" aria-activedescendant={hits.length ? `property-location-option-${activeHit}` : undefined} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "ArrowDown" && hits.length) { event.preventDefault(); setActiveHit(index => (index + 1) % hits.length); } else if (event.key === "ArrowUp" && hits.length) { event.preventDefault(); setActiveHit(index => (index - 1 + hits.length) % hits.length); } else if (event.key === "Enter" && hits.length) { event.preventDefault(); selectHit(hits[activeHit]); } else if (event.key === "Escape") { setHits([]); setError(""); } else if (event.key === "Enter") { event.preventDefault(); void search(query); } }} maxLength={120} placeholder="e.g. Austin, TX" autoComplete="off"/><button type="button" onClick={() => void search(query)} disabled={busy || query.trim().length < 2}>{busy ? <><LoaderCircle size={15} className="spin"/> Searching</> : <><Search size={15}/> Search</>}</button></div>
    </div>
    {mapLoading && <p role="status" className="property-map-status">Loading optional street map…</p>}
    {busy && <p role="status" className="property-map-status">Searching OpenStreetMap…</p>}
    {error && <p role="alert" className="property-map-error"><AlertCircle size={15}/>{error}</p>}
    {hits.length > 0 && <ul id="property-location-results" role="listbox" className="property-map-results" aria-label="Location search suggestions">{hits.map((hit, index) => <li key={`${hit.lat}-${hit.lng}-${index}`}><button id={`property-location-option-${index}`} type="button" role="option" aria-selected={activeHit === index} onMouseEnter={() => setActiveHit(index)} onClick={() => selectHit(hit)}>{hit.displayName}</button></li>)}</ul>}
    <div className="property-map" ref={mapElement} role="application" aria-label="Interactive OpenStreetMap. Pan and zoom the map, click to reposition the marker, or drag the marker." />
    {tilesUnavailable && <p role="status" className="property-map-status">Street map tiles could not load. You can retry your connection or use the sample property and continue with manual roof dimensions.</p>}
    <div className="property-map-selection"><div><strong>Approximate point</strong><span>{selectedLabel}</span><small>{selectedResolved ? `${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)} · selected approximate coordinates` : "Choose a result or select a point on the map before confirming."}</small></div><div><button type="button" onClick={useSample}>Use sample property</button><button type="button" className="property-map-confirm" disabled={!selectedResolved} onClick={() => onConfirm({ ...selected, label: selectedLabel })}>Confirm location</button></div></div>
    <p className="property-map-attribution-note">Map tiles load when the planner opens. Location text is sent to OpenStreetMap/Nominatim after you type three or more characters and pause briefly. This public geocoder integration is for a low-volume demo, not production-scale address search.</p>
  </section>;
}
