import "./globals.css";

export const metadata = {
  title: "Our Calendar",
  description: "One shared calendar for the two of you. Check it before you say yes.",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
