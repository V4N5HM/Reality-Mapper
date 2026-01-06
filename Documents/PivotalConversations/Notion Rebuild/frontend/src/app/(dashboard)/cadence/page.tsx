import { getActiveCadence } from '@/lib/notion/cadence';
import { CadenceView } from '@/components/cadence/cadence-view';

export const dynamic = 'force-dynamic';

export default async function CadencePage() {
  const cadenceItems = await getActiveCadence();

  return <CadenceView items={cadenceItems} />;
}
