import { useState, useEffect } from 'react';
import { formatDistanceToNow, format } from 'date-fns';

export function RelativeTime({ date }: { date: string | Date }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return <span className="text-muted-foreground text-sm font-mono">Invalid date</span>;
  }

  return (
    <span 
      className="text-muted-foreground text-sm font-mono hover:text-foreground transition-colors cursor-default"
      title={format(d, "yyyy-MM-dd HH:mm:ss 'UTC'")}
    >
      {formatDistanceToNow(d, { addSuffix: true })}
    </span>
  );
}
