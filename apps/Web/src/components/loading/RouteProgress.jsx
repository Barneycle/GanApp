import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const RouteProgress = () => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setVisible(true);
    setWidth(12);
    const toMid = window.setTimeout(() => setWidth(70), 80);
    const toDone = window.setTimeout(() => setWidth(100), 420);
    const hide = window.setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 620);
    return () => {
      window.clearTimeout(toMid);
      window.clearTimeout(toDone);
      window.clearTimeout(hide);
    };
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-blue-950/40">
      <div
        className="h-full bg-white transition-[width] duration-300 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
};
