import React from 'react';

interface VolumeIndicatorProps {
  volume: number; // Normalized volume level (e.g., 0 to 2)
  barCount?: number;
}

export const VolumeIndicator: React.FC<VolumeIndicatorProps> = ({ volume, barCount = 7 }) => {
  const bars = Array.from({ length: barCount });

  const getBarHeight = (index: number) => {
    const centerIndex = Math.floor(barCount / 2);
    const distanceFromCenter = Math.abs(index - centerIndex);

    // Make the effect more pronounced and clamp the volume to prevent oversized bars
    const clampedVolume = Math.min(Math.max(volume, 0), 1.5);
    
    // Decrease height for bars further from the center to create a wave-like effect
    const heightFactor = (barCount - distanceFromCenter) / barCount;
    
    let height = clampedVolume * heightFactor * 100;
    
    // Ensure bars have a minimum height so they are always visible when listening
    height = Math.max(height, 2); 

    return `${height}%`;
  };

  return (
    <div className="flex justify-center items-center h-12 w-32" aria-label="Audio volume level">
      {bars.map((_, index) => (
        <div
          key={index}
          className="w-2 bg-blue-400/80 rounded-full mx-1"
          style={{
            height: getBarHeight(index),
            transition: 'height 0.1s ease-out',
            opacity: Math.min(Math.max(volume * 0.9, 0.4), 1),
          }}
        />
      ))}
    </div>
  );
};
