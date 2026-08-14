'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { resolveTabIndex, type OgeTabsOrientation } from '@oge-ui/behavior';
import { OgeTabStrip, type OgeTabStripApi } from './tab-strip';
import { useOgeTabs } from './use-tabs';
import type { OgeTabsHandle, OgeTabsSharedProps } from './tabs-types';

export interface OgeTabsProps extends OgeTabsSharedProps {
  /** Layout direction of the stand-alone strip. */
  orientation?: OgeTabsOrientation;
}

/**
 * Stand-alone tab strip — the React render of the Angular `<oge-tabs>`: the
 * WAI-ARIA APG tabs pattern without panels, for driving your own content.
 * Selection, closing and reordering run through the shared
 * `@oge-ui/behavior` pipelines, so the decisions match the Angular component
 * exactly; only the API is React's (controlled/uncontrolled pairs, callbacks
 * and a ref handle).
 *
 * ```tsx
 * <OgeTabs
 *   items={[{ text: 'Overview' }, { text: 'Settings' }]}
 *   selectedIndex={index}
 *   onSelectedIndexChange={setIndex}
 * />
 * ```
 */
export const OgeTabs = forwardRef<OgeTabsHandle, OgeTabsProps>(
  function OgeTabsRender(props, ref) {
    const { orientation = 'horizontal', className, style } = props;
    const tabs = useOgeTabs(props);
    const stripApi = useRef<OgeTabStripApi | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => stripApi.current?.focusActiveTab(),
        closeTab: (target) => tabs.closeTab(target),
        scrollToTab: (target) => {
          const index = resolveTabIndex(tabs.descriptors, target);
          if (index !== -1) stripApi.current?.scrollToIndex(index);
        },
      }),
      [tabs],
    );

    tabs.closedFocusRef.current = (index) =>
      stripApi.current?.handleClosedFocus(index);

    return (
      <div
        className={['oge-tabs', className].filter(Boolean).join(' ')}
        style={style}
      >
        <OgeTabStrip
          descriptors={tabs.descriptors}
          selectedIndex={tabs.selectedIndex}
          activation={props.activation}
          orientation={orientation}
          disabled={props.disabled}
          alignment={props.tabAlignment}
          indicatorFit={props.indicatorFit}
          showNavButtons={props.showNavButtons}
          showTabListButton={props.showTabListButton}
          allowReorder={props.allowTabReordering}
          stylingMode={props.stylingMode}
          size={props.size}
          messages={tabs.messages}
          closePendingIds={tabs.closePendingIds}
          idPrefix={tabs.id}
          ariaLabel={props.ariaLabel}
          onActivate={tabs.onTabClick}
          onFocusSelect={(index, event) => tabs.requestSelect(index, event)}
          onCloseRequest={(index, event) => tabs.requestClose(index, event)}
          onReorderRequest={tabs.requestReorder}
          onReady={(api) => (stripApi.current = api)}
        />
      </div>
    );
  },
);
