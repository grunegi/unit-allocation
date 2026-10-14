import "./css/globals.css";

export const metadata = {
  title: "سیستم تخصیص واحد",
  description: "مدیریت افراد و تخصیص واحدها",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
