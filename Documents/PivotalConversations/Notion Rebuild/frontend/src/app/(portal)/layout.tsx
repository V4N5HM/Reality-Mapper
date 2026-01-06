import { Toaster } from 'sonner';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" theme="dark" />
    </>
  );
}
