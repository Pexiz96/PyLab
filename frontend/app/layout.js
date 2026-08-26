import "./globals.css";
import "./path.css";
import "./mastery.css";

export const metadata = {
  title: "PyLab",
  description: "Learn. Code. Master Python.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
