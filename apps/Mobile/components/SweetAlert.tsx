import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'question';

interface SweetAlertProps {
  visible: boolean;
  title?: string;
  message?: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  confirmButtonColor?: string;
  cancelButtonColor?: string;
  autoClose?: boolean;
  autoCloseDelay?: number; // in milliseconds
}

export const SweetAlert: React.FC<SweetAlertProps> = ({
  visible,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = false,
  onConfirm,
  onCancel,
  onClose,
  confirmButtonColor,
  cancelButtonColor,
  autoClose = false,
  autoCloseDelay = 5000, // 5 seconds default
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const autoCloseTimer = useRef<NodeJS.Timeout | null>(null);
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('SweetAlert: visible changed', visible, { title, message, type });
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Set up auto-close timer and countdown if enabled
      if (autoClose && !showCancel) {
        const totalSeconds = Math.ceil(autoCloseDelay / 1000);
        setRemainingSeconds(totalSeconds);
        
        // Animate progress circle from 0 to 1
        progressAnim.setValue(0);
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: autoCloseDelay,
          useNativeDriver: false, // Can't use native driver for SVG
        }).start();

        // Update countdown every second
        let secondsLeft = totalSeconds;
        countdownTimer.current = setInterval(() => {
          secondsLeft -= 1;
          setRemainingSeconds(secondsLeft);
          if (secondsLeft <= 0) {
            if (countdownTimer.current) {
              clearInterval(countdownTimer.current);
              countdownTimer.current = null;
            }
          }
        }, 1000);

        // Set up auto-close timer
        autoCloseTimer.current = setTimeout(() => {
          // Call onConfirm and onClose directly to avoid dependency issues
          if (onConfirm) {
            onConfirm();
          }
          if (onClose) {
            onClose();
          }
        }, autoCloseDelay);
      }
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      setRemainingSeconds(0);
      // Clear timers if alert is closed
      if (autoCloseTimer.current) {
        clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = null;
      }
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
      }
    }

    // Cleanup timers on unmount
    return () => {
      if (autoCloseTimer.current) {
        clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = null;
      }
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
      }
    };
  }, [visible, autoClose, autoCloseDelay, showCancel, onConfirm, onClose]);

  const handleConfirm = () => {
    // Clear auto-close timer and countdown if manually closed
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    if (onConfirm) {
      onConfirm();
    }
    if (onClose) {
      onClose();
    }
  };

  const handleCancel = () => {
    // Clear auto-close timer and countdown if manually closed
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    if (onCancel) {
      onCancel();
    }
    if (onClose) {
      onClose();
    }
  };

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return {
          name: 'checkmark-circle',
          color: '#10b981',
          bgColor: '#d1fae5',
        };
      case 'error':
        return {
          name: 'close-circle',
          color: '#ef4444',
          bgColor: '#fee2e2',
        };
      case 'warning':
        return {
          name: 'warning',
          color: '#f59e0b',
          bgColor: '#fef3c7',
        };
      case 'question':
        return {
          name: 'help-circle',
          color: '#3b82f6',
          bgColor: '#dbeafe',
        };
      default:
        return {
          name: 'information-circle',
          color: '#3b82f6',
          bgColor: '#dbeafe',
        };
    }
  };

  const iconConfig = getIconConfig();
  const defaultConfirmColor = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6';
  const confirmColor = confirmButtonColor || defaultConfirmColor;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon with countdown */}
          <View style={styles.iconWrapper}>
            <View style={[styles.iconContainer, { backgroundColor: iconConfig.bgColor }]}>
              <Ionicons name={iconConfig.name as any} size={64} color={iconConfig.color} />
            </View>
            {autoClose && !showCancel && remainingSeconds > 0 && (
              <View style={styles.countdownBadge}>
                <Text style={[styles.countdownText, { color: iconConfig.color }]}>
                  {remainingSeconds}
                </Text>
              </View>
            )}
          </View>
          
          {/* Progress bar for countdown */}
          {autoClose && !showCancel && remainingSeconds > 0 && (
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: iconConfig.color,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Title */}
          {title && (
            <Text style={styles.title}>{title}</Text>
          )}

          {/* Message */}
          {message && (
            <Text style={styles.message}>{message}</Text>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {showCancel && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { borderColor: cancelButtonColor || '#6b7280' },
                ]}
                onPress={handleCancel}
              >
                <Text style={[styles.cancelButtonText, { color: cancelButtonColor || '#6b7280' }]}>
                  {cancelText}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: confirmColor },
                showCancel && styles.buttonWithMargin,
              ]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBarBackground: {
    width: '100%',
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWithMargin: {
    marginLeft: 0,
  },
  confirmButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

// Hook for easy usage
let alertInstance: {
  show: (config: Omit<SweetAlertProps, 'visible'>) => void;
} | null = null;

export const setSweetAlertInstance = (instance: typeof alertInstance) => {
  alertInstance = instance;
};

export const showSweetAlert = (config: Omit<SweetAlertProps, 'visible'>) => {
  if (alertInstance) {
    alertInstance.show(config);
  }
};

