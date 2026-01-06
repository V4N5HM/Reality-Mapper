import { LoadingState } from '@/components/shared/loading-state';

export default function PortalLoading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
            <LoadingState message="Loading client portal..." />
        </div>
    );
}
