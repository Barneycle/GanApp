import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CertificateGeneratorModal from '../components/CertificateGeneratorModal';

export default function CertificateScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
    router.back();
  };

  return (
    <CertificateGeneratorModal
      visible={visible}
      eventId={eventId}
      onClose={handleClose}
    />
  );
}

