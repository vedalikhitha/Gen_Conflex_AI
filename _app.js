import { ClerkProvider } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    if (router.pathname === '/landing_page/index.html') {
      document.querySelector('body').innerHTML = '';
    }
  }, [router.pathname]);

  return (
    <ClerkProvider {...pageProps}>
      <Component {...pageProps} />
    </ClerkProvider>
  );
}

export default MyApp;