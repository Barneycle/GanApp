import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

interface AttributionBarViewProps {
  imageUri: string;
  attributionText: string;
  width: number;
  height: number;
}

/**
 * Component for Reddit-style attribution bar
 * Full-width black bar at the bottom with white text
 */
export const AttributionBarView = React.forwardRef<View, AttributionBarViewProps>(
  ({ imageUri, attributionText, width, height }, ref) => {
    // Calculate responsive font size and padding
    const fontSize = Math.max(24, Math.floor(width / 40));
    const paddingX = Math.max(20, Math.floor(width / 50));
    const paddingY = Math.max(15, Math.floor(height / 80));
    const barHeight = fontSize + paddingY * 2;
    
    return (
      <View ref={ref} style={[styles.container, { width, height }]}>
        <Image
          source={{ uri: imageUri }}
          style={[styles.image, { width, height }]}
          resizeMode="cover"
        />
        {/* Full-width black bar at bottom */}
        <View
          style={[
            styles.attributionBar,
            {
              height: barHeight,
              paddingHorizontal: paddingX,
            },
          ]}
        >
          <Text
            style={[
              styles.attributionText,
              {
                fontSize: fontSize,
              },
            ]}
          >
            {attributionText}
          </Text>
        </View>
      </View>
    );
  }
);

AttributionBarView.displayName = 'AttributionBarView';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  attributionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  attributionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: 'System',
  },
});

