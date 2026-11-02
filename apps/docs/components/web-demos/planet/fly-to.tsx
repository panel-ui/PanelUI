'use client';

import { useRef, useState } from 'react';
import { Button } from 'panelui-web/button';
import { Planet, type PlanetHandle } from 'panelui-web/planet';

const CITIES = [
  { name: 'Tokyo', lat: 35.68, lng: 139.69 },
  { name: 'Nairobi', lat: -1.29, lng: 36.82 },
  { name: 'Reykjavík', lat: 64.15, lng: -21.94 },
  { name: 'São Paulo', lat: -23.55, lng: -46.63 },
];

export default function PlanetFlyTo() {
  const planet = useRef<PlanetHandle>(null);
  const [city, setCity] = useState(CITIES[0].name);

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <Planet ref={planet} defaultRotation={[139.69, 30]} className="max-w-xs">
        <Planet.Globe label="Cities">
          {CITIES.map((place) => (
            <Planet.Marker
              key={place.name}
              lat={place.lat}
              lng={place.lng}
              label={place.name === city ? place.name : undefined}
            />
          ))}
        </Planet.Globe>
      </Planet>

      <div className="flex flex-wrap justify-center gap-2">
        {CITIES.map((place) => (
          <Button
            key={place.name}
            size="sm"
            variant={place.name === city ? 'default' : 'outline'}
            onClick={() => {
              setCity(place.name);
              // The latitude is eased towards the equator so a city near a
              // pole is seen from the side, not from directly above.
              planet.current?.rotateTo([place.lng, place.lat * 0.6]);
            }}
          >
            {place.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
