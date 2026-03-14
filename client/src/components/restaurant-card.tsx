import { ExternalLink, MapPin, Navigation, Utensils } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import type { Restaurant } from '@/types/restaurant';
import { cn } from '@/utils/cn';
import { formatDistance } from '@/utils/format';

type RestaurantCardProps = {
  restaurant: Restaurant;
  /** Whether to use the alternate (mint) background */
  alternate: boolean;
  /** Contextual label for distance, e.g. "away from La Union" */
  distanceLabel?: string;
};

/**
 * Individual restaurant card matching the Typography Focus design.
 * Handles missing data gracefully — hides distance/link when null.
 */
export const RestaurantCard = ({
  restaurant,
  alternate,
  distanceLabel,
}: RestaurantCardProps): ReactNode => {
  const categoryText =
    restaurant.categories.length > 0
      ? restaurant.categories.map((c) => c.name).join(' • ')
      : 'Restaurant';

  const categoryIcon =
    restaurant.categories.length > 0 && restaurant.categories[0].icon
      ? restaurant.categories[0].icon
      : null;

  /** Build a Google Maps link from lat/lng. */
  const googleMapsUrl =
    restaurant.location !== null
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=&center=${restaurant.location.lat},${restaurant.location.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`;

  return (
    <div
      className={cn(
        'rounded-xl border p-6 transition-shadow hover:shadow-md md:p-',
        alternate
          ? 'border-secondary/50 bg-secondary'
          : 'border-border bg-card shadow-sm',
      )}
    >
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        {/* Left: Content */}
        <div className="flex-1">
          {/* Category row */}
          <div className="mb-2 flex items-center gap-3">
            {categoryIcon ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-forest">
                <img
                  src={categoryIcon}
                  alt=""
                  className="h-4 w-4"
                  loading="lazy"
                />
              </span>
            ) : (
              <Utensils className="h-5 w-5 text-forest" />
            )}
            <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
              {categoryText}
            </span>
          </div>

          {/* Name */}
          <h3 className="mb-3 text-2xl leading-tight font-extrabold text-forest md:text-3xl">
            {restaurant.name}
          </h3>

          {/* Metadata */}
          <div className="flex flex-col gap-1.5 text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <p className="text-sm">{restaurant.address}</p>
            </div>

            {restaurant.distance != null && (
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 shrink-0" />
                <p className="text-sm font-medium text-soft-forest">
                  {formatDistance(restaurant.distance)}
                  {distanceLabel && (
                    <span className="font-normal text-muted-foreground">
                      {' '}
                      {distanceLabel}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: CTA */}
        {googleMapsUrl !== null && (
          <div className="flex min-w-40 flex-col gap-3">
            <Button
              asChild
              className="w-full bg-forest font-bold text-secondary hover:bg-forest/90"
            >
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                View on Maps
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
