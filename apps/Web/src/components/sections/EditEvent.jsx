import React from 'react';
import { useParams } from 'react-router-dom';
import { CreateEvent } from './CreateEvent';

export const EditEvent = () => {
  const { eventId } = useParams();

  return <CreateEvent mode="edit" eventId={eventId || null} />;
};

