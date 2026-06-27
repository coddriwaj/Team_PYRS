import { useEffect, useMemo, useRef, useState } from 'react';

let googleMapsPromise;

function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!apiKey) return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY.'));

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[data-google-maps-api]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.google.maps), { once: true });
        existingScript.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMapsApi = 'true';
      script.onload = () => resolve(window.google.maps);
      script.onerror = () => reject(new Error('Google Maps failed to load.'));
      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}

function markerColor(priority) {
  const normalized = String(priority || 'medium').toLowerCase();
  if (normalized === 'high') return '#B91C1C';
  if (normalized === 'low') return '#15803D';
  return '#B45309';
}

function buildMarkerIcon(maps, priority) {
  return {
    path: maps.SymbolPath.CIRCLE,
    fillColor: markerColor(priority),
    fillOpacity: 0.95,
    strokeColor: '#FFFFFF',
    strokeWeight: 2,
    scale: priority === 'high' ? 9 : 7,
  };
}

function GoogleComplaintMap({ markers, selectedId, onMarkerClick, emptyMessage }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef([]);
  const infoWindowRef = useRef(null);
  const [loadError, setLoadError] = useState('');
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const validMarkers = useMemo(
    () => markers.filter((marker) => Number.isFinite(marker.position?.lat) && Number.isFinite(marker.position?.lng)),
    [markers]
  );

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !mapElementRef.current) return;

        const defaultCenter = validMarkers[0]?.position || { lat: 27.7172, lng: 85.324 };
        if (!mapRef.current) {
          mapRef.current = new maps.Map(mapElementRef.current, {
            center: defaultCenter,
            zoom: validMarkers.length ? 12 : 7,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
          infoWindowRef.current = new maps.InfoWindow();
        }

        markerRefs.current.forEach((marker) => marker.setMap(null));
        markerRefs.current = [];

        const bounds = new maps.LatLngBounds();

        validMarkers.forEach((item) => {
          const marker = new maps.Marker({
            position: item.position,
            map: mapRef.current,
            title: item.title,
            icon: buildMarkerIcon(maps, item.criticalness),
          });

          marker.addListener('click', () => {
            infoWindowRef.current.setContent(`
              <div style="max-width:240px">
                <strong>${item.title}</strong>
                <p style="margin:6px 0 0">${item.category || 'Other'} - ${item.criticalness || 'medium'} priority</p>
              </div>
            `);
            infoWindowRef.current.open({ map: mapRef.current, anchor: marker });
            onMarkerClick?.(item.raw);
          });

          markerRefs.current.push(marker);
          bounds.extend(item.position);
        });

        if (validMarkers.length === 1) {
          mapRef.current.setCenter(validMarkers[0].position);
          mapRef.current.setZoom(14);
        } else if (validMarkers.length > 1) {
          mapRef.current.fitBounds(bounds, 72);
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, validMarkers, onMarkerClick]);

  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const selected = validMarkers.find((marker) => marker.id === selectedId);
    if (selected) {
      mapRef.current.panTo(selected.position);
      mapRef.current.setZoom(Math.max(mapRef.current.getZoom(), 13));
    }
  }, [selectedId, validMarkers]);

  if (loadError) {
    return (
      <div className="map-fallback">
        <p>{loadError}</p>
        <small>Add `VITE_GOOGLE_MAPS_API_KEY` in `Frontend/.env` and restart Vite.</small>
      </div>
    );
  }

  if (!validMarkers.length) {
    return (
      <div className="map-fallback">
        <p>{emptyMessage || 'No complaint locations available.'}</p>
      </div>
    );
  }

  return <div ref={mapElementRef} className="google-map" />;
}

export default GoogleComplaintMap;
