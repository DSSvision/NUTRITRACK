import './global.css';
import { AuthProvider } from './providers/auth-provider';

export const metadata = {
  title: 'NutriTrack | Calorie Tracker',
  description: 'Track your calories, meals, and daily nutrition.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
