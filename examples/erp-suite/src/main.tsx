import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ogeSetLicenseKey } from '@oge-ui/core';
import { OGE_LICENSE_KEY } from './license';
import '@oge-ui/react/styles.css';
import '@oge-ui/core/themes/dark.css';
import '@oge-ui/react-charts/styles.css';
import '@oge-ui/react-kanban/styles.css';
import '@oge-ui/react-pivot/styles.css';
import '@oge-ui/react-spreadsheet/styles.css';
import '@oge-ui/react-scheduler/styles.css';
import '@oge-ui/react-gantt/styles.css';
import '@oge-ui/react-bpmn/styles.css';
import './index.css';
import {
  OgeButtonsConfigProvider,
  OgeCardConfigProvider,
  OgeFormsConfigProvider,
  OgeGridConfigProvider,
  OgeModalProvider,
  OgeOverlayConfigProvider,
  OgeToastProvider,
  OgeUploadConfigProvider,
} from '@oge-ui/react';
import { App } from './App';

ogeSetLicenseKey(OGE_LICENSE_KEY);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OgeButtonsConfigProvider
      config={{
        clickGuardMs: 250,
        messages: { loading: 'Working…' },
      }}
    >
      <OgeOverlayConfigProvider
        config={{
          toastPosition: 'bottom-end',
          toastDisplayTime: 3500,
          messages: {
            dialogConfirmTitle: 'Confirm action',
            dialogOk: 'Confirm',
            dialogCancel: 'Cancel',
          },
        }}
      >
        <OgeGridConfigProvider
          config={{
            locale: 'en-US',
            filterDebounce: 150,
            columnHidingMode: 'detail',
            messages: {
              search: 'Search items, SKUs, suppliers…',
              noData: 'No items match the current filters.',
              editRow: 'Edit item',
              deleteRow: 'Delete item',
              saveRow: 'Save item',
              cancelEdit: 'Discard row changes',
            },
          }}
        >
          <OgeFormsConfigProvider
            config={{
              labelLocation: 'top',
              showRequiredMark: true,
              messages: {
                validationSummaryTitle:
                  '{count, plural, one {# field needs your attention} other {# fields need your attention}}',
              },
            }}
          >
            <OgeUploadConfigProvider
              config={{
                messages: {
                  buttons: { selectSingle: 'Choose a file' },
                  dropZone: {
                    labelSingle: 'Drop a file here, or {browse}',
                    browse: 'browse files',
                  },
                },
              }}
            >
              <OgeCardConfigProvider config={{ stylingMode: 'outlined', size: 'sm' }}>
                <OgeModalProvider>
                  <OgeToastProvider>
                    <App />
                  </OgeToastProvider>
                </OgeModalProvider>
              </OgeCardConfigProvider>
            </OgeUploadConfigProvider>
          </OgeFormsConfigProvider>
        </OgeGridConfigProvider>
      </OgeOverlayConfigProvider>
    </OgeButtonsConfigProvider>
  </StrictMode>,
);
