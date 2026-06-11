import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export function QR({ text, size, label }: { text: string; size: number; label?: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let on = true;
    QRCode.toDataURL(text, { width: size * 2, margin: 1, errorCorrectionLevel: 'M' }).then((u) => on && setUrl(u));
    return () => {
      on = false;
    };
  }, [text, size]);
  if (!url) return <div style={{ width: size, height: size, margin: '0 auto' }} />;
  return <img className="qr-img" src={url} width={size} height={size} alt={label ?? 'QR code'} data-payload={text} />;
}
