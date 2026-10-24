import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import {
  provideOgeButtonsConfig,
  provideOgeCardConfig,
  provideOgeGridConfig,
  provideOgeInputsConfig,
  provideOgeOverlayConfig,
  provideOgeTabsConfig,
} from 'oge-ui';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideOgeGridConfig({
      locale: 'en-US',
      messages: {
        noData: 'No orders match the current date range or region filter.',
        search: 'Search orders, customers, companies, or categories…',
        groupPanelHint: 'Drag a column header here to group by that field',
      },
    }),
    provideOgeInputsConfig({
      locale: 'en-US',
      adaptiveMode: 'auto',
      messages: {
        clearButton: 'Clear filter',
        dropDownToggle: 'Open options',
        noDataText: 'No matching regions',
        presetToday: 'Today',
        presetLast7Days: 'Last 7 days',
        presetLast30Days: 'Last 30 days',
        presetThisMonth: 'This month',
        presetLastMonth: 'Last month',
      },
    }),
    provideOgeButtonsConfig({
      clickGuardMs: 250,
      messages: {
        loading: 'Exporting…',
      },
    }),
    provideOgeOverlayConfig({
      toastPosition: 'bottom-end',
      toastDisplayTime: 3200,
      messages: {
        toastClose: 'Dismiss notification',
        modalClose: 'Close dialog',
      },
    }),
    provideOgeTabsConfig({
      messages: {
        tabListMenu: 'All dashboard tabs',
        noData: 'No tabs available',
      },
    }),
    provideOgeCardConfig({
      stylingMode: 'outlined',
      size: 'md',
    }),
  ],
};
