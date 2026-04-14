import "../globals.css";

export default function AddonLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          src="https://appsforoffice.microsoft.com/lib/1.1/hosted/office.js"
          async
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){try{
                var t = localStorage.getItem('phg-theme');
                if(t !== 'dark' && t !== 'light') t = 'dark';
                document.documentElement.setAttribute('data-theme', t);
              }catch(e){ document.documentElement.setAttribute('data-theme','dark'); }})();
            `,
          }}
        />
      </head>
      <body style={{ margin: 0, padding: 0, height: "100vh", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
