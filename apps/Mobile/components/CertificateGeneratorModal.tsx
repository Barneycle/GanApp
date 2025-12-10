import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useFonts } from 'expo-font';
import { saveFileToGanApp } from '../lib/mediaStoreSaver';
let Print: any = null;
try {
  Print = require('expo-print');
} catch (e) {
  console.log('expo-print not available:', e);
}
import { CertificateService, CertificateConfig, Certificate } from '../lib/certificateService';
import { EventService, Event } from '../lib/eventService';
import { useAuth } from '../lib/authContext';
import { useToast } from './Toast';

// Certificate content component for rendering
const CertificateContentView = ({ 
  config, 
  event, 
  userName, 
  formatDate,
  fontsLoaded = false
}: { 
  config: CertificateConfig; 
  event: Event; 
  userName: string; 
  formatDate: (date: string | null | undefined) => string;
  fontsLoaded?: boolean;
}) => {
  const width = config.width || 2000;
  const height = config.height || 1200;
  const header = config.header_config || {};
  const participation = config.participation_text_config || {};
  const isGivenTo = config.is_given_to_config || {};
  const nameConfig = config.name_config || {};

  // Build participation text
  let participationText = participation.text_template || '';
  participationText = participationText.replace('{EVENT_NAME}', event.title);
  participationText = participationText.replace('{EVENT_DATE}', formatDate(event.start_date));
  participationText = participationText.replace('{VENUE}', event.venue || '[Venue]');

  const logoConfig = config.logo_config || {};

  return (
    <View
      style={{
        width,
        height,
        backgroundColor: config.background_color || '#ffffff',
        borderWidth: config.border_width || 5,
        borderColor: config.border_color || '#1e40af',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* PSU Logo */}
      {logoConfig.psu_logo_url && (
        <Image
          source={{ uri: logoConfig.psu_logo_url }}
          style={{
            position: 'absolute',
            left: (width * (logoConfig.psu_logo_position?.x || 15)) / 100,
            top: (height * (logoConfig.psu_logo_position?.y || 10)) / 100,
            width: logoConfig.psu_logo_size?.width || 120,
            height: logoConfig.psu_logo_size?.height || 120,
          }}
          resizeMode="contain"
        />
      )}

      {/* Sponsor Logos */}
      {logoConfig.sponsor_logos && logoConfig.sponsor_logos.length > 0 && (
        <>
          {logoConfig.sponsor_logos.map((logoUrl, index) => {
            const sponsorSize = logoConfig.sponsor_logo_size || { width: 80, height: 80 };
            const sponsorPos = logoConfig.sponsor_logo_position || { x: 90, y: 5 };
            const spacing = logoConfig.sponsor_logo_spacing || 10;
            return (
              <Image
                key={index}
                source={{ uri: logoUrl }}
                style={{
                  position: 'absolute',
                  left: (width * sponsorPos.x) / 100,
                  top: (height * sponsorPos.y) / 100 + (index * (sponsorSize.height + spacing)),
                  width: sponsorSize.width,
                  height: sponsorSize.height,
                }}
                resizeMode="contain"
              />
            );
          })}
        </>
      )}

      {/* Header - Republic */}
      {header.republic_text && header.republic_config && (
        <Text
          style={{
            position: 'absolute',
            top: (height * (header.republic_config.position?.y || 8)) / 100 - (header.republic_config.font_size || 14) / 2,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: header.republic_config.font_size || 14,
            color: header.republic_config.color || '#000000',
            fontWeight: header.republic_config.font_weight === 'bold' ? 'bold' : 'normal',
          }}
        >
          {header.republic_text}
        </Text>
      )}

      {/* Header - University */}
      {header.university_text && header.university_config && (
        <Text
          style={{
            position: 'absolute',
            top: (height * (header.university_config.position?.y || 11)) / 100 - (header.university_config.font_size || 20) / 2,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: header.university_config.font_size || 20,
            color: header.university_config.color || '#000000',
            fontWeight: header.university_config.font_weight === 'bold' ? 'bold' : 'normal',
          }}
        >
          {header.university_text}
        </Text>
      )}

      {/* Header - Location */}
      {header.location_text && header.location_config && (
        <Text
          style={{
            position: 'absolute',
            top: (height * (header.location_config.position?.y || 14)) / 100 - (header.location_config.font_size || 14) / 2,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: header.location_config.font_size || 14,
            color: header.location_config.color || '#000000',
            fontWeight: header.location_config.font_weight === 'bold' ? 'bold' : 'normal',
          }}
        >
          {header.location_text}
        </Text>
      )}

      {/* Title */}
      {config.title_text && (
        <View
          style={{
            position: 'absolute',
            top: (height * ((config.title_position?.y || 28) - 4)) / 100,
            left: 0,
            right: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: config.title_font_size || 56,
              color: config.title_color || '#000000',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            {config.title_text}
          </Text>
        </View>
      )}

      {/* Title Subtitle */}
      {config.title_subtitle && (
        <Text
          style={{
            position: 'absolute',
            top: (height * ((config.title_position?.y || 28) + 2)) / 100,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: (config.title_font_size || 56) * 0.4,
            color: config.title_color || '#000000',
          }}
        >
          {config.title_subtitle}
        </Text>
      )}

      {/* "is given to" Text */}
      {isGivenTo.text && (
        <Text
          style={{
            position: 'absolute',
            top: (height * (isGivenTo.position?.y || 38)) / 100 - (isGivenTo.font_size || 16) / 2,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: isGivenTo.font_size || 16,
            color: isGivenTo.color || '#000000',
            fontWeight: isGivenTo.font_weight === 'bold' ? 'bold' : 'normal',
          }}
        >
          {isGivenTo.text}
        </Text>
      )}

      {/* Participant Name - MonteCarlo font */}
      <Text
        style={{
          position: 'absolute',
          top: (height * (nameConfig.position?.y || 50)) / 100 - (nameConfig.font_size || 48) / 2,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: nameConfig.font_size || 48,
          color: nameConfig.color || '#000000',
          fontWeight: nameConfig.font_weight === 'bold' ? 'bold' : 'normal',
          fontStyle: 'italic',
          fontFamily: 'MonteCarlo', // Use MonteCarlo font for participant name
        }}
      >
        {userName}
      </Text>

      {/* Name Line */}
      <View
        style={{
          position: 'absolute',
          top: (height * ((nameConfig.position?.y || 50) + 3)) / 100,
          left: width * 0.2,
          width: width * 0.6,
          height: 2,
          backgroundColor: '#000000',
        }}
      />

      {/* Participation Text - Handle multi-line */}
      {participationText && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          {participationText.split('\n').map((line, index) => {
            const lineHeight = (participation.font_size || 18) * (participation.line_height || 1.5);
            const startY = (height * (participation.position?.y || 60)) / 100 - ((participationText.split('\n').length - 1) * lineHeight) / 2;
            return (
              <Text
                key={index}
                style={{
                  position: 'absolute',
                  top: startY + (index * lineHeight) - (participation.font_size || 18) / 2,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  fontSize: participation.font_size || 18,
                  color: participation.color || '#000000',
                }}
              >
                {line}
              </Text>
            );
          })}
        </View>
      )}

      {/* Signature Blocks */}
      {config.signature_blocks && config.signature_blocks.length > 0 && (
        <>
          {config.signature_blocks.map((sig, index) => {
            const sigX = (width * (sig.position_config?.x || 50)) / 100;
            const sigY = (height * (sig.position_config?.y || 92)) / 100;
            const imgWidth = sig.signature_image_width || 300;
            const imgHeight = sig.signature_image_height || 100;
            
            return (
              <View 
                key={index} 
                style={{ 
                  position: 'absolute',
                  left: sigX - imgWidth / 2,
                  top: sigY - imgHeight - 20,
                  width: imgWidth,
                  alignItems: 'center',
                }}
              >
                {/* Signature Image */}
                {sig.signature_image_url && (
                  <Image
                    source={{ uri: sig.signature_image_url }}
                    style={{
                      width: imgWidth,
                      height: imgHeight,
                    }}
                    resizeMode="contain"
                  />
                )}
                
                {/* Name - bold version only */}
                {sig.name && (
                  <Text
                    style={{
                      marginTop: sig.signature_image_url ? 0 : 0,
                      textAlign: 'center',
                      fontSize: sig.name_font_size || 14,
                      color: sig.name_color || '#000000',
                      fontWeight: 'bold',
                      fontFamily: sig.font_family || 'sans-serif',
                    }}
                  >
                    {sig.name}
                  </Text>
                )}
                
                {/* Position */}
                {sig.position && (
                  <Text
                    style={{
                      marginTop: 2,
                      textAlign: 'center',
                      fontSize: sig.position_font_size || 12,
                      color: sig.position_color || '#000000',
                      fontFamily: sig.font_family || 'sans-serif',
                    }}
                  >
                    {sig.position}
                  </Text>
                )}
              </View>
            );
          })}
        </>
      )}
    </View>
  );
};

interface CertificateGeneratorModalProps {
  visible: boolean;
  eventId: string;
  onClose: () => void;
}

export default function CertificateGeneratorModal({
  visible,
  eventId,
  onClose,
}: CertificateGeneratorModalProps) {
  const { user } = useAuth();
  const toast = useToast();
  const certificateViewRef = useRef<any>(null);

  // Load MonteCarlo font - try different font name variations
  const [fontsLoaded, fontError] = useFonts({
    'MonteCarlo': require('../assets/fonts/MonteCarlo-Regular.ttf'),
  });

  useEffect(() => {
    if (fontError) {
      console.error('❌ Error loading MonteCarlo font:', fontError);
    }
    if (fontsLoaded) {
      console.log('✅ MonteCarlo font loaded successfully, fontsLoaded:', fontsLoaded);
    } else {
      console.log('⏳ MonteCarlo font still loading, fontsLoaded:', fontsLoaded);
    }
  }, [fontsLoaded, fontError]);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [config, setConfig] = useState<CertificateConfig | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  // Default config (same as web version) - defined before use
  const getDefaultConfig = (): CertificateConfig => ({
    event_id: eventId,
    background_color: '#ffffff',
    border_color: '#1e40af',
    border_width: 5,
    title_text: 'CERTIFICATE',
    title_subtitle: 'OF PARTICIPATION',
    title_font_size: 56,
    title_color: '#000000',
    title_position: { x: 50, y: 28 },
    width: 2000,
    height: 1200,
    name_config: {
      font_size: 48,
      color: '#000000',
      position: { x: 50, y: 50 },
      font_family: 'MonteCarlo, cursive',
      font_weight: 'bold',
    },
    event_title_config: {
      font_size: 24,
      color: '#000000',
      position: { x: 50, y: 60 },
      font_family: 'Libre Baskerville, serif',
      font_weight: 'normal',
    },
    date_config: {
      font_size: 20,
      color: '#000000',
      position: { x: 50, y: 70 },
      font_family: 'Arial, sans-serif',
      font_weight: 'normal',
      date_format: 'MMMM DD, YYYY',
    },
    header_config: {
      republic_text: 'Republic of the Philippines',
      university_text: 'Partido State University',
      location_text: 'Goa, Camarines Sur',
      republic_config: {
        font_size: 14,
        color: '#000000',
        position: { x: 50, y: 8 },
        font_family: 'Libre Baskerville, serif',
        font_weight: 'normal',
      },
      university_config: {
        font_size: 20,
        color: '#000000',
        position: { x: 50, y: 11 },
        font_family: 'Libre Baskerville, serif',
        font_weight: 'bold',
      },
      location_config: {
        font_size: 14,
        color: '#000000',
        position: { x: 50, y: 14 },
        font_family: 'Libre Baskerville, serif',
        font_weight: 'normal',
      },
    },
    logo_config: {
      psu_logo_url: null,
      psu_logo_size: { width: 120, height: 120 },
      psu_logo_position: { x: 15, y: 10 },
      sponsor_logos: [],
      sponsor_logo_size: { width: 80, height: 80 },
      sponsor_logo_position: { x: 90, y: 5 },
      sponsor_logo_spacing: 10,
    },
    participation_text_config: {
      text_template: 'For his/her active participation during the {EVENT_NAME} held on {EVENT_DATE} at {VENUE}',
      font_size: 18,
      color: '#000000',
      position: { x: 50, y: 60 },
      font_family: 'Libre Baskerville, serif',
      font_weight: 'normal',
      line_height: 24,
    },
    is_given_to_config: {
      text: 'This certificate is proudly presented to',
      font_size: 16,
      color: '#000000',
      position: { x: 50, y: 38 },
      font_family: 'Libre Baskerville, serif',
      font_weight: 'normal',
    },
    signature_blocks: [],
  });

  useEffect(() => {
    if (visible && eventId && user?.id && fontsLoaded) {
      loadData();
    }
  }, [visible, eventId, user?.id, fontsLoaded]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load event (same as web)
      const eventResult = await EventService.getEventById(eventId);
      if (eventResult.error || !eventResult.event) {
        throw new Error(eventResult.error || 'Event not found');
      }
      setEvent(eventResult.event);

      // Load certificate config from certificate_configs table (same as web - template created during event creation)
      const configResult = await CertificateService.getCertificateConfig(eventId);
      const defaultConfig = getDefaultConfig();
      
      if (configResult.error) {
        // Use default config if there's an error loading
        setConfig(defaultConfig);
      } else if (!configResult.config) {
        // Use default config if no config exists
        setConfig(defaultConfig);
      } else {
        // Deep merge with default config to ensure all fields are present (same as web)
        const mergedConfig: CertificateConfig = {
          ...defaultConfig,
          ...configResult.config,
          header_config: { ...defaultConfig.header_config, ...(configResult.config.header_config || {}) },
          logo_config: { ...defaultConfig.logo_config, ...(configResult.config.logo_config || {}) },
          participation_text_config: { 
            ...defaultConfig.participation_text_config, 
            ...(configResult.config.participation_text_config || {}),
            position: { 
              ...defaultConfig.participation_text_config.position, 
              ...(configResult.config.participation_text_config?.position || {}) 
            }
          },
          is_given_to_config: { ...defaultConfig.is_given_to_config, ...(configResult.config.is_given_to_config || {}) },
          name_config: { ...defaultConfig.name_config, ...(configResult.config.name_config || {}) },
          event_title_config: { ...defaultConfig.event_title_config, ...(configResult.config.event_title_config || {}) },
          date_config: { ...defaultConfig.date_config, ...(configResult.config.date_config || {}) },
          signature_blocks: configResult.config.signature_blocks || defaultConfig.signature_blocks
        };
        setConfig(mergedConfig);
      }

      // Check if certificate already exists (same as web)
      const certResult = await CertificateService.getUserCertificate(user.id, eventId);
      if (certResult.certificate) {
        setCertificate(certResult.certificate);
        if (certResult.certificate.certificate_png_url) {
          setPreviewUri(certResult.certificate.certificate_png_url);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load certificate data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) {
      return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    const date = new Date(dateString);
    const format = config?.date_config?.date_format || 'MMMM DD, YYYY';

    if (format === 'MMMM DD, YYYY') {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    return date.toLocaleDateString();
  };

  const getUserName = (): string => {
    if (!user) {
      return user?.email?.split('@')[0] || 'Participant';
    }

    const parts: string[] = [];
    if (user.prefix) parts.push(user.prefix);
    if (user.first_name) parts.push(user.first_name);
    if (user.middle_initial) parts.push(user.middle_initial);
    if (user.last_name) parts.push(user.last_name);
    if (user.affix) parts.push(user.affix);

    if (parts.length > 0) {
      return parts.join(' ');
    }

    return user?.email?.split('@')[0] || 'Participant';
  };

  const generatePNG = async (): Promise<string | null> => {
    if (!config || !event) {
      console.error('Missing config or event for PNG generation');
      return null;
    }

    // Wait a bit longer to ensure the view is fully rendered, especially on regeneration
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!certificateViewRef.current) {
      console.error('certificateViewRef.current is null - view may not be rendered');
      throw new Error('Certificate view not ready. Please try again.');
    }

    try {
      const uri = await captureRef(certificateViewRef.current, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      return uri.startsWith('file://') ? uri : `file://${uri}`;
    } catch (err: any) {
      console.error('Error generating PNG:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      throw new Error(`Failed to generate PNG certificate: ${err.message || 'Unknown error'}`);
    }
  };

  const generatePDF = async (): Promise<string | null> => {
    if (!config || !event) {
      return null;
    }

    if (!Print) {
      console.warn('expo-print not available, PDF generation will be skipped');
      return null;
    }

    try {
      // Generate HTML for the certificate
      const html = generateCertificateHTML();
      
      // Generate PDF from HTML using expo-print
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      return uri;
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      throw new Error('Failed to generate PDF certificate');
    }
  };

  const generateCertificateHTML = (): string => {
    if (!config || !event) return '';

    const width = config.width || 2000;
    const height = config.height || 1200;
    const participantName = getUserName();
    const header = config.header_config || {};
    const participation = config.participation_text_config || {};
    const isGivenTo = config.is_given_to_config || {};
    const nameConfig = config.name_config || {};

    // Build participation text
    let participationText = participation.text_template || '';
    participationText = participationText.replace('{EVENT_NAME}', event.title);
    participationText = participationText.replace('{EVENT_DATE}', formatDate(event.start_date));
    participationText = participationText.replace('{VENUE}', event.venue || '[Venue]');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=MonteCarlo&display=swap');
            body {
              margin: 0;
              padding: 0;
              width: ${width}px;
              height: ${height}px;
              background-color: ${config.background_color || '#ffffff'};
              font-family: 'Libre Baskerville', serif;
              position: relative;
              overflow: hidden;
            }
            .certificate {
              width: 100%;
              height: 100%;
              position: relative;
              border: ${config.border_width || 5}px solid ${config.border_color || '#1e40af'};
              box-sizing: border-box;
            }
            .header {
              position: absolute;
              top: ${(height * (header.republic_config?.position?.y || 8)) / 100}px;
              left: 0;
              right: 0;
              text-align: center;
            }
            .republic {
              font-size: ${header.republic_config?.font_size || 14}px;
              color: ${header.republic_config?.color || '#000000'};
              font-weight: ${header.republic_config?.font_weight || 'normal'};
              margin-bottom: 5px;
            }
            .university {
              font-size: ${header.university_config?.font_size || 20}px;
              color: ${header.university_config?.color || '#000000'};
              font-weight: ${header.university_config?.font_weight || 'bold'};
              margin-bottom: 5px;
            }
            .location {
              font-size: ${header.location_config?.font_size || 14}px;
              color: ${header.location_config?.color || '#000000'};
              font-weight: ${header.location_config?.font_weight || 'normal'};
            }
            .title {
              position: absolute;
              top: ${(height * (config.title_position?.y || 28)) / 100}px;
              left: 0;
              right: 0;
              text-align: center;
            }
            .title-main {
              font-size: ${config.title_font_size || 56}px;
              color: ${config.title_color || '#000000'};
              font-weight: bold;
              margin-bottom: 10px;
            }
            .title-subtitle {
              font-size: ${(config.title_font_size || 56) * 0.4}px;
              color: ${config.title_color || '#000000'};
            }
            .is-given-to {
              position: absolute;
              top: ${(height * (isGivenTo.position?.y || 45)) / 100}px;
              left: 0;
              right: 0;
              text-align: center;
              font-size: ${isGivenTo.font_size || 16}px;
              color: ${isGivenTo.color || '#000000'};
            }
            .participant-name {
              position: absolute;
              top: ${(height * (nameConfig.position?.y || 50)) / 100}px;
              left: 0;
              right: 0;
              text-align: center;
              font-size: ${nameConfig.font_size || 48}px;
              color: ${nameConfig.color || '#000000'};
              font-weight: ${nameConfig.font_weight || 'bold'};
              font-family: 'MonteCarlo', cursive;
            }
            .name-line {
              position: absolute;
              top: ${(height * ((nameConfig.position?.y || 50) + 3)) / 100}px;
              left: ${width * 0.2}px;
              right: ${width * 0.2}px;
              height: 2px;
              background-color: #000000;
            }
            .participation {
              position: absolute;
              top: ${(height * (participation.position?.y || 60)) / 100}px;
              left: ${width * 0.15}px;
              right: ${width * 0.15}px;
              text-align: center;
              font-size: ${participation.font_size || 18}px;
              color: ${participation.color || '#000000'};
              line-height: ${participation.line_height || 24}px;
            }
            .signatures {
              position: absolute;
              bottom: ${height * 0.08}px;
              left: 0;
              right: 0;
              display: flex;
              justify-content: space-around;
              padding: 0 ${width * 0.1}px;
            }
            .signature {
              text-align: center;
            }
            .signature-name {
              font-size: 14px;
              font-weight: bold;
              color: #000000;
              margin-top: 5px;
            }
            .signature-position {
              font-size: 12px;
              color: #000000;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            ${header.republic_text ? `<div class="header"><div class="republic">${header.republic_text}</div></div>` : ''}
            ${header.university_text ? `<div class="university">${header.university_text}</div>` : ''}
            ${header.location_text ? `<div class="location">${header.location_text}</div>` : ''}
            ${config.title_text ? `<div class="title"><div class="title-main">${config.title_text}</div>${config.title_subtitle ? `<div class="title-subtitle">${config.title_subtitle}</div>` : ''}</div>` : ''}
            ${isGivenTo.text ? `<div class="is-given-to">${isGivenTo.text}</div>` : ''}
            <div class="participant-name">${participantName}</div>
            <div class="name-line"></div>
            ${participationText ? `<div class="participation">${participationText}</div>` : ''}
            ${config.signature_blocks && config.signature_blocks.length > 0 ? `
              <div class="signatures">
                ${config.signature_blocks.map((sig) => `
                  <div class="signature">
                    ${sig.signature_image_url ? `<img src="${sig.signature_image_url}" style="max-width: 100px; max-height: 60px;" />` : ''}
                    ${sig.name ? `<div class="signature-name">${sig.name}</div>` : ''}
                    ${sig.position ? `<div class="signature-position">${sig.position}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </body>
      </html>
    `;
  };

  const handleGenerate = async () => {
    if (!eventId || !user?.id || !config || !event) return;

    setGenerating(true);
    setError(null);

    try {
      // Generate certificate number
      const certificateNumber = CertificateService.generateCertificateNumber(eventId, user.id);

      // Generate PNG (required)
      const pngUri = await generatePNG();
      if (!pngUri) {
        throw new Error('Failed to generate PNG');
      }

      // Generate PDF (optional, if expo-print is available)
      const pdfUri = await generatePDF();
      
      // Upload files
      const pngFileName = `${certificateNumber}.png`;
      const uploadPromises = [
        CertificateService.uploadCertificateFile(pngUri, pngFileName, 'png', eventId, user.id),
      ];

      let pdfResult: { url?: string; error?: string } = {};
      if (pdfUri) {
        const pdfFileName = `${certificateNumber}.pdf`;
        uploadPromises.push(
          CertificateService.uploadCertificateFile(pdfUri, pdfFileName, 'pdf', eventId, user.id)
        );
      }

      const results = await Promise.all(uploadPromises);
      const pngResult = results[0];
      
      if (results.length > 1) {
        pdfResult = results[1];
      }

      if (pngResult.error) {
        throw new Error(`PNG upload failed: ${pngResult.error}`);
      }
      if (pdfResult.error) {
        console.warn('PDF upload failed, continuing with PNG only:', pdfResult.error);
      }

      // Save to database
      const saveResult = await CertificateService.saveCertificate({
        event_id: eventId,
        user_id: user.id,
        certificate_number: certificateNumber,
        participant_name: getUserName(),
        event_title: event.title,
        completion_date: event.start_date || new Date().toISOString().split('T')[0],
        certificate_pdf_url: pdfResult.url,
        certificate_png_url: pngResult.url,
      });

      if (saveResult.error) {
        throw new Error(`Failed to save certificate: ${saveResult.error}`);
      }

      setCertificate(saveResult.certificate);
      setPreviewUri(pngResult.url);
      toast.success('Certificate generated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to generate certificate');
      toast.error(err.message || 'Failed to generate certificate');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'png') => {
    if (!certificate) return;

    const url = format === 'pdf' ? certificate.certificate_pdf_url : certificate.certificate_png_url;

    if (!url) {
      toast.error(`${format.toUpperCase()} certificate not available`);
      return;
    }

    try {
      // Request permissions if needed (iOS only)
      if (Platform.OS === 'ios') {
        const permissionResult = await MediaLibrary.requestPermissionsAsync(true);
        if (!permissionResult.granted) {
          toast.warning('Please grant photo library access to save the certificate. You can enable it in your device settings.');
          return;
        }
      }

      // Download file to cache first
      const fileName = `certificate-${certificate.certificate_number}.${format}`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      const downloadResult = await FileSystem.downloadAsync(url, fileUri);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download certificate: HTTP ${downloadResult.status}`);
      }

      // Ensure URI has file:// prefix
      const assetUri = downloadResult.uri.startsWith('file://') 
        ? downloadResult.uri 
        : `file://${downloadResult.uri}`;
      
      // Save to Pictures/GanApp/ (same as albums)
      if (Platform.OS === 'android') {
        // Android: Use MediaStore API (no permissions needed on Android 10+)
        await saveFileToGanApp(assetUri, fileName, format);
      } else {
        // iOS: Use MediaLibrary (permissions already checked above)
        const asset = await MediaLibrary.createAssetAsync(assetUri);
        const album = await MediaLibrary.getAlbumAsync('GanApp');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('GanApp', asset, false);
        }
      }
      
      toast.success('Certificate downloaded successfully!');
    } catch (err: any) {
      console.error('Error downloading certificate:', err);
      toast.error(`Failed to download certificate: ${err.message || 'Unknown error'}`);
    }
  };

  if (loading || !fontsLoaded) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-white rounded-xl p-8 max-w-md mx-4">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-center text-slate-600 mt-4">
              {!fontsLoaded ? 'Loading fonts...' : 'Loading certificate data...'}
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50">
        <View className="flex-1 bg-white mt-20 rounded-t-3xl">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-200">
            <Text className="text-2xl font-bold text-slate-800">Certificate</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
            {error && (
              <View className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <Text className="text-red-800 text-sm">{error}</Text>
              </View>
            )}

            {certificate ? (
              <View className="space-y-6">
                <View className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <Text className="text-green-800 font-medium">Certificate already generated!</Text>
                  <Text className="text-green-600 text-sm mt-1">You can download it anytime below or regenerate a new one.</Text>
                </View>

                {/* Regenerate Button - placed prominently before preview */}
                <TouchableOpacity
                  onPress={handleGenerate}
                  disabled={generating}
                  style={{
                    backgroundColor: '#ea580c',
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 60,
                  }}
                >
                  {generating ? (
                    <>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={{ color: '#ffffff', fontWeight: '600', marginTop: 8, fontSize: 16 }}>
                        Regenerating...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="refresh" size={28} color="#ffffff" />
                      <Text style={{ color: '#ffffff', fontWeight: '600', marginTop: 8, fontSize: 16 }}>
                        Regenerate Certificate
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Preview */}
                {previewUri && (
                  <View className="bg-slate-50 rounded-lg p-4 items-center">
                    <Text className="text-slate-700 font-semibold mb-3">Preview</Text>
                    <Image
                      source={{ uri: previewUri }}
                      style={{ width: '100%', height: 400, resizeMode: 'contain' }}
                    />
                  </View>
                )}

                {/* Download Buttons */}
                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    onPress={() => handleDownload('pdf')}
                    className="flex-1 bg-blue-600 px-4 py-3 rounded-lg items-center"
                  >
                    <Ionicons name="document-text" size={24} color="#ffffff" />
                    <Text className="text-white font-semibold mt-2">Download PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDownload('png')}
                    className="flex-1 bg-blue-600 px-4 py-3 rounded-lg items-center"
                  >
                    <Ionicons name="image" size={24} color="#ffffff" />
                    <Text className="text-white font-semibold mt-2">Download PNG</Text>
                  </TouchableOpacity>
                </View>

                {/* Certificate Preview (hidden, used for regeneration) */}
                {config && event && (
                  <View 
                    ref={certificateViewRef} 
                    collapsable={false} 
                    style={{ 
                      position: 'absolute', 
                      left: -10000, // Move far off-screen but still render
                      top: 0,
                      width: config.width || 2000, 
                      height: config.height || 1200,
                    }}
                    removeClippedSubviews={false} // Important: don't clip subviews
                  >
                    <CertificateContentView config={config} event={event} userName={getUserName()} formatDate={formatDate} fontsLoaded={fontsLoaded} />
                  </View>
                )}
              </View>
            ) : (
              <View className="space-y-6">
                <View className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <Text className="text-blue-800 font-medium">Generate Your Certificate</Text>
                  <Text className="text-blue-600 text-sm mt-1">
                    Create a certificate for your participation in this event.
                  </Text>
                </View>

                {/* Certificate Preview (hidden, used for generation) */}
                {config && event && (
                  <View 
                    ref={certificateViewRef} 
                    collapsable={false} 
                    style={{ 
                      position: 'absolute', 
                      left: -10000, // Move far off-screen but still render
                      top: 0,
                      width: config.width || 2000, 
                      height: config.height || 1200,
                    }}
                    removeClippedSubviews={false} // Important: don't clip subviews
                  >
                    <CertificateContentView config={config} event={event} userName={getUserName()} formatDate={formatDate} fontsLoaded={fontsLoaded} />
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleGenerate}
                  disabled={generating}
                  className="bg-blue-600 px-6 py-4 rounded-lg items-center"
                >
                  {generating ? (
                    <>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text className="text-white font-semibold mt-2">Generating...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="document-text" size={24} color="#ffffff" />
                      <Text className="text-white font-semibold mt-2">Generate Certificate</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

