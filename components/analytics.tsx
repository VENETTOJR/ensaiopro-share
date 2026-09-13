/**
 * Analytics unificado — Meta Pixel + Google Analytics + Google Tag Manager.
 *
 * Ativa via env vars (deixar vazio = não injeta script):
 *   NEXT_PUBLIC_META_PIXEL_ID=123456789
 *   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
 *   NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
 *
 * Todos são carregados com strategy=afterInteractive (não bloqueia render).
 */
import Script from "next/script";

export function Analytics() {
  const META = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const GA = process.env.NEXT_PUBLIC_GA_ID;
  const GTM = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <>
      {META && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META}');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${META}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {GA && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA}`}
            strategy="afterInteractive"
          />
          <Script id="ga-config" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA}');
            `}
          </Script>
        </>
      )}

      {GTM && (
        <Script id="gtm" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM}');
          `}
        </Script>
      )}
    </>
  );
}

/**
 * Helper pra disparar eventos conversão em qualquer componente client.
 * Uso: `trackEvent("Purchase", { value: 147, currency: "BRL" })`
 */
export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined") return;
  // Meta Pixel
  const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
  if (fbq) fbq("track", name, params);
  // Google Analytics
  const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (gtag) gtag("event", name, params);
  // dataLayer (GTM)
  const dataLayer = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
  if (dataLayer) dataLayer.push({ event: name, ...params });
}
