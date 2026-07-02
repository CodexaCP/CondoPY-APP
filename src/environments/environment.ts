// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // Navegador (ionic serve):  http://localhost:5071/api
  // Emulador Android:         http://10.0.2.2:5071/api
  // Dispositivo físico:       http://<IP-PC>:5071/api
  // ngrok:                    https://ophthalmometrical-zainab-irredeemable.ngrok-free.dev/api
  apiUrl: 'http://localhost:5071/api'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
