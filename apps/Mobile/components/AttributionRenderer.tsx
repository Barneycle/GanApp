import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { getAttributionComponent } from '../lib/addAttributionViewShot';

/**
 * Renderer component for attribution compositing
 * This component renders attribution components from the registry and captures them
 * It should be added to the root layout to enable programmatic view-shot compositing
 */
export function AttributionRenderer() {
  const [component, setComponent] = useState<React.ReactElement | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    // Poll for components to render
    const interval = setInterval(() => {
      const comp = getAttributionComponent();
      if (comp) {
        // Always update to ensure re-render
        if (comp !== component) {
          console.log('AttributionRenderer: Rendering new component');
          setComponent(comp);
          setKey(prev => prev + 1); // Force re-render with new key
        }
      } else {
        // Clear component if registry is cleared
        if (component) {
          console.log('AttributionRenderer: Clearing component');
          setComponent(null);
        }
      }
    }, 50); // Check more frequently for better responsiveness

    return () => clearInterval(interval);
  }, [component]);

  if (!component) {
    return null;
  }

  // Render the component directly (it's already a React element)
  // Use a stable key to prevent unmounting
  return (
    <View 
      key={key} 
      style={styles.hiddenContainer} 
      pointerEvents="none"
      collapsable={false}
      removeClippedSubviews={false}
    >
      {component}
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    left: -5000,
    top: -5000,
    width: 4000,
    height: 4000,
    overflow: 'visible',
    opacity: 0.01, // Low but not 0 - ensures view is not optimized away
    pointerEvents: 'none',
    zIndex: -1,
    // Disable view collapsing on Android
    collapsable: false,
  },
});

