'use client';

import { ExternalLink } from 'lucide-react';

interface PortalLinkProps {
  clientName: string;
}

export function PortalLink({ clientName }: PortalLinkProps) {
  const slug = clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(`/portal/${slug}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      className="text-zinc-500 hover:text-white transition-colors"
      title="Open client portal"
      type="button"
    >
      <ExternalLink className="w-4 h-4" />
    </button>
  );
}
