import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
}

const labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

const StarRating = ({ value, onChange }: StarRatingProps) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-3 sm:gap-5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= (hovered || value);
          return (
            <button
              key={star}
              type="button"
              className={`transition-all duration-200 ${isActive ? "animate-star-pop" : ""}`}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => onChange(star)}
              aria-label={`Rate ${star} out of 5`}
            >
              <Star
                size={48}
                className={`transition-colors duration-200 ${
                  isActive
                    ? "fill-star-filled text-star-filled"
                    : "fill-transparent text-star-empty"
                } hover:text-star-hover`}
                strokeWidth={1.5}
              />
              <span className="block text-xs font-body text-muted-foreground mt-1">
                {star}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-lg font-semibold text-foreground h-7 transition-all">
        {labels[hovered || value] || "Tap a star to rate"}
      </p>
    </div>
  );
};

export default StarRating;
