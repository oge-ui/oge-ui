import { bootstrapApplication } from '@angular/platform-browser';
import { ogeSetLicenseKey } from '@oge-ui/core';
import { OGE_LICENSE_KEY } from './license';
import { appConfig } from './app/app.config';
import { App } from './app/app';

ogeSetLicenseKey(OGE_LICENSE_KEY);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
