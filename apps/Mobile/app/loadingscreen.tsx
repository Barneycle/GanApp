import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [text, setText] = useState('');
  const fullText = 'GanApp';
  const progressBarWidth = useRef(new Animated.Value(0)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    // Set minimum timer to ensure loading screen lasts at least 3 seconds
    minTimerRef.current = setTimeout(() => {
      setIsCompleted(true);
      onComplete();
    }, 3000);

    const cursorAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    cursorAnimation.start();

    let charIndex = 0;
    const animateText = () => {
      if (charIndex < fullText.length) {
        const currentText = fullText.substring(0, charIndex + 1);
        setText(currentText);
        
        // Progress bar fills gradually with each character (0% to 80% during typing)
        const progress = (charIndex + 1) / fullText.length;
        const progressValue = progress * 0.8;
        
        Animated.timing(progressBarWidth, {
          toValue: progressValue,
          duration: 600,
          useNativeDriver: false,
        }).start();
        
        charIndex++;
        animationRef.current = setTimeout(animateText, 100);
      } else {
        // Wait a bit before stopping cursor and completing the final 20%
        setTimeout(() => {
          cursorAnimation.stop();
          
          // Complete the final 20% of progress bar quickly
          Animated.timing(progressBarWidth, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }).start(() => {
            // Animation completed, but minimum timer will handle onComplete
          });
        }, 300);
      }
    };

    // Start text animation after a shorter delay
    setTimeout(() => {
      animateText();
    }, 200);

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
      if (minTimerRef.current) {
        clearTimeout(minTimerRef.current);
      }
      cursorAnimation.stop();
    };
  }, []); // Empty dependency array - only run once on mount

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1 bg-zinc-200 justify-center items-center">
      {/* Text with blinking cursor */}
      <View className="mb-4">
        <Text className="font-mono font-bold text-5xl text-centersm:text-2xl md:text-3xl lg:text-4xl text-blue-900">
          {text}
          <Animated.Text 
            className="text-blue-900 ml-1"
            style={{ opacity: cursorOpacity }}
          >
            |
          </Animated.Text>
        </Text>
      </View>

      {/* Progress Bar */}
      <View className="w-[200px] h-[2px] bg-gray-800 rounded relative overflow-hidden">
        <Animated.View 
          className="h-full bg-blue-500 rounded"
          style={{
            width: progressBarWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
            shadowColor: '#3b82f6',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 15,
            elevation: 8,
          }}
        />
      </View>
    </SafeAreaView>
    </>
  );
};

export default LoadingScreen;
