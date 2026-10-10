"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { AlertCircle, LoaderCircle, MapPin, Search } from "lucide-react";
import { isValidGeocodeQuery, parseGeocodeResults, type GeocodeResult } from "@/lib/map-search";

type SearchHit = GeocodeResult;
type Coordinates = { lat: number; lng: number };
const SAMPLE: Coordinates = { lat: 30.2672, lng: -97.7431 };
const GEOCODER = process.env.NEXT_PUBLIC_MAP_GEOCODER_URL?.trim() || "https://nominatim.openstreetmap.org/search";
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim() || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

/** Optional online street map. No precise location is requested or sent automatically. */
export function PropertyMap({ onConfirm, onUseSample }: { onConfirm: (label: string) => void; onUseSample: () => void }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const marker = useRef<Leaflet.Marker | null>(null);
  const lastSearch = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const searchLock = useRef(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Coordinates>(SAMPLE);
  const [selectedLabel, setSelectedLabel] = useState("Austin, Texas · illustrative sample location");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const [tilesUnavailable, setTilesUnavailable] = useState(false);

  useEffect(() => {
    if (!enabled || !mapElement.current || map.current) return;
    let disposed = false;
    let instance: Leaflet.Map | null = null;
    let resize: ResizeObserver | null = null;
    void import("leaflet").then(L => {
      if (disposed || !mapElement.current) return;
      const mapNode = mapElement.current;
      const activeMap = L.map(mapNode, { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView([SAMPLE.lat, SAMPLE.lng], 12);
      instance = activeMap;
      const layer = L.tileLayer(TILE_URL, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
      });
      layer.on("tileerror", () => setTilesUnavailable(true));
      layer.addTo(activeMap);
      const activePin = L.marker([SAMPLE.lat, SAMPLE.lng], { draggable: true, title: "Selected approximate property location", keyboard: true, alt: "Selected approximate property location", icon: L.divIcon({ className: "solar-map-pin", html: '<span aria-hidden="true"></span>', iconSize: [24, 30], iconAnchor: [12, 28] }) }).addTo(activeMap);
      activePin.on("dragend", () => {
        const point = activePin.getLatLng();
        setSelected({ lat: point.lat, lng: point.lng });
        setSelectedLabel(`Selected map point · ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);
      });
      activeMap.on("click", event => {
        const point = event.latlng;
        activePin.setLatLng(point);
        setSelected({ lat: point.lat, lng: point.lng });
        setSelectedLabel(`Selected map point · ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);
      });
      map.current = activeMap;
      marker.current = activePin;
      resize = new ResizeObserver(() => activeMap.invalidateSize({ pan: false }));
      resize.observe(mapNode);
    }).catch(() => setError("The interactive map could not load in this browser. Use the sample property and continue with manual roof details."));
    return () => {
      disposed = true;
      activeRequest.current?.abort();
      resize?.disconnect();
      instance?.remove();
      map.current = null;
      marker.current = null;
    };
  }, [enabled]);

  async function search() {
    const text = query.trim();
    if (!isValidGeocodeQuery(text)) { setError("Enter a city, postcode, landmark, or address between 2 and 120 characters."); return; }
    if (searchLock.current) return;
    searchLock.current = true;
    setBusy(true); setError(""); setHits([]);
    const wait = Math.max(0, 1100 - (Date.now() - lastSearch.current));
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    if (!map.current) { searchLock.current = false; setBusy(false); return; }
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
    } catch {
      if (controller.signal.aborted) setError("Location search timed out or was canceled. Retry, use a broader place name, or continue with the sample property.");
      else setError("Location search is temporarily unavailable. Check your connection and retry, or continue with the sample property.");
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) activeRequest.current = null;
      searchLock.current = false;
      setBusy(false);
    }
  }

  function selectHit(hit: SearchHit) {
    const coordinates = { lat: hit.lat, lng: hit.lng };
    setSelected(coordinates); setSelectedLabel(hit.displayName); setHits([]);
    marker.current?.setLatLng([coordinates.lat, coordinates.lng]);
    map.current?.flyTo([coordinates.lat, coordinates.lng], 16, { duration: 0.8 });
  }

  function useSample() {
    setSelected(SAMPLE);
    setSelectedLabel("Austin, Texas · illustrative sample location");
    marker.current?.setLatLng([SAMPLE.lat, SAMPLE.lng]);
    map.current?.flyTo([SAMPLE.lat, SAMPLE.lng], 12, { duration: 0.5 });
    onUseSample();
  }

  return <section className="property-map-card" aria-labelledby="property-map-title">
    <div className="property-map-heading"><div><p className="landing-eyebrow">Optional online map</p><h3 id="property-map-title">Find an approximate property location</h3><p>City and postcode search uses OpenStreetMap/Nominatim. You choose whether to search; no device location is requested. A marker does not identify a specific building.</p></div><MapPin aria-hidden="true" size={19}/></div>
    {!enabled && <div className="property-map-optin"><p>Load an optional live street map. This contacts OpenStreetMap tile servers; your location is only sent to the geocoder if you later press Search.</p><button type="button" onClick={() => setEnabled(true)}>Load online map</button></div>}
    {enabled && <div className="property-map-search">
      <label htmlFor="property-location-search">Search by city, postcode, landmark, or address</label>
      <div><input id="property-location-search" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} maxLength={120} placeholder="e.g. Austin, TX" autoComplete="off"/><button type="button" onClick={() => void search()} disabled={busy || query.trim().length < 2}>{busy ? <><LoaderCircle size={15} className="spin"/> Searching</> : <><Search size={15}/> Search</>}</button></div>
    </div>}
    {busy && <p role="status" className="property-map-status">Searching OpenStreetMap…</p>}
    {error && <p role="alert" className="property-map-error"><AlertCircle size={15}/>{error}</p>}
    {hits.length > 0 && <ul className="property-map-results" aria-label="Location search results">{hits.map((hit, index) => <li key={`${hit.lat}-${hit.lng}-${index}`}><button type="button" onClick={() => selectHit(hit)}>{hit.displayName}</button></li>)}</ul>}
    {enabled ? <div className="property-map" ref={mapElement} role="application" aria-label="Interactive OpenStreetMap. Pan and zoom the map, click to reposition the marker, or drag the marker." /> : <div className="property-map-placeholder" aria-label="Online map not loaded"><MapPin size={20}/><span>Approximate sample point · Austin, Texas</span><small>Load the online map to pan, zoom, search, or reposition the marker.</small></div>}
    {enabled && tilesUnavailable && <p role="status" className="property-map-status">Street map tiles could not load. You can retry your connection or use the sample property and continue with manual roof dimensions.</p>}
    <div className="property-map-selection"><div><strong>Approximate point</strong><span>{selectedLabel}</span><small>{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)} · marker position is user-selected</small></div><div><button type="button" onClick={useSample}>Use sample property</button><button type="button" className="property-map-confirm" onClick={() => onConfirm(selectedLabel)}>Confirm location</button></div></div>
    <p className="property-map-attribution-note">Map tiles and location search require an internet connection. Location text is sent to the public geocoding service only when you press Search. OpenStreetMap tile use is subject to its usage policy; this public demo integration is not intended for high-volume production traffic.</p>
  </section>;
}
