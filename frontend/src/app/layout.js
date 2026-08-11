import './globals.css';

export const metadata = {
  title: 'Electric Vehicle Dashboard',
  description: 'Live telemetry dashboard for EVs'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
