import './globals.css'

export const metadata = {
  title: 'Macias Virtual Room (Minimal)',
  description: 'TxDOT plan sharing for subcontractors'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body>{children}</body></html>
  );
}
