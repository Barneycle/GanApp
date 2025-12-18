import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TutorialStep, isTutorialCompleted, markTutorialCompleted } from '../lib/tutorialService';
import { useAuth } from '../lib/authContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TutorialOverlayProps {
  screenId: string;
  steps: TutorialStep[];
  onComplete?: () => void;
}

export default function TutorialOverlay({ screenId, steps, onComplete }: TutorialOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const { user } = useAuth();

  useEffect(() => {
    const checkTutorial = async () => {
      const completed = await isTutorialCompleted(screenId, user?.id);
      if (!completed && steps.length > 0) {
        setCurrentStep(0);
        setVisible(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    };
    checkTutorial();
  }, [screenId, steps.length, user?.id]);

  useEffect(() => {
    // If steps change while visible, keep index in range.
    if (currentStep > steps.length - 1) {
      setCurrentStep(0);
    }
  }, [steps.length]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    await markTutorialCompleted(screenId, user?.id);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onComplete?.();
    });
  };

  if (!visible || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleSkip}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.container}>
          <View style={styles.content}>
            {/* Top actions */}
            <View style={styles.topRow}>
              <Text style={styles.stepCount}>
                {currentStep + 1} / {steps.length}
              </Text>
              <TouchableOpacity onPress={handleSkip} style={styles.skipLink}>
                <Text style={styles.skipLinkText}>Skip</Text>
              </TouchableOpacity>
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="information-circle" size={32} color="#1e40af" />
              </View>
              <Text style={styles.title}>{step.title}</Text>
            </View>

            {/* Description */}
            <ScrollView style={styles.descriptionScroll} contentContainerStyle={styles.descriptionScrollContent}>
              <Text style={styles.description}>{step.description}</Text>
            </ScrollView>

            {/* Step indicator */}
            <View style={styles.stepIndicator}>
              {steps.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCurrentStep(index)}
                  accessibilityRole="button"
                  style={[
                    styles.stepDot,
                    index === currentStep && styles.stepDotActive,
                  ]}
                />
              ))}
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity
                onPress={handlePrev}
                disabled={isFirstStep}
                style={[styles.button, styles.backButton, isFirstStep && styles.buttonDisabled]}
              >
                <Ionicons name="arrow-back" size={18} color={isFirstStep ? '#94a3b8' : '#0f172a'} style={{ marginRight: 6 }} />
                <Text style={[styles.backButtonText, isFirstStep && styles.backButtonTextDisabled]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNext}
                style={[styles.button, styles.nextButton]}
              >
                <Text style={styles.nextButtonText}>
                  {isLastStep ? 'Got it!' : 'Next'}
                </Text>
                {!isLastStep && (
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  skipLink: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipLinkText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    alignSelf: 'stretch',
    textAlign: 'left',
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    alignSelf: 'stretch',
    textAlign: 'left',
    lineHeight: 24,
  },
  descriptionScroll: {
    maxHeight: Math.min(320, SCREEN_HEIGHT * 0.35),
    marginBottom: 20,
  },
  descriptionScrollContent: {
    paddingBottom: 2,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  stepDotActive: {
    width: 24,
    backgroundColor: '#1e40af',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  backButton: {
    backgroundColor: '#f1f5f9',
  },
  backButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonTextDisabled: {
    color: '#94a3b8',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  nextButton: {
    backgroundColor: '#1e40af',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

