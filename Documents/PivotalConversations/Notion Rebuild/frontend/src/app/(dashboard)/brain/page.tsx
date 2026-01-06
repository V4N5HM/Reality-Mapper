import { getBrainDocuments } from '@/lib/notion/brain';
import { getClients } from '@/lib/notion/clients';
import { BrainView } from '@/components/brain/brain-view';

export const dynamic = 'force-dynamic';

export default async function BrainPage() {
  const [documents, clients] = await Promise.all([
    getBrainDocuments(),
    getClients('Active'),
  ]);

  return <BrainView documents={documents} clients={clients} />;
}
