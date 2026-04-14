import "../globals.css";

export const metadata = {
  title: "PHG AI Triage",
};

export default function AddonLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://appsforoffice.microsoft.com/lib/1.1/hosted/office.js" />
      </head>
      <body style={{ margin: 0, padding: 0, height: "100vh", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
