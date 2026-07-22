import Script from 'next/script';
import { site } from '@/lib/site';

/**
 * Google Analytics, mounted once in the root layout so it covers every page.
 *
 * `afterInteractive` rather than the raw `async` tag Google hands out: it is
 * what Next recommends for a tag manager, and it keeps 50KB of analytics off
 * the critical path so it cannot show up in the site's own performance
 * numbers. Nothing is lost by waiting — `gtag` queues into `dataLayer`, which
 * is set up before the library that drains it has loaded.
 *
 * Nothing is sent from a development build. Localhost traffic in the property
 * is noise you then have to remember to filter out of every report.
 */
export function Analytics() {
  if (process.env.NODE_ENV !== 'production' || !site.analyticsId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${site.analyticsId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${site.analyticsId}');`}
      </Script>
    </>
  );
}
