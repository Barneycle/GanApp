import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EventService } from '../../services/eventService';
import { CertificateService } from '../../services/certificateService';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { supabase } from '../../lib/supabaseClient';

export const Certificate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [event, setEvent] = useState(null);
  const [certificateData, setCertificateData] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [eligibilityError, setEligibilityError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Refs to prevent multiple simultaneous operations
  const generateInProgressRef = useRef(false);
  const downloadInProgressRef = useRef(false);

  useEffect(() => {
    if (eventId && user?.id) {
      loadEventData();
    } else if (eventId) {
      setError('Event ID is missing');
      setLoading(false);
    }
  }, [eventId, user?.id]);

  const loadEventData = async () => {
    if (!eventId || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setEligibilityError(null);
      
      // Check if certificate already exists
      const existingCert = await CertificateService.getUserCertificate(user.id, eventId);
      if (existingCert.certificate) {
        console.log('Found existing certificate:', existingCert.certificate.certificate_pdf_url);
        setCertificate(existingCert.certificate);
        // If certificate exists, always show download button (don't allow regeneration)
        // Users can only generate once
        setIsGenerated(true);
        setShowSuccessMessage(false); // Don't show success message on page load for existing certificates
        console.log('Certificate exists - showing download button only (no regeneration allowed)');
      } else {
        console.log('No existing certificate found - user can generate');
        setShowSuccessMessage(false); // No certificate, no success message
      }

      const eventResult = await EventService.getEventById(eventId);
      
      if (eventResult.error) {
        setError(eventResult.error || 'Failed to load event data');
        setLoading(false);
        return;
      }

      if (eventResult.event) {
        setEvent(eventResult.event);
        
        // Get participant name from user data
        const participantName = user?.first_name && user?.last_name
          ? `${user.first_name} ${user.last_name}`
          : user?.email?.split('@')[0] || 'Participant';

        // Format event date
        const eventDate = new Date(eventResult.event.start_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // Get organizer name from user's affiliated organization
        const organizer = user?.affiliated_organization || 'GanApp Events';

        const certData = {
          eventId: eventResult.event.id,
          eventName: eventResult.event.title,
          participantName: participantName,
          date: existingCert.certificate ? new Date(existingCert.certificate.completion_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : eventDate,
          certificateId: existingCert.certificate?.certificate_number || `CERT-${Date.now()}`,
          organizer: organizer
        };
        
        setCertificateData(certData);
      }
    } catch (err) {
      console.error('Error loading event data:', err);
      setError('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  // Get user name from database by ID
  const getUserNameFromDB = async (userId) => {
    try {
      // Try RPC function first
      const { data: userProfile, error: rpcError } = await supabase.rpc('get_user_profile', { user_id: userId });
      
      if (!rpcError && userProfile) {
        const firstName = userProfile.first_name || '';
        const lastName = userProfile.last_name || '';
        if (firstName && lastName) {
          return `${firstName} ${lastName}`;
        } else if (firstName) {
          return firstName;
        } else if (lastName) {
          return lastName;
        }
      }
      
      // Fallback to auth.users metadata
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!authError && user && user.id === userId) {
        const firstName = user.user_metadata?.first_name || '';
        const lastName = user.user_metadata?.last_name || '';
        if (firstName && lastName) {
          return `${firstName} ${lastName}`;
        } else if (firstName) {
          return firstName;
        } else if (lastName) {
          return lastName;
        }
        return user.email?.split('@')[0] || 'Participant';
      }
      
      return 'Participant';
    } catch (err) {
      console.error('Error fetching user name from DB:', err);
      return 'Participant';
    }
  };

  // Helper function to get name placement from certificate template
  const getNamePlacement = (template) => {
    // Default placement (center, 50% from bottom)
    const defaultPlacement = {
      x: 0.5, // 50% from left (center horizontally)
      y: 0.5, // 50% from bottom
      fontSize: 36,
      color: '#000000', // Black
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      textAlign: 'center' // 'center', 'left', 'right'
    };

    if (!template || !template.content_fields) {
      return defaultPlacement;
    }

    // Check if name_position exists in content_fields
    const namePosition = template.content_fields.name_position;
    if (namePosition && typeof namePosition === 'object') {
      return {
        x: namePosition.x !== undefined ? namePosition.x : defaultPlacement.x,
        y: namePosition.y !== undefined ? namePosition.y : defaultPlacement.y,
        fontSize: namePosition.fontSize || defaultPlacement.fontSize,
        color: namePosition.color || defaultPlacement.color,
        fontFamily: namePosition.fontFamily || defaultPlacement.fontFamily,
        fontWeight: namePosition.fontWeight || defaultPlacement.fontWeight,
        textAlign: namePosition.textAlign || defaultPlacement.textAlign
      };
    }

    // If name_position is a string, try to parse it
    if (typeof namePosition === 'string') {
      try {
        const parsed = JSON.parse(namePosition);
        return {
          x: parsed.x !== undefined ? parsed.x : defaultPlacement.x,
          y: parsed.y !== undefined ? parsed.y : defaultPlacement.y,
          fontSize: parsed.fontSize || defaultPlacement.fontSize,
          color: parsed.color || defaultPlacement.color,
          fontFamily: parsed.fontFamily || defaultPlacement.fontFamily,
          fontWeight: parsed.fontWeight || defaultPlacement.fontWeight,
          textAlign: parsed.textAlign || defaultPlacement.textAlign
        };
      } catch (e) {
        console.warn('Failed to parse name_position:', e);
      }
    }

    return defaultPlacement;
  };

  // Helper function: Generate certificate (retrieves template, overlays name, saves to DB, uploads to bucket)
  const generateCertificateHelper = async (userId, eventId, participantName, templateUrl) => {
    // Step 0: Get certificate template metadata for name placement
    const templateResult = await CertificateService.getCertificateTemplate(eventId);
    const certificateTemplate = templateResult.template;
    const namePlacement = getNamePlacement(certificateTemplate);

    // Step 1: Detect template type (PDF or image)
    const isImageTemplate = templateUrl.match(/\.(jpg|jpeg|png|gif)$/i) || 
                            (certificateTemplate && certificateTemplate.template_type === 'image');
    const isPdfTemplate = templateUrl.match(/\.pdf$/i) || 
                          (certificateTemplate && certificateTemplate.template_type === 'pdf');

    // Step 2: Download template from storage
    let bucket, path;
    let templateBytes;
    
    // Parse URL to extract bucket and path
    if (templateUrl.includes('/storage/v1/object/public/')) {
      const urlParts = templateUrl.split('/storage/v1/object/public/');
      if (urlParts.length === 2) {
        const parts = urlParts[1].split('/');
        bucket = parts[0];
        path = parts.slice(1).join('/');
      }
    } else if (templateUrl.includes('/storage/v1/object/')) {
      const urlParts = templateUrl.split('/storage/v1/object/');
      if (urlParts.length === 2) {
        const parts = urlParts[1].split('/');
        bucket = parts[0];
        path = parts.slice(1).join('/');
      }
    }
    
    // Try Storage API download first (bypasses CORS, acts as server-side proxy)
    if (bucket && path) {
      try {
        const { data: templateData, error: downloadError } = await supabase.storage
          .from(bucket)
          .download(path);
        
        if (!downloadError && templateData) {
          templateBytes = await templateData.arrayBuffer();
        } else {
          throw new Error(downloadError?.message || 'Storage API download failed');
        }
      } catch (storageErr) {
        // If Storage API fails, try using the URL directly (if it's public)
        try {
          const response = await fetch(templateUrl, {
            method: 'GET',
            headers: {
              'Accept': isImageTemplate ? 'image/*' : 'application/pdf',
            },
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch template: ${response.statusText}`);
          }
          
          templateBytes = await response.arrayBuffer();
        } catch (fetchErr) {
          throw new Error(`Failed to download template. Storage API: ${storageErr.message}, Direct fetch: ${fetchErr.message}`);
        }
      }
    } else {
      // If we can't parse the URL, try fetching it directly
      try {
        const response = await fetch(templateUrl, {
          method: 'GET',
          headers: {
            'Accept': isImageTemplate ? 'image/*' : 'application/pdf',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch template: ${response.statusText}`);
        }
        
        templateBytes = await response.arrayBuffer();
      } catch (fetchErr) {
        throw new Error(`Failed to download template: ${fetchErr.message}. URL: ${templateUrl}`);
      }
    }

    let filledBytes;
    let fileExtension = 'pdf';
    let contentType = 'application/pdf';

    // Step 3: Process template based on type
    if (isImageTemplate) {
      // Handle PNG/JPG templates with Canvas API
      const imageBlob = new Blob([templateBytes], { type: 'image/png' });
      const imageUrl = URL.createObjectURL(imageBlob);
      
      // Create canvas to draw on image
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      // Draw the template image
      ctx.drawImage(img, 0, 0);

      // Calculate text position based on dynamic placement
      const textX = namePlacement.textAlign === 'center' 
        ? canvas.width * namePlacement.x
        : namePlacement.textAlign === 'right'
        ? canvas.width * namePlacement.x
        : canvas.width * namePlacement.x; // left alignment
      
      const textY = canvas.height * (1 - namePlacement.y); // y is from bottom, canvas y is from top

      // Set text style
      ctx.font = `${namePlacement.fontWeight} ${namePlacement.fontSize}px ${namePlacement.fontFamily}`;
      ctx.fillStyle = namePlacement.color;
      ctx.textAlign = namePlacement.textAlign;
      ctx.textBaseline = 'middle'; // Center vertically on the y position

      // Calculate text width for centering if needed
      const textMetrics = ctx.measureText(participantName);
      let finalX = textX;
      if (namePlacement.textAlign === 'center') {
        finalX = textX - (textMetrics.width / 2);
      } else if (namePlacement.textAlign === 'right') {
        finalX = textX - textMetrics.width;
      }

      // Draw the participant name
      ctx.fillText(participantName, finalX, textY);

      console.log('Drawing name on image:', {
        participantName,
        fontSize: namePlacement.fontSize,
        x: finalX,
        y: textY,
        width: canvas.width,
        height: canvas.height,
        textWidth: textMetrics.width,
        placement: namePlacement
      });

      // Convert canvas to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png', 1.0);
      });

      filledBytes = await blob.arrayBuffer();
      fileExtension = 'png';
      contentType = 'image/png';

      // Clean up
      URL.revokeObjectURL(imageUrl);
    } else if (isPdfTemplate) {
      // Handle PDF templates (existing logic)
      const pdfDoc = await PDFDocument.load(templateBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      // Try to fill form fields first
      const form = pdfDoc.getForm();
      const formFields = form.getFields();
      let nameFilled = false;
      
      if (formFields.length > 0) {
        for (const field of formFields) {
          try {
            const fieldName = field.getName().toLowerCase();
            if (fieldName.includes('name') || fieldName.includes('participant')) {
              if (field.constructor.name === 'PDFTextField') {
                field.setText(participantName);
                nameFilled = true;
                break;
              }
            }
          } catch (err) {
            // Continue if field can't be filled
          }
        }
      }
      
      // If no form fields, overlay text using dynamic placement
      if (!nameFilled) {
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontSize = namePlacement.fontSize;
        const textWidth = helveticaFont.widthOfTextAtSize(participantName, fontSize);
        
        // Calculate x position based on textAlign
        let x;
        if (namePlacement.textAlign === 'center') {
          x = (width * namePlacement.x) - (textWidth / 2);
        } else if (namePlacement.textAlign === 'right') {
          x = (width * namePlacement.x) - textWidth;
        } else {
          x = width * namePlacement.x; // left
        }
        
        // y is from bottom in PDF
        const y = height * namePlacement.y;
        
        console.log('Drawing name on PDF:', {
          participantName,
          fontSize,
          x,
          y,
          width,
          height,
          textWidth,
          placement: namePlacement
        });
        
        // Parse color
        const colorMatch = namePlacement.color.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
        const pdfColor = colorMatch 
          ? rgb(parseInt(colorMatch[1], 16) / 255, parseInt(colorMatch[2], 16) / 255, parseInt(colorMatch[3], 16) / 255)
          : rgb(0, 0, 0);
        
        firstPage.drawText(participantName, {
          x: x,
          y: y,
          size: fontSize,
          font: helveticaFont,
          color: pdfColor,
        });
      }
      
      filledBytes = await pdfDoc.save();
    } else {
      throw new Error('Unsupported template format. Please use PDF or image (PNG/JPG) templates.');
    }
    
    // Step 3: Check if certificate already exists, if not create one
    let existingCert = await CertificateService.getUserCertificate(userId, eventId);
    let certificateRecord;
    let isExistingCertificate = false;
    
    if (existingCert.certificate) {
      // Certificate already exists, use it
      console.log('Certificate already exists, updating it:', existingCert.certificate.id);
      certificateRecord = existingCert.certificate;
      isExistingCertificate = true;
    } else {
      // Create new certificate record
      const result = await CertificateService.generateCertificate(userId, eventId, 'pdf');
      
      if (result.error) {
        // If error is duplicate key, try to fetch existing certificate
        if (result.error.includes('duplicate key') || result.error.includes('unique constraint')) {
          console.log('Duplicate certificate detected, fetching existing one');
          const retryCert = await CertificateService.getUserCertificate(userId, eventId);
          if (retryCert.certificate) {
            certificateRecord = retryCert.certificate;
            isExistingCertificate = true;
          } else {
            throw new Error('Certificate exists but could not be retrieved');
          }
        } else {
          throw new Error(result.error);
        }
      } else if (result.certificate) {
        certificateRecord = result.certificate;
      } else {
        throw new Error('Failed to create certificate record');
      }
    }

    // Step 4: Upload filled certificate to generated-certificates bucket
    const certificateNumber = certificateRecord.certificate_number || `CERT-${Date.now()}`;
    const fileName = `${certificateNumber}.${fileExtension}`;
    // Path format: certificates/{eventId}/{userId}/{fileName}
    // This matches the RLS policy which checks (storage.foldername(name))[3] = auth.uid()::text
    const filePath = `certificates/${eventId}/${userId}/${fileName}`;

    console.log('Uploading certificate to path:', filePath);
    console.log('User ID:', userId);
    console.log('File size:', filledBytes.byteLength, 'bytes');
    console.log('File type:', contentType);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated-certificates')
      .upload(filePath, filledBytes, {
        contentType: contentType,
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error details:', uploadError);
      throw new Error(`Certificate ${isExistingCertificate ? 'updated' : 'created'} but upload failed: ${uploadError.message}. Please ensure RLS policies are configured correctly.`);
    }
    
    console.log('Certificate uploaded successfully:', uploadData);

    // Step 5: Get public URL and update certificate record in DB
    const { data: { publicUrl } } = supabase.storage
      .from('generated-certificates')
      .getPublicUrl(filePath);

    console.log('Public URL generated:', publicUrl);
    console.log('Updating certificate record ID:', certificateRecord.id);

    // Update the appropriate URL field based on file type
    const updateField = isImageTemplate ? 'certificate_png_url' : 'certificate_pdf_url';
    const { data: updateData, error: updateError } = await supabase
      .from('certificates')
      .update({ [updateField]: publicUrl })
      .eq('id', certificateRecord.id)
      .select();

    if (updateError) {
      console.error('Update error:', updateError);
      console.error('Update error details:', JSON.stringify(updateError, null, 2));
      // If update fails due to RLS, try to verify the certificate exists and belongs to user
      if (updateError.code === '42501' || updateError.message?.includes('row-level security')) {
        console.error('RLS policy blocking update. Please ensure UPDATE policy exists for certificates table.');
        throw new Error('Failed to update certificate URL. Please ensure RLS policies allow certificate updates.');
      }
      // Continue anyway - certificate is uploaded, we'll use the publicUrl we generated
    } else {
      console.log('Certificate record updated successfully with PDF URL:', updateData);
      if (updateData && updateData.length > 0) {
        console.log('Updated certificate PDF URL:', updateData[0].certificate_pdf_url);
      } else {
        console.warn('Update returned no data - certificate might not have been updated');
      }
    }

    // Return certificate with the public URL we just generated (don't rely on fetch which might return cached/old data)
    const updatedCertificate = {
      ...certificateRecord,
      [updateField]: publicUrl
    };
    
    console.log(`Returning certificate with ${updateField}:`, updatedCertificate[updateField]);
    return updatedCertificate;
  };

  // Generate Certificate: Call by ID in DB → Get name → Helper generates
  const generateCertificate = useCallback(async () => {
    if (generateInProgressRef.current) {
      return;
    }
    
    if (!eventId || !user?.id) {
      setError('Missing event ID or user information');
      return;
    }
    
    generateInProgressRef.current = true;
    setIsGenerating(true);
    setError(null);
    setEligibilityError(null);
    
    try {
      // Step 0: Check if certificate already exists - users can only generate once
      const existingCert = await CertificateService.getUserCertificate(user.id, eventId);
      if (existingCert.certificate) {
        setError('Certificate already exists. You can only generate a certificate once. Please use the download button.');
        return;
      }

      // Step 1: Check eligibility
      const eligibilityCheck = await CertificateService.checkEligibility(user.id, eventId);
      
      if (eligibilityCheck.error) {
        setEligibilityError(eligibilityCheck.error);
        return;
      }

      if (!eligibilityCheck.eligibility?.template_available) {
        setEligibilityError('Certificate template not available. Please contact the event organizer.');
        return;
      }

      if (!eligibilityCheck.eligibility?.eligible) {
        let errorMsg = 'You are not eligible for certificate generation. ';
        if (!eligibilityCheck.eligibility.attendance_verified) {
          errorMsg += 'Attendance not verified. ';
        }
        if (!eligibilityCheck.eligibility.survey_completed) {
          errorMsg += 'Survey not completed. ';
        }
        setEligibilityError(errorMsg);
        return;
      }

      // Step 2: Get template URL
      if (!event?.certificate_templates_url) {
        setError('Certificate template not available');
        return;
      }

      const templateUrl = event.certificate_templates_url.split(',')[0].trim();

      // Step 3: Call by ID in DB to get name
      const participantName = await getUserNameFromDB(user.id);

      // Step 4: Helper generates certificate (retrieves template, overlays name, saves to DB, uploads to bucket)
      const generatedCertificate = await generateCertificateHelper(
        user.id,
        eventId,
        participantName,
        templateUrl
      );

      console.log('Certificate generated, PDF URL:', generatedCertificate.certificate_pdf_url);
      setCertificate(generatedCertificate);
      
      // Certificate has been generated - always set isGenerated to true
      // Users can only generate once
      setIsGenerated(true);
      setShowSuccessMessage(true); // Show success message only after generation (not on page load)
      
      // Update certificate data
      if (certificateData) {
        setCertificateData({
          ...certificateData,
          certificateId: generatedCertificate.certificate_number,
          date: new Date(generatedCertificate.completion_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        });
      }
    } catch (err) {
      console.error('Error generating certificate:', err);
      setError(`Failed to generate certificate: ${err.message || 'Unknown error'}`);
    } finally {
      generateInProgressRef.current = false;
      setIsGenerating(false);
    }
  }, [eventId, user?.id, event, certificateData]);

  // Download Certificate: Just download the already-generated certificate (no generation)
  const downloadCertificate = useCallback(async (e) => {
    // Prevent event bubbling
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent multiple simultaneous downloads using ref (synchronous check)
    if (downloadInProgressRef.current) {
      return;
    }
    
    if (!certificate) {
      alert('Certificate not available');
      return;
    }
    
    // Check for PNG first, then fallback to PDF
    const certificateUrl = certificate.certificate_png_url || certificate.certificate_pdf_url;
    const fileExtension = certificate.certificate_png_url ? 'png' : 'pdf';
    const contentType = certificate.certificate_png_url ? 'image/png' : 'application/pdf';
    
    if (!certificateUrl || certificateUrl.includes('example.com') || certificateUrl.includes('placeholder')) {
      // Certificate exists but URL is invalid/missing
      // Users can only generate once, so just show an error
      alert(`Certificate ${fileExtension.toUpperCase()} is not available. The certificate was generated but the file is missing. Please contact support.`);
      return;
    }
    
    // Set ref immediately (synchronous) to prevent race conditions
    downloadInProgressRef.current = true;
    setIsDownloading(true);
    
    try {
      // Download using Storage API (server-side proxy)
      let blob;
      
      if (certificateUrl.includes('/storage/v1/object/public/')) {
        const urlParts = certificateUrl.split('/storage/v1/object/public/');
        if (urlParts.length === 2) {
          const parts = urlParts[1].split('/');
          const bucket = parts[0];
          const path = parts.slice(1).join('/');
          
          const { data, error } = await supabase.storage
            .from(bucket)
            .download(path);
          
          if (error) {
            throw new Error(`Failed to download certificate: ${error.message}`);
          }
          
          // Supabase Storage download() returns a Blob directly
          if (data instanceof Blob) {
            blob = data;
          } else if (data && typeof data.blob === 'function') {
            blob = await data.blob();
          } else {
            // Fallback: convert to blob if it's an ArrayBuffer
            blob = new Blob([data], { type: contentType });
          }
        } else {
          throw new Error('Could not parse certificate URL');
        }
      } else {
        const response = await fetch(certificateUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch certificate: ${response.statusText}`);
        }
        blob = await response.blob();
      }
      
      // Create download link - trigger download ONCE
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${certificate.certificate_number || 'certificate'}.${fileExtension}`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup after download starts
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
      }, 300);
      
    } catch (err) {
      console.error('Error downloading certificate:', err);
      alert(`Failed to download certificate: ${err.message || 'Unknown error'}`);
    } finally {
      // Reset both ref and state
      downloadInProgressRef.current = false;
      setIsDownloading(false);
    }
  }, [certificate, generateCertificate]);

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading certificate data...</p>
        </div>
      </section>
    );
  }

  if (error || !certificateData) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Error</h3>
            <p className="text-slate-600 mb-6">{error || 'Failed to load certificate data'}</p>
            <button 
              onClick={() => navigate('/my-events')} 
              className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
            >
              Back to My Events
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {showSuccessMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 font-medium">Certificate generated successfully!</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="items-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 text-center">Certificate of Participation</h2>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div className="border-b border-gray-200 pb-4">
              <p className="text-base text-gray-600 mb-2">Event Name</p>
              <p className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.eventName}</p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <p className="text-base text-gray-600 mb-2">Participant</p>
              <p className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.participantName}</p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <p className="text-base text-gray-600 mb-2">Date</p>
              <p className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.date}</p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <p className="text-base text-gray-600 mb-2">Organizer</p>
              <p className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.organizer}</p>
            </div>

            <div>
              <p className="text-base text-gray-600 mb-2">Certificate ID</p>
              <p className="text-base font-mono text-gray-500">{certificateData.certificateId}</p>
            </div>
          </div>
        </div>

        {eligibilityError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-yellow-800 text-sm">{eligibilityError}</p>
            </div>
          </div>
        )}

        {!isGenerated ? (
          <button
            onClick={generateCertificate}
            disabled={isGenerating || generateInProgressRef.current}
            className={`w-full py-5 rounded-lg items-center justify-center mb-6 ${
              isGenerating ? 'bg-green-400' : 'bg-green-600'
            } text-white text-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isGenerating ? 'Generating Certificate...' : 'Generate Certificate'}
          </button>
        ) : (
          <div className="space-y-4 mb-6">
            <button
              onClick={downloadCertificate}
              disabled={isDownloading || downloadInProgressRef.current}
              className={`w-full py-5 rounded-lg items-center justify-center text-white text-lg font-semibold transition-colors ${
                isDownloading || downloadInProgressRef.current
                  ? 'bg-green-400 cursor-not-allowed opacity-50' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
              style={{ minHeight: '56px' }}
            >
              {isDownloading ? 'Downloading...' : 'Download Certificate'}
            </button>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={() => navigate('/')}
            className="w-full py-5 bg-blue-800 rounded-lg items-center justify-center text-white text-lg font-semibold hover:bg-blue-900 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </section>
  );
};
