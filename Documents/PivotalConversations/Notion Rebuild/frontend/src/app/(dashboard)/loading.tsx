import { LoadingState } from '@/components/shared/loading-state';

export default function Loading() {
    return (
        <div className="flex h-full w-full items-center justify-center min-h-[50vh]">
            <LoadingState message="Loading..." />
        </div>
    );
}
