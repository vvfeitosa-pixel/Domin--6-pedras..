import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.vvfeitosa.dominope',
  appName: 'Dominó Pernambucano',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#3a1a00',
      showSpinner: false
    }
  }
};

export default config;
