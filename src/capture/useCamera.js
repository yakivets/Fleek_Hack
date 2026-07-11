import { useEffect, useRef, useState } from 'react';

// Rear camera stream into a <video>. status: starting | ready | unavailable
export function useCamera(active) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('starting');

  useEffect(() => {
    if (!active) return;
    let stream;
    let cancelled = false;
    setStatus('starting');
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) return;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);

  return { videoRef, status };
}

const MAX_W = 1024; // cap resolution: smaller payloads, no quality benefit above this for garment shots

export function grabFrame(video) {
  const scale = Math.min(1, MAX_W / video.videoWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

// File-input fallback (camera denied / desktop without webcam): downscale to same cap.
export function fileToDataURI(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_W / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}
